// Bitácora de auditoría · RF-15
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { aCsv, descargarArchivo, fechaCorta, nombreRol, normalizar } from '../../core/util';
import { Icon } from '../../shared/icon';
import { Rol } from '../../core/models';

@Component({
  selector: 'app-bitacora',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">RF-15 · RNF de trazabilidad</div>
          <h1>Bitácora</h1>
          <p class="serif sub">Toda creación, modificación, publicación y rechazo queda registrada con usuario, rol y marca de tiempo. No se puede editar.</p>
        </div>
        <button class="btn btn-ghost" (click)="exportar()"><app-icon name="download" [size]="16" /> Exportar CSV</button>
      </div>
      <div class="row" style="margin-bottom:14px">
        <input type="search" placeholder="Buscar en acción, detalle o usuario…" [ngModel]="q()" (ngModelChange)="q.set($event)" style="max-width:340px" />
        <select [ngModel]="accion()" (ngModelChange)="accion.set($event)" aria-label="Acción">
          <option value="">Todas las acciones</option>
          @for (a of acciones(); track a) { <option [value]="a">{{ a }}</option> }
        </select>
        <span class="caption">{{ lista().length }} registro(s)</span>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th style="width:170px">Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>
            @for (b of lista().slice(0, limite()); track b.id) {
              <tr>
                <td class="caption">{{ fecha(b.fecha) }}</td>
                <td><strong>{{ b.usuario }}</strong><div class="caption">{{ rol(b.rol) }}</div></td>
                <td><span class="pill" [class.red]="b.accion.includes('rechaz') || b.accion.includes('bloqueada')" [class.green]="b.accion.includes('Publicación de')">{{ b.accion }}</span></td>
                <td>{{ b.detalle }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (lista().length > limite()) {
        <button class="btn btn-sm" style="margin-top:12px" (click)="limite.set(limite() + 100)">Ver más</button>
      }
    </div>
  `,
})
export class Bitacora {
  protected readonly store = inject(StoreService);
  protected readonly fecha = fechaCorta;
  protected readonly q = signal('');
  protected readonly accion = signal('');
  protected readonly limite = signal(100);
  protected readonly acciones = computed(() => [...new Set(this.store.bitacora().map((b) => b.accion))].sort());
  protected readonly lista = computed(() => {
    const q = normalizar(this.q());
    return this.store.bitacora().filter((b) => (!this.accion() || b.accion === this.accion()) && (!q || normalizar(`${b.accion} ${b.detalle} ${b.usuario}`).includes(q)));
  });
  rol(r: Rol | 'SISTEMA') {
    return r === 'SISTEMA' ? 'Sistema' : nombreRol(r);
  }
  exportar() {
    descargarArchivo('bitacora.csv', aCsv([['fecha', 'usuario', 'rol', 'accion', 'detalle'], ...this.lista().map((b) => [b.fecha, b.usuario, b.rol, b.accion, b.detalle])]));
  }
}
