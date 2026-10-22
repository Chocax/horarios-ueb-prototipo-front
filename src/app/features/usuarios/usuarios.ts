// CU-02 Gestionar usuarios y roles · RF-22
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLES, Usuario } from '../../core/models';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreRol, nuevoId } from '../../core/util';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-02 · RF-22</div>
          <h1>Usuarios y roles</h1>
          <p class="serif sub">Cree usuarios, asígneles un rol y desactívelos cuando dejen la institución. Un usuario desactivado no puede iniciar sesión; todo cambio de rol queda en la bitácora.</p>
        </div>
        <button class="btn btn-primary" (click)="abrir(null)"><app-icon name="plus" [size]="16" /> Nuevo usuario</button>
      </div>

      <div class="grid cols-4" style="margin-bottom:16px">
        @for (r of roles; track r.valor) {
          <div class="accent stat" [class.marigold]="r.valor === 'COORDINADOR'" [class.tint]="r.valor === 'COMITE'" [class.peach]="r.valor === 'DOCENTE'" [class.midnight]="r.valor === 'ADMINISTRADOR'">
            <div class="valor">{{ cuenta(r.valor) }}</div><div class="etiqueta">{{ r.nombre }}</div>
          </div>
        }
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Docente vinculado</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (u of lista(); track u.id) {
              <tr [class.inactivo]="!u.activo">
                <td><strong>{{ u.nombre }}</strong></td>
                <td class="mono">{{ u.correo }}</td>
                <td><span class="pill">{{ rol(u.rol) }}</span></td>
                <td>{{ u.docenteId ? docente(u.docenteId) : '—' }}</td>
                <td>@if (u.activo) { <span class="pill green">Activo</span> } @else { <span class="pill red">Desactivado</span> }</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-sm btn-ghost" (click)="abrir(u)">Editar</button>
                  <button class="btn btn-sm" (click)="alternar(u)" [disabled]="u.id === yo()">{{ u.activo ? 'Desactivar' : 'Activar' }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (edit(); as e) {
      <app-modal [titulo]="esNuevo() ? 'Nuevo usuario' : e.nombre" [subtitulo]="esNuevo() ? 'La contraseña se guarda como resumen (hash), nunca en texto plano.' : e.correo" (cerrar)="edit.set(null)">
        <div class="form-grid">
          <div class="field"><label>Nombre</label><input type="text" [(ngModel)]="e.nombre" /></div>
          <div class="field"><label>Correo institucional</label><input type="email" [(ngModel)]="e.correo" /></div>
          <div class="field"><label>Rol</label>
            <select [(ngModel)]="e.rol" [disabled]="e.id === yo()">@for (r of roles; track r.valor) { <option [value]="r.valor">{{ r.nombre }}</option> }</select>
          </div>
          @if (e.rol === 'DOCENTE') {
            <div class="field"><label>Docente vinculado</label>
              <select [(ngModel)]="e.docenteId"><option [ngValue]="undefined">Sin vincular</option>@for (d of store.docentes(); track d.id) { <option [ngValue]="d.id">{{ d.nombre }}</option> }</select>
            </div>
          }
          <div class="field"><label>{{ esNuevo() ? 'Contraseña inicial' : 'Nueva contraseña (opcional)' }}</label><input type="password" [(ngModel)]="clave" autocomplete="new-password" /></div>
        </div>
        <label class="check" style="margin-top:12px"><input type="checkbox" [(ngModel)]="e.activo" [disabled]="e.id === yo()" /> Usuario activo</label>
        @if (errores().length) { <div class="errores" style="margin-top:14px"><ul>@for (x of errores(); track x) {<li>{{ x }}</li>}</ul></div> }
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="edit.set(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="guardar(e)">Guardar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`tr.inactivo td { color: var(--ink-40); }`],
})
export class Usuarios {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly roles = ROLES;
  protected readonly rol = nombreRol;
  protected readonly edit = signal<Usuario | null>(null);
  protected readonly esNuevo = signal(false);
  protected readonly errores = signal<string[]>([]);
  protected readonly yo = computed(() => this.sesion.actual()?.usuarioId);
  protected clave = '';
  protected readonly lista = computed(() => [...this.store.usuarios()].sort((a, b) => a.rol.localeCompare(b.rol) || a.nombre.localeCompare(b.nombre)));

  cuenta(r: string) {
    return this.store.usuarios().filter((u) => u.rol === r && u.activo).length;
  }
  docente(id: string) {
    return this.store.catalogo().docente(id)?.nombre ?? '—';
  }
  abrir(u: Usuario | null) {
    this.errores.set([]);
    this.clave = '';
    this.esNuevo.set(!u);
    this.edit.set(u ? { ...u } : { id: nuevoId('usr'), nombre: '', correo: '', hashClave: '', rol: 'DOCENTE', activo: true });
  }
  alternar(u: Usuario) {
    const r = this.store.guardarUsuario({ ...u, activo: !u.activo });
    if (r.ok) this.toast.ok(`${u.nombre} ${u.activo ? 'desactivado' : 'activado'}`);
  }
  guardar(e: Usuario) {
    const final = { ...e, docenteId: e.rol === 'DOCENTE' ? e.docenteId : undefined };
    const r = this.store.guardarUsuario(final, this.clave || undefined);
    if (!r.ok) {
      this.errores.set(r.errores ?? [r.mensaje ?? 'Error']);
      return;
    }
    this.edit.set(null);
    this.toast.ok(`Usuario ${e.nombre} guardado`);
  }
}
