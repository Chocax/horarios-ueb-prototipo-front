import { Injectable, signal } from '@angular/core';
import { Rol } from '../models';

export interface SesionUsuario {
  usuarioId: string;
  nombre: string;
  rol: Rol;
  docenteId?: string;
}

const CLAVE = 'ueb-horarios-sesion';

/** Sesión del usuario autenticado (RF-15). */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly actual = signal<SesionUsuario | null>(this.leer());

  iniciar(s: SesionUsuario) {
    this.actual.set(s);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(s));
    } catch {}
  }

  cerrar() {
    this.actual.set(null);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {}
  }

  tieneRol(...roles: Rol[]) {
    const s = this.actual();
    return !!s && roles.includes(s.rol);
  }

  private leer(): SesionUsuario | null {
    try {
      const t = sessionStorage.getItem(CLAVE);
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
}
