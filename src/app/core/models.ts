// Modelo del dominio — corresponde al diagrama de clases y al MER (entregable de análisis y diseño).

export type Rol = 'COORDINADOR' | 'COMITE' | 'DOCENTE' | 'ADMINISTRADOR';
export type Vinculacion = 'TIEMPO_COMPLETO' | 'TRES_CUARTOS' | 'MEDIO_TIEMPO' | 'CUARTO_TIEMPO';
export type Caracteristica = 'EQUIPOS_COMPUTO' | 'MOBILIARIO_MOVIL' | 'LAB_REDES' | 'LAB_FISICA';
export type Jornada = 'DIURNA' | 'NOCTURNA';
export type EstadoVersion = 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA';
export type EstadoGrupo = 'ABIERTO' | 'CERRADO';
/** 0 = lunes … 5 = sábado */
export type Dia = 0 | 1 | 2 | 3 | 4 | 5;

/** Rango horario en horas enteras (formato 24 h). */
export interface RangoHorario {
  inicio: number;
  fin: number;
}

export interface ParametrosProgramacion {
  franjaLunesViernes: RangoHorario;
  franjaSabado: RangoHorario;
  bloquesNoAsignables: RangoHorario[];
  duracionSesion: number; // horas
  cupoMaximo: number;
  toleranciaCupo: number; // porcentaje
  cupoMinimo: number;
  sesionesMinimas: number;
  sesionesMaximas: number;
  horasMaxPorVinculacion: Record<Vinculacion, number>;
}

export interface PeriodoAcademico {
  id: string;
  codigo: string; // 2026-2
  anio: number;
  semestre: 1 | 2;
  estado: 'ABIERTO' | 'CERRADO';
  parametros: ParametrosProgramacion;
}

export interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number; // semestre del plan
  creditos: number;
  sesionesSemanales: number;
  caracteristicasRequeridas: Caracteristica[];
}

/** Relación SE OFRECE EN (curso – periodo) con su demanda estimada (RF-18). */
export interface OfertaCurso {
  periodoId: string;
  cursoId: string;
  demandaEstimada: number;
}

export interface BloqueDisponible {
  dia: Dia;
  inicio: number;
  fin: number;
}

export interface Docente {
  id: string;
  identificador: string;
  nombre: string;
  correoInstitucional: string;
  tipoVinculacion: Vinculacion;
  categoriaEscalafon: string;
  horasMaxDocencia: number;
  habilitaciones: string[]; // ids de curso
  disponibilidad: BloqueDisponible[];
}

export interface Aula {
  id: string;
  codigo: string;
  nombre: string;
  capacidad: number;
  caracteristicas: Caracteristica[];
  /** Bloque y piso del campus (se deducen del código si no vienen). */
  bloque?: string;
  piso?: number;
}

export interface Grupo {
  id: string;
  periodoId: string;
  cursoId: string;
  codigo: string; // G1, G2…
  jornada: Jornada;
  cupoPlaneado: number;
  inscritos: number | null;
  estado: EstadoGrupo;
  /** Docente que se intenta asignar primero (asignación previa acordada con el docente). */
  docentePreferido?: string | null;
}

export interface Sesion {
  id: string;
  grupoId: string;
  dia: Dia;
  inicio: number;
  docenteId: string | null;
  aulaId: string | null;
}

export interface GrupoPendiente {
  grupoId: string;
  causa: string;
  regla: string; // R1…R9
}

export interface VersionHorario {
  id: string;
  periodoId: string;
  numero: number;
  estado: EstadoVersion;
  origen: string;
  fechaCreacion: string;
  fechaPublicacion: string | null;
  autor: string;
  sesiones: Sesion[];
  pendientes: GrupoPendiente[];
}

export interface Observacion {
  id: string;
  versionId: string;
  usuarioId: string;
  autor: string;
  concepto: 'FAVORABLE' | 'CON_AJUSTES';
  texto: string;
  fecha: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  hashClave: string;
  rol: Rol;
  activo: boolean;
  docenteId?: string;
}

export interface RegistroBitacora {
  id: string;
  fecha: string;
  usuario: string;
  rol: Rol | 'SISTEMA';
  accion: string;
  detalle: string;
}

export interface Violacion {
  regla: string; // R1…R9
  mensaje: string;
}

export interface IncumplimientoBlando {
  regla: string; // B1…B5
  titulo: string;
  detalle: string;
}

/**
 * Horario de atención (cambio solicitado en la validación con el docente de Legislación): espacio semanal de
 * 1 o 2 horas por materia para tutorías, preguntas u orientación. Si el docente tiene poca disponibilidad,
 * puede quedar como «acordar con el docente».
 */
export type ModoAtencion = 'HORARIO' | 'ACORDAR';
export interface HorarioAtencion {
  id: string;
  periodoId: string;
  docenteId: string;
  cursoId: string;
  modo: ModoAtencion;
  dia: Dia | null;
  inicio: number | null;
  fin: number | null;
  /** Lugar o indicación (sala de profesores, enlace de reunión, correo…). */
  lugar: string;
}

export interface EstadoApp {
  version: number; // versión del esquema de datos guardado
  periodos: PeriodoAcademico[];
  cursos: Curso[];
  ofertas: OfertaCurso[];
  docentes: Docente[];
  aulas: Aula[];
  grupos: Grupo[];
  versiones: VersionHorario[];
  observaciones: Observacion[];
  usuarios: Usuario[];
  bitacora: RegistroBitacora[];
  horariosAtencion: HorarioAtencion[];
  periodoActivoId: string;
}

export const DIAS: { valor: Dia; nombre: string; corto: string }[] = [
  { valor: 0, nombre: 'Lunes', corto: 'LUN' },
  { valor: 1, nombre: 'Martes', corto: 'MAR' },
  { valor: 2, nombre: 'Miércoles', corto: 'MIÉ' },
  { valor: 3, nombre: 'Jueves', corto: 'JUE' },
  { valor: 4, nombre: 'Viernes', corto: 'VIE' },
  { valor: 5, nombre: 'Sábado', corto: 'SÁB' },
];

export const VINCULACIONES: { valor: Vinculacion; nombre: string; corto: string }[] = [
  { valor: 'TIEMPO_COMPLETO', nombre: 'Tiempo completo', corto: 'TC' },
  { valor: 'TRES_CUARTOS', nombre: 'Tres cuartos de tiempo', corto: '¾' },
  { valor: 'MEDIO_TIEMPO', nombre: 'Medio tiempo', corto: '½' },
  { valor: 'CUARTO_TIEMPO', nombre: 'Un cuarto de tiempo', corto: '¼' },
];

export const CARACTERISTICAS: { valor: Caracteristica; nombre: string }[] = [
  { valor: 'EQUIPOS_COMPUTO', nombre: 'Equipos de cómputo' },
  { valor: 'MOBILIARIO_MOVIL', nombre: 'Mobiliario móvil' },
  { valor: 'LAB_REDES', nombre: 'Laboratorio de redes' },
  { valor: 'LAB_FISICA', nombre: 'Laboratorio de física' },
];

export const ROLES: { valor: Rol; nombre: string; corto: string; descripcion: string }[] = [
  {
    valor: 'COORDINADOR',
    nombre: 'Coordinador de horarios',
    corto: 'Coordinador',
    descripcion: 'Lleva todo el proceso del periodo: parámetros, docentes, cursos, aulas y grupos; genera la propuesta, la ajusta en el tablero, la publica y cierra los grupos con pocos inscritos.',
  },
  {
    valor: 'COMITE',
    nombre: 'Comité Táctico / de Área',
    corto: 'Comité',
    descripcion: 'Revisa las versiones del horario en modo lectura y registra su concepto u observaciones para el coordinador. No puede modificar el horario.',
  },
  {
    valor: 'DOCENTE',
    nombre: 'Docente',
    corto: 'Docente',
    descripcion: 'Consulta y exporta solo su propio horario publicado y registra su disponibilidad semanal.',
  },
  {
    valor: 'ADMINISTRADOR',
    nombre: 'Administrador del sistema',
    corto: 'Administrador',
    descripcion: 'Crea usuarios, les asigna rol y los activa o desactiva; también puede ver periodos, la consulta del horario y la bitácora.',
  },
];
