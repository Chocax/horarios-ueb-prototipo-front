import { ParametrosProgramacion, Sesion } from '../core/models';

export const ALTO_HORA = 46;

/** Paleta para distinguir cursos o grupos dentro de una misma vista (tonos claros, texto oscuro legible). */
export const PALETA = ['#dcebfd', '#ffe3b0', '#fcd5cd', '#d4f0dc', '#e8dcfa', '#fbe0ef', '#d5f1f2', '#f2ecc6', '#e3e6ee', '#ffd9b8', '#d9e8c8', '#f5d6e0'];

/** Asigna a cada clave un color estable según su posición en la lista ordenada. */
export function mapaColores(claves: string[]): Map<string, string> {
  return new Map([...new Set(claves)].map((k, i) => [k, PALETA[i % PALETA.length]]));
}

export function horasGrilla(p: ParametrosProgramacion): number[] {
  const ini = Math.min(p.franjaLunesViernes.inicio, p.franjaSabado.inicio);
  const fin = Math.max(p.franjaLunesViernes.fin, p.franjaSabado.fin);
  return Array.from({ length: fin - ini }, (_, i) => ini + i);
}

/** Calcula carriles (columnas internas) para sesiones que se solapan en el mismo día. */
export function carriles(sesiones: Sesion[], dur: number): Map<string, { carril: number; total: number }> {
  const out = new Map<string, { carril: number; total: number }>();
  for (let dia = 0; dia <= 5; dia++) {
    const del = sesiones.filter((s) => s.dia === dia).sort((a, b) => a.inicio - b.inicio || a.id.localeCompare(b.id));
    let cluster: Sesion[] = [];
    let finCluster = -1;
    const cerrar = () => {
      const fines: number[] = [];
      const asign = new Map<string, number>();
      for (const s of cluster) {
        let c = fines.findIndex((f) => f <= s.inicio);
        if (c === -1) {
          c = fines.length;
          fines.push(0);
        }
        fines[c] = s.inicio + dur;
        asign.set(s.id, c);
      }
      cluster.forEach((s) => out.set(s.id, { carril: asign.get(s.id)!, total: Math.max(1, fines.length) }));
      cluster = [];
    };
    for (const s of del) {
      if (cluster.length && s.inicio >= finCluster) cerrar();
      cluster.push(s);
      finCluster = Math.max(finCluster, s.inicio + dur);
    }
    if (cluster.length) cerrar();
  }
  return out;
}

export function fueraDeFranja(p: ParametrosProgramacion, dia: number, hora: number): boolean {
  const f = dia === 5 ? p.franjaSabado : p.franjaLunesViernes;
  return hora < f.inicio || hora >= f.fin;
}

export function bloqueado(p: ParametrosProgramacion, hora: number): boolean {
  return p.bloquesNoAsignables.some((b) => hora >= b.inicio && hora < b.fin);
}

export const nombreCorto = (n: string) =>
  n
    .replace('Introducción a la ingeniería de sistemas', 'Intro. ing. de sistemas')
    .replace('Estructuras del pensamiento', 'Est. del pensamiento')
    .replace('Microprocesadores y programación assembler', 'Micro y prog. assembler')
    .replace('Investigación tecnológica y de ingeniería', 'Inv. tecnológica y de ing.')
    .replace('Legislación, normatividad y ciudadanía', 'Leg., normatividad y ciud.')
    .replace('Gestión de tecnología e innovación', 'Gestión de tec. e innovación')
    .replace('Sistemas digitales y arquitectura', 'Sist. digitales y arquitectura')
    .replace('Modelos y simulación de sistemas', 'Modelos y sim. de sistemas');
