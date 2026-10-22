// Importación CSV (CU-07 · RF-17): todo o nada. Si una fila tiene errores no se carga ningún registro.
import { Aula, BloqueDisponible, Caracteristica, Curso, Dia, Docente, EstadoApp, OfertaCurso, ParametrosProgramacion, Vinculacion } from '../models';
import { normalizar, nuevoId } from '../util';

export type TipoImportacion = 'docentes' | 'disponibilidad' | 'cursos' | 'aulas';

export interface ErrorFila {
  fila: number; // número de línea en el archivo (1 = encabezado)
  motivo: string;
}

export interface ResultadoImportacion {
  separador: ';' | ',';
  filas: number;
  errores: ErrorFila[];
  nuevos: number;
  actualizados: number;
  vista: string[][]; // primeras filas para la vista previa
  cambios: Partial<Pick<EstadoApp, 'docentes' | 'cursos' | 'aulas' | 'ofertas'>>;
  resumen: string;
}

export const PLANTILLAS: Record<TipoImportacion, { columnas: string[]; ejemplo: string[]; ayuda: string }> = {
  docentes: {
    columnas: ['identificador', 'nombre', 'correo', 'vinculacion', 'escalafon', 'horas_max', 'cursos_habilitados'],
    ejemplo: ['D2001', 'Laura Gómez Ruiz', 'lgomez@ueb.demo', 'MT', 'Asistente', '8', 'ISI-102|ISI-205'],
    ayuda: 'vinculacion: TC, 3/4, MT (medio tiempo) o 1/4. horas_max vacío = valor por defecto de la vinculación. cursos_habilitados: códigos separados por |.',
  },
  disponibilidad: {
    columnas: ['identificador_docente', 'dia', 'inicio', 'fin'],
    ejemplo: ['D1001', 'LUN', '7', '12'],
    ayuda: 'dia: LUN, MAR, MIE, JUE, VIE o SAB. inicio y fin en horas enteras (24 h). Reemplaza la disponibilidad de los docentes incluidos en el archivo.',
  },
  cursos: {
    columnas: ['codigo', 'nombre', 'nivel', 'creditos', 'sesiones_semanales', 'caracteristicas', 'demanda'],
    ejemplo: ['ISI-999', 'Curso de ejemplo', '3', '3', '2', 'EQUIPOS_COMPUTO', '75'],
    ayuda: 'caracteristicas: EQUIPOS_COMPUTO, MOBILIARIO_MOVIL, LAB_REDES o LAB_FISICA, separadas por | (vacío = aula estándar). demanda: estimada para el periodo seleccionado.',
  },
  aulas: {
    columnas: ['codigo', 'nombre', 'capacidad', 'caracteristicas'],
    ejemplo: ['F-305', 'Sala de cómputo F-305', '45', 'EQUIPOS_COMPUTO'],
    ayuda: 'caracteristicas: EQUIPOS_COMPUTO, MOBILIARIO_MOVIL, LAB_REDES o LAB_FISICA, separadas por | (vacío = aula estándar).',
  },
};

export function plantillaCsv(tipo: TipoImportacion): string {
  const p = PLANTILLAS[tipo];
  return [p.columnas.join(';'), p.ejemplo.join(';')].join('\n');
}

/** Parte el texto en filas respetando comillas. Detecta ; o , según el encabezado. */
export function parsearCsv(texto: string): { separador: ';' | ','; filas: string[][] } {
  const limpio = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const primera = limpio.split('\n')[0] ?? '';
  const separador: ';' | ',' = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"' && limpio[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === separador) {
      fila.push(celda.trim());
      celda = '';
    } else if (ch === '\n') {
      fila.push(celda.trim());
      filas.push(fila);
      fila = [];
      celda = '';
    } else celda += ch;
  }
  if (celda.length || fila.length) {
    fila.push(celda.trim());
    filas.push(fila);
  }
  return { separador, filas: filas.filter((f) => f.some((c) => c !== '')) };
}

const VINC: Record<string, Vinculacion> = {
  tc: 'TIEMPO_COMPLETO', 'tiempo completo': 'TIEMPO_COMPLETO', tiempo_completo: 'TIEMPO_COMPLETO',
  '3/4': 'TRES_CUARTOS', '¾': 'TRES_CUARTOS', 'tres cuartos': 'TRES_CUARTOS', tres_cuartos: 'TRES_CUARTOS',
  mt: 'MEDIO_TIEMPO', '1/2': 'MEDIO_TIEMPO', '½': 'MEDIO_TIEMPO', 'medio tiempo': 'MEDIO_TIEMPO', medio_tiempo: 'MEDIO_TIEMPO',
  '1/4': 'CUARTO_TIEMPO', '¼': 'CUARTO_TIEMPO', 'cuarto de tiempo': 'CUARTO_TIEMPO', cuarto_tiempo: 'CUARTO_TIEMPO',
};
const DIA: Record<string, Dia> = { lun: 0, lunes: 0, mar: 1, martes: 1, mie: 2, miercoles: 2, jue: 3, jueves: 3, vie: 4, viernes: 4, sab: 5, sabado: 5 };
const CARS: Caracteristica[] = ['EQUIPOS_COMPUTO', 'MOBILIARIO_MOVIL', 'LAB_REDES', 'LAB_FISICA'];
const ESC = ['instructor', 'auxiliar', 'asistente', 'asociado', 'titular'];

const entero = (v: string) => (/^-?\d+$/.test(v.trim()) ? Number(v) : NaN);

interface Contexto {
  estado: EstadoApp;
  periodoId: string;
  parametros: ParametrosProgramacion;
}

export function procesarImportacion(tipo: TipoImportacion, texto: string, ctx: Contexto): ResultadoImportacion {
  const { separador, filas } = parsearCsv(texto);
  const base: ResultadoImportacion = { separador, filas: 0, errores: [], nuevos: 0, actualizados: 0, vista: [], cambios: {}, resumen: '' };
  if (!filas.length) return { ...base, errores: [{ fila: 1, motivo: 'El archivo está vacío.' }] };

  const cols = PLANTILLAS[tipo].columnas;
  const cab = filas[0].map((c) => normalizar(c));
  const faltan = cols.filter((c) => !cab.includes(c));
  if (faltan.length) return { ...base, errores: [{ fila: 1, motivo: `Faltan columnas en el encabezado: ${faltan.join(', ')}. Use la plantilla.` }] };
  const idx = (c: string) => cab.indexOf(c);
  const datos = filas.slice(1).map((f, i) => ({ n: i + 2, v: (c: string) => (f[idx(c)] ?? '').trim(), raw: f }));
  const errores: ErrorFila[] = [];
  const err = (n: number, m: string) => errores.push({ fila: n, motivo: m });
  const vista = [cols, ...datos.slice(0, 8).map((d) => cols.map((c) => d.v(c)))];
  const e = ctx.estado;

  if (tipo === 'docentes') {
    const docentes = [...e.docentes];
    const vistos = new Set<string>();
    let nuevos = 0, act = 0;
    for (const d of datos) {
      const id = d.v('identificador');
      const nom = d.v('nombre');
      const correo = d.v('correo');
      const vin = VINC[normalizar(d.v('vinculacion'))];
      const esc = d.v('escalafon');
      const hm = d.v('horas_max');
      const antes = errores.length;
      if (!id) err(d.n, 'El identificador es obligatorio.');
      else if (vistos.has(id)) err(d.n, `El identificador ${id} está repetido en el archivo.`);
      if (!nom) err(d.n, 'El nombre es obligatorio.');
      if (correo && !/^\S+@\S+\.\S+$/.test(correo)) err(d.n, `El correo «${correo}» no es válido.`);
      if (!vin) err(d.n, `Vinculación «${d.v('vinculacion')}» no reconocida (use TC, 3/4, MT o 1/4).`);
      if (esc && !ESC.includes(normalizar(esc))) err(d.n, `Escalafón «${esc}» no reconocido.`);
      if (hm && !(entero(hm) >= 0)) err(d.n, `Las horas máximas «${hm}» deben ser un entero mayor o igual a 0.`);
      const codigos = d.v('cursos_habilitados').split('|').map((x) => x.trim()).filter(Boolean);
      const hab: string[] = [];
      for (const c of codigos) {
        const cur = e.cursos.find((x) => x.codigo.toLowerCase() === c.toLowerCase());
        if (!cur) err(d.n, `El curso ${c} no existe en el catálogo.`);
        else hab.push(cur.id);
      }
      vistos.add(id);
      if (errores.length > antes) continue;
      const prev = docentes.find((x) => x.identificador === id);
      const doc: Docente = {
        id: prev?.id ?? nuevoId('doc'),
        identificador: id,
        nombre: nom,
        correoInstitucional: correo || prev?.correoInstitucional || '',
        tipoVinculacion: vin,
        categoriaEscalafon: esc ? esc[0].toUpperCase() + normalizar(esc).slice(1) : prev?.categoriaEscalafon ?? 'Asistente',
        horasMaxDocencia: hm ? entero(hm) : ctx.parametros.horasMaxPorVinculacion[vin],
        habilitaciones: hab,
        disponibilidad: prev?.disponibilidad ?? [],
      };
      if (prev) {
        docentes[docentes.indexOf(prev)] = doc;
        act++;
      } else {
        docentes.push(doc);
        nuevos++;
      }
    }
    return cierre({ docentes }, nuevos, act, 'docente(s)');
  }

  if (tipo === 'disponibilidad') {
    const porDoc = new Map<string, BloqueDisponible[]>();
    const p = ctx.parametros;
    for (const d of datos) {
      const id = d.v('identificador_docente');
      const doc = e.docentes.find((x) => x.identificador === id);
      const dia = DIA[normalizar(d.v('dia'))];
      const ini = entero(d.v('inicio'));
      const fin = entero(d.v('fin'));
      const antes = errores.length;
      if (!doc) err(d.n, `No existe un docente con identificador «${id}».`);
      if (dia === undefined) err(d.n, `Día «${d.v('dia')}» no válido (use LUN, MAR, MIE, JUE, VIE o SAB).`);
      if (isNaN(ini) || isNaN(fin)) err(d.n, 'Las horas de inicio y fin deben ser enteros.');
      else if (ini >= fin) err(d.n, `La hora de inicio (${ini}) debe ser menor que la de fin (${fin}).`);
      else if (dia !== undefined) {
        const f = dia === 5 ? p.franjaSabado : p.franjaLunesViernes;
        if (ini < f.inicio || fin > f.fin) err(d.n, `El bloque ${ini}–${fin} está fuera de la franja hábil (${f.inicio}–${f.fin}).`);
      }
      if (errores.length > antes) continue;
      const l = porDoc.get(doc!.id) ?? [];
      if (l.some((b) => b.dia === dia && b.inicio < fin && ini < b.fin)) {
        err(d.n, `El bloque se solapa con otro bloque del mismo docente y día.`);
        continue;
      }
      l.push({ dia, inicio: ini, fin });
      porDoc.set(doc!.id, l);
    }
    const docentes = e.docentes.map((x) => (porDoc.has(x.id) ? { ...x, disponibilidad: porDoc.get(x.id)!.sort((a, b) => a.dia - b.dia || a.inicio - b.inicio) } : x));
    return cierre({ docentes }, 0, porDoc.size, 'docente(s) con disponibilidad reemplazada', datos.length);
  }

  if (tipo === 'cursos') {
    const cursos = [...e.cursos];
    let ofertas: OfertaCurso[] = [...e.ofertas];
    const vistos = new Set<string>();
    let nuevos = 0, act = 0;
    const p = ctx.parametros;
    for (const d of datos) {
      const cod = d.v('codigo');
      const nom = d.v('nombre');
      const niv = entero(d.v('nivel'));
      const cre = entero(d.v('creditos'));
      const ses = entero(d.v('sesiones_semanales'));
      const dem = d.v('demanda');
      const cars = d.v('caracteristicas').split('|').map((x) => x.trim().toUpperCase()).filter(Boolean);
      const antes = errores.length;
      if (!cod) err(d.n, 'El código es obligatorio.');
      else if (vistos.has(cod)) err(d.n, `El código ${cod} está repetido en el archivo.`);
      if (!nom) err(d.n, 'El nombre es obligatorio.');
      if (!(niv >= 1 && niv <= 10)) err(d.n, `El nivel «${d.v('nivel')}» debe ser un entero entre 1 y 10.`);
      if (!(cre >= 0)) err(d.n, `Los créditos «${d.v('creditos')}» deben ser un entero mayor o igual a 0.`);
      if (!(ses >= p.sesionesMinimas && ses <= p.sesionesMaximas)) err(d.n, `Las sesiones semanales «${d.v('sesiones_semanales')}» deben estar entre ${p.sesionesMinimas} y ${p.sesionesMaximas}.`);
      cars.forEach((c) => !CARS.includes(c as Caracteristica) && err(d.n, `Característica «${c}» no reconocida.`));
      if (dem && !(entero(dem) >= 0)) err(d.n, `La demanda «${dem}» debe ser un entero mayor o igual a 0.`);
      vistos.add(cod);
      if (errores.length > antes) continue;
      const prev = cursos.find((x) => x.codigo.toLowerCase() === cod.toLowerCase());
      const c: Curso = { id: prev?.id ?? nuevoId('cur'), codigo: cod, nombre: nom, nivel: niv, creditos: cre, sesionesSemanales: ses, caracteristicasRequeridas: cars as Caracteristica[] };
      if (prev) {
        cursos[cursos.indexOf(prev)] = c;
        act++;
      } else {
        cursos.push(c);
        nuevos++;
      }
      if (dem) {
        const o = ofertas.find((x) => x.cursoId === c.id && x.periodoId === ctx.periodoId);
        ofertas = o ? ofertas.map((x) => (x === o ? { ...x, demandaEstimada: entero(dem) } : x)) : [...ofertas, { periodoId: ctx.periodoId, cursoId: c.id, demandaEstimada: entero(dem) }];
      }
    }
    return cierre({ cursos, ofertas }, nuevos, act, 'curso(s)');
  }

  // aulas
  const aulas: Aula[] = [...e.aulas];
  const vistos = new Set<string>();
  let nuevos = 0, act = 0;
  for (const d of datos) {
    const cod = d.v('codigo');
    const cap = entero(d.v('capacidad'));
    const cars = d.v('caracteristicas').split('|').map((x) => x.trim().toUpperCase()).filter(Boolean);
    const antes = errores.length;
    if (!cod) err(d.n, 'El código es obligatorio.');
    else if (vistos.has(cod)) err(d.n, `El código ${cod} está repetido en el archivo.`);
    if (!(cap > 0)) err(d.n, `La capacidad «${d.v('capacidad')}» debe ser un entero mayor que 0.`);
    cars.forEach((c) => !CARS.includes(c as Caracteristica) && err(d.n, `Característica «${c}» no reconocida.`));
    vistos.add(cod);
    if (errores.length > antes) continue;
    const prev = aulas.find((x) => x.codigo.toLowerCase() === cod.toLowerCase());
    const a: Aula = { id: prev?.id ?? nuevoId('aula'), codigo: cod, nombre: d.v('nombre') || cod, capacidad: cap, caracteristicas: cars as Caracteristica[] };
    if (prev) {
      aulas[aulas.indexOf(prev)] = a;
      act++;
    } else {
      aulas.push(a);
      nuevos++;
    }
  }
  return cierre({ aulas }, nuevos, act, 'aula(s)');

  function cierre(cambios: ResultadoImportacion['cambios'], nuevos: number, act: number, que: string, filasN = datos.length): ResultadoImportacion {
    const ok = errores.length === 0;
    return {
      separador,
      filas: filasN,
      errores: errores.sort((a, b) => a.fila - b.fila),
      nuevos: ok ? nuevos : 0,
      actualizados: ok ? act : 0,
      vista,
      cambios: ok ? cambios : {},
      resumen: `${tipo}: ${filasN} fila(s) — ${nuevos} nuevo(s), ${act} ${que.includes('reemplazada') ? que : 'actualizado(s)'}`,
    };
  }
}
