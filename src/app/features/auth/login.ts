// CU-01 Iniciar sesión · RF-15, RF-22 (usuario desactivado no entra)
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { ROLES } from '../../core/models';
import { RUTA_INICIAL } from '../../layout/nav';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <section class="hero">
        <div class="marca-ueb">
          <img src="ueb-logo.png" alt="Universidad El Bosque" width="132" height="114" />
          <div class="sep"></div>
          <div><strong>Facultad de Ingeniería</strong><span>Programa de Ingeniería de Sistemas</span></div>
        </div>
        <h1>Programa los horarios <span class="highlight">sin choques</span> en una tarde.</h1>
        <p class="serif">
          Genera una propuesta válida para el periodo, ajústala en el tablero con arrastrar y soltar y publícala cuando el comité dé su
          concepto. Cada movimiento se valida contra las nueve reglas duras del programa.
        </p>
        <div class="tarjetas">
          <div class="accent marigold"><strong>R1–R9</strong><span>reglas duras validadas en cada cambio</span></div>
          <div class="accent tint"><strong>4 roles</strong><span>coordinación, comité, docentes y administración</span></div>
          <div class="accent midnight"><strong>Plan UEB</strong><span>53 cursos de Ingeniería de Sistemas, jornada diurna y nocturna</span></div>
        </div>
      </section>

      <section class="card form">
        <h2>Iniciar sesión</h2>
        <p class="muted" style="margin:4px 0 18px">Universidad El Bosque · Programa de Ingeniería de Sistemas</p>
        <form (ngSubmit)="entrar()" class="stack">
          <div class="field">
            <label for="correo">Correo institucional</label>
            <input id="correo" type="email" name="correo" [(ngModel)]="correo" autocomplete="username" required />
          </div>
          <div class="field">
            <label for="clave">Contraseña</label>
            <input id="clave" type="password" name="clave" [(ngModel)]="clave" autocomplete="current-password" required />
          </div>
          @if (error()) {
            <div class="errores" role="alert">{{ error() }}</div>
          }
          <button class="btn btn-primary" type="submit" style="margin-top:4px">Entrar</button>
        </form>

        <div class="demo">
          <div class="label">Cuentas de demostración · contraseña <code>demo123</code></div>
          <div class="cuentas">
            @for (u of cuentas; track u.correo) {
              <button type="button" class="cuenta" [class.off]="!u.activo" (click)="usar(u.correo)">
                <span class="rol" [class]="u.activo ? u.rolCodigo : 'INACTIVO'">{{ u.activo ? u.rol : 'Desactivado' }}</span>
                <strong>{{ u.nombre }}</strong>
                <span class="caption">{{ u.correo }}</span>
              </button>
            }
          </div>
          <details class="roles">
            <summary>¿Qué puede hacer cada rol?</summary>
            @for (r of roles; track r.valor) {
              <div class="r">
                <span class="rol" [class]="r.valor">{{ r.corto }}</span>
                <p>{{ r.descripcion }}</p>
              </div>
            }
          </details>
          <button type="button" class="btn btn-sm" style="margin-top:10px" (click)="reset()">Restablecer datos de demostración</button>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .wrap { min-height: 100vh; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px; align-items: center; max-width: 1280px; margin: 0 auto; padding: 48px 40px; }
      @media (max-width: 1000px) { .wrap { grid-template-columns: 1fr; } }
      .marca-ueb { display: flex; align-items: center; gap: 18px; margin-bottom: 28px; }
      .marca-ueb img { width: 104px; height: auto; }
      .marca-ueb .sep { width: 1px; align-self: stretch; background: var(--hairline); }
      .marca-ueb strong { display: block; font-size: 16px; }
      .marca-ueb span { font-size: 13px; color: var(--ink-60); }
      .hero h1 { font-size: 54px; line-height: 1.06; letter-spacing: -1.89px; font-weight: 600; max-width: 640px; }
      .hero .serif { margin-top: 18px; max-width: 560px; }
      .tarjetas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 32px; max-width: 640px; }
      .tarjetas .accent { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
      .tarjetas strong { font-size: 20px; letter-spacing: -0.4px; }
      .tarjetas span { font-size: 13px; line-height: 1.35; }
      .form { padding: 28px; }
      .demo { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--hairline); }
      .cuentas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
      .cuenta { text-align: left; font: inherit; background: #fff; border: 1px solid var(--hairline); border-radius: 8px; padding: 9px 12px; cursor: pointer;
        display: flex; flex-direction: column; align-items: flex-start; gap: 4px; transition: border-color 200ms ease, background 200ms ease; }
      .cuenta.off strong { color: var(--ink-40); }
      .roles { margin-top: 14px; border: 1px solid var(--hairline); border-radius: 8px; padding: 10px 12px; background: #fbfbfa; }
      .roles summary { cursor: pointer; font-weight: 600; font-size: 13.5px; }
      .roles .r { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: start; padding: 10px 0 2px; }
      .roles .r .rol { justify-self: start; }
      .roles p { font-size: 13px; line-height: 1.45; color: var(--ink-60); margin: 0; }
      .cuenta:hover { border-color: var(--color-notion-blue); background: var(--color-sky-tint); }
      .cuenta strong { font-size: 13px; }
      code { background: rgba(0,0,0,0.06); border-radius: 4px; padding: 1px 5px; }
    `,
  ],
})
export class Login {
  private readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  correo = '';
  clave = '';
  readonly error = signal('');
  readonly roles = ROLES;
  readonly cuentas = this.store
    .usuarios()
    .map((u) => ({ nombre: u.nombre, correo: u.correo, rolCodigo: u.rol, rol: ROLES.find((r) => r.valor === u.rol)?.corto ?? u.rol, activo: u.activo }));

  usar(correo: string) {
    this.correo = correo;
    this.clave = 'demo123';
    this.entrar();
  }

  entrar() {
    const r = this.store.iniciarSesion(this.correo, this.clave);
    if (!r.ok) {
      this.error.set(r.mensaje ?? 'Error');
      return;
    }
    this.error.set('');
    const destino = this.route.snapshot.queryParamMap.get('r');
    this.router.navigateByUrl(destino && destino.startsWith('/') && !destino.startsWith('/login') ? destino : RUTA_INICIAL[this.sesion.actual()!.rol]);
  }

  reset() {
    this.store.restablecerDemo();
    this.toast.ok('Datos de demostración restablecidos');
  }
}
