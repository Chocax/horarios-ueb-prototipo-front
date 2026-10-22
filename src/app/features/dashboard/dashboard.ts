// Inicio del coordinador: estado del periodo y accesos al flujo del BPMN.
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { fechaCorta } from '../../core/util';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Periodo {{ store.periodo().codigo }}</div>
          <h1>Hola, {{ primerNombre() }}</h1>
          <p class="serif sub">Este es el estado de la programación del periodo. Sigue los pasos de abajo para llegar al horario publicado.</p>
        </div>
        <div class="row">
          <a class="btn btn-ghost" routerLink="/tablero"><app-icon name="board" [size]="16" /> Ir al tablero</a>
          <button class="btn btn-primary" (click)="generar()" [disabled]="store.periodo().estado === 'CERRADO'">
            <app-icon name="wand" [size]="16" /> Generar propuesta
          </button>
        </div>
      </div>

      <div class="grid cols-4">
        <div class="accent marigold stat"><div class="valor">{{ store.ofertasPeriodo().length }}</div><div class="etiqueta">Cursos ofertados</div></div>
        <div class="accent tint stat"><div class="valor">{{ store.gruposAbiertos().length }}</div><div class="etiqueta">Grupos abiertos (diurna y nocturna)</div></div>
        <div class="accent peach stat"><div class="valor">{{ store.docentes().length }}</div><div class="etiqueta">Docentes</div></div>
        <div class="accent midnight stat"><div class="valor">{{ store.aulas().length }}</div><div class="etiqueta">Aulas</div></div>
      </div>

      <div class="grid" style="grid-template-columns: 1.3fr 1fr">
        <div class="card">
          <div class="card-title"><h2>Flujo del periodo</h2><span class="caption">según el BPMN del proceso</span></div>
          <ol class="pasos">
            @for (p of pasos(); track p.n) {
              <li [class.ok]="p.ok">
                <span class="num">@if (p.ok) {<app-icon name="check" [size]="14" />} @else {{{ p.n }}}</span>
                <div class="txt">
                  <strong>{{ p.titulo }}</strong>
                  <span class="muted">{{ p.detalle }}</span>
                </div>
                <a class="btn btn-sm" [routerLink]="p.ruta">Abrir</a>
              </li>
            }
          </ol>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card">
            <div class="card-title"><h2>Versión de trabajo</h2>
              @if (vt(); as v) { <span class="pill yellow">Versión {{ v.numero }} · borrador</span> } @else { <span class="pill">Sin borrador</span> }
            </div>
            @if (vt(); as v) {
              <div class="kpis">
                <div><span class="k">{{ v.sesiones.length }}</span><span class="caption">sesiones</span></div>
                <div><span class="k" [class.rojo]="v.pendientes.length">{{ v.pendientes.length }}</span><span class="caption">grupos pendientes</span></div>
                <div><span class="k" [class.rojo]="violaciones()">{{ violaciones() }}</span><span class="caption">violaciones R1–R9</span></div>
                <div><span class="k">{{ blandas() }}</span><span class="caption">avisos B1–B6</span></div>
              </div>
              <p class="caption" style="margin-top:10px">{{ v.origen }} · {{ fecha(v.fechaCreacion) }}</p>
            } @else {
              <p class="muted">Genera una propuesta para empezar a ajustar el horario del periodo.</p>
            }
          </div>

          <div class="card">
            <div class="card-title"><h2>Concepto del comité</h2><a routerLink="/versiones" class="caption">ver versiones</a></div>
            @for (o of observaciones(); track o.id) {
              <div class="obs">
                <span class="pill" [class.green]="o.concepto === 'FAVORABLE'" [class.yellow]="o.concepto !== 'FAVORABLE'">
                  {{ o.concepto === 'FAVORABLE' ? 'Favorable' : 'Requiere ajustes' }} · v{{ numeroVersion(o.versionId) }}
                </span>
                <p>{{ o.texto }}</p>
                <span class="caption">{{ o.autor }} · {{ fecha(o.fecha) }}</span>
              </div>
            } @empty {
              <p class="muted">Aún no hay observaciones del comité para este periodo.</p>
            }
          </div>

          <div class="card">
            <div class="card-title"><h2>Últimos movimientos</h2><a routerLink="/bitacora" class="caption">bitácora</a></div>
            @for (b of ultimos(); track b.id) {
              <div class="mov"><strong>{{ b.accion }}</strong><span class="muted">{{ b.detalle }}</span><span class="caption">{{ b.usuario }} · {{ fecha(b.fecha) }}</span></div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pasos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
      .pasos li { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--hairline); }
      .pasos li:last-child { border-bottom: none; }
      .num { width: 28px; height: 28px; border-radius: 99px; border: 1.5px solid var(--ink-20); display: inline-flex; align-items: center; justify-content: center;
        font-weight: 600; font-size: 13px; flex: none; color: var(--ink-60); }
      .pasos li.ok .num { background: var(--color-notion-blue); border-color: var(--color-notion-blue); color: #fff; }
      .txt { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .kpis div { display: flex; flex-direction: column; }
      .k { font-size: 28px; font-weight: 600; letter-spacing: -0.8px; }
      .k.rojo { color: var(--color-vermillion); }
      .obs, .mov { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--hairline); }
      .obs:last-child, .mov:last-child { border-bottom: none; }
      .obs .pill { align-self: flex-start; }
    `,
  ],
})
export class Dashboard {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly fecha = fechaCorta;

  protected readonly vt = this.store.versionTrabajo;
  protected readonly primerNombre = computed(() => (this.sesion.actual()?.nombre ?? '').split(' ')[0]);
  protected readonly violaciones = computed(() => (this.vt() ? this.store.violacionesDe(this.vt()!).length : 0));
  protected readonly blandas = computed(() => (this.vt() ? this.store.blandasDe(this.vt()!).length : 0));
  protected readonly observaciones = computed(() => {
    const ids = new Set(this.store.versionesPeriodo().map((v) => v.id));
    return this.store.observaciones().filter((o) => ids.has(o.versionId)).slice(-3).reverse();
  });
  protected readonly ultimos = computed(() => this.store.bitacora().slice(0, 5));

  protected readonly pasos = computed(() => {
    const vt = this.vt();
    const vp = this.store.versionPublicada();
    const conDisp = this.store.docentes().filter((d) => d.disponibilidad.length).length;
    const obsVt = vt ? this.store.observaciones().filter((o) => o.versionId === vt.id) : [];
    return [
      { n: 1, titulo: 'Configurar periodo y parámetros', detalle: `Franjas, bloque no asignable y cupos de ${this.store.periodo().codigo}`, ok: true, ruta: '/periodos' },
      { n: 2, titulo: 'Registrar o importar el catálogo', detalle: `${this.store.cursos().length} cursos · ${this.store.aulas().length} aulas · ${this.store.gruposAbiertos().length} grupos`, ok: this.store.gruposAbiertos().length > 0, ruta: '/grupos' },
      { n: 3, titulo: 'Disponibilidad de docentes', detalle: `${conDisp} de ${this.store.docentes().length} docentes la tienen registrada`, ok: conDisp === this.store.docentes().length, ruta: '/docentes' },
      { n: 4, titulo: 'Generar propuesta inicial', detalle: vt ? `Versión ${vt.numero} generada` : 'Algoritmo voraz con validación R1–R9', ok: !!vt || !!vp, ruta: '/tablero' },
      { n: 5, titulo: 'Ajustar en el tablero', detalle: vt ? `${vt.pendientes.length} grupo(s) pendiente(s)` : '—', ok: !!vt && vt.pendientes.length === 0, ruta: '/tablero' },
      { n: 6, titulo: 'Concepto del comité', detalle: obsVt.length ? `${obsVt.length} observación(es) sobre la versión ${vt!.numero}` : 'El comité revisa la propuesta', ok: obsVt.length > 0, ruta: '/versiones' },
      { n: 7, titulo: 'Publicar horario oficial', detalle: vp ? `Versión ${vp.numero} publicada` : 'Bloqueado si hay pendientes o violaciones', ok: !!vp, ruta: '/versiones' },
    ];
  });

  numeroVersion(id: string) {
    return this.store.version(id)?.numero ?? '?';
  }

  generar() {
    const r = this.store.generarPropuesta();
    if (r.ok && r.valor) {
      this.toast.ok(`Versión ${r.valor.numero} generada`, [`${r.valor.sesiones.length} sesiones ubicadas`, `${r.valor.pendientes.length} grupo(s) pendiente(s)`]);
      this.router.navigateByUrl('/tablero');
    } else this.toast.error(r.mensaje ?? 'No se pudo generar');
  }
}
