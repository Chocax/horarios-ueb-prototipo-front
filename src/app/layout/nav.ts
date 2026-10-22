import { Rol } from '../core/models';

export interface ItemNav {
  ruta: string;
  texto: string;
  icono: string;
  grupo?: string;
  roles: Rol[];
  ref?: string; // trazabilidad
}

export const NAV: ItemNav[] = [
  { ruta: '/inicio', texto: 'Inicio', icono: 'home', roles: ['COORDINADOR'] },
  { ruta: '/revision', texto: 'Revisión de propuestas', icono: 'message', roles: ['COMITE'], ref: 'CU-18, CU-20' },
  { ruta: '/mi-horario', texto: 'Mi horario', icono: 'calendar', roles: ['DOCENTE'], ref: 'CU-18, CU-19' },
  { ruta: '/mi-disponibilidad', texto: 'Mi disponibilidad', icono: 'clock', roles: ['DOCENTE'], ref: 'CU-05' },
  { ruta: '/usuarios', texto: 'Usuarios y roles', icono: 'shield', roles: ['ADMINISTRADOR'], ref: 'CU-02' },

  { ruta: '/periodos', texto: 'Periodos y parámetros', icono: 'settings', grupo: 'Planeación', roles: ['COORDINADOR', 'ADMINISTRADOR'], ref: 'CU-03' },
  { ruta: '/docentes', texto: 'Docentes', icono: 'users', grupo: 'Planeación', roles: ['COORDINADOR'], ref: 'CU-04, CU-05' },
  { ruta: '/cursos', texto: 'Cursos', icono: 'book', grupo: 'Planeación', roles: ['COORDINADOR'], ref: 'CU-06' },
  { ruta: '/aulas', texto: 'Aulas', icono: 'door', grupo: 'Planeación', roles: ['COORDINADOR'], ref: 'CU-06' },
  { ruta: '/grupos', texto: 'Grupos y demanda', icono: 'layers', grupo: 'Planeación', roles: ['COORDINADOR'], ref: 'CU-08, CU-09' },
  { ruta: '/importar', texto: 'Importar datos', icono: 'upload', grupo: 'Planeación', roles: ['COORDINADOR'], ref: 'CU-07' },

  { ruta: '/tablero', texto: 'Tablero del horario', icono: 'board', grupo: 'Programación', roles: ['COORDINADOR'], ref: 'CU-10–CU-13' },
  { ruta: '/versiones', texto: 'Versiones y publicación', icono: 'history', grupo: 'Programación', roles: ['COORDINADOR'], ref: 'CU-14, CU-15' },
  { ruta: '/consulta', texto: 'Consultar horario', icono: 'eye', grupo: 'Programación', roles: ['COORDINADOR', 'COMITE', 'ADMINISTRADOR'], ref: 'CU-18, CU-19' },

  { ruta: '/reportes', texto: 'Reportes', icono: 'chart', grupo: 'Seguimiento', roles: ['COORDINADOR'], ref: 'CU-16' },
  { ruta: '/inscritos', texto: 'Inscritos y cierre', icono: 'list', grupo: 'Seguimiento', roles: ['COORDINADOR'], ref: 'CU-17' },
  { ruta: '/bitacora', texto: 'Bitácora', icono: 'lock', grupo: 'Seguimiento', roles: ['COORDINADOR', 'ADMINISTRADOR'], ref: 'RF-15' },

  { ruta: '/trazabilidad', texto: 'Trazabilidad', icono: 'trace', grupo: 'Ayuda', roles: ['COORDINADOR', 'COMITE', 'DOCENTE', 'ADMINISTRADOR'] },
];

export const RUTA_INICIAL: Record<Rol, string> = {
  COORDINADOR: '/inicio',
  COMITE: '/revision',
  DOCENTE: '/mi-horario',
  ADMINISTRADOR: '/usuarios',
};
