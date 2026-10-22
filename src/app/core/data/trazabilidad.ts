// Matriz de trazabilidad: requerimiento → caso de uso → pantalla del prototipo.
export interface FilaRF {
  rf: string;
  titulo: string;
  cu: string;
  pantallas: { texto: string; ruta: string }[];
  prueba: string;
}

const P = {
  periodos: { texto: 'Periodos y parámetros', ruta: '/periodos' },
  docentes: { texto: 'Docentes', ruta: '/docentes' },
  cursos: { texto: 'Cursos', ruta: '/cursos' },
  aulas: { texto: 'Aulas', ruta: '/aulas' },
  grupos: { texto: 'Grupos y demanda', ruta: '/grupos' },
  importar: { texto: 'Importar datos', ruta: '/importar' },
  tablero: { texto: 'Tablero del horario', ruta: '/tablero' },
  versiones: { texto: 'Versiones y publicación', ruta: '/versiones' },
  consulta: { texto: 'Consultar horario', ruta: '/consulta' },
  reportes: { texto: 'Reportes', ruta: '/reportes' },
  inscritos: { texto: 'Inscritos y cierre', ruta: '/inscritos' },
  bitacora: { texto: 'Bitácora', ruta: '/bitacora' },
  usuarios: { texto: 'Usuarios y roles', ruta: '/usuarios' },
  revision: { texto: 'Revisión (comité)', ruta: '/revision' },
  miHorario: { texto: 'Mi horario (docente)', ruta: '/mi-horario' },
  miDisp: { texto: 'Mi disponibilidad (docente)', ruta: '/mi-disponibilidad' },
  login: { texto: 'Inicio de sesión', ruta: '/login' },
};

export const MATRIZ_RF: FilaRF[] = [
  { rf: 'RF-01', titulo: 'Parámetros de franja, bloques no asignables y duración', cu: 'CU-03', pantallas: [P.periodos], prueba: 'Cambiar la franja del sábado a 8–12 y regenerar: ninguna sesión queda fuera.' },
  { rf: 'RF-02', titulo: 'Parámetros de aforo y frecuencia', cu: 'CU-03', pantallas: [P.periodos], prueba: 'Cupo máximo 35 → R9 y reportes usan el nuevo valor.' },
  { rf: 'RF-03', titulo: 'Registro de docentes con vinculación y horas máximas', cu: 'CU-04', pantallas: [P.docentes], prueba: 'Docente sin vinculación u horas negativas se rechaza.' },
  { rf: 'RF-04', titulo: 'Disponibilidad y habilitaciones por docente', cu: 'CU-05', pantallas: [P.docentes, P.miDisp], prueba: 'Docente no habilitado no aparece; disponibilidad nocturna impide 16:00 (R6).' },
  { rf: 'RF-05', titulo: 'Cursos con nivel, sesiones y características', cu: 'CU-06', pantallas: [P.cursos], prueba: 'Curso con cómputo solo va a laboratorios (R4).' },
  { rf: 'RF-06', titulo: 'Aulas con capacidad y características', cu: 'CU-06', pantallas: [P.aulas], prueba: 'Aula de 30 rechaza grupo de 40 (R4).' },
  { rf: 'RF-07', titulo: 'Creación de grupos con cupo planeado', cu: 'CU-08', pantallas: [P.grupos], prueba: 'Cupo 44 se acepta, 45 se rechaza (R9).' },
  { rf: 'RF-08', titulo: 'Generación de propuesta con pendientes y causa', cu: 'CU-10', pantallas: [P.tablero], prueba: 'Generar: 2 pendientes con causa, 0 violaciones.' },
  { rf: 'RF-09', titulo: 'Validación de restricciones duras R1–R9', cu: 'CU-11', pantallas: [P.tablero, P.grupos, P.versiones], prueba: 'Cada rechazo nombra la regla violada.' },
  { rf: 'RF-10', titulo: 'Ajuste por arrastrar y soltar con rechazo inmediato', cu: 'CU-12', pantallas: [P.tablero], prueba: 'Arrastrar a 12:00 o a un choque de docente: vuelve y muestra R3/R1.' },
  { rf: 'RF-11', titulo: 'Reporte de restricciones blandas B1–B6', cu: 'CU-13', pantallas: [P.tablero], prueba: 'Panel de blandas; no bloquea la publicación.' },
  { rf: 'RF-12', titulo: 'Versionado, publicación bloqueada y restauración', cu: 'CU-14, CU-15', pantallas: [P.versiones], prueba: 'Publicar con pendientes se bloquea; restaurar crea borrador.' },
  { rf: 'RF-13', titulo: 'Exportación CSV y PDF', cu: 'CU-19', pantallas: [P.consulta, P.miHorario], prueba: 'CSV con una fila por sesión; PDF por impresión.' },
  { rf: 'RF-14', titulo: 'Reportes de aulas, carga docente y grupos bajo mínimo', cu: 'CU-16', pantallas: [P.reportes], prueba: '% de ocupación, horas vs. máximo y grupos < 10.' },
  { rf: 'RF-15', titulo: 'Autenticación, permisos por rol y bitácora', cu: 'CU-01', pantallas: [P.login, P.bitacora], prueba: 'Comité no ve el tablero y el servidor rechaza la acción directa.' },
  { rf: 'RF-16', titulo: 'Periodos con parámetros independientes', cu: 'CU-03', pantallas: [P.periodos], prueba: 'Cambiar parámetros de 2027-1 no altera 2026-2.' },
  { rf: 'RF-17', titulo: 'Importación CSV todo o nada con errores por fila', cu: 'CU-07', pantallas: [P.importar], prueba: '50 filas con 3 inválidas: no carga nada y lista las 3.' },
  { rf: 'RF-18', titulo: 'Demanda y sugerencia de número de grupos', cu: 'CU-09', pantallas: [P.grupos], prueba: 'Demanda 130 → 4 grupos; se puede bajar a 3 pero no a 2.' },
  { rf: 'RF-19', titulo: 'Consulta por docente, aula, curso y nivel', cu: 'CU-18', pantallas: [P.consulta, P.miHorario, P.revision], prueba: 'El docente solo ve sus sesiones publicadas.' },
  { rf: 'RF-20', titulo: 'Observaciones del comité sobre una versión', cu: 'CU-20', pantallas: [P.revision, P.versiones], prueba: 'El coordinador ve la observación en la versión.' },
  { rf: 'RF-21', titulo: 'Inscritos y cierre de grupos bajo el mínimo', cu: 'CU-17', pantallas: [P.inscritos, P.reportes], prueba: 'Grupo con 8 inscritos se cierra y libera docente y aula.' },
  { rf: 'RF-22', titulo: 'Gestión de usuarios y roles', cu: 'CU-02', pantallas: [P.usuarios], prueba: 'Usuario desactivado no inicia sesión; cambio de rol en bitácora.' },
];

export const CASOS_USO: { cu: string; nombre: string; actor: string; ruta: string }[] = [
  { cu: 'CU-01', nombre: 'Iniciar sesión', actor: 'Todos', ruta: '/login' },
  { cu: 'CU-02', nombre: 'Gestionar usuarios y roles', actor: 'Administrador', ruta: '/usuarios' },
  { cu: 'CU-03', nombre: 'Configurar periodo académico', actor: 'Coordinador', ruta: '/periodos' },
  { cu: 'CU-04', nombre: 'Gestionar docentes', actor: 'Coordinador', ruta: '/docentes' },
  { cu: 'CU-05', nombre: 'Registrar disponibilidad', actor: 'Coordinador, Docente', ruta: '/mi-disponibilidad' },
  { cu: 'CU-06', nombre: 'Gestionar cursos y aulas', actor: 'Coordinador', ruta: '/cursos' },
  { cu: 'CU-07', nombre: 'Importar datos del periodo', actor: 'Coordinador', ruta: '/importar' },
  { cu: 'CU-08', nombre: 'Gestionar grupos', actor: 'Coordinador', ruta: '/grupos' },
  { cu: 'CU-09', nombre: 'Sugerir número de grupos', actor: 'Coordinador', ruta: '/grupos' },
  { cu: 'CU-10', nombre: 'Generar propuesta de horario', actor: 'Coordinador', ruta: '/tablero' },
  { cu: 'CU-11', nombre: 'Validar restricciones duras', actor: '(incluido)', ruta: '/tablero' },
  { cu: 'CU-12', nombre: 'Ajustar horario', actor: 'Coordinador', ruta: '/tablero' },
  { cu: 'CU-13', nombre: 'Revisar restricciones blandas', actor: 'Coordinador', ruta: '/tablero' },
  { cu: 'CU-14', nombre: 'Publicar horario', actor: 'Coordinador', ruta: '/versiones' },
  { cu: 'CU-15', nombre: 'Restaurar versión del horario', actor: 'Coordinador', ruta: '/versiones' },
  { cu: 'CU-16', nombre: 'Consultar reportes', actor: 'Coordinador', ruta: '/reportes' },
  { cu: 'CU-17', nombre: 'Cerrar grupos', actor: 'Coordinador', ruta: '/inscritos' },
  { cu: 'CU-18', nombre: 'Consultar horario', actor: 'Coordinador, Docente, Comité', ruta: '/consulta' },
  { cu: 'CU-19', nombre: 'Exportar horario', actor: 'Coordinador', ruta: '/consulta' },
  { cu: 'CU-20', nombre: 'Registrar observaciones', actor: 'Comité', ruta: '/revision' },
];

export const REGLAS_BLANDAS = [
  { codigo: 'B1', nombre: 'Cursos de 2 o 3 sesiones no en días consecutivos' },
  { codigo: 'B2', nombre: 'Minimizar huecos de 2 h o más en la jornada del docente' },
  { codigo: 'B3', nombre: 'Equilibrar la carga entre docentes' },
  { codigo: 'B4', nombre: 'Evitar cruces entre cursos del mismo semestre y jornada' },
  { codigo: 'B5', nombre: 'No usar aulas especiales para cursos que no las necesitan' },
  { codigo: 'B6', nombre: 'Los grupos diurnos de un curso los dictan docentes distintos' },
];
