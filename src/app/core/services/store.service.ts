// Store del prototipo: hace las veces del backend (servicios + persistencia) usando signals y localStorage.
// Cada operación revisa el rol en el "servidor" (RNF-06) y deja registro en la bitácora (RF-15).
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { PARAMETROS_POR_DEFECTO, estadoInicial, VERSION_ESQUEMA } from '../data/seed';
import {
  Aula, BloqueDisponible, Curso, Dia, Docente, EstadoApp, Grupo, HorarioAtencion, IncumplimientoBlando, Observacion, OfertaCurso,
  ParametrosProgramacion, PeriodoAcademico, Rol, Sesion, Usuario, VersionHorario, Violacion,
} from '../models';
import { evaluarBlandas } from '../rules/reglas-blandas';
import { Catalogo, cupoEfectivo } from '../rules/reglas-duras';
import { ValidadorReglas } from '../rules/validador';
import { GeneradorHorario, GeneradorVoraz } from '../scheduling/generador';
import { ahoraIso, hashClave, nombreDiaMin, nuevoId, rango } from '../util';
import { SessionService } from './session.service';

const CLAVE = 'ueb-horarios-estado';

export class AccionNoPermitida extends Error {}

export interface Resultado<T = void> {
  ok: boolean;
  mensaje?: string;
  errores?: string[];
  violaciones?: Violacion[];
  valor?: T;
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly sesion = inject(SessionService);
  readonly validador = new ValidadorReglas();
  /** Estrategia de generación intercambiable (RNF-04). */
  generador: GeneradorHorario = new GeneradorVoraz(this.validador);

  readonly estado = signal<EstadoApp>(this.cargar());

  constructor() {
    effect(() => {
      const e = this.estado();
      try {
        localStorage.setItem(CLAVE, JSON.stringify(e));
      } catch {}
    });
  }

  // ------------------------------------------------------------------ selectores
  readonly periodos = computed(() => [...this.estado().periodos].sort((a, b) => a.codigo.localeCompare(b.codigo)));
  readonly periodo = computed(() => this.estado().periodos.find((p) => p.id === this.estado().periodoActivoId)!);
  readonly parametros = computed(() => this.periodo().parametros);
  readonly cursos = computed(() => this.estado().cursos);
  readonly docentes = computed(() => [...this.estado().docentes].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  readonly aulas = computed(() => this.estado().aulas);
  readonly usuarios = computed(() => this.estado().usuarios);
  readonly bitacora = computed(() => [...this.estado().bitacora].reverse());
  readonly ofertasPeriodo = computed(() => this.estado().ofertas.filter((o) => o.periodoId === this.periodo().id));
  readonly gruposPeriodo = computed(() => this.estado().grupos.filter((g) => g.periodoId === this.periodo().id));
  readonly gruposAbiertos = computed(() => this.gruposPeriodo().filter((g) => g.estado === 'ABIERTO'));
  readonly versionesPeriodo = computed(() =>
    this.estado().versiones.filter((v) => v.periodoId === this.periodo().id).sort((a, b) => b.numero - a.numero),
  );
  readonly versionTrabajo = computed(() => this.versionesPeriodo().find((v) => v.estado === 'BORRADOR') ?? null);
  readonly versionPublicada = computed(() => this.versionesPeriodo().find((v) => v.estado === 'PUBLICADA') ?? null);
  readonly observaciones = computed(() => this.estado().observaciones);

  readonly catalogo = computed<Catalogo>(() => {
    const e = this.estado();
    const mc = new Map(e.cursos.map((x) => [x.id, x]));
    const mg = new Map(e.grupos.map((x) => [x.id, x]));
    const md = new Map(e.docentes.map((x) => [x.id, x]));
    const ma = new Map(e.aulas.map((x) => [x.id, x]));
    return { curso: (id) => mc.get(id), grupo: (id) => mg.get(id), docente: (id) => md.get(id), aula: (id) => ma.get(id) };
  });

  version(id: string | null | undefined) {
    return id ? this.estado().versiones.find((v) => v.id === id) ?? null : null;
  }
  parametrosDe(v: VersionHorario) {
    return this.estado().periodos.find((p) => p.id === v.periodoId)!.parametros;
  }
  violacionesDe(v: VersionHorario) {
    return this.validador.validarVersion(v, this.parametrosDe(v), this.catalogo());
  }
  blandasDe(v: VersionHorario): IncumplimientoBlando[] {
    return evaluarBlandas(v, this.parametrosDe(v), this.catalogo(), this.docentes().map((d) => d.id));
  }
  etiquetaGrupo(grupoId: string) {
    const g = this.catalogo().grupo(grupoId);
    const c = g ? this.catalogo().curso(g.cursoId) : undefined;
    return g && c ? `${c.nombre} ${g.codigo}` : '—';
  }
  sesionesRequeridas(grupoId: string) {
    const g = this.catalogo().grupo(grupoId);
    const c = g ? this.catalogo().curso(g.cursoId) : undefined;
    return c ? Math.max(this.parametros().sesionesMinimas, c.sesionesSemanales) : 0;
  }
  cargaDocente(v: VersionHorario | null, docenteId: string) {
    if (!v) return 0;
    return v.sesiones.filter((s) => s.docenteId === docenteId).length * this.parametrosDe(v).duracionSesion;
  }

  // ------------------------------------------------------------------ autenticación (CU-01)
  iniciarSesion(correo: string, clave: string): Resultado {
    const u = this.estado().usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!u || u.hashClave !== hashClave(clave)) return { ok: false, mensaje: 'Correo o contraseña incorrectos.' };
    if (!u.activo) return { ok: false, mensaje: 'El usuario está desactivado. Comuníquese con el administrador.' };
    this.sesion.iniciar({ usuarioId: u.id, nombre: u.nombre, rol: u.rol, docenteId: u.docenteId });
    this.log('Inicio de sesión', `${u.nombre} (${u.correo})`);
    return { ok: true };
  }
  cerrarSesion() {
    this.log('Cierre de sesión', this.sesion.actual()?.nombre ?? '');
    this.sesion.cerrar();
  }

  // ------------------------------------------------------------------ periodos y parámetros (CU-03)
  seleccionarPeriodo(id: string) {
    this.estado.update((e) => ({ ...e, periodoActivoId: id }));
  }

  crearPeriodo(anio: number, semestre: 1 | 2, copiarOferta: boolean): Resultado<PeriodoAcademico> {
    this.exigir('COORDINADOR', 'ADMINISTRADOR');
    const codigo = `${anio}-${semestre}`;
    if (this.estado().periodos.some((p) => p.codigo === codigo)) return { ok: false, mensaje: `El periodo ${codigo} ya existe.` };
    const base = this.periodo();
    const nuevo: PeriodoAcademico = {
      id: `per-${anio}-${semestre}`,
      codigo,
      anio,
      semestre,
      estado: 'ABIERTO',
      parametros: structuredClone(base?.parametros ?? PARAMETROS_POR_DEFECTO),
    };
    this.estado.update((e) => {
      let ofertas = e.ofertas;
      let grupos = e.grupos;
      if (copiarOferta) {
        ofertas = [...ofertas, ...e.ofertas.filter((o) => o.periodoId === base.id).map((o) => ({ ...o, periodoId: nuevo.id }))];
        grupos = [
          ...grupos,
          ...e.grupos
            .filter((g) => g.periodoId === base.id && g.estado === 'ABIERTO')
            .map((g) => ({ ...g, id: g.id.replace(base.id.replace('per-', ''), nuevo.id.replace('per-', '')), periodoId: nuevo.id, inscritos: null })),
        ];
      }
      return { ...e, periodos: [...e.periodos, nuevo], ofertas, grupos, periodoActivoId: nuevo.id };
    });
    this.log('Creación de periodo', `${codigo}${copiarOferta ? ` (oferta copiada de ${base.codigo})` : ''}`);
    return { ok: true, valor: nuevo };
  }

  actualizarParametros(periodoId: string, p: ParametrosProgramacion): Resultado {
    this.exigir('COORDINADOR', 'ADMINISTRADOR');
    const errores = validarParametros(p);
    if (errores.length) return { ok: false, mensaje: 'Revise los parámetros.', errores };
    const per = this.estado().periodos.find((x) => x.id === periodoId)!;
    this.estado.update((e) => ({ ...e, periodos: e.periodos.map((x) => (x.id === periodoId ? { ...x, parametros: structuredClone(p) } : x)) }));
    this.log('Modificación de parámetros', `Periodo ${per.codigo}`);
    return { ok: true };
  }

  // ------------------------------------------------------------------ catálogo (CU-04, CU-06)
  guardarDocente(d: Docente): Resultado {
    this.exigir('COORDINADOR');
    const err: string[] = [];
    if (!d.identificador.trim()) err.push('El identificador es obligatorio.');
    if (!d.nombre.trim()) err.push('El nombre es obligatorio.');
    if (!d.tipoVinculacion) err.push('Seleccione el tipo de vinculación.');
    if (!(d.horasMaxDocencia >= 0)) err.push('Las horas máximas no pueden ser negativas.');
    if (this.estado().docentes.some((x) => x.identificador === d.identificador && x.id !== d.id)) err.push('Ya existe un docente con ese identificador.');
    if (err.length) return { ok: false, mensaje: 'No se pudo guardar el docente.', errores: err };
    const existe = this.estado().docentes.some((x) => x.id === d.id);
    this.estado.update((e) => ({ ...e, docentes: existe ? e.docentes.map((x) => (x.id === d.id ? d : x)) : [...e.docentes, d] }));
    this.log(existe ? 'Modificación de docente' : 'Creación de docente', d.nombre);
    return { ok: true };
  }

  actualizarDisponibilidad(docenteId: string, bloques: BloqueDisponible[]): Resultado {
    const s = this.sesion.actual();
    const propio = s?.rol === 'DOCENTE' && s.docenteId === docenteId;
    if (!propio) this.exigir('COORDINADOR');
    const d = this.estado().docentes.find((x) => x.id === docenteId)!;
    this.estado.update((e) => ({ ...e, docentes: e.docentes.map((x) => (x.id === docenteId ? { ...x, disponibilidad: bloques } : x)) }));
    this.log('Registro de disponibilidad', `${d.nombre} (${bloques.length} bloques)`);
    return { ok: true };
  }

  guardarCurso(c: Curso, demanda: number | null): Resultado {
    this.exigir('COORDINADOR');
    const err: string[] = [];
    if (!c.codigo.trim() || !c.nombre.trim()) err.push('Código y nombre son obligatorios.');
    if (c.nivel < 1 || c.nivel > 10) err.push('El nivel debe estar entre 1 y 10.');
    const p = this.parametros();
    if (c.sesionesSemanales < p.sesionesMinimas || c.sesionesSemanales > p.sesionesMaximas)
      err.push(`Las sesiones semanales deben estar entre ${p.sesionesMinimas} y ${p.sesionesMaximas}.`);
    if (this.estado().cursos.some((x) => x.codigo === c.codigo && x.id !== c.id)) err.push('Ya existe un curso con ese código.');
    if (err.length) return { ok: false, mensaje: 'No se pudo guardar el curso.', errores: err };
    const existe = this.estado().cursos.some((x) => x.id === c.id);
    const pid = this.periodo().id;
    this.estado.update((e) => {
      let ofertas = e.ofertas;
      if (demanda !== null) {
        const o = ofertas.find((x) => x.cursoId === c.id && x.periodoId === pid);
        ofertas = o ? ofertas.map((x) => (x === o ? { ...x, demandaEstimada: demanda } : x)) : [...ofertas, { periodoId: pid, cursoId: c.id, demandaEstimada: demanda }];
      }
      return { ...e, cursos: existe ? e.cursos.map((x) => (x.id === c.id ? c : x)) : [...e.cursos, c], ofertas };
    });
    this.log(existe ? 'Modificación de curso' : 'Creación de curso', `${c.codigo} ${c.nombre}`);
    return { ok: true };
  }

  guardarAula(a: Aula): Resultado {
    this.exigir('COORDINADOR');
    const err: string[] = [];
    if (!a.codigo.trim()) err.push('El código es obligatorio.');
    if (!(a.capacidad > 0)) err.push('La capacidad debe ser mayor que 0.');
    if (this.estado().aulas.some((x) => x.codigo === a.codigo && x.id !== a.id)) err.push('Ya existe un aula con ese código.');
    if (err.length) return { ok: false, mensaje: 'No se pudo guardar el aula.', errores: err };
    const existe = this.estado().aulas.some((x) => x.id === a.id);
    this.estado.update((e) => ({ ...e, aulas: existe ? e.aulas.map((x) => (x.id === a.id ? a : x)) : [...e.aulas, a] }));
    this.log(existe ? 'Modificación de aula' : 'Creación de aula', `${a.codigo} (${a.capacidad})`);
    return { ok: true };
  }

  // ------------------------------------------------------------------ grupos y demanda (CU-08, CU-09)
  sugerenciaGrupos(cursoId: string) {
    const o = this.ofertasPeriodo().find((x) => x.cursoId === cursoId);
    const p = this.parametros();
    const demanda = o?.demandaEstimada ?? 0;
    return { demanda, sugeridos: demanda > 0 ? Math.ceil(demanda / p.cupoMaximo) : 0, minimo: demanda > 0 ? Math.ceil(demanda / cupoEfectivo(p)) : 0 };
  }

  actualizarDemanda(cursoId: string, demanda: number): Resultado {
    this.exigir('COORDINADOR');
    if (!(demanda >= 0)) return { ok: false, mensaje: 'La demanda no puede ser negativa.' };
    const pid = this.periodo().id;
    this.estado.update((e) => {
      const o = e.ofertas.find((x) => x.cursoId === cursoId && x.periodoId === pid);
      const ofertas: OfertaCurso[] = o
        ? e.ofertas.map((x) => (x === o ? { ...x, demandaEstimada: demanda } : x))
        : [...e.ofertas, { periodoId: pid, cursoId, demandaEstimada: demanda }];
      return { ...e, ofertas };
    });
    this.log('Registro de demanda', `${this.catalogo().curso(cursoId)?.nombre}: ${demanda}`);
    return { ok: true };
  }

  /** Ajusta el número de grupos de un curso al número indicado, validando el cupo efectivo (RF-18). */
  aplicarNumeroGrupos(cursoId: string, n: number): Resultado {
    this.exigir('COORDINADOR');
    const { demanda } = this.sugerenciaGrupos(cursoId);
    const p = this.parametros();
    const tope = cupoEfectivo(p);
    if (n < 1) return { ok: false, mensaje: 'Debe abrirse al menos un grupo.' };
    if (demanda / n > tope) {
      return {
        ok: false,
        mensaje: `Con ${n} grupo(s) cada uno tendría ${(demanda / n).toFixed(1)} estudiantes y el cupo efectivo es ${tope} (R9).`,
      };
    }
    const curso = this.catalogo().curso(cursoId)!;
    const pid = this.periodo().id;
    const actuales = this.gruposPeriodo().filter((g) => g.cursoId === cursoId && g.estado === 'ABIERTO');
    const cupo = Math.min(tope, Math.ceil(demanda / n));
    const nuevos: Grupo[] = [];
    for (let i = actuales.length; i < n; i++) {
      nuevos.push({
        id: nuevoId('grp'),
        periodoId: pid,
        cursoId,
        codigo: `G${i + 1}`,
        // norma: los dos primeros grupos son diurnos; los siguientes, nocturnos
        jornada: i < 2 ? 'DIURNA' : 'NOCTURNA',
        cupoPlaneado: cupo,
        inscritos: null,
        estado: 'ABIERTO',
      });
    }
    const sobran = actuales.slice(n).map((g) => g.id);
    this.estado.update((e) => ({
      ...e,
      grupos: [...e.grupos.filter((g) => !sobran.includes(g.id)).map((g) => (g.cursoId === cursoId && g.periodoId === pid && g.estado === 'ABIERTO' ? { ...g, cupoPlaneado: cupo } : g)), ...nuevos],
      versiones: e.versiones.map((v) => (v.estado === 'BORRADOR' ? { ...v, sesiones: v.sesiones.filter((s) => !sobran.includes(s.grupoId)), pendientes: v.pendientes.filter((x) => !sobran.includes(x.grupoId)) } : v)),
    }));
    this.log('Ajuste de número de grupos', `${curso.nombre}: ${n} grupo(s) de ${cupo}`);
    return { ok: true, mensaje: `${curso.nombre}: ${n} grupo(s) con cupo ${cupo}.` };
  }

  guardarGrupo(g: Grupo): Resultado {
    this.exigir('COORDINADOR');
    const tope = cupoEfectivo(this.parametros());
    if (!(g.cupoPlaneado > 0)) return { ok: false, mensaje: 'El cupo debe ser mayor que 0.' };
    if (g.cupoPlaneado > tope) return { ok: false, mensaje: `R9 · El cupo ${g.cupoPlaneado} supera el máximo efectivo de ${tope} (${this.parametros().cupoMaximo} + ${this.parametros().toleranciaCupo} %).` };
    const existe = this.estado().grupos.some((x) => x.id === g.id);
    this.estado.update((e) => ({ ...e, grupos: existe ? e.grupos.map((x) => (x.id === g.id ? g : x)) : [...e.grupos, g] }));
    this.log(existe ? 'Modificación de grupo' : 'Creación de grupo', `${this.catalogo().curso(g.cursoId)?.nombre} ${g.codigo} · cupo ${g.cupoPlaneado}`);
    return { ok: true };
  }

  // ------------------------------------------------------------------ importación CSV (CU-07)
  aplicarImportacion(cambios: Partial<Pick<EstadoApp, 'docentes' | 'cursos' | 'aulas' | 'ofertas'>>, resumen: string) {
    this.exigir('COORDINADOR');
    this.estado.update((e) => ({ ...e, ...cambios }));
    this.log('Importación CSV', resumen);
  }

  // ------------------------------------------------------------------ generación y tablero (CU-10, CU-11, CU-12)
  generarPropuesta(): Resultado<VersionHorario> {
    this.exigir('COORDINADOR');
    const per = this.periodo();
    if (per.estado === 'CERRADO') return { ok: false, mensaje: `El periodo ${per.codigo} está cerrado.` };
    const r = this.generador.generar({
      grupos: this.gruposAbiertos(),
      docentes: this.estado().docentes,
      aulas: this.estado().aulas,
      parametros: per.parametros,
      catalogo: this.catalogo(),
      bloqueosDocente: this.bloqueosAtencion(per.id),
    });
    const v: VersionHorario = {
      id: nuevoId('ver'),
      periodoId: per.id,
      numero: this.siguienteNumero(per.id),
      estado: 'BORRADOR',
      origen: `Generada automáticamente (${this.generador.nombre}, ${r.milisegundos} ms)`,
      fechaCreacion: ahoraIso(),
      fechaPublicacion: null,
      autor: this.sesion.actual()?.nombre ?? 'Sistema',
      sesiones: r.sesiones,
      pendientes: r.pendientes,
    };
    // solo una versión de trabajo por periodo: los borradores anteriores se archivan
    this.estado.update((e) => ({
      ...e,
      versiones: [...e.versiones.map((x) => (x.periodoId === per.id && x.estado === 'BORRADOR' ? { ...x, estado: 'ARCHIVADA' as const } : x)), v],
    }));
    this.log('Generación de propuesta', `Versión ${v.numero} de ${per.codigo}: ${r.sesiones.length} sesiones, ${r.pendientes.length} grupo(s) pendiente(s), ${r.milisegundos} ms`);
    return { ok: true, valor: v };
  }

  /** Mueve o reasigna una sesión: valida R1–R9 y, si pasa, guarda el cambio (RF-10). */
  moverSesion(versionId: string, sesionId: string, cambios: { dia?: Dia; inicio?: number; docenteId?: string | null; aulaId?: string | null }): Resultado {
    this.exigir('COORDINADOR');
    const v = this.version(versionId);
    if (!v || v.estado !== 'BORRADOR') return { ok: false, mensaje: 'Solo se puede ajustar la versión de trabajo (borrador).' };
    const s = v.sesiones.find((x) => x.id === sesionId)!;
    const nueva: Sesion = { ...s, ...cambios };
    const viol = this.validador.validar(
      { sesionId: s.id, grupoId: s.grupoId, dia: nueva.dia, inicio: nueva.inicio, docenteId: nueva.docenteId, aulaId: nueva.aulaId },
      v.sesiones,
      this.parametrosDe(v),
      this.catalogo(),
    );
    if (viol.length) return { ok: false, mensaje: 'Movimiento rechazado', violaciones: viol };
    this.reemplazarVersion({ ...v, sesiones: v.sesiones.map((x) => (x.id === s.id ? nueva : x)) });
    const dur = this.parametrosDe(v).duracionSesion;
    this.log('Ajuste de sesión', `${this.etiquetaGrupo(s.grupoId)}: ${nombreDiaMin(s.dia)} ${rango(s.inicio, s.inicio + dur)} → ${nombreDiaMin(nueva.dia)} ${rango(nueva.inicio, nueva.inicio + dur)}${cambios.aulaId !== undefined && cambios.aulaId !== s.aulaId ? `, aula ${this.catalogo().aula(nueva.aulaId!)?.codigo}` : ''}${cambios.docenteId !== undefined && cambios.docenteId !== s.docenteId ? `, docente ${this.catalogo().docente(nueva.docenteId!)?.nombre}` : ''} (v${v.numero})`);
    return { ok: true };
  }

  /** Ubica una sesión de un grupo pendiente en el día y hora indicados, eligiendo docente y aula válidos. */
  ubicarSesionPendiente(versionId: string, grupoId: string, dia: Dia, inicio: number): Resultado {
    this.exigir('COORDINADOR');
    const v = this.version(versionId);
    if (!v || v.estado !== 'BORRADOR') return { ok: false, mensaje: 'Solo se puede ajustar la versión de trabajo (borrador).' };
    const g = this.catalogo().grupo(grupoId)!;
    const p = this.parametrosDe(v);
    const previas = v.sesiones.filter((s) => s.grupoId === grupoId);
    // norma del Programa (blanda, B6): en el día se prefieren docentes distintos para los grupos del mismo curso
    const otrosDiurnos = new Set(
      g.jornada === 'DIURNA'
        ? v.sesiones.filter((s) => s.grupoId !== grupoId && this.catalogo().grupo(s.grupoId)?.cursoId === g.cursoId && this.catalogo().grupo(s.grupoId)?.jornada === 'DIURNA').map((s) => s.docenteId)
        : [],
    );
    const docentesCand = previas[0]?.docenteId
      ? [this.catalogo().docente(previas[0].docenteId)!]
      : this.estado()
          .docentes.filter((d) => d.habilitaciones.includes(g.cursoId))
          .sort((a, b) => Number(otrosDiurnos.has(a.id)) - Number(otrosDiurnos.has(b.id)));
    const aulasCand = [...this.estado().aulas].sort((a, b) => a.capacidad - b.capacidad);
    let mejor: Violacion[] | null = null;
    if (!docentesCand.length) docentesCand.push(null as any);
    for (const d of docentesCand) {
      for (const a of aulasCand) {
        const viol = this.validador.validar({ sesionId: null, grupoId, dia, inicio, docenteId: d?.id ?? null, aulaId: a.id }, v.sesiones, p, this.catalogo());
        if (!viol.length) {
          const s: Sesion = { id: nuevoId('ses'), grupoId, dia, inicio, docenteId: d!.id, aulaId: a.id };
          const total = previas.length + 1;
          const requeridas = this.sesionesRequeridas(grupoId);
          const pendientes = total >= requeridas ? v.pendientes.filter((x) => x.grupoId !== grupoId) : v.pendientes;
          this.reemplazarVersion({ ...v, sesiones: [...v.sesiones, s], pendientes });
          this.log('Ubicación manual de sesión', `${this.etiquetaGrupo(grupoId)} (${total}/${requeridas}): ${nombreDiaMin(dia)} ${rango(inicio, inicio + p.duracionSesion)}, ${a.codigo}, ${d!.nombre} (v${v.numero})`);
          return { ok: true, mensaje: `Sesión ${total} de ${requeridas} ubicada en ${a.codigo} con ${d!.nombre}.` };
        }
        if (!mejor || viol.length < mejor.length) mejor = viol;
      }
    }
    return { ok: false, mensaje: 'No hay docente y aula válidos para esa franja', violaciones: mejor ?? [] };
  }

  /** Reintenta ubicar automáticamente un grupo pendiente (por ejemplo, tras corregir su causa). */
  reintentarPendiente(versionId: string, grupoId: string): Resultado {
    this.exigir('COORDINADOR');
    const v = this.version(versionId);
    if (!v || v.estado !== 'BORRADOR') return { ok: false, mensaje: 'Solo se puede ajustar la versión de trabajo (borrador).' };
    const g = this.catalogo().grupo(grupoId)!;
    // el generador trabaja sobre las sesiones ya ubicadas como fijas
    const otros = v.sesiones.filter((s) => s.grupoId !== grupoId);
    const r = this.generador.generar({
      grupos: [g],
      docentes: this.estado().docentes,
      aulas: this.estado().aulas,
      parametros: this.parametrosDe(v),
      catalogo: this.catalogo(),
      sesionesFijas: otros,
      bloqueosDocente: this.bloqueosAtencion(v.periodoId),
    });
    const nuevas = r.sesiones;
    const okTodas = nuevas.length > 0;
    if (r.pendientes.length || !okTodas) {
      const causa = r.pendientes[0] ?? { grupoId, regla: 'R1', causa: 'Las franjas libres chocan con otras sesiones de la versión.' };
      this.reemplazarVersion({ ...v, pendientes: v.pendientes.map((x) => (x.grupoId === grupoId ? { ...x, causa: causa.causa, regla: causa.regla } : x)) });
      return { ok: false, mensaje: 'El grupo sigue pendiente', errores: [`${causa.regla} · ${causa.causa}`] };
    }
    this.reemplazarVersion({ ...v, sesiones: [...otros, ...nuevas], pendientes: v.pendientes.filter((x) => x.grupoId !== grupoId) });
    this.log('Ubicación automática de pendiente', `${this.etiquetaGrupo(grupoId)}: ${nuevas.length} sesión(es) (v${v.numero})`);
    return { ok: true, mensaje: `${this.etiquetaGrupo(grupoId)} quedó ubicado con ${nuevas.length} sesión(es).` };
  }

  // ------------------------------------------------------------------ horario de atención (cambio de la validación)
  /** Horarios de atención del periodo activo. */
  readonly horariosAtencion = computed(() => (this.estado().horariosAtencion ?? []).filter((h) => h.periodoId === this.periodo().id));

  atencionDe(docenteId: string, cursoId: string, periodoId = this.periodo().id) {
    return (this.estado().horariosAtencion ?? []).find((h) => h.periodoId === periodoId && h.docenteId === docenteId && h.cursoId === cursoId) ?? null;
  }

  /** Bloques de atención con hora fija: el generador no programa clases del docente encima. */
  private bloqueosAtencion(periodoId: string) {
    return (this.estado().horariosAtencion ?? [])
      .filter((h) => h.periodoId === periodoId && h.modo === 'HORARIO' && h.dia !== null && h.inicio !== null && h.fin !== null)
      .map((h) => ({ docenteId: h.docenteId, dia: h.dia!, inicio: h.inicio!, fin: h.fin! }));
  }

  /**
   * Materias que dicta el docente en el periodo: las de sus sesiones en la versión vigente (borrador o publicada)
   * y las de los grupos donde es docente preferente (asignación acordada antes de generar).
   */
  cursosDictados(docenteId: string, periodoId = this.periodo().id): Curso[] {
    const v = this.estado().versiones.filter((x) => x.periodoId === periodoId);
    const vigente = v.find((x) => x.estado === 'BORRADOR') ?? v.find((x) => x.estado === 'PUBLICADA');
    const ids = new Set<string>();
    for (const s of vigente?.sesiones ?? []) if (s.docenteId === docenteId) ids.add(this.catalogo().grupo(s.grupoId)?.cursoId ?? '');
    for (const g of this.estado().grupos) if (g.periodoId === periodoId && g.estado === 'ABIERTO' && g.docentePreferido === docenteId) ids.add(g.cursoId);
    ids.delete('');
    return [...ids].map((id) => this.catalogo().curso(id)!).filter(Boolean).sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre));
  }

  /** Clases del docente que se cruzan con un bloque (en la versión vigente del periodo). */
  private cruceConClases(docenteId: string, dia: Dia, inicio: number, fin: number, periodoId: string) {
    const v = this.estado().versiones.filter((x) => x.periodoId === periodoId);
    const vigente = v.find((x) => x.estado === 'BORRADOR') ?? v.find((x) => x.estado === 'PUBLICADA');
    if (!vigente) return null;
    const dur = this.parametrosDe(vigente).duracionSesion;
    return vigente.sesiones.find((s) => s.docenteId === docenteId && s.dia === dia && s.inicio < fin && inicio < s.inicio + dur) ?? null;
  }

  /** Reglas del horario de atención: 1 o 2 horas, dentro de la franja, fuera del almuerzo y de sus clases. */
  validarAtencion(h: HorarioAtencion): string[] {
    if (h.modo === 'ACORDAR') return [];
    const err: string[] = [];
    const p = this.estado().periodos.find((x) => x.id === h.periodoId)!.parametros;
    if (h.dia === null || h.inicio === null || h.fin === null) return ['Elija día, hora de inicio y duración.'];
    const dur = h.fin - h.inicio;
    if (dur < 1 || dur > 2) err.push('El horario de atención es de 1 o 2 horas a la semana.');
    const franja = h.dia === 5 ? p.franjaSabado : p.franjaLunesViernes;
    if (h.inicio < franja.inicio || h.fin > franja.fin) err.push(`Debe quedar dentro de la franja hábil (${rango(franja.inicio, franja.fin)}).`);
    const b = p.bloquesNoAsignables.find((x) => x.inicio < h.fin! && h.inicio! < x.fin);
    if (b) err.push(`Cruza el bloque de almuerzo ${rango(b.inicio, b.fin)}.`);
    const d = this.catalogo().docente(h.docenteId);
    if (d && !d.disponibilidad.some((x) => x.dia === h.dia && x.inicio <= h.inicio! && x.fin >= h.fin!)) err.push(`${d.nombre} no está disponible el ${nombreDiaMin(h.dia)} ${rango(h.inicio, h.fin)}.`);
    const clase = this.cruceConClases(h.docenteId, h.dia, h.inicio, h.fin, h.periodoId);
    if (clase) err.push(`Se cruza con su clase de ${this.etiquetaGrupo(clase.grupoId)} (${nombreDiaMin(clase.dia)} ${rango(clase.inicio, clase.inicio + p.duracionSesion)}).`);
    const otra = (this.estado().horariosAtencion ?? []).find(
      (x) => x.id !== h.id && x.periodoId === h.periodoId && x.docenteId === h.docenteId && x.modo === 'HORARIO' && x.dia === h.dia && x.inicio! < h.fin! && h.inicio! < x.fin!,
    );
    if (otra) err.push(`Se cruza con su horario de atención de ${this.catalogo().curso(otra.cursoId)?.nombre}.`);
    return err;
  }

  /** Aviso cuando una clase (generada o movida después) quedó encima del horario de atención. */
  avisoAtencion(h: HorarioAtencion): string | null {
    if (h.modo !== 'HORARIO' || h.dia === null || h.inicio === null || h.fin === null) return null;
    const clase = this.cruceConClases(h.docenteId, h.dia, h.inicio, h.fin, h.periodoId);
    return clase ? `Ahora se cruza con ${this.etiquetaGrupo(clase.grupoId)}; ajuste el horario de atención.` : null;
  }

  guardarAtencion(h: HorarioAtencion): Resultado {
    const s = this.sesion.actual();
    const propio = s?.rol === 'DOCENTE' && s.docenteId === h.docenteId;
    if (!propio) this.exigir('COORDINADOR');
    const err = this.validarAtencion(h);
    if (err.length) return { ok: false, mensaje: 'No se puede guardar el horario de atención', errores: err };
    const limpio: HorarioAtencion = h.modo === 'ACORDAR' ? { ...h, dia: null, inicio: null, fin: null } : h;
    this.estado.update((e) => ({
      ...e,
      horariosAtencion: [...(e.horariosAtencion ?? []).filter((x) => !(x.periodoId === h.periodoId && x.docenteId === h.docenteId && x.cursoId === h.cursoId)), limpio],
    }));
    this.log('Horario de atención', `${this.catalogo().docente(h.docenteId)?.nombre} · ${this.catalogo().curso(h.cursoId)?.nombre}: ${this.textoAtencion(limpio)}`);
    return { ok: true };
  }

  eliminarAtencion(h: HorarioAtencion): Resultado {
    const s = this.sesion.actual();
    const propio = s?.rol === 'DOCENTE' && s.docenteId === h.docenteId;
    if (!propio) this.exigir('COORDINADOR');
    this.estado.update((e) => ({ ...e, horariosAtencion: (e.horariosAtencion ?? []).filter((x) => x.id !== h.id) }));
    this.log('Horario de atención', `${this.catalogo().docente(h.docenteId)?.nombre} · ${this.catalogo().curso(h.cursoId)?.nombre}: sin definir`);
    return { ok: true };
  }

  textoAtencion(h: HorarioAtencion | null): string {
    if (!h) return 'Sin definir';
    if (h.modo === 'ACORDAR') return `Acordar con el docente${h.lugar ? ' · ' + h.lugar : ''}`;
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${dias[h.dia!]} ${rango(h.inicio!, h.fin!)}${h.lugar ? ' · ' + h.lugar : ''}`;
  }

  // ------------------------------------------------------------------ versiones (CU-14, CU-15)
  publicarVersion(versionId: string): Resultado {
    this.exigir('COORDINADOR');
    const v = this.version(versionId)!;
    const causas: string[] = [];
    if (v.estado !== 'BORRADOR') causas.push('Solo se puede publicar la versión de trabajo (borrador).');
    v.pendientes.forEach((x) => causas.push(`Pendiente · ${this.etiquetaGrupo(x.grupoId)}: ${x.causa}`));
    this.violacionesDe(v).forEach((x) => x.violaciones.forEach((w) => causas.push(`${w.regla} · ${this.etiquetaGrupo(x.sesion.grupoId)}: ${w.mensaje}`)));
    const abiertos = this.estado().grupos.filter((g) => g.periodoId === v.periodoId && g.estado === 'ABIERTO');
    abiertos.forEach((g) => {
      const n = v.sesiones.filter((s) => s.grupoId === g.id).length;
      const req = this.sesionesRequeridas(g.id);
      if (n < req && !v.pendientes.some((x) => x.grupoId === g.id)) causas.push(`Incompleto · ${this.etiquetaGrupo(g.id)}: ${n} de ${req} sesiones.`);
    });
    if (causas.length) {
      this.log('Publicación bloqueada', `Versión ${v.numero}: ${causas.length} causa(s)`);
      return { ok: false, mensaje: `No se puede publicar la versión ${v.numero}`, errores: causas };
    }
    this.estado.update((e) => ({
      ...e,
      versiones: e.versiones.map((x) =>
        x.id === v.id
          ? { ...x, estado: 'PUBLICADA' as const, fechaPublicacion: ahoraIso() }
          : x.periodoId === v.periodoId && x.estado === 'PUBLICADA'
            ? { ...x, estado: 'ARCHIVADA' as const }
            : x,
      ),
    }));
    this.log('Publicación de horario', `Versión ${v.numero} publicada como oficial`);
    return { ok: true };
  }

  restaurarVersion(versionId: string): Resultado<VersionHorario> {
    this.exigir('COORDINADOR');
    const v = this.version(versionId)!;
    const copia: VersionHorario = {
      ...structuredClone(v),
      id: nuevoId('ver'),
      numero: this.siguienteNumero(v.periodoId),
      estado: 'BORRADOR',
      origen: `Restaurada desde la versión ${v.numero}`,
      fechaCreacion: ahoraIso(),
      fechaPublicacion: null,
      autor: this.sesion.actual()?.nombre ?? 'Sistema',
      sesiones: v.sesiones.map((s) => ({ ...s, id: nuevoId('ses') })),
    };
    // los grupos cerrados después no vuelven
    const cerrados = new Set(this.estado().grupos.filter((g) => g.estado === 'CERRADO').map((g) => g.id));
    copia.sesiones = copia.sesiones.filter((s) => !cerrados.has(s.grupoId));
    copia.pendientes = copia.pendientes.filter((p) => !cerrados.has(p.grupoId));
    this.estado.update((e) => ({
      ...e,
      versiones: [...e.versiones.map((x) => (x.periodoId === v.periodoId && x.estado === 'BORRADOR' ? { ...x, estado: 'ARCHIVADA' as const } : x)), copia],
    }));
    this.log('Restauración de versión', `Versión ${v.numero} → nueva versión de trabajo ${copia.numero}`);
    return { ok: true, valor: copia };
  }

  // ------------------------------------------------------------------ comité (CU-20)
  registrarObservacion(versionId: string, concepto: Observacion['concepto'], texto: string): Resultado {
    this.exigir('COMITE');
    if (!texto.trim()) return { ok: false, mensaje: 'Escriba la observación.' };
    const s = this.sesion.actual()!;
    const v = this.version(versionId)!;
    const o: Observacion = { id: nuevoId('obs'), versionId, usuarioId: s.usuarioId, autor: s.nombre, concepto, texto: texto.trim(), fecha: ahoraIso() };
    this.estado.update((e) => ({ ...e, observaciones: [...e.observaciones, o] }));
    this.log('Observación del comité', `Versión ${v.numero}: ${concepto === 'FAVORABLE' ? 'concepto favorable' : 'requiere ajustes'}`);
    return { ok: true };
  }

  // ------------------------------------------------------------------ inscritos y cierre (CU-17)
  registrarInscritos(grupoId: string, n: number | null): Resultado {
    this.exigir('COORDINADOR');
    if (n !== null && !(n >= 0)) return { ok: false, mensaje: 'El número de inscritos no puede ser negativo.' };
    this.estado.update((e) => ({ ...e, grupos: e.grupos.map((g) => (g.id === grupoId ? { ...g, inscritos: n } : g)) }));
    this.log('Registro de inscritos', `${this.etiquetaGrupo(grupoId)}: ${n ?? '—'}`);
    return { ok: true };
  }

  simularInscritos(): Resultado {
    this.exigir('COORDINADOR');
    let semilla = 17;
    const rnd = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
    this.estado.update((e) => ({
      ...e,
      grupos: e.grupos.map((g) => {
        if (g.periodoId !== this.periodo().id || g.estado !== 'ABIERTO') return g;
        const r = rnd();
        const n = r < 0.12 ? 3 + Math.floor(rnd() * 6) : Math.round(g.cupoPlaneado * (0.55 + rnd() * 0.45));
        return { ...g, inscritos: n };
      }),
    }));
    this.log('Registro de inscritos', `Carga simulada para ${this.periodo().codigo}`);
    return { ok: true };
  }

  cerrarGrupo(grupoId: string): Resultado {
    this.exigir('COORDINADOR');
    const g = this.catalogo().grupo(grupoId)!;
    const min = this.parametros().cupoMinimo;
    if (g.inscritos === null || g.inscritos >= min) return { ok: false, mensaje: `Solo se cierran grupos con inscritos registrados por debajo del mínimo (${min}).` };
    const liberadas = this.estado().versiones.filter((v) => v.periodoId === g.periodoId && v.estado !== 'ARCHIVADA').reduce((t, v) => t + v.sesiones.filter((s) => s.grupoId === grupoId).length, 0);
    this.estado.update((e) => ({
      ...e,
      grupos: e.grupos.map((x) => (x.id === grupoId ? { ...x, estado: 'CERRADO' as const } : x)),
      versiones: e.versiones.map((v) =>
        v.periodoId === g.periodoId && v.estado !== 'ARCHIVADA'
          ? { ...v, sesiones: v.sesiones.filter((s) => s.grupoId !== grupoId), pendientes: v.pendientes.filter((p) => p.grupoId !== grupoId) }
          : v,
      ),
    }));
    this.log('Cierre de grupo', `${this.etiquetaGrupo(grupoId)} con ${g.inscritos} inscritos; ${liberadas} sesión(es) liberadas (docente y aula)`);
    return { ok: true, mensaje: `${this.etiquetaGrupo(grupoId)} cerrado. Se liberaron ${liberadas} sesión(es).` };
  }

  // ------------------------------------------------------------------ usuarios (CU-02)
  guardarUsuario(u: Usuario, claveNueva?: string): Resultado {
    this.exigir('ADMINISTRADOR');
    const err: string[] = [];
    if (!u.nombre.trim()) err.push('El nombre es obligatorio.');
    if (!/^\S+@\S+\.\S+$/.test(u.correo)) err.push('El correo no es válido.');
    if (this.estado().usuarios.some((x) => x.correo.toLowerCase() === u.correo.toLowerCase() && x.id !== u.id)) err.push('Ya existe un usuario con ese correo.');
    const existe = this.estado().usuarios.find((x) => x.id === u.id);
    if (!existe && !claveNueva) err.push('Asigne una contraseña inicial.');
    if (err.length) return { ok: false, mensaje: 'No se pudo guardar el usuario.', errores: err };
    const final: Usuario = { ...u, hashClave: claveNueva ? hashClave(claveNueva) : existe!.hashClave };
    this.estado.update((e) => ({ ...e, usuarios: existe ? e.usuarios.map((x) => (x.id === u.id ? final : x)) : [...e.usuarios, final] }));
    const detalle: string[] = [];
    if (!existe) detalle.push(`rol ${u.rol}`);
    else {
      if (existe.rol !== u.rol) detalle.push(`rol ${existe.rol} → ${u.rol}`);
      if (existe.activo !== u.activo) detalle.push(u.activo ? 'activado' : 'desactivado');
    }
    this.log(existe ? 'Modificación de usuario' : 'Creación de usuario', `${u.nombre}${detalle.length ? ` (${detalle.join(', ')})` : ''}`);
    return { ok: true };
  }

  // ------------------------------------------------------------------ demo
  restablecerDemo() {
    this.estado.set(this.construirInicial());
    this.sesion.cerrar();
  }

  // ------------------------------------------------------------------ internos
  private exigir(...roles: Rol[]) {
    if (!this.sesion.tieneRol(...roles)) {
      const s = this.sesion.actual();
      this.log('Acción rechazada por permisos', `Rol ${s?.rol ?? 'sin sesión'} intentó una operación de ${roles.join('/')}`);
      throw new AccionNoPermitida(`Acción no permitida para el rol ${s?.rol ?? 'sin sesión'}.`);
    }
  }

  private log(accion: string, detalle: string) {
    const s = this.sesion.actual();
    this.estado.update((e) => ({
      ...e,
      bitacora: [...e.bitacora.slice(-999), { id: nuevoId('log'), fecha: ahoraIso(), usuario: s?.nombre ?? 'Sistema', rol: s?.rol ?? 'SISTEMA', accion, detalle }],
    }));
  }

  private reemplazarVersion(v: VersionHorario) {
    this.estado.update((e) => ({ ...e, versiones: e.versiones.map((x) => (x.id === v.id ? v : x)) }));
  }

  private siguienteNumero(periodoId: string) {
    return Math.max(0, ...this.estado().versiones.filter((v) => v.periodoId === periodoId).map((v) => v.numero)) + 1;
  }

  private cargar(): EstadoApp {
    try {
      const t = localStorage.getItem(CLAVE);
      if (t) {
        const e = JSON.parse(t) as EstadoApp;
        if (e.version === VERSION_ESQUEMA) return e;
      }
    } catch {}
    return this.construirInicial();
  }

  /** Estado de demo: catálogo + horario histórico 2026-1 publicado (generado con el mismo algoritmo). */
  private construirInicial(): EstadoApp {
    const e = estadoInicial();
    const mc = new Map(e.cursos.map((x) => [x.id, x]));
    const mg = new Map(e.grupos.map((x) => [x.id, x]));
    const md = new Map(e.docentes.map((x) => [x.id, x]));
    const ma = new Map(e.aulas.map((x) => [x.id, x]));
    const cat: Catalogo = { curso: (id) => mc.get(id), grupo: (id) => mg.get(id), docente: (id) => md.get(id), aula: (id) => ma.get(id) };
    const per = e.periodos.find((p) => p.id === 'per-2026-1')!;
    const r = new GeneradorVoraz(this.validador).generar({
      grupos: e.grupos.filter((g) => g.periodoId === per.id),
      docentes: e.docentes,
      aulas: e.aulas,
      parametros: per.parametros,
      catalogo: cat,
    });
    // en el histórico, los grupos que no cupieron se dan por cerrados para que la versión sea publicable
    const cerrados = new Set(r.pendientes.map((p) => p.grupoId));
    e.grupos = e.grupos.map((g) => (cerrados.has(g.id) ? { ...g, estado: 'CERRADO' } : g.periodoId === per.id ? { ...g, inscritos: g.cupoPlaneado - 4 } : g));
    const fecha = '2026-01-20T15:00:00.000Z';
    e.versiones = [
      {
        id: 'ver-2026-1-v1',
        periodoId: per.id,
        numero: 1,
        estado: 'PUBLICADA',
        origen: 'Generada automáticamente (histórico)',
        fechaCreacion: '2026-01-12T14:00:00.000Z',
        fechaPublicacion: fecha,
        autor: 'Diana Marcela Rojas',
        sesiones: r.sesiones,
        pendientes: [],
      },
    ];
    e.horariosAtencion = atencionesDeDemostracion(e, r.sesiones, per.parametros.duracionSesion);
    e.bitacora = [
      { id: 'log-0', fecha, usuario: 'Diana Marcela Rojas', rol: 'COORDINADOR', accion: 'Publicación de horario', detalle: 'Versión 1 de 2026-1 publicada como oficial' },
      { id: 'log-1', fecha: '2026-07-01T13:00:00.000Z', usuario: 'Sistema', rol: 'SISTEMA', accion: 'Carga de datos de demostración', detalle: 'Catálogo 2026-2 (plan de estudios de Ingeniería de Sistemas)' },
    ];
    return e;
  }
}

/**
 * Horarios de atención de demostración para Germán Augusto Neuta (docente de Legislación que validó el
 * prototipo): en 2026-1, una hora fija libre el viernes para Legislación y «acordar» para su electiva;
 * en 2026-2, viernes 12:00–13:00 para Legislación y «acordar» para la Electiva profesional II.
 */
function atencionesDeDemostracion(e: EstadoApp, sesiones2026_1: Sesion[], dur: number): HorarioAtencion[] {
  const german = e.docentes.find((d) => d.nombre === 'Germán Augusto Neuta');
  if (!german) return [];
  const curso = (nombre: string) => e.cursos.find((c) => c.nombre === nombre)?.id ?? '';
  const legislacion = curso('Legislación, normatividad y ciudadanía');
  const suyas = sesiones2026_1.filter((s) => s.docenteId === german.id);
  const libre = [12, 11, 17, 15, 7].find((h) => !suyas.some((s) => s.dia === 4 && s.inicio < h + 1 && h < s.inicio + dur)) ?? 12;
  const electiva1 = suyas.map((s) => e.grupos.find((g) => g.id === s.grupoId)?.cursoId).find((id) => id && id !== legislacion);
  const out: HorarioAtencion[] = [
    { id: 'ate-1', periodoId: 'per-2026-1', docenteId: german.id, cursoId: legislacion, modo: 'HORARIO', dia: 4, inicio: libre, fin: libre + 1, lugar: 'Sala de profesores, bloque A piso 3' },
    { id: 'ate-3', periodoId: 'per-2026-2', docenteId: german.id, cursoId: legislacion, modo: 'HORARIO', dia: 4, inicio: 12, fin: 13, lugar: 'Sala de profesores, bloque A piso 3' },
    { id: 'ate-4', periodoId: 'per-2026-2', docenteId: german.id, cursoId: curso('Electiva profesional II'), modo: 'ACORDAR', dia: null, inicio: null, fin: null, lugar: 'Escribir a gneuta@ueb.demo' },
  ];
  if (electiva1) out.splice(1, 0, { id: 'ate-2', periodoId: 'per-2026-1', docenteId: german.id, cursoId: electiva1, modo: 'ACORDAR', dia: null, inicio: null, fin: null, lugar: 'Escribir a gneuta@ueb.demo' });
  return out.filter((h) => h.cursoId);
}

export function validarParametros(p: ParametrosProgramacion): string[] {
  const err: string[] = [];
  const okRango = (r: { inicio: number; fin: number }) => r.inicio >= 0 && r.fin <= 24 && r.inicio < r.fin;
  if (!okRango(p.franjaLunesViernes)) err.push('La franja de lunes a viernes no es válida.');
  if (!okRango(p.franjaSabado)) err.push('La franja del sábado no es válida.');
  p.bloquesNoAsignables.forEach((b, i) => !okRango(b) && err.push(`El bloque no asignable ${i + 1} no es válido.`));
  if (!(p.duracionSesion >= 1 && p.duracionSesion <= 4)) err.push('La duración de la sesión debe estar entre 1 y 4 horas.');
  if (!(p.cupoMaximo > 0)) err.push('El cupo máximo debe ser mayor que 0.');
  if (!(p.toleranciaCupo >= 0 && p.toleranciaCupo <= 50)) err.push('La tolerancia debe estar entre 0 % y 50 %.');
  if (!(p.cupoMinimo >= 0 && p.cupoMinimo < p.cupoMaximo)) err.push('El cupo mínimo debe ser menor que el cupo máximo.');
  if (!(p.sesionesMinimas >= 1 && p.sesionesMinimas <= p.sesionesMaximas)) err.push('Las sesiones mínimas deben ser al menos 1 y no superar las máximas.');
  if (!(p.sesionesMaximas <= 7)) err.push('Las sesiones máximas no pueden superar 7.');
  Object.entries(p.horasMaxPorVinculacion).forEach(([k, v]) => !(v >= 0) && err.push(`Las horas máximas de ${k} no son válidas.`));
  return err;
}
