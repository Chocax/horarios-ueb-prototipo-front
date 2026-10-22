import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { Icon } from './icon';

@Component({
  selector: 'app-toast-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="t.tipo" role="status">
          <span class="ico"><app-icon [name]="t.tipo === 'ok' ? 'check' : t.tipo === 'error' ? 'alert' : 'message'" [size]="16" /></span>
          <div class="txt">
            <strong>{{ t.titulo }}</strong>
            @if (t.detalle?.length) {
              <ul>
                @for (d of t.detalle; track $index) {
                  <li>{{ d }}</li>
                }
              </ul>
            }
          </div>
          <button class="btn icon-btn x" (click)="toasts.cerrar(t.id)" aria-label="Cerrar"><app-icon name="x" [size]="14" /></button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .host { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 80; width: min(440px, calc(100vw - 40px)); }
      .toast { display: flex; gap: 10px; align-items: flex-start; background: #fff; border: 1px solid var(--hairline); border-radius: 12px;
        padding: 12px 10px 12px 14px; box-shadow: var(--shadow-mockup); animation: entra 220ms cubic-bezier(.2,1.3,.4,1); }
      .ico { width: 26px; height: 26px; border-radius: 99px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
      .ok .ico { background: #e3efd9; color: #2f5a17; }
      .error .ico { background: #fde0db; color: #a51e0b; }
      .info .ico { background: var(--color-sky-tint); color: var(--color-notion-blue); }
      .txt { flex: 1; min-width: 0; padding-top: 3px; }
      .txt strong { font-weight: 600; }
      ul { margin: 6px 0 0; padding-left: 16px; color: var(--ink-60); font-size: 13px; }
      .x { width: 26px; height: 26px; }
      @keyframes entra { from { transform: translateY(10px); opacity: 0; } }
    `,
  ],
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
}
