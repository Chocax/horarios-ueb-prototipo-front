import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cerrar.emit()">
      <div class="modal" [class.wide]="ancho()" (click)="$event.stopPropagation()" role="dialog" [attr.aria-label]="titulo()">
        <div class="modal-head">
          <div>
            <h2>{{ titulo() }}</h2>
            @if (subtitulo()) {
              <p class="muted" style="margin-top:4px">{{ subtitulo() }}</p>
            }
          </div>
          <button class="btn icon-btn" (click)="cerrar.emit()" aria-label="Cerrar"><app-icon name="x" /></button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly ancho = input(false);
  readonly cerrar = output<void>();
}
