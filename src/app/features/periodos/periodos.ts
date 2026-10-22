// CU-03 Configurar periodo académico · RF-01, RF-02, RF-16
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParametrosProgramacion, VINCULACIONES } from '../../core/models';
import { cupoEfectivo } from '../../core/rules/reglas-duras';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-periodos',
  imports: [FormsModule, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-03 · RF-01 · RF-02 · RF-16</div>
          <h1>Periodos y parámetros</h1>
          <p class="serif sub">Cada periodo tiene su propio juego de parámetros. Cambiarlos no altera los horarios de otros periodos ni exige tocar el código.</p>
        </div>
        <button class="btn btn-primary" (click)="nuevo.set(true)"><app-icon name="plus" [size]="16" /> Nuevo periodo</button>
      </div>

      <div class="grid" style="grid-template-columns: 320px 1fr; align-items:start">
        <div class="card">
          <div class="card-title"><h2>Periodos</h2></div>
          <div class="stack" style="gap:6px">
            @for (p of store.periodos(); track p.id) {
              <button type="button" class="per" [class.on]="p.id === store.periodo().id" (click)="store.seleccionarPeriodo(p.id)">
                <strong>{{ p.codigo }}</strong>
                <span class="pill" [class.green]="p.estado === 'ABIERTO'">{{ p.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado' }}</span>
                <span class="caption">{{ grupos(p.id) }} grupos · {{ versiones(p.id) }} versiones</span>
              </button>
            }
          </div>
          <p class="caption" style="margin-top:12px">El periodo seleccionado es el que se usa en todas las pantallas (también se cambia desde la barra superior).</p>
        </div>

        <div class="card">
          <div class="card-title">
            <h2>Parámetros de {{ store.periodo().codigo }}</h2>
            @if (cerrado()) { <span class="pill">Periodo cerrado · solo lectura</span> }
          </div>

          <fieldset [disabled]="cerrado()">
            <h3 class="sec">Franja hábil y bloques (RF-01)</h3>
            <div class="form-grid">
              <div class="field"><label>Lunes a viernes · inicio</label><input type="number" [(ngModel)]="p().franjaLunesViernes.inicio" min="0" max="23" /></div>
              <div class="field"><label>Lunes a viernes · fin</label><input type="number" [(ngModel)]="p().franjaLunesViernes.fin" min="1" max="24" /></div>
              <div class="field"><label>Sábado · inicio</label><input type="number" [(ngModel)]="p().franjaSabado.inicio" min="0" max="23" /></div>
              <div class="field"><label>Sábado · fin</label><input type="number" [(ngModel)]="p().franjaSabado.fin" min="1" max="24" /></div>
              <div class="field"><label>Duración de la sesión (horas)</label><input type="number" [(ngModel)]="p().duracionSesion" min="1" max="4" /></div>
            </div>
            <div class="field" style="margin-top:12px">
              <label>Bloques no asignables</label>
              <div class="stack" style="gap:6px">
                @for (b of p().bloquesNoAsignables; track $index) {
                  <div class="row">
                    <input type="number" [(ngModel)]="b.inicio" style="width:90px" aria-label="inicio" /> <span>a</span>
                    <input type="number" [(ngModel)]="b.fin" style="width:90px" aria-label="fin" />
                    <button type="button" class="btn icon-btn" (click)="quitarBloque($index)" aria-label="Quitar"><app-icon name="x" [size]="14" /></button>
                  </div>
                }
                <button type="button" class="btn btn-sm" style="align-self:flex-start" (click)="agregarBloque()"><app-icon name="plus" [size]="14" /> Agregar bloque</button>
              </div>
            </div>

            <h3 class="sec">Aforo y frecuencia (RF-02)</h3>
            <div class="form-grid">
              <div class="field"><label>Cupo máximo por grupo</label><input type="number" [(ngModel)]="p().cupoMaximo" min="1" /></div>
              <div class="field"><label>Tolerancia (%)</label><input type="number" [(ngModel)]="p().toleranciaCupo" min="0" max="100" /></div>
              <div class="field"><label>Cupo mínimo para no cerrar</label><input type="number" [(ngModel)]="p().cupoMinimo" min="0" /></div>
              <div class="field"><label>Sesiones semanales mínimas</label><input type="number" [(ngModel)]="p().sesionesMinimas" min="1" /></div>
              <div class="field"><label>Sesiones semanales máximas</label><input type="number" [(ngModel)]="p().sesionesMaximas" min="1" /></div>
              <div class="field"><label>Cupo efectivo (R9)</label><input type="text" [value]="efectivo()" disabled /></div>
            </div>

            <h3 class="sec">Horas máximas de docencia por vinculación (R7)</h3>
            <div class="form-grid">
              @for (v of vinculaciones; track v.valor) {
                <div class="field"><label>{{ v.nombre }}</label><input type="number" [(ngModel)]="p().horasMaxPorVinculacion[v.valor]" min="0" /></div>
              }
            </div>
            <p class="caption" style="margin-top:6px">Valores de referencia del Estatuto Docente [confirmar con la Facultad].</p>
          </fieldset>

          @if (errores().length) {
            <div class="errores" style="margin-top:16px"><strong>Revise los parámetros</strong><ul>@for (e of errores(); track e) {<li>{{ e }}</li>}</ul></div>
          }
          @if (!cerrado()) {
            <div class="modal-foot">
              <button class="btn btn-ghost" (click)="recargar()">Descartar cambios</button>
              <button class="btn btn-primary" (click)="guardar()"><app-icon name="check" [size]="16" /> Guardar parámetros</button>
            </div>
          }
        </div>
      </div>
    </div>

    @if (nuevo()) {
      <app-modal titulo="Nuevo periodo académico" subtitulo="Copia los parámetros del periodo seleccionado; luego puede ajustarlos sin afectar a los demás." (cerrar)="nuevo.set(false)">
        <div class="form-grid">
          <div class="field"><label>Año</label><input type="number" [(ngModel)]="anio" /></div>
          <div class="field"><label>Semestre</label>
            <select [(ngModel)]="semestre"><option [ngValue]="1">1</option><option [ngValue]="2">2</option></select>
          </div>
        </div>
        <label class="check" style="margin-top:12px"><input type="checkbox" [(ngModel)]="copiar" /> Copiar la oferta y los grupos de {{ store.periodo().codigo }}</label>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="nuevo.set(false)">Cancelar</button>
          <button class="btn btn-primary" (click)="crear()">Crear periodo {{ anio }}-{{ semestre }}</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      fieldset { border: none; padding: 0; margin: 0; }
      .sec { font-size: 15px; margin: 20px 0 10px; }
      .sec:first-child { margin-top: 0; }
      .per { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; text-align: left; font: inherit; padding: 10px 12px;
        border-radius: 8px; border: 1px solid var(--hairline); background: #fff; cursor: pointer; }
      .per .caption { grid-column: 1 / -1; }
      .per.on { border-color: var(--color-notion-blue); background: var(--color-sky-tint); }
    `,
  ],
})
export class Periodos {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly vinculaciones = VINCULACIONES;
  protected readonly p = signal<ParametrosProgramacion>(structuredClone(this.store.parametros()));
  protected readonly errores = signal<string[]>([]);
  protected readonly nuevo = signal(false);
  protected readonly cerrado = computed(() => this.store.periodo().estado === 'CERRADO');
  anio = new Date().getFullYear() + 1;
  semestre: 1 | 2 = 1;
  copiar = true;

  constructor() {
    effect(() => {
      this.p.set(structuredClone(this.store.parametros()));
      this.errores.set([]);
    });
  }

  efectivo() {
    return `${cupoEfectivo(this.p())} estudiantes`;
  }
  grupos(pid: string) {
    return this.store.estado().grupos.filter((g) => g.periodoId === pid && g.estado === 'ABIERTO').length;
  }
  versiones(pid: string) {
    return this.store.estado().versiones.filter((v) => v.periodoId === pid).length;
  }
  agregarBloque() {
    this.p.update((x) => ({ ...x, bloquesNoAsignables: [...x.bloquesNoAsignables, { inicio: 12, fin: 13 }] }));
  }
  quitarBloque(i: number) {
    this.p.update((x) => ({ ...x, bloquesNoAsignables: x.bloquesNoAsignables.filter((_, j) => j !== i) }));
  }
  recargar() {
    this.p.set(structuredClone(this.store.parametros()));
    this.errores.set([]);
  }
  guardar() {
    const r = this.store.actualizarParametros(this.store.periodo().id, this.p());
    if (!r.ok) {
      this.errores.set(r.errores ?? [r.mensaje ?? 'Error']);
      return;
    }
    this.errores.set([]);
    this.toast.ok(`Parámetros de ${this.store.periodo().codigo} guardados`, ['Las validaciones R1–R9 usan los nuevos valores de inmediato.']);
  }
  crear() {
    const r = this.store.crearPeriodo(Number(this.anio), Number(this.semestre) as 1 | 2, this.copiar);
    if (!r.ok) {
      this.toast.error(r.mensaje ?? 'No se pudo crear');
      return;
    }
    this.nuevo.set(false);
    this.toast.ok(`Periodo ${r.valor!.codigo} creado y seleccionado`);
  }
}
