// Ayuda: matriz de trazabilidad RF → CU → pantalla, reglas y prueba de permisos del "servidor" (RF-15).
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CASOS_USO, MATRIZ_RF, REGLAS_BLANDAS } from '../../core/data/trazabilidad';
import { REGLAS_DURAS } from '../../core/rules/reglas-duras';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreRol } from '../../core/util';
import { NAV } from '../../layout/nav';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-trazabilidad',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Ayuda</div>
          <h1>Trazabilidad</h1>
          <p class="serif sub">Cómo se cumple cada requerimiento funcional del documento de análisis y diseño: caso de uso, pantalla y prueba de aceptación.</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><h2>Prueba de permisos en el servidor (RF-15)</h2><span class="pill">Usted es: {{ rol() }}</span></div>
        <p class="muted" style="margin-bottom:12px">El menú oculta lo que su rol no puede hacer, pero además cada operación se valida en el servicio. Estos botones invocan operaciones directamente, como lo haría alguien que salta la interfaz:</p>
        <div class="row">
          <button class="btn btn-sm" (click)="probarMover()"><app-icon name="board" [size]="14" /> Mover una sesión</button>
          <button class="btn btn-sm" (click)="probarPublicar()"><app-icon name="send" [size]="14" /> Publicar la versión de trabajo</button>
          <button class="btn btn-sm" (click)="probarUsuario()"><app-icon name="shield" [size]="14" /> Cambiar el rol de un usuario</button>
        </div>
        <p class="caption" style="margin-top:8px">Si su rol no tiene permiso verá «Operación rechazada por el servidor» y el intento quedará en la bitácora.</p>
      </div>

      <div class="card" style="margin-bottom:16px;padding:0">
        <div class="tabla-wrap" style="border:none">
          <table class="tabla">
            <thead><tr><th>RF</th><th>Requerimiento</th><th>CU</th><th>Pantalla</th><th>Prueba de aceptación</th></tr></thead>
            <tbody>
              @for (f of matriz; track f.rf) {
                <tr>
                  <td class="mono"><strong>{{ f.rf }}</strong></td>
                  <td>{{ f.titulo }}</td>
                  <td class="mono">{{ f.cu }}</td>
                  <td>@for (p of f.pantallas; track p.ruta) { @if (puede(p.ruta)) { <a [routerLink]="p.ruta" class="lnk">{{ p.texto }}</a> } @else { <span class="muted lnk">{{ p.texto }}</span> } }</td>
                  <td class="caption">{{ f.prueba }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid cols-2" style="align-items:start">
        <div class="card">
          <div class="card-title"><h2>Casos de uso</h2></div>
          @for (c of casos; track c.cu) {
            <div class="fila"><span class="mono"><strong>{{ c.cu }}</strong></span><span style="flex:1">{{ c.nombre }}</span><span class="caption">{{ c.actor }}</span></div>
          }
        </div>
        <div class="card">
          <div class="card-title"><h2>Restricciones</h2></div>
          <div class="label" style="margin-bottom:6px">Duras (bloquean)</div>
          @for (r of duras; track r.codigo) { <div class="fila"><span class="regla">{{ r.codigo }}</span><span>{{ r.nombre }}</span></div> }
          <div class="label" style="margin:14px 0 6px">Blandas (se reportan)</div>
          @for (r of blandas; track r.codigo) { <div class="fila"><span class="regla blanda">{{ r.codigo }}</span><span>{{ r.nombre }}</span></div> }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .lnk { display: inline-block; margin-right: 10px; white-space: nowrap; }
      .fila { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 13.5px; }
      .fila:last-child { border-bottom: none; }
    `,
  ],
})
export class Trazabilidad {
  private readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly matriz = MATRIZ_RF;
  protected readonly casos = CASOS_USO;
  protected readonly duras = REGLAS_DURAS;
  protected readonly blandas = REGLAS_BLANDAS;
  protected readonly rol = computed(() => (this.sesion.actual() ? nombreRol(this.sesion.actual()!.rol) : ''));

  puede(ruta: string) {
    const r = this.sesion.actual()?.rol;
    if (ruta === '/login') return false;
    const item = NAV.find((i) => i.ruta === ruta);
    return !!r && !!item && item.roles.includes(r);
  }

  // Las excepciones AccionNoPermitida las atrapa el ErrorHandler global y las muestra como aviso.
  probarMover() {
    const v = this.store.versionTrabajo() ?? this.store.versionPublicada();
    if (!v) return this.toast.info('No hay versiones en este periodo para probar.');
    const s = v.sesiones[0];
    const r = this.store.moverSesion(v.id, s.id, { dia: s.dia, inicio: s.inicio });
    this.toast.info('El servidor aceptó la operación', [r.ok ? 'Su rol tiene permiso (la sesión quedó igual).' : r.mensaje ?? '']);
  }
  probarPublicar() {
    const v = this.store.versionTrabajo() ?? this.store.versionPublicada();
    if (!v) return this.toast.info('No hay versiones en este periodo para probar.');
    const r = this.store.publicarVersion(v.id);
    this.toast.info('El servidor aceptó la operación', [r.ok ? 'Versión publicada.' : `Su rol tiene permiso, pero la publicación se bloqueó: ${r.errores?.length ?? 0} causa(s).`]);
  }
  probarUsuario() {
    const u = this.store.usuarios().find((x) => x.id === 'usr-comite2') ?? this.store.usuarios()[0];
    const r = this.store.guardarUsuario({ ...u });
    this.toast.info('El servidor aceptó la operación', [r.ok ? 'Su rol tiene permiso (el usuario quedó igual).' : r.mensaje ?? '']);
  }
}
