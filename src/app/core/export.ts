// Exportación del horario (CU-19 · RF-13): una fila por sesión.
import { Sesion } from './models';
import { Catalogo } from './rules/reglas-duras';
import { aCsv, descargarArchivo, hh, nombreDia } from './util';

export function exportarCsv(nombreArchivo: string, sesiones: Sesion[], cat: Catalogo, duracion: number) {
  const filas = [...sesiones]
    .map((s) => {
      const g = cat.grupo(s.grupoId);
      const c = g ? cat.curso(g.cursoId) : undefined;
      return { s, g, c };
    })
    .sort((a, b) => (a.c?.nivel ?? 0) - (b.c?.nivel ?? 0) || (a.c?.nombre ?? '').localeCompare(b.c?.nombre ?? '') || (a.g?.codigo ?? '').localeCompare(b.g?.codigo ?? '') || a.s.dia - b.s.dia || a.s.inicio - b.s.inicio)
    .map(({ s, g, c }) => [
      c?.codigo ?? '',
      c?.nombre ?? '',
      c?.nivel ?? '',
      g?.codigo ?? '',
      g?.jornada === 'DIURNA' ? 'Diurna' : 'Nocturna',
      s.docenteId ? cat.docente(s.docenteId)?.nombre ?? '' : '',
      s.aulaId ? cat.aula(s.aulaId)?.codigo ?? '' : '',
      nombreDia(s.dia),
      hh(s.inicio),
      hh(s.inicio + duracion),
    ]);
  const csv = aCsv([['codigo_curso', 'curso', 'semestre', 'grupo', 'jornada', 'docente', 'aula', 'dia', 'hora_inicio', 'hora_fin'], ...filas]);
  descargarArchivo(nombreArchivo, csv);
  return filas.length;
}
