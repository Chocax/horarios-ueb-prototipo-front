// CU-04 Gestionar docentes · CU-05 Registrar disponibilidad · RF-03, RF-04
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BloqueDisponible, Docente, VINCULACIONES, Vinculacion } from '../../core/models';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { cortoVinculacion, normalizar, nuevoId } from '../../core/util';
import { DisponibilidadEditor } from '../../shared/disponibilidad-editor';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

export const ESCALAFON = ['Instructor', 'Auxiliar', 'Asistente', 'Asociado', 'Titular'];

@Component({
  selector: 'app-docentes',
  imports: [FormsModule, Icon, Modal, DisponibilidadEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-04 · CU-05 · RF-03 · RF-04</div>
          <h1>Docentes</h1>
          <p class="serif sub">Vinculación, horas máximas, cursos que puede orientar y disponibilidad semanal de cada docente.</p>
        </div>
        <button class="btn btn-primary" (click)="abrir(null)"><app-icon name="plus" [size]="16" /> Nuevo docente</button>
      </div>

      <div class="row" style="margin-bottom:14px">
        <input type="search" placeholder="Buscar por nombre o identificador…" [ngModel]="q()" (ngModelChange)="q.set($event)" style="max-width:340px" />
        <select [ngModel]="fVinc()" (ngModelChange)="fVinc.set($event)" aria-label="Vinculación">
          <option value="">Todas las vinculaciones</option>
          @for (v of vinculaciones; track v.valor) { <option [value]="v.valor">{{ v.nombre }}</option> }
        </select>
        <span class="caption">{{ lista().length }} docente(s)</span>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Docente</th><th>Vinculación</th><th>Escalafón</th><th class="num">Horas máx.</th><th>Carga en {{ etiquetaVersion() }}</th><th class="num">Cursos habilitados</th><th class="num">Horas disponibles</th></tr></thead>
          <tbody>
            @for (d of lista(); track d.id) {
              <tr class="clickable" (click)="abrir(d)">
                <td><strong>{{ d.nombre }}</strong><div class="caption">{{ d.identificador }} · {{ d.correoInstitucional }}</div></td>
                <td><span class="pill">{{ corto(d.tipoVinculacion) }}</span></td>
                <td>{{ d.categoriaEscalafon }}</td>
                <td class="num">{{ d.horasMaxDocencia }}</td>
                <td style="min-width:160px">
                  <div class="row" style="gap:8px;flex-wrap:nowrap">
                    <div class="barra" [class.alta]="pct(d) >= 100" [class.media]="pct(d) >= 75 && pct(d) < 100" style="flex:1"><span [style.width.%]="min(pct(d), 100)"></span></div>
                    <span class="caption">{{ carga(d) }}/{{ d.horasMaxDocencia }} h</span>
                  </div>
                </td>
                <td class="num">{{ d.habilitaciones.length }}</td>
                <td class="num" [class.rojo]="!d.disponibilidad.length">{{ horasDisp(d) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (edit(); as e) {
      <app-modal [titulo]="esNuevo() ? 'Nuevo docente' : e.nombre" [subtitulo]="esNuevo() ? 'Registre los datos básicos; luego habilitaciones y disponibilidad.' : e.identificador + ' · ' + e.correoInstitucional" [ancho]="true" (cerrar)="edit.set(null)">
        <div class="tabs" style="margin-bottom:18px">
          <button [class.on]="tab() === 'datos'" (click)="tab.set('datos')">Datos</button>
          <button [class.on]="tab() === 'hab'" (click)="tab.set('hab')">Cursos habilitados ({{ e.habilitaciones.length }})</button>
          <button [class.on]="tab() === 'disp'" (click)="tab.set('disp')">Disponibilidad</button>
        </div>

        @switch (tab()) {
          @case ('datos') {
            <div class="form-grid">
              <div class="field"><label>Identificador</label><input type="text" [(ngModel)]="e.identificador" /></div>
              <div class="field"><label>Nombre completo</label><input type="text" [(ngModel)]="e.nombre" /></div>
              <div class="field"><label>Correo institucional</label><input type="email" [(ngModel)]="e.correoInstitucional" /></div>
              <div class="field"><label>Tipo de vinculación</label>
                <select [ngModel]="e.tipoVinculacion" (ngModelChange)="cambiarVinculacion(e, $event)">
                  <option [ngValue]="null" disabled>Seleccione…</option>
                  @for (v of vinculaciones; track v.valor) { <option [ngValue]="v.valor">{{ v.nombre }}</option> }
                </select>
              </div>
              <div class="field"><label>Categoría de escalafón</label>
                <select [(ngModel)]="e.categoriaEscalafon">@for (c of escalafon; track c) { <option [value]="c">{{ c }}</option> }</select>
              </div>
              <div class="field"><label>Horas máximas de docencia directa</label><input type="number" [(ngModel)]="e.horasMaxDocencia" />
                <span class="caption">Se toman por defecto de la vinculación (parámetros del periodo).</span></div>
            </div>
          }
          @case ('hab') {
            <div class="row" style="margin-bottom:10px">
              <input type="search" placeholder="Filtrar cursos…" [ngModel]="qCurso()" (ngModelChange)="qCurso.set($event)" style="max-width:300px" />
              <span class="caption">Solo los docentes habilitados aparecen como opción para un curso (R5).</span>
            </div>
            <div class="niveles">
              @for (n of niveles(); track n.nivel) {
                <div>
                  <div class="nivel"><span class="dot" [style.background]="'var(--nivel-' + n.nivel + ')'"></span> Semestre {{ n.nivel }}</div>
                  @for (c of n.cursos; track c.id) {
                    <label class="check"><input type="checkbox" [checked]="e.habilitaciones.includes(c.id)" (change)="toggleHab(e, c.id)" /> {{ c.nombre }}</label>
                  }
                </div>
              }
            </div>
          }
          @case ('disp') {
            <app-disponibilidad-editor [bloques]="e.disponibilidad" [parametros]="store.parametros()" (cambio)="disp = $event; e.disponibilidad = $event" />
          }
        }

        @if (errores().length) {
          <div class="errores" style="margin-top:16px"><ul>@for (x of errores(); track x) {<li>{{ x }}</li>}</ul></div>
        }
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="edit.set(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="guardar(e)"><app-icon name="check" [size]="16" /> Guardar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .rojo { color: var(--color-vermillion); font-weight: 600; }
      .niveles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-height: 52vh; overflow: auto; }
      @media (max-width: 760px) { .niveles { grid-template-columns: 1fr; } }
      .nivel { font-size: 12px; font-weight: 600; color: var(--ink-54); margin: 4px 0 6px; display: flex; align-items: center; gap: 6px; }
      .dot { width: 10px; height: 10px; border-radius: 3px; }
      .check { font-size: 13px; padding: 3px 0; }
    `,
  ],
})
export class Docentes {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly vinculaciones = VINCULACIONES;
  protected readonly escalafon = ESCALAFON;
  protected readonly corto = cortoVinculacion;
  protected readonly min = Math.min;

  protected readonly q = signal('');
  protected readonly fVinc = signal('');
  protected readonly qCurso = signal('');
  protected readonly edit = signal<Docente | null>(null);
  protected readonly esNuevo = signal(false);
  protected readonly tab = signal<'datos' | 'hab' | 'disp'>('datos');
  protected readonly errores = signal<string[]>([]);
  protected disp: BloqueDisponible[] | null = null;
  private dispOriginal: BloqueDisponible[] = [];

  private readonly versionRef = computed(() => this.store.versionTrabajo() ?? this.store.versionPublicada());
  protected readonly etiquetaVersion = computed(() => {
    const v = this.versionRef();
    return v ? `v${v.numero}` : 'el horario (sin versión)';
  });

  protected readonly lista = computed(() => {
    const q = normalizar(this.q());
    return this.store
      .docentes()
      .filter((d) => (!q || normalizar(d.nombre).includes(q) || d.identificador.toLowerCase().includes(q)) && (!this.fVinc() || d.tipoVinculacion === this.fVinc()));
  });

  protected readonly niveles = computed(() => {
    const q = normalizar(this.qCurso());
    const m = new Map<number, { nivel: number; cursos: { id: string; nombre: string }[] }>();
    for (const c of this.store.cursos()) {
      if (q && !normalizar(c.nombre).includes(q)) continue;
      if (!m.has(c.nivel)) m.set(c.nivel, { nivel: c.nivel, cursos: [] });
      m.get(c.nivel)!.cursos.push(c);
    }
    return [...m.values()].sort((a, b) => a.nivel - b.nivel);
  });

  carga(d: Docente) {
    return this.store.cargaDocente(this.versionRef(), d.id);
  }
  pct(d: Docente) {
    return d.horasMaxDocencia ? Math.round((this.carga(d) / d.horasMaxDocencia) * 100) : 0;
  }
  horasDisp(d: Docente) {
    return d.disponibilidad.reduce((t, b) => t + (b.fin - b.inicio), 0);
  }

  abrir(d: Docente | null) {
    this.errores.set([]);
    this.disp = null;
    this.tab.set('datos');
    this.esNuevo.set(!d);
    this.dispOriginal = d ? structuredClone(d.disponibilidad) : [];
    this.edit.set(
      d
        ? structuredClone(d)
        : {
            id: nuevoId('doc'),
            identificador: `D${1000 + this.store.docentes().length + 1}`,
            nombre: '',
            correoInstitucional: '',
            tipoVinculacion: null as unknown as Vinculacion,
            categoriaEscalafon: 'Asistente',
            horasMaxDocencia: 0,
            habilitaciones: [],
            disponibilidad: [],
          },
    );
  }

  cambiarVinculacion(e: Docente, v: Vinculacion) {
    e.tipoVinculacion = v;
    e.horasMaxDocencia = this.store.parametros().horasMaxPorVinculacion[v];
  }
  toggleHab(e: Docente, cursoId: string) {
    e.habilitaciones = e.habilitaciones.includes(cursoId) ? e.habilitaciones.filter((x) => x !== cursoId) : [...e.habilitaciones, cursoId];
    this.edit.set({ ...e });
  }

  guardar(e: Docente) {
    const final = { ...e, horasMaxDocencia: Number(e.horasMaxDocencia), disponibilidad: this.dispOriginal };
    const r = this.store.guardarDocente(final);
    if (!r.ok) {
      this.errores.set(r.errores ?? [r.mensaje ?? 'Error']);
      this.tab.set('datos');
      return;
    }
    if (this.disp) this.store.actualizarDisponibilidad(e.id, this.disp);
    this.edit.set(null);
    this.toast.ok(`Docente ${final.nombre} guardado`);
  }
}
