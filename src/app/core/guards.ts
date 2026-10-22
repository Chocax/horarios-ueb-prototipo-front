import { ErrorHandler, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RUTA_INICIAL } from '../layout/nav';
import { Rol } from './models';
import { SessionService } from './services/session.service';
import { AccionNoPermitida } from './services/store.service';
import { ToastService } from './services/toast.service';

export const autenticado: CanActivateFn = (_route, state) => {
  const s = inject(SessionService);
  if (s.actual()) return true;
  // se recuerda la pantalla pedida para volver a ella después de iniciar sesión (links compartidos)
  const destino = state.url && state.url !== '/' ? `?r=${encodeURIComponent(state.url)}` : '';
  return inject(Router).parseUrl(`/login${destino}`);
};

/** Guarda por rol: además de ocultar el menú, bloquea la ruta (RF-15). */
export const conRol = (...roles: Rol[]): CanActivateFn => () => {
  const s = inject(SessionService);
  const t = inject(ToastService);
  const actual = s.actual();
  if (!actual) return inject(Router).parseUrl('/login');
  if (roles.includes(actual.rol)) return true;
  t.error('Acceso denegado', [`El rol ${actual.rol} no tiene permiso para esta pantalla.`]);
  return inject(Router).parseUrl(RUTA_INICIAL[actual.rol]);
};

export const redirigirPorRol: CanActivateFn = () => {
  const s = inject(SessionService);
  const actual = s.actual();
  return inject(Router).parseUrl(actual ? RUTA_INICIAL[actual.rol] : '/login');
};

@Injectable()
export class ManejadorErrores implements ErrorHandler {
  private readonly toast = inject(ToastService);
  handleError(error: unknown): void {
    const e = (error as any)?.rejection ?? error;
    if (e instanceof AccionNoPermitida) {
      this.toast.error('Operación rechazada por el servidor', [e.message]);
      return;
    }
    console.error(error);
  }
}
