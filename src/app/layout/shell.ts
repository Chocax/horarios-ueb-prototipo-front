import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../core/services/session.service';
import { StoreService } from '../core/services/store.service';
import { nombreRol } from '../core/util';
import { Icon } from '../shared/icon';
import { NAV } from './nav';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="side">
      <div class="marca">
        <img class="logo" src="ueb-simbolo.png" alt="Universidad El Bosque" width="34" height="34" />
        <div>
          <strong>Horarios UEB</strong>
          <span class="caption">Universidad El Bosque</span>
        </div>
      </div>
      <nav>
        @for (g of grupos(); track g.nombre) {
          @if (g.nombre) {
            <div class="grupo">{{ g.nombre }}</div>
          }
          @for (i of g.items; track i.ruta) {
            <a [routerLink]="i.ruta" routerLinkActive="on" class="item">
              <app-icon [name]="i.icono" [size]="17" />
              <span>{{ i.texto }}</span>
            </a>
          }
        }
      </nav>
      <div class="pie">
        <span class="pill peach">Datos de demostración</span>
        <p class="caption" style="margin-top:8px">Prototipo de alta fidelidad · Proyecto Núcleo II · Grupo 7</p>
      </div>
    </aside>

    <div class="main">
      <header class="top">
        <div class="row" style="gap:8px">
          <span class="caption">Periodo</span>
          <select (change)="cambiarPeriodo($any($event.target).value)" aria-label="Periodo académico">
            @for (p of store.periodos(); track p.id) {
              <option [value]="p.id" [selected]="p.id === store.periodo().id">{{ p.codigo }}{{ p.estado === 'CERRADO' ? ' (cerrado)' : '' }}</option>
            }
          </select>
          @if (store.versionPublicada(); as vp) {
            <span class="pill green">Publicado: versión {{ vp.numero }}</span>
          } @else {
            <span class="pill">Sin horario publicado</span>
          }
          @if (store.versionTrabajo() && sesion.actual()?.rol !== 'DOCENTE') {
            @let vt = store.versionTrabajo()!;
            <span class="pill yellow">En trabajo: versión {{ vt.numero }}</span>
          }
        </div>
        <div class="spacer"></div>
        <div class="usuario">
          <span class="avatar">{{ iniciales() }}</span>
          <div class="txt">
            <strong>{{ sesion.actual()?.nombre }}</strong>
            <span class="rol" [class]="sesion.actual()?.rol">{{ rol() }}</span>
          </div>
          <button class="btn icon-btn" title="Cerrar sesión" (click)="salir()"><app-icon name="logout" /></button>
        </div>
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
      .side { position: sticky; top: 0; height: 100vh; background: #fbfbfa; border-right: 1px solid var(--hairline);
        display: flex; flex-direction: column; padding: 18px 12px; gap: 14px; overflow-y: auto; }
      .marca { display: flex; gap: 10px; align-items: center; padding: 4px 8px 10px; }
      .marca strong { display: block; font-size: 15px; letter-spacing: -0.2px; }
      .logo { width: 34px; height: 34px; object-fit: contain; flex: none; }
      nav { display: flex; flex-direction: column; gap: 1px; flex: 1; }
      .grupo { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-40); padding: 14px 10px 6px; }
      .item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; color: var(--ink-54); font-weight: 500;
        transition: background 200ms ease, color 200ms ease; }
      .item:hover { background: rgba(0,0,0,0.04); color: var(--ink-95); }
      .item.on { background: var(--color-sky-tint); color: var(--color-notion-blue); }
      .pie { padding: 8px; border-top: 1px solid var(--hairline); }
      .main { min-width: 0; display: flex; flex-direction: column; }
      .top { position: sticky; top: 0; z-index: 20; height: 60px; display: flex; align-items: center; gap: 16px; padding: 0 28px;
        background: rgba(246,245,244,0.92); backdrop-filter: blur(8px); box-shadow: var(--shadow-nav); border-bottom: 1px solid var(--hairline); }
      .top select { padding: 5px 8px; }
      .usuario { display: flex; align-items: center; gap: 10px; }
      .usuario .txt { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; line-height: 1.2; }
      .avatar { width: 34px; height: 34px; border-radius: 99px; border: 2px solid var(--color-signal-blue); background: #fff; display: inline-flex;
        align-items: center; justify-content: center; font-weight: 600; font-size: 12px; }
      main { flex: 1; min-width: 0; }
    `,
  ],
})
export class Shell {
  protected readonly store = inject(StoreService);
  protected readonly sesion = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly grupos = computed(() => {
    const rol = this.sesion.actual()?.rol;
    const items = NAV.filter((i) => rol && i.roles.includes(rol));
    const out: { nombre: string; items: typeof items }[] = [];
    for (const i of items) {
      const nombre = i.grupo ?? '';
      let g = out.find((x) => x.nombre === nombre);
      if (!g) out.push((g = { nombre, items: [] }));
      g.items.push(i);
    }
    return out;
  });
  protected readonly rol = computed(() => (this.sesion.actual() ? nombreRol(this.sesion.actual()!.rol) : ''));
  protected readonly iniciales = computed(() =>
    (this.sesion.actual()?.nombre ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join(''),
  );
  protected readonly menu = signal(false);

  cambiarPeriodo(id: string) {
    this.store.seleccionarPeriodo(id);
  }
  salir() {
    this.store.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
