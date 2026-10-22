// CU-06 Gestionar cursos y aulas (cursos) · RF-05
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Caracteristica, CARACTERISTICAS, Curso } from '../../core/models';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreCaracteristica, normalizar, nuevoId } from '../../core/util';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-cursos',
  imports: [FormsModule, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-06 · RF-05</div>
          <h1>Cursos del plan de estudios</h1>
          <p class="serif sub">Plan de Ingeniería de Sistemas de la Universidad El Bosque: nivel, sesiones semanales y características de aula que exige cada curso.</p>
        </div>
        <button class="btn btn-primary" (click)="abrir(null)"><app-icon name="plus" [size]="16" /> Nuevo curso</button>
      </div>

      <div class="row" style="margin-bottom:14px">
        <input type="search" placeholder="Buscar curso o código…" [ngModel]="q()" (ngModelChange)="q.set($event)" style="max-width:320px" />
        <select [ngModel]="fNivel()" (ngModelChange)="fNivel.set(+$event)" aria-label="Semestre">
          <option [ngValue]="0">Todos los semestres</option>
          @for (n of [1,2,3,4,5,6,7,8,9]; track n) { <option [ngValue]="n">Semestre {{ n }}</option> }
        </select>
        <span class="caption">{{ lista().length }} curso(s)</span>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Curso</th><th class="num">Semestre</th><th class="num">Créditos</th><th class="num">Sesiones / semana</th><th>Aula requerida</th><th class="num">Demanda {{ store.periodo().codigo }}</th><th class="num">Grupos</th><th class="num">Docentes habilitados</th></tr></thead>
          <tbody>
            @for (c of lista(); track c.id) {
              <tr class="clickable" (click)="abrir(c)">
                <td class="mono">{{ c.codigo }}</td>
                <td><span class="dot" [style.background]="'var(--nivel-' + c.nivel + ')'"></span><strong>{{ c.nombre }}</strong></td>
                <td class="num">{{ c.nivel }}</td>
                <td class="num">{{ c.creditos }}</td>
                <td class="num">{{ c.sesionesSemanales }} × {{ store.parametros().duracionSesion }} h</td>
                <td>
                  @for (x of c.caracteristicasRequeridas; track x) { <span class="pill blue" style="margin-right:4px">{{ car(x) }}</span> }
                  @empty { <span class="muted">Aula estándar</span> }
                </td>
                <td class="num">{{ demanda(c.id) ?? '—' }}</td>
                <td class="num">{{ grupos(c.id) }}</td>
                <td class="num" [class.rojo]="!habilitados(c.id)">{{ habilitados(c.id) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (edit(); as e) {
      <app-modal [titulo]="esNuevo() ? 'Nuevo curso' : e.nombre" [subtitulo]="e.codigo" (cerrar)="edit.set(null)">
        <div class="form-grid">
          <div class="field"><label>Código</label><input type="text" [(ngModel)]="e.codigo" /></div>
          <div class="field"><label>Nombre</label><input type="text" [(ngModel)]="e.nombre" /></div>
          <div class="field"><label>Semestre (nivel)</label><input type="number" [(ngModel)]="e.nivel" min="1" max="10" /></div>
          <div class="field"><label>Créditos</label><input type="number" [(ngModel)]="e.creditos" min="0" /></div>
          <div class="field"><label>Sesiones semanales ({{ store.parametros().sesionesMinimas }}–{{ store.parametros().sesionesMaximas }})</label><input type="number" [(ngModel)]="e.sesionesSemanales" /></div>
          <div class="field"><label>Demanda estimada en {{ store.periodo().codigo }}</label><input type="number" [(ngModel)]="dem" min="0" /></div>
        </div>
        <div class="field" style="margin-top:12px">
          <label>Características de aula requeridas (R4)</label>
          @for (c of caracteristicas; track c.valor) {
            <label class="check"><input type="checkbox" [checked]="e.caracteristicasRequeridas.includes(c.valor)" (change)="toggle(e, c.valor)" /> {{ c.nombre }}</label>
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
  styles: [`.dot { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:8px; } .rojo { color: var(--color-vermillion); font-weight:600; }`],
})
export class Cursos {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly caracteristicas = CARACTERISTICAS;
  protected readonly car = nombreCaracteristica;
  protected readonly q = signal('');
  protected readonly fNivel = signal(0);
  protected readonly edit = signal<Curso | null>(null);
  protected readonly esNuevo = signal(false);
  protected readonly errores = signal<string[]>([]);
  protected dem: number | null = null;

  protected readonly lista = computed(() => {
    const q = normalizar(this.q());
    return [...this.store.cursos()]
      .filter((c) => (!q || normalizar(c.nombre).includes(q) || c.codigo.toLowerCase().includes(q)) && (!this.fNivel() || c.nivel === this.fNivel()))
      .sort((a, b) => a.nivel - b.nivel || a.codigo.localeCompare(b.codigo));
  });

  demanda(id: string) {
    return this.store.ofertasPeriodo().find((o) => o.cursoId === id)?.demandaEstimada ?? null;
  }
  grupos(id: string) {
    return this.store.gruposAbiertos().filter((g) => g.cursoId === id).length;
  }
  habilitados(id: string) {
    return this.store.docentes().filter((d) => d.habilitaciones.includes(id)).length;
  }
  abrir(c: Curso | null) {
    this.errores.set([]);
    this.esNuevo.set(!c);
    this.dem = c ? this.demanda(c.id) : null;
    this.edit.set(c ? structuredClone(c) : { id: nuevoId('cur'), codigo: '', nombre: '', nivel: 1, creditos: 3, sesionesSemanales: 2, caracteristicasRequeridas: [] });
  }
  toggle(e: Curso, c: Caracteristica) {
    e.caracteristicasRequeridas = e.caracteristicasRequeridas.includes(c) ? e.caracteristicasRequeridas.filter((x) => x !== c) : [...e.caracteristicasRequeridas, c];
  }
  guardar(e: Curso) {
    const r = this.store.guardarCurso(
      { ...e, nivel: Number(e.nivel), creditos: Number(e.creditos), sesionesSemanales: Number(e.sesionesSemanales) },
      this.dem === null || (this.dem as unknown) === '' ? null : Number(this.dem),
    );
    if (!r.ok) {
      this.errores.set(r.errores ?? [r.mensaje ?? 'Error']);
      return;
    }
    this.edit.set(null);
    this.toast.ok(`Curso ${e.nombre} guardado`);
  }
}
