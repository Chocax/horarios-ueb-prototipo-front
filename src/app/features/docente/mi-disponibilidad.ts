// Docente: CU-05 Registrar disponibilidad · RF-04
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BloqueDisponible } from '../../core/models';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { DisponibilidadEditor } from '../../shared/disponibilidad-editor';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-mi-disponibilidad',
  imports: [DisponibilidadEditor, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-05 · RF-04</div>
          <h1>Mi disponibilidad</h1>
          <p class="serif sub">Marque las horas en que puede dictar clase. El generador y el tablero no lo ubicarán fuera de ellas (R6).</p>
        </div>
        @if (docente()) {
          <button class="btn btn-primary" (click)="guardar()" [disabled]="!cambios()"><app-icon name="check" [size]="16" /> Guardar disponibilidad</button>
        }
      </div>
      @if (docente(); as d) {
        <div class="grid" style="grid-template-columns: minmax(0, 1fr) 280px; align-items:start">
          <div class="card">
            <app-disponibilidad-editor [bloques]="bloques() ?? d.disponibilidad" [parametros]="store.parametros()" (cambio)="bloques.set($event)" />
          </div>
          <div class="card">
            <div class="card-title"><h2>Cursos que puede orientar</h2></div>
            @for (c of habilitados(); track c) { <div class="hab">{{ c }}</div> } @empty { <p class="muted">Sin cursos habilitados.</p> }
            <p class="caption" style="margin-top:10px">Las habilitaciones las define la coordinación.</p>
          </div>
        </div>
      } @else {
        <div class="aviso warn"><app-icon name="alert" [size]="18" /><div>Su usuario no está vinculado a un docente.</div></div>
      }
    </div>
  `,
  styles: [`.hab { font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--hairline); } .hab:last-of-type { border-bottom: none; }`],
})
export class MiDisponibilidad {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly bloques = signal<BloqueDisponible[] | null>(null);
  protected readonly cambios = computed(() => this.bloques() !== null);
  protected readonly docente = computed(() => this.store.catalogo().docente(this.sesion.actual()?.docenteId ?? ''));
  protected readonly habilitados = computed(() => (this.docente()?.habilitaciones ?? []).map((id) => this.store.catalogo().curso(id)?.nombre ?? id).sort());

  guardar() {
    const r = this.store.actualizarDisponibilidad(this.docente()!.id, this.bloques()!);
    if (r.ok) {
      this.bloques.set(null);
      this.toast.ok('Disponibilidad guardada', ['La coordinación la usará en la próxima generación del horario.']);
    }
  }
}
