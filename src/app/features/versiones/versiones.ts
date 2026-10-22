// CU-14 Publicar horario · CU-15 Restaurar versión · RF-12 (y lectura de observaciones RF-20)
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VersionHorario } from '../../core/models';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { fechaCorta } from '../../core/util';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-versiones',
  imports: [RouterLink, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-14 · CU-15 · RF-12 · RF-20</div>
          <h1>Versiones y publicación</h1>
          <p class="serif sub">Solo una versión de trabajo por periodo. La publicación se bloquea si hay grupos pendientes o violaciones de R1–R9; restaurar crea un borrador nuevo sin tocar la publicada.</p>
        </div>
        <a class="btn btn-ghost" routerLink="/tablero"><app-icon name="board" [size]="16" /> Ir al tablero</a>
      </div>

      @for (v of store.versionesPeriodo(); track v.id) {
        <div class="card version" [class.pub]="v.estado === 'PUBLICADA'" [class.bor]="v.estado === 'BORRADOR'">
          <div class="cab">
            <div class="num">v{{ v.numero }}</div>
            <div style="flex:1;min-width:0">
              <div class="row" style="gap:8px">
                <span class="pill" [class.green]="v.estado === 'PUBLICADA'" [class.yellow]="v.estado === 'BORRADOR'">{{ estado(v) }}</span>
                <span class="caption">{{ v.origen }}</span>
              </div>
              <div class="caption" style="margin-top:4px">Creada por {{ v.autor }} · {{ fecha(v.fechaCreacion) }}@if (v.fechaPublicacion) { · publicada {{ fecha(v.fechaPublicacion) }} }</div>
            </div>
            <div class="kpis">
              <div><strong>{{ v.sesiones.length }}</strong><span class="caption">sesiones</span></div>
              <div><strong [class.rojo]="v.pendientes.length">{{ v.pendientes.length }}</strong><span class="caption">pendientes</span></div>
              <div><strong [class.rojo]="viol(v)">{{ viol(v) }}</strong><span class="caption">violaciones</span></div>
              <div><strong>{{ obs(v).length }}</strong><span class="caption">observaciones</span></div>
            </div>
            <div class="row" style="gap:6px">
              @if (v.estado === 'BORRADOR') {
                <button class="btn btn-primary btn-sm" (click)="publicar(v)"><app-icon name="send" [size]="14" /> Publicar</button>
              } @else {
                <button class="btn btn-sm" (click)="restaurar(v)" [disabled]="store.periodo().estado === 'CERRADO'"><app-icon name="undo" [size]="14" /> Restaurar como borrador</button>
              }
              <button class="btn btn-sm btn-ghost" (click)="ver(v)"><app-icon name="eye" [size]="14" /> Ver</button>
            </div>
          </div>
          @if (obs(v).length) {
            <div class="obs">
              @for (o of obs(v); track o.id) {
                <div class="o">
                  <span class="pill" [class.green]="o.concepto === 'FAVORABLE'" [class.yellow]="o.concepto !== 'FAVORABLE'">{{ o.concepto === 'FAVORABLE' ? 'Concepto favorable' : 'Requiere ajustes' }}</span>
                  <p>{{ o.texto }}</p>
                  <span class="caption">{{ o.autor }} · Comité · {{ fecha(o.fecha) }}</span>
                </div>
              }
            </div>
          }
        </div>
      } @empty {
        <div class="card vacio"><h3>No hay versiones en {{ store.periodo().codigo }}</h3><p>Genere la primera propuesta desde el tablero.</p>
          <a class="btn btn-primary" routerLink="/tablero" style="margin-top:12px">Ir al tablero</a></div>
      }
    </div>

    @if (bloqueo(); as b) {
      <app-modal [titulo]="b.titulo" subtitulo="Resuelva estas causas en el tablero y vuelva a intentarlo (RNF-05: ninguna versión publicada puede tener violaciones duras)." (cerrar)="bloqueo.set(null)">
        <div class="errores"><ul>@for (c of b.causas; track $index) { <li>{{ c }}</li> }</ul></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="bloqueo.set(null)">Cerrar</button>
          <a class="btn btn-primary" routerLink="/tablero" (click)="bloqueo.set(null)">Resolver en el tablero</a>
        </div>
      </app-modal>
    }
    @if (confirmar(); as v) {
      <app-modal [titulo]="'Publicar la versión ' + v.numero" subtitulo="Pasará a ser el horario oficial del periodo; la publicada anterior queda archivada." (cerrar)="confirmar.set(null)">
        @if (!obs(v).length) {
          <div class="aviso warn"><app-icon name="alert" [size]="18" /><div>Esta versión aún no tiene concepto del comité. Puede publicarla, pero el proceso recomienda esperar su revisión.</div></div>
        }
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="confirmar.set(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="hacerPublicar(v)"><app-icon name="send" [size]="16" /> Publicar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .version { margin-bottom: 12px; padding: 18px 20px; }
      .version.bor { border-color: var(--color-marigold); }
      .version.pub { border-color: #8cc56a; }
      .cab { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .num { font-size: 26px; font-weight: 700; letter-spacing: -1px; width: 56px; }
      .kpis { display: flex; gap: 18px; }
      .kpis div { display: flex; flex-direction: column; align-items: center; min-width: 64px; }
      .kpis strong { font-size: 18px; }
      .rojo { color: var(--color-vermillion); }
      .obs { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--hairline); display: grid; gap: 10px; }
      .o { display: flex; flex-direction: column; gap: 4px; }
      .o .pill { align-self: flex-start; }
    `,
  ],
})
export class Versiones {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly fecha = fechaCorta;
  protected readonly bloqueo = signal<{ titulo: string; causas: string[] } | null>(null);
  protected readonly confirmar = signal<VersionHorario | null>(null);
  private readonly violMap = computed(() => new Map(this.store.versionesPeriodo().map((v) => [v.id, this.store.violacionesDe(v).length])));

  estado(v: VersionHorario) {
    return v.estado === 'BORRADOR' ? 'Borrador (en trabajo)' : v.estado === 'PUBLICADA' ? 'Publicada · oficial' : 'Archivada';
  }
  viol(v: VersionHorario) {
    return this.violMap().get(v.id) ?? 0;
  }
  obs(v: VersionHorario) {
    return this.store.observaciones().filter((o) => o.versionId === v.id);
  }
  publicar(v: VersionHorario) {
    // primero se valida (CU-11); si hay causas se muestran sin pedir confirmación
    if (v.pendientes.length || this.viol(v)) {
      const r = this.store.publicarVersion(v.id);
      this.bloqueo.set({ titulo: r.mensaje ?? 'No se puede publicar', causas: r.errores ?? [] });
      return;
    }
    this.confirmar.set(v);
  }
  hacerPublicar(v: VersionHorario) {
    this.confirmar.set(null);
    const r = this.store.publicarVersion(v.id);
    if (r.ok) this.toast.ok(`Versión ${v.numero} publicada`, ['Ya es visible para docentes y comité, y exportable en CSV y PDF.']);
    else this.bloqueo.set({ titulo: r.mensaje ?? 'No se puede publicar', causas: r.errores ?? [] });
  }
  restaurar(v: VersionHorario) {
    const r = this.store.restaurarVersion(v.id);
    if (r.ok) this.toast.ok(`Versión ${v.numero} restaurada`, [`Se creó el borrador v${r.valor!.numero}. La versión publicada no cambió.`]);
  }
  ver(v: VersionHorario) {
    this.router.navigate(['/consulta'], { queryParams: { version: v.id } });
  }
}
