// CU-17 Cerrar grupos · RF-21
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Grupo } from '../../core/models';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-inscritos',
  imports: [FormsModule, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-17 · RF-21</div>
          <h1>Inscritos y cierre de grupos</h1>
          <p class="serif sub">Al cerrar inscripciones, registre los inscritos por grupo. Los grupos con menos de {{ min() }} estudiantes se pueden cerrar; su docente y su aula quedan libres. La reubicación de estudiantes se decide fuera del sistema.</p>
        </div>
        <button class="btn btn-ghost" (click)="simular()"><app-icon name="wand" [size]="16" /> Simular inscritos</button>
      </div>

      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="accent tint stat"><div class="valor">{{ abiertos().length }}</div><div class="etiqueta">grupos abiertos</div></div>
        <div class="accent sky stat"><div class="valor">{{ registrados() }}</div><div class="etiqueta">con inscritos registrados</div></div>
        <div class="accent coral stat"><div class="valor">{{ bajo().length }}</div><div class="etiqueta">por debajo del mínimo ({{ min() }})</div></div>
        <div class="accent midnight stat"><div class="valor">{{ cerrados().length }}</div><div class="etiqueta">grupos cerrados</div></div>
      </div>

      <div class="row" style="margin-bottom:12px">
        <label class="check"><input type="checkbox" [ngModel]="soloBajo()" (ngModelChange)="soloBajo.set($event)" /> Mostrar solo los grupos por debajo del mínimo</label>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Grupo</th><th>Jornada</th><th class="num">Cupo planeado</th><th class="num" style="width:130px">Inscritos</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (g of lista(); track g.id) {
              <tr [class.bajo]="esBajo(g)" [class.cerr]="g.estado === 'CERRADO'">
                <td><strong>{{ store.etiquetaGrupo(g.id) }}</strong></td>
                <td>{{ g.jornada === 'DIURNA' ? 'Diurna' : 'Nocturna' }}</td>
                <td class="num">{{ g.cupoPlaneado }}</td>
                <td class="num">
                  @if (g.estado === 'ABIERTO') {
                    <input type="number" class="mini" min="0" [ngModel]="g.inscritos" (change)="registrar(g, $any($event.target).value)" [attr.aria-label]="'Inscritos ' + store.etiquetaGrupo(g.id)" />
                  } @else { {{ g.inscritos }} }
                </td>
                <td>
                  @if (g.estado === 'CERRADO') { <span class="pill dark">Cerrado</span> }
                  @else if (esBajo(g)) { <span class="pill red">Bajo el mínimo</span> }
                  @else if (g.inscritos === null) { <span class="pill">Sin registrar</span> }
                  @else { <span class="pill green">Se mantiene</span> }
                </td>
                <td style="text-align:right">
                  @if (esBajo(g)) { <button class="btn btn-sm btn-danger" (click)="confirmar.set(g)">Cerrar grupo</button> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted" style="text-align:center;padding:24px">No hay grupos para mostrar.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (confirmar(); as g) {
      <app-modal [titulo]="'Cerrar ' + store.etiquetaGrupo(g.id)" [subtitulo]="g.inscritos + ' inscritos de un mínimo de ' + min()" (cerrar)="confirmar.set(null)">
        <p>Se eliminarán sus <strong>{{ sesionesDe(g) }} sesión(es)</strong> de la versión de trabajo y de la publicada, liberando el docente y el aula en esos bloques. La acción queda en la bitácora.</p>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="confirmar.set(null)">Cancelar</button>
          <button class="btn btn-danger" (click)="cerrar(g)">Cerrar grupo</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .mini { width: 90px; padding: 5px 8px; text-align: right; }
      tr.bajo td { background: #fff6f4; }
      tr.cerr td { color: var(--ink-40); }
    `,
  ],
})
export class Inscritos {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly soloBajo = signal(false);
  protected readonly confirmar = signal<Grupo | null>(null);
  protected readonly min = computed(() => this.store.parametros().cupoMinimo);
  protected readonly abiertos = this.store.gruposAbiertos;
  protected readonly cerrados = computed(() => this.store.gruposPeriodo().filter((g) => g.estado === 'CERRADO'));
  protected readonly registrados = computed(() => this.abiertos().filter((g) => g.inscritos !== null).length);
  protected readonly bajo = computed(() => this.abiertos().filter((g) => this.esBajo(g)));
  protected readonly lista = computed(() => {
    const cat = this.store.catalogo();
    const base = this.soloBajo() ? this.bajo() : this.store.gruposPeriodo();
    return [...base].sort((a, b) => {
      const ca = cat.curso(a.cursoId)!, cb = cat.curso(b.cursoId)!;
      return ca.nivel - cb.nivel || ca.nombre.localeCompare(cb.nombre) || a.codigo.localeCompare(b.codigo);
    });
  });

  esBajo = (g: Grupo) => g.estado === 'ABIERTO' && g.inscritos !== null && g.inscritos < this.min();
  sesionesDe(g: Grupo) {
    return this.store.versionesPeriodo().filter((v) => v.estado !== 'ARCHIVADA').reduce((t, v) => t + v.sesiones.filter((s) => s.grupoId === g.id).length, 0);
  }
  registrar(g: Grupo, v: string) {
    const r = this.store.registrarInscritos(g.id, v === '' ? null : Number(v));
    if (!r.ok) this.toast.error(r.mensaje ?? 'Error');
  }
  simular() {
    this.store.simularInscritos();
    this.toast.info('Inscritos simulados', [`${this.bajo().length} grupo(s) quedaron por debajo del mínimo.`]);
  }
  cerrar(g: Grupo) {
    this.confirmar.set(null);
    const r = this.store.cerrarGrupo(g.id);
    if (r.ok) this.toast.ok('Grupo cerrado', [r.mensaje ?? '']);
    else this.toast.error(r.mensaje ?? 'No se pudo cerrar');
  }
}
