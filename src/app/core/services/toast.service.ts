import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tipo: 'ok' | 'error' | 'info';
  titulo: string;
  detalle?: string[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private n = 0;

  ok(titulo: string, detalle?: string[]) {
    this.push('ok', titulo, detalle, 3500);
  }
  error(titulo: string, detalle?: string[]) {
    this.push('error', titulo, detalle, 7000);
  }
  info(titulo: string, detalle?: string[]) {
    this.push('info', titulo, detalle, 4500);
  }
  cerrar(id: number) {
    this.toasts.update((l) => l.filter((t) => t.id !== id));
  }

  private push(tipo: Toast['tipo'], titulo: string, detalle: string[] | undefined, ms: number) {
    const id = ++this.n;
    this.toasts.update((l) => [...l.slice(-3), { id, tipo, titulo, detalle }]);
    setTimeout(() => this.cerrar(id), ms);
  }
}
