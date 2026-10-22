// Comité Táctico / de Área: CU-18 Consultar horario · CU-20 Registrar observaciones · RF-20
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observacion } from '../../core/models';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { fechaCorta } from '../../core/util';
import { Icon } from '../../shared/icon';
import { ScheduleGrid } from '../../shared/schedule-grid';

@Component({
  selector: 'app-revision',
  imports: [FormsModule, RouterLink, Icon, ScheduleGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Comité · CU-18 · CU-20 · RF-20</div>
          <h1>Revisión de propuestas</h1>
          <p class="serif sub">Revise la versión del horario y registre su concepto. El coordinador lo verá asociado a esa versión. El comité no puede modificar el horario.</p>
        </div>
        <a class="btn btn-ghost" routerLink="/consulta"><app-icon name="eye" [size]="16" /> Consulta detallada</a>
      </div>

      @if (!versiones().length) {
        <div class="card vacio"><h3>Aún no hay propuestas en {{ store.periodo().codigo }}</h3><p>Cuando el coordinador genere una versión aparecerá aquí para su revisión.</p></div>
      } @else {
        <div class="grid" style="grid-template-columns: minmax(0,1fr) 340px; align-items:start">
          <div>
            <div class="row" style="margin-bottom:12px">
              <select (change)="versionId.set($any($event.target).value)" [disabled]="!versionesPeriodo().length" aria-label="Versión">
                @for (v of versiones(); track v.id) { <option [value]="v.id" [selected]="v.id === version().id">Versión {{ v.numero }} · {{ v.estado === 'BORRADOR' ? 'propuesta en trabajo' : v.estado === 'PUBLICADA' ? 'publicada' : 'archivada' }}</option> }
              </select>
              <select [ngModel]="nivel()" (ngModelChange)="nivel.set(+$event)" aria-label="Semestre">
                @for (n of [1,2,3,4,5,6,7,8,9]; track n) { <option [ngValue]="n">Semestre {{ n }}</option> }
              </select>
              <span class="lock"><app-icon name="lock" [size]="14" /> Solo lectura</span>
            </div>
            @if (version(); as v) {
              <div class="grid cols-4" style="margin-bottom:14px">
                <div class="accent tint stat"><div class="valor">{{ v.sesiones.length }}</div><div class="etiqueta">sesiones</div></div>
                <div class="accent peach stat"><div class="valor">{{ v.pendientes.length }}</div><div class="etiqueta">grupos pendientes</div></div>
                <div class="accent sky stat"><div class="valor">{{ violaciones() }}</div><div class="etiqueta">violaciones R1–R9</div></div>
                <div class="accent marigold stat"><div class="valor">{{ blandas() }}</div><div class="etiqueta">avisos B1–B6</div></div>
              </div>
              <div style="overflow-x:auto"><app-schedule-grid [sesiones]="sesiones()" [parametros]="store.parametrosDe(v)" /></div>
            }
          </div>

          <div class="stack" style="gap:16px">
            <div class="card">
              <div class="card-title"><h2>Registrar concepto</h2></div>
              <div class="stack" style="gap:8px">
                <label class="check"><input type="radio" name="c" value="FAVORABLE" [(ngModel)]="concepto" /> Concepto favorable</label>
                <label class="check"><input type="radio" name="c" value="CON_AJUSTES" [(ngModel)]="concepto" /> Requiere ajustes</label>
                <div class="field"><label>Observación</label><textarea rows="5" [(ngModel)]="texto" placeholder="Ej.: En 3.er semestre Programación II y Estructuras de datos quedaron el mismo día; sugerimos separarlas."></textarea></div>
                @if (error()) { <div class="errores">{{ error() }}</div> }
                <button class="btn btn-primary" (click)="registrar()"><app-icon name="send" [size]="16" /> Enviar al coordinador</button>
              </div>
            </div>
            <div class="card">
              <div class="card-title"><h2>Observaciones de esta versión</h2></div>
              @for (o of obs(); track o.id) {
                <div class="o">
                  <span class="pill" [class.green]="o.concepto === 'FAVORABLE'" [class.yellow]="o.concepto !== 'FAVORABLE'">{{ o.concepto === 'FAVORABLE' ? 'Favorable' : 'Requiere ajustes' }}</span>
                  <p>{{ o.texto }}</p>
                  <span class="caption">{{ o.autor }}{{ o.usuarioId === yo() ? ' (usted)' : '' }} · {{ fecha(o.fecha) }}</span>
                </div>
              } @empty { <p class="muted">Sin observaciones todavía.</p> }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .lock { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--ink-54); }
      .o { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--hairline); }
      .o:last-child { border-bottom: none; }
      .o .pill { align-self: flex-start; }
    `,
  ],
})
export class Revision {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly fecha = fechaCorta;
  protected readonly versiones = this.store.versionesPeriodo;
  protected readonly versionId = signal(this.store.versionTrabajo()?.id ?? this.store.versionPublicada()?.id ?? this.store.versionesPeriodo()[0]?.id ?? '');
  protected readonly versionesPeriodo = this.store.versionesPeriodo;
  protected readonly version = computed(() => {
    const l = this.store.versionesPeriodo();
    return l.find((v) => v.id === this.versionId()) ?? this.store.versionTrabajo() ?? this.store.versionPublicada() ?? l[0] ?? null;
  });
  protected readonly nivel = signal(1);
  protected readonly error = signal('');
  protected readonly yo = computed(() => this.sesion.actual()?.usuarioId);
  concepto: Observacion['concepto'] = 'CON_AJUSTES';
  texto = '';

  protected readonly sesiones = computed(() => {
    const cat = this.store.catalogo();
    return (this.version()?.sesiones ?? []).filter((s) => cat.curso(cat.grupo(s.grupoId)?.cursoId ?? '')?.nivel === this.nivel());
  });
  protected readonly violaciones = computed(() => (this.version() ? this.store.violacionesDe(this.version()!).length : 0));
  protected readonly blandas = computed(() => (this.version() ? this.store.blandasDe(this.version()!).length : 0));
  protected readonly obs = computed(() => this.store.observaciones().filter((o) => o.versionId === this.version()?.id).reverse());

  registrar() {
    const v = this.version();
    if (!v) return;
    const r = this.store.registrarObservacion(v.id, this.concepto, this.texto);
    if (!r.ok) {
      this.error.set(r.mensaje ?? 'Error');
      return;
    }
    this.error.set('');
    this.texto = '';
    this.toast.ok('Observación registrada', [`Quedó asociada a la versión ${v.numero} y visible para el coordinador.`]);
  }
}
