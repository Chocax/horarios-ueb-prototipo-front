import { Caracteristica, CARACTERISTICAS, Dia, DIAS, Rol, ROLES, Vinculacion, VINCULACIONES } from './models';

export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
export const rango = (inicio: number, fin: number) => `${hh(inicio)}–${hh(fin)}`;
export const nombreDia = (d: Dia) => DIAS[d].nombre;
export const nombreDiaMin = (d: Dia) => DIAS[d].nombre.toLowerCase();
export const nombreVinculacion = (v: Vinculacion) => VINCULACIONES.find((x) => x.valor === v)?.nombre ?? v;
export const cortoVinculacion = (v: Vinculacion) => VINCULACIONES.find((x) => x.valor === v)?.corto ?? v;
export const nombreCaracteristica = (c: Caracteristica) => CARACTERISTICAS.find((x) => x.valor === c)?.nombre ?? c;
export const nombreRol = (r: Rol) => ROLES.find((x) => x.valor === r)?.nombre ?? r;

export const seSolapan = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

let contador = 0;
export const nuevoId = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const ahoraIso = () => new Date().toISOString();

export const fechaCorta = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Resumen no reversible de la contraseña (simulado: el prototipo no tiene servidor). */
export function hashClave(clave: string): string {
  let h1 = 0xdeadbeef ^ clave.length;
  let h2 = 0x41c6ce57 ^ clave.length;
  const sal = 'ueb-horarios';
  const s = sal + clave;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'sha-demo$' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function descargarArchivo(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function aCsv(filas: (string | number | null)[][], separador = ';'): string {
  return filas
    .map((f) =>
      f
        .map((c) => {
          const v = c === null || c === undefined ? '' : String(c);
          return /[;",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(separador),
    )
    .join('\n');
}
