// CU-06 Gestionar cursos y aulas (aulas) · RF-06
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Aula, Caracteristica, CARACTERISTICAS } from '../../core/models';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreCaracteristica, nuevoId } from '../../core/util';
import { BLOQUES } from '../../core/data/seed';

const bloqueDe = (a: Aula) => a.bloque ?? a.codigo.split('-')[0].toUpperCase();
const pisoDe = (a: Aula) => a.piso ?? (Number(a.codigo.split('-')[1]?.[0]) || undefined);
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-aulas',
  imports: [FormsModule, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-06 · RF-06</div>
          <h1>Aulas</h1>
          <p class="serif sub">Salones que usa la Facultad de Ingeniería por bloque y piso, con su capacidad y características (salas de cómputo, mobiliario móvil, laboratorios de redes y de física).</p>
        </div>
        <button class="btn btn-primary" (click)="abrir(null)"><app-icon name="plus" [size]="16" /> Nueva aula</button>
      </div>

      <div class="bloques">
        @for (b of bloques; track b.codigo) {
          <button type="button" class="bloque" [class.on]="fBloque() === b.codigo" (click)="fBloque.set(fBloque() === b.codigo ? '' : b.codigo)">
            <div class="row between"><strong>{{ b.nombre }}</strong><span class="pill">{{ porBloque(b.codigo) }} aulas</span></div>
            <p>{{ b.descripcion }}</p>
          </button>
        }
      </div>

      <div class="row" style="margin:18px 0 12px">
        <select [ngModel]="fBloque()" (ngModelChange)="fBloque.set($event)" aria-label="Bloque">
          <option value="">Todos los bloques</option>
          @for (b of bloques; track b.codigo) { <option [value]="b.codigo">{{ b.nombre }}</option> }
        </select>
        <select [ngModel]="fTipo()" (ngModelChange)="fTipo.set($event)" aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="STD">Salón de sillas y tablero</option>
          @for (c of caracteristicas; track c.valor) { <option [value]="c.valor">{{ c.nombre }}</option> }
        </select>
        <span class="caption">{{ lista().length }} aula(s) · {{ capacidadTotal() }} puestos</span>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Ubicación</th><th class="num">Capacidad</th><th>Características</th><th>Ocupación en {{ etiqueta() }}</th></tr></thead>
          <tbody>
            @for (a of lista(); track a.id) {
              <tr class="clickable" (click)="abrir(a)">
                <td class="mono"><strong>{{ a.codigo }}</strong></td>
                <td>{{ a.nombre }}</td>
                <td class="caption">{{ ubicacion(a) }}</td>
                <td class="num">{{ a.capacidad }}</td>
                <td>@for (x of a.caracteristicas; track x) { <span class="pill blue" style="margin-right:4px">{{ car(x) }}</span> } @empty { <span class="muted">Estándar</span> }</td>
                <td style="min-width:200px">
                  <div class="row" style="gap:8px;flex-wrap:nowrap">
                    <div class="barra" style="flex:1"><span [style.width.%]="ocupacion(a.id)"></span></div>
                    <span class="caption">{{ ocupacion(a.id) }} %</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (edit(); as e) {
      <app-modal [titulo]="esNuevo() ? 'Nueva aula' : 'Aula ' + e.codigo" (cerrar)="edit.set(null)">
        <div class="form-grid">
          <div class="field"><label>Código</label><input type="text" [(ngModel)]="e.codigo" /></div>
          <div class="field"><label>Nombre</label><input type="text" [(ngModel)]="e.nombre" /></div>
          <div class="field"><label>Capacidad</label><input type="number" [(ngModel)]="e.capacidad" min="1" /></div>
        </div>
        <div class="field" style="margin-top:12px">
          <label>Características</label>
          @for (c of caracteristicas; track c.valor) {
            <label class="check"><input type="checkbox" [checked]="e.caracteristicas.includes(c.valor)" (change)="toggle(e, c.valor)" /> {{ c.nombre }}</label>
          }
        </div>
        @if (errores().length) {
          <div class="errores" style="margin-top:14px"><ul>@for (x of errores(); track x) {<li>{{ x }}</li>}</ul></div>
        }
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="edit.set(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="guardar(e)">Guardar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .bloques { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      @media (max-width: 1100px) { .bloques { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 640px) { .bloques { grid-template-columns: 1fr; } }
      .bloque { text-align: left; font: inherit; background: #fff; border: 1px solid var(--hairline); border-radius: var(--radius-cards); padding: 14px 16px; cursor: pointer;
        display: flex; flex-direction: column; gap: 6px; transition: border-color 200ms ease, background 200ms ease; }
      .bloque:hover { border-color: var(--color-notion-blue); }
      .bloque.on { border-color: var(--color-notion-blue); background: var(--color-sky-tint); }
      .bloque p { font-size: 13px; line-height: 1.45; color: var(--ink-60); margin: 0; }
    `,
  ],
})
export class Aulas {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly caracteristicas = CARACTERISTICAS;
  protected readonly car = nombreCaracteristica;
  protected readonly edit = signal<Aula | null>(null);
  protected readonly esNuevo = signal(false);
  protected readonly errores = signal<string[]>([]);

  protected readonly bloques = BLOQUES;
  protected readonly fBloque = signal('');
  protected readonly fTipo = signal('');
  protected readonly lista = computed(() =>
    [...this.store.aulas()]
      .filter((a) => !this.fBloque() || bloqueDe(a) === this.fBloque())
      .filter((a) => !this.fTipo() || (this.fTipo() === 'STD' ? !a.caracteristicas.length : a.caracteristicas.includes(this.fTipo() as Caracteristica)))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })),
  );
  protected readonly capacidadTotal = computed(() => this.lista().reduce((t, a) => t + a.capacidad, 0));
  private readonly ver = computed(() => this.store.versionTrabajo() ?? this.store.versionPublicada());
  protected readonly etiqueta = computed(() => (this.ver() ? `v${this.ver()!.numero}` : 'el horario'));
  private readonly horasSemana = computed(() => {
    const p = this.store.parametros();
    const bloq = p.bloquesNoAsignables.reduce((t, b) => t + (b.fin - b.inicio), 0);
    return 5 * (p.franjaLunesViernes.fin - p.franjaLunesViernes.inicio - bloq) + (p.franjaSabado.fin - p.franjaSabado.inicio);
  });

  porBloque(b: string) {
    return this.store.aulas().filter((a) => bloqueDe(a) === b).length;
  }
  ubicacion(a: Aula) {
    const b = bloqueDe(a);
    const piso = a.piso ?? pisoDe(a);
    const extra = b === 'A' && piso === 3 ? ' · Facultad de Ingeniería' : '';
    return piso ? `Bloque ${b}, piso ${piso}${extra}` : `Bloque ${b}`;
  }
  ocupacion(id: string) {
    const v = this.ver();
    if (!v) return 0;
    const h = v.sesiones.filter((s) => s.aulaId === id).length * this.store.parametrosDe(v).duracionSesion;
    return Math.round((h / this.horasSemana()) * 100);
  }
  abrir(a: Aula | null) {
    this.errores.set([]);
    this.esNuevo.set(!a);
    this.edit.set(a ? structuredClone(a) : { id: nuevoId('aula'), codigo: '', nombre: '', capacidad: 40, caracteristicas: [] });
  }
  toggle(e: Aula, c: Caracteristica) {
    e.caracteristicas = e.caracteristicas.includes(c) ? e.caracteristicas.filter((x) => x !== c) : [...e.caracteristicas, c];
  }
  guardar(e: Aula) {
    const r = this.store.guardarAula({ ...e, capacidad: Number(e.capacidad), bloque: bloqueDe(e), piso: pisoDe(e) });
    if (!r.ok) {
      this.errores.set(r.errores ?? [r.mensaje ?? 'Error']);
      return;
    }
    this.edit.set(null);
    this.toast.ok(`Aula ${e.codigo} guardada`);
  }
}
