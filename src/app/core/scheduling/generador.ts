// Generador de la propuesta inicial (CU-10, RF-08). Se consume por la interfaz GeneradorHorario (RNF-04).
import { Aula, Dia, Docente, Grupo, GrupoPendiente, ParametrosProgramacion, Sesion } from '../models';
import { Catalogo, cupoEfectivo } from '../rules/reglas-duras';
import { ValidadorReglas } from '../rules/validador';
import { nombreCaracteristica, nuevoId } from '../util';

export interface EntradaGeneracion {
  grupos: Grupo[];
  docentes: Docente[];
  aulas: Aula[];
  parametros: ParametrosProgramacion;
  catalogo: Catalogo;
  /** Sesiones ya ubicadas que se respetan como fijas (reintento de pendientes). */
  sesionesFijas?: Sesion[];
}

export interface ResultadoGeneracion {
  sesiones: Sesion[];
  pendientes: GrupoPendiente[];
  milisegundos: number;
}

export interface GeneradorHorario {
  readonly nombre: string;
  generar(entrada: EntradaGeneracion): ResultadoGeneracion;
}

interface Candidato {
  /** [día, hora de inicio] de cada sesión */
  franjas: [Dia, number][];
  costo: number;
}

/**
 * Algoritmo voraz con patrones semanales:
 *  1. Ordena los grupos de menos a más opciones (docentes habilitados × aulas aptas).
 *  2. Para cada grupo arma candidatos "patrón de días + misma hora" (L-X, M-J, X-V, L-X-V…), como se
 *     programan las clases en la práctica, y les asigna un costo: días seguidos (B1), sábado en jornada
 *     diurna, huecos y cruces en el horario del semestre y la jornada (B4), horas menos deseadas.
 *  3. Toma el candidato más barato que el validador R1–R9 aprueba, con el docente menos cargado (B3).
 *  4. Si ningún patrón cabe, intenta sesión por sesión; si tampoco, el grupo queda PENDIENTE con su causa.
 */
export class GeneradorVoraz implements GeneradorHorario {
  readonly nombre = 'Voraz por patrones semanales';
  constructor(private readonly validador = new ValidadorReglas()) {}

  generar(e: EntradaGeneracion): ResultadoGeneracion {
    const t0 = performance.now();
    const p = e.parametros;
    const dur = p.duracionSesion;
    const sesiones: Sesion[] = [];
    const fijas = e.sesionesFijas ?? [];
    const pendientes: GrupoPendiente[] = [];
    const carga = new Map<string, number>();
    const ocupacion = new Ocupacion(e, dur);
    fijas.forEach((s) => {
      ocupacion.agregar(s);
      if (s.docenteId) carga.set(s.docenteId, (carga.get(s.docenteId) ?? 0) + dur);
    });

    const aulasAptas = (g: Grupo) => {
      const c = e.catalogo.curso(g.cursoId)!;
      return e.aulas
        .filter((a) => a.capacidad >= g.cupoPlaneado && c.caracteristicasRequeridas.every((x) => a.caracteristicas.includes(x)))
        .sort((a, b) => {
          // aulas sin características que el curso no necesita primero (B5); luego la de mejor ajuste
          const espA = a.caracteristicas.filter((x) => !c.caracteristicasRequeridas.includes(x)).length;
          const espB = b.caracteristicas.filter((x) => !c.caracteristicasRequeridas.includes(x)).length;
          return espA - espB || a.capacidad - b.capacidad || a.codigo.localeCompare(b.codigo);
        });
    };
    // un docente sirve para la jornada si su disponibilidad cubre al menos una franja de ella
    const sirveJornada = (d: Docente, g: Grupo) =>
      d.disponibilidad.some((b) =>
        b.dia === 5
          ? b.fin - b.inicio >= dur
          : g.jornada === 'DIURNA'
            ? Math.min(b.fin, 18) - Math.max(b.inicio, 7) >= dur
            : Math.min(b.fin, 22) - Math.max(b.inicio, 18) >= dur,
      );
    const habilitados = (g: Grupo) => e.docentes.filter((d) => d.habilitaciones.includes(g.cursoId) && sirveJornada(d, g));
    // norma del programa: los grupos diurnos de un mismo curso los dictan docentes distintos
    const docentesDiurnosDelCurso = (g: Grupo) => {
      const ids = new Set<string>();
      for (const s of [...fijas, ...sesiones]) {
        const og = e.catalogo.grupo(s.grupoId);
        if (og && og.id !== g.id && og.cursoId === g.cursoId && og.jornada === 'DIURNA' && s.docenteId) ids.add(s.docenteId);
      }
      return ids;
    };
    const sesionesDe = (g: Grupo) => Math.max(p.sesionesMinimas, e.catalogo.curso(g.cursoId)!.sesionesSemanales);

    const orden = [...e.grupos].sort((a, b) => {
      const pa = a.docentePreferido ? 0 : 1;
      const pb = b.docentePreferido ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const oa = habilitados(a).length * Math.min(aulasAptas(a).length, 20);
      const ob = habilitados(b).length * Math.min(aulasAptas(b).length, 20);
      return oa - ob || sesionesDe(b) - sesionesDe(a) || (a.jornada === 'NOCTURNA' ? -1 : 1) - (b.jornada === 'NOCTURNA' ? -1 : 1) || a.id.localeCompare(b.id);
    });

    for (const g of orden) {
      const curso = e.catalogo.curso(g.cursoId)!;
      const n = sesionesDe(g);
      const causa = (regla: string, texto: string) => pendientes.push({ grupoId: g.id, regla, causa: texto });

      if (curso.sesionesSemanales > p.sesionesMaximas) {
        causa('R8', `${curso.nombre} pide ${curso.sesionesSemanales} sesiones y el máximo es ${p.sesionesMaximas}.`);
        continue;
      }
      if (g.cupoPlaneado > cupoEfectivo(p)) {
        causa('R9', `El cupo ${g.cupoPlaneado} supera el máximo efectivo de ${cupoEfectivo(p)}.`);
        continue;
      }
      const todos = habilitados(g);
      if (!todos.length) {
        causa('R5', `Ningún docente habilitado para ${curso.nombre} tiene disponibilidad en la jornada ${g.jornada.toLowerCase()}.`);
        continue;
      }
      const ocupados = g.jornada === 'DIURNA' ? docentesDiurnosDelCurso(g) : new Set<string>();
      const docs = todos.filter((d) => !ocupados.has(d.id));
      if (!docs.length) {
        causa(
          'R5',
          `Norma de dos docentes en el día: el único docente diurno habilitado para ${curso.nombre} (${todos.map((d) => d.nombre).join(', ')}) ya dicta otro grupo diurno del curso.`,
        );
        continue;
      }
      const aulas = aulasAptas(g);
      if (!aulas.length) {
        const req = curso.caracteristicasRequeridas.length ? ' con ' + curso.caracteristicasRequeridas.map((x) => nombreCaracteristica(x).toLowerCase()).join(' y ') : '';
        causa('R4', `No hay aula${req} con capacidad para ${g.cupoPlaneado} estudiantes.`);
        continue;
      }
      const conHoras = docs.filter((d) => d.horasMaxDocencia - (carga.get(d.id) ?? 0) >= n * dur);
      if (!conHoras.length) {
        causa('R7', `Los docentes habilitados (${docs.map((d) => `${d.nombre}: ${carga.get(d.id) ?? 0}/${d.horasMaxDocencia} h`).join('; ')}) no tienen horas libres para ${n * dur} h más.`);
        continue;
      }
      // menor ocupación relativa primero (equilibra la carga, B3)
      conHoras.sort((a, b) => (carga.get(a.id) ?? 0) / a.horasMaxDocencia - (carga.get(b.id) ?? 0) / b.horasMaxDocencia || a.id.localeCompare(b.id));

      let mejor: { costo: number; sesiones: Sesion[]; docente: Docente } | null = null;
      // asignación acordada con el docente: se intenta primero
      const preferido = g.docentePreferido ? conHoras.find((d) => d.id === g.docentePreferido) : undefined;
      if (preferido) {
        const r = this.mejorPatron(g, preferido, n, aulas, ocupacion, [...fijas, ...sesiones], e);
        if (r) mejor = { ...r, docente: preferido };
      }
      // si no, se evalúan los tres docentes menos cargados y se elige el mejor horario
      for (const d of mejor ? [] : conHoras.slice(0, 3)) {
        const r = this.mejorPatron(g, d, n, aulas, ocupacion, [...fijas, ...sesiones], e);
        // a igualdad de horario se prefiere al docente con menos carga relativa (B3)
        const costo = r ? r.costo + ((carga.get(d.id) ?? 0) / d.horasMaxDocencia) * 8 : Infinity;
        if (r && (!mejor || costo < mejor.costo)) mejor = { ...r, costo, docente: d };
      }
      if (!mejor) {
        for (const d of conHoras.slice(3)) {
          const r = this.mejorPatron(g, d, n, aulas, ocupacion, [...fijas, ...sesiones], e);
          if (r) {
            mejor = { ...r, docente: d };
            break;
          }
        }
      }
      if (!mejor) {
        for (const d of conHoras) {
          const r = this.sesionPorSesion(g, d, n, aulas, [...fijas, ...sesiones], e, ocupacion);
          if (r) {
            mejor = { costo: 999, sesiones: r, docente: d };
            break;
          }
        }
      }
      if (!mejor) {
        causa('R6', `No hay franja común entre la disponibilidad de ${conHoras.map((d) => d.nombre).join(', ')} y las aulas libres (${g.jornada.toLowerCase()}).`);
        continue;
      }
      mejor.sesiones.forEach((s) => ocupacion.agregar(s));
      sesiones.push(...mejor.sesiones);
      carga.set(mejor.docente.id, (carga.get(mejor.docente.id) ?? 0) + n * dur);
    }

    return { sesiones, pendientes, milisegundos: Math.round(performance.now() - t0) };
  }

  /** Busca el patrón de días + hora de menor costo en el que el docente y alguna aula estén libres. */
  private mejorPatron(g: Grupo, d: Docente, n: number, aulas: Aula[], oc: Ocupacion, ya: Sesion[], e: EntradaGeneracion) {
    const p = e.parametros;
    const dur = p.duracionSesion;
    const nivel = e.catalogo.curso(g.cursoId)!.nivel;
    const candidatos = this.candidatos(g, n, nivel, oc, e).sort((a, b) => a.costo - b.costo);
    for (const c of candidatos) {
      if (!c.franjas.every(([dia, h]) => d.disponibilidad.some((b) => b.dia === dia && b.inicio <= h && b.fin >= h + dur))) continue;
      if (c.franjas.some(([dia, h]) => oc.docenteOcupado(d.id, dia, h))) continue;
      // misma aula toda la semana si se puede; si no, la primera libre de cada día
      const comun = aulas.find((a) => c.franjas.every(([dia, h]) => !oc.aulaOcupada(a.id, dia, h)));
      const porDia = c.franjas.map(([dia, h]) => comun ?? aulas.find((a) => !oc.aulaOcupada(a.id, dia, h)));
      if (porDia.some((a) => !a)) continue;
      const nuevas: Sesion[] = c.franjas.map(([dia, h], i) => ({ id: nuevoId('ses'), grupoId: g.id, dia, inicio: h, docenteId: d.id, aulaId: porDia[i]!.id }));
      // confirmación con el validador de reglas duras (CU-11)
      const tent: Sesion[] = [];
      let ok = true;
      for (const s of nuevas) {
        if (this.validador.validar({ sesionId: null, grupoId: g.id, dia: s.dia, inicio: s.inicio, docenteId: s.docenteId, aulaId: s.aulaId }, [...ya, ...tent], p, e.catalogo).length) {
          ok = false;
          break;
        }
        tent.push(s);
      }
      if (!ok) continue;
      const costoDocente = c.franjas.reduce((t, [dia, h]) => t + oc.huecoDocente(d.id, dia, h), 0);
      return { costo: c.costo + costoDocente + (comun ? 0 : 1), sesiones: nuevas };
    }
    return null;
  }

  private candidatos(g: Grupo, n: number, nivel: number, oc: Ocupacion, e: EntradaGeneracion): Candidato[] {
    const diurna = g.jornada === 'DIURNA';
    const dur = e.parametros.duracionSesion;
    const horasLV = diurna ? [7, 9, 14, 16] : [18, 20];
    const fs = e.parametros.franjaSabado;
    const horasSab = [7, 9, 11].filter(
      (h) => h >= fs.inicio && h + dur <= fs.fin && !e.parametros.bloquesNoAsignables.some((b) => h < b.fin && b.inicio < h + dur),
    );
    const pref = (dia: number, h: number) => (dia === 5 ? (h === 11 ? 2 : 1) : diurna ? ({ 7: 0, 9: 0, 14: 1, 16: 2 } as Record<number, number>)[h] ?? 1 : 0);
    const out: Candidato[] = [];
    for (const dias of combinaciones(n)) {
      const conSab = dias.includes(5);
      const consecutivos = dias.filter((x, i) => i > 0 && x - dias[i - 1] === 1).length;
      const base = consecutivos * 6 + (conSab ? (diurna ? 12 : 3) : 0);
      // entre semana todas las sesiones a la misma hora; el sábado, en su propia franja
      const hs = dias.some((x) => x !== 5) ? horasLV : [null];
      const hsSab = conSab ? horasSab : [null];
      for (const h of hs) {
        for (const hSab of hsSab) {
          if (diurna && h !== null && hSab !== null && h !== hSab) continue; // diurna: misma hora también el sábado
          const franjas = dias.map((dia) => [dia, dia === 5 ? hSab! : h!] as [Dia, number]);
          let costo = base;
          for (const [dia, hora] of franjas) {
            costo += pref(dia, hora);
            const r = oc.efectoNivel(nivel, g.jornada, g.cursoId, dia, hora);
            // B4: cada sesión que se cruce con otro curso del semestre se evita, pero se permite como último recurso
            costo += r.huecos * 4 + r.sobrecarga * 5 + (r.cruza ? 40 : 0);
          }
          out.push({ franjas, costo });
        }
      }
    }
    // jornada nocturna: un curso de 2 sesiones puede ir en un bloque de 4 h el sábado (7–11 o 9–13)
    if (!diurna && n === 2) {
      for (const h of horasSab.slice(0, -1)) {
        const franjas: [Dia, number][] = [[5, h], [5, h + dur]];
        let costo = 9;
        for (const [dia, hora] of franjas) {
          const r = oc.efectoNivel(nivel, g.jornada, g.cursoId, dia, hora);
          costo += r.huecos * 4 + (r.cruza ? 40 : 0);
        }
        out.push({ franjas, costo });
      }
    }
    return out;
  }

  /** Último recurso: ubica sesión por sesión en cualquier día y hora libre (sin exigir patrón). */
  private sesionPorSesion(g: Grupo, d: Docente, n: number, aulas: Aula[], ya: Sesion[], e: EntradaGeneracion, oc: Ocupacion): Sesion[] | null {
    for (const evitarCruces of [true, false]) {
      const r = this.sesionPorSesionPasada(g, d, n, aulas, ya, e, oc, evitarCruces);
      if (r) return r;
    }
    return null;
  }

  private sesionPorSesionPasada(g: Grupo, d: Docente, n: number, aulas: Aula[], ya: Sesion[], e: EntradaGeneracion, oc: Ocupacion, evitarCruces: boolean): Sesion[] | null {
    const p = e.parametros;
    const nivel = e.catalogo.curso(g.cursoId)!.nivel;
    const horasLV = g.jornada === 'DIURNA' ? [7, 9, 14, 16, 18] : [18, 20, 14, 16];
    const tent: Sesion[] = [];
    for (let k = 0; k < n; k++) {
      let ubicada: Sesion | null = null;
      const usados = tent.map((s) => s.dia);
      const dias = ([0, 1, 2, 3, 4, 5] as Dia[]).filter((x) => !usados.includes(x));
      for (const dia of dias) {
        for (const h of dia === 5 ? [7, 9, 11] : horasLV) {
          if (!d.disponibilidad.some((b) => b.dia === dia && b.inicio <= h && b.fin >= h + p.duracionSesion)) continue;
          if (evitarCruces && oc.efectoNivel(nivel, g.jornada, g.cursoId, dia, h).cruza) continue;
          for (const aula of aulas) {
            if (!this.validador.validar({ sesionId: null, grupoId: g.id, dia, inicio: h, docenteId: d.id, aulaId: aula.id }, [...ya, ...tent], p, e.catalogo).length) {
              ubicada = { id: nuevoId('ses'), grupoId: g.id, dia, inicio: h, docenteId: d.id, aulaId: aula.id };
              break;
            }
          }
          if (ubicada) break;
        }
        if (ubicada) break;
      }
      if (!ubicada) return null;
      tent.push(ubicada);
    }
    return tent;
  }
}

/** Patrones de días por número de sesiones, de más a menos deseables (el costo afina el orden). */
function combinaciones(n: number): Dia[][] {
  const dias: Dia[] = [0, 1, 2, 3, 4, 5];
  const out: Dia[][] = [];
  const rec = (desde: number, acc: Dia[]) => {
    if (acc.length === n) return void out.push([...acc]);
    for (let i = desde; i < dias.length; i++) rec(i + 1, [...acc, dias[i]]);
  };
  rec(0, []);
  return out;
}

/** Índices de ocupación para descartar candidatos rápido (docente, aula y horario de cada semestre/jornada). */
class Ocupacion {
  private readonly docente = new Set<string>();
  private readonly aula = new Set<string>();
  /** clave nivel|jornada|día → horas de inicio con su curso */
  private readonly nivel = new Map<string, { inicio: number; cursoId: string }[]>();
  private readonly docenteDia = new Map<string, number[]>();

  constructor(private readonly e: EntradaGeneracion, private readonly dur: number) {}

  agregar(s: Sesion) {
    for (let h = s.inicio; h < s.inicio + this.dur; h++) {
      if (s.docenteId) this.docente.add(`${s.docenteId}|${s.dia}|${h}`);
      if (s.aulaId) this.aula.add(`${s.aulaId}|${s.dia}|${h}`);
    }
    const g = this.e.catalogo.grupo(s.grupoId);
    const c = g ? this.e.catalogo.curso(g.cursoId) : undefined;
    if (g && c) {
      const k = `${c.nivel}|${g.jornada}|${s.dia}`;
      this.nivel.set(k, [...(this.nivel.get(k) ?? []), { inicio: s.inicio, cursoId: c.id }]);
    }
    if (s.docenteId) {
      const k = `${s.docenteId}|${s.dia}`;
      this.docenteDia.set(k, [...(this.docenteDia.get(k) ?? []), s.inicio]);
    }
  }
  docenteOcupado(id: string, dia: number, h: number) {
    for (let x = h; x < h + this.dur; x++) if (this.docente.has(`${id}|${dia}|${x}`)) return true;
    return false;
  }
  aulaOcupada(id: string, dia: number, h: number) {
    for (let x = h; x < h + this.dur; x++) if (this.aula.has(`${id}|${dia}|${x}`)) return true;
    return false;
  }
  /** Efecto de agregar una sesión al horario del semestre en esa jornada: cruces, huecos y días recargados. */
  efectoNivel(nivel: number, jornada: string, cursoId: string, dia: number, h: number) {
    const l = this.nivel.get(`${nivel}|${jornada}|${dia}`) ?? [];
    const cruza = l.some((x) => x.cursoId !== cursoId && x.inicio < h + this.dur && h < x.inicio + this.dur);
    const inicios = [...l.map((x) => x.inicio), h].sort((a, b) => a - b);
    let huecos = 0;
    for (let i = 1; i < inicios.length; i++) {
      const libre = inicios[i] - (inicios[i - 1] + this.dur);
      // el almuerzo (11–14 en la grilla de 2 h) no cuenta como hueco
      if (libre > 0 && !(inicios[i - 1] + this.dur <= 12 && inicios[i] >= 13 && libre <= 3)) huecos += Math.ceil(libre / this.dur);
    }
    const sobrecarga = l.length >= 3 ? 1 : 0;
    return { cruza, huecos, sobrecarga };
  }
  huecoDocente(id: string, dia: number, h: number) {
    const l = this.docenteDia.get(`${id}|${dia}`) ?? [];
    if (!l.length) return 0.5;
    const dist = Math.min(...l.map((x) => Math.abs(x - h)));
    return dist <= this.dur ? 0 : 1;
  }
}
