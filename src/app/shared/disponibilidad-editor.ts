// Editor de disponibilidad semanal (CU-05 · RF-04): clic o arrastre para marcar las horas en que el docente puede dictar.
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { BloqueDisponible, Dia, DIAS, ParametrosProgramacion } from '../core/models';
import { hh } from '../core/util';
import { bloqueado, fueraDeFranja, horasGrilla } from './semana';

@Component({
  selector: 'app-disponibilidad-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="leyenda">
      <span><i class="si"></i> Disponible</span>
      <span><i class="no"></i> No disponible</span>
      <span><i class="off"></i> Fuera de la franja / bloque no asignable</span>
      <span class="spacer"></span>
      @if (!soloLectura()) {
        <button type="button" class="btn btn-sm" (click)="todo(true)">Marcar toda la franja</button>
        <button type="button" class="btn btn-sm" (click)="todo(false)">Limpiar</button>
      }
    </div>
    <div class="disp" (mouseleave)="arrastrando = false" (mouseup)="arrastrando = false">
      <div class="cab"></div>
      @for (d of dias; track d.valor) {
        <div class="cab">{{ d.corto }}</div>
      }
      @for (h of horas(); track h) {
        <div class="hora">{{ hh(h) }}</div>
        @for (d of dias; track d.valor) {
          <button
            type="button"
            class="c"
            [class.on]="marcado(d.valor, h)"
            [class.off]="inhabil(d.valor, h)"
            [disabled]="inhabil(d.valor, h) || soloLectura()"
            [attr.aria-label]="d.nombre + ' ' + hh(h)"
            (mousedown)="inicio(d.valor, h, $event)"
            (mouseenter)="pasar(d.valor, h)"
          ></button>
        }
      }
    </div>
    <p class="caption" style="margin-top:8px">{{ resumen() }}</p>
  `,
  styles: [
    `
      .leyenda { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--ink-60); margin-bottom: 10px; }
      .leyenda i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 4px; border: 1px solid var(--hairline); }
      .leyenda .si { background: var(--color-notion-blue); border-color: var(--color-notion-blue); }
      .leyenda .no { background: #fff; }
      .leyenda .off { background: repeating-linear-gradient(135deg, rgba(0,0,0,.08) 0 3px, transparent 3px 6px); }
      .disp { display: grid; grid-template-columns: 52px repeat(6, 1fr); gap: 3px; user-select: none; }
      .cab { font-size: 11.5px; font-weight: 600; color: var(--ink-54); text-align: center; padding-bottom: 2px; }
      .hora { font-size: 11px; color: var(--ink-40); text-align: right; padding-right: 6px; line-height: 22px; font-variant-numeric: tabular-nums; }
      .c { height: 22px; border-radius: 5px; border: 1px solid var(--hairline); background: #fff; cursor: pointer; padding: 0; transition: background 120ms ease; }
      .c:hover:not(:disabled) { border-color: var(--color-notion-blue); }
      .c.on { background: var(--color-notion-blue); border-color: var(--color-notion-blue); }
      .c.off { background: repeating-linear-gradient(135deg, rgba(0,0,0,.06) 0 3px, transparent 3px 6px); border-color: var(--hairline); cursor: not-allowed; }
      .c:disabled:not(.off) { cursor: default; }
    `,
  ],
})
export class DisponibilidadEditor {
  readonly bloques = input.required<BloqueDisponible[]>();
  readonly parametros = input.required<ParametrosProgramacion>();
  readonly soloLectura = input(false);
  readonly cambio = output<BloqueDisponible[]>();

  protected readonly dias = DIAS;
  protected readonly hh = hh;
  protected readonly horas = computed(() => horasGrilla(this.parametros()));
  /** Conjunto de celdas marcadas, clave "dia-hora". */
  private readonly celdas = signal(new Set<string>());
  protected arrastrando = false;
  private valorArrastre = true;

  constructor() {
    effect(() => {
      const s = new Set<string>();
      for (const b of this.bloques()) for (let h = b.inicio; h < b.fin; h++) s.add(`${b.dia}-${h}`);
      this.celdas.set(s);
    });
  }

  protected readonly resumen = computed(() => {
    const n = this.celdas().size;
    return n ? `${n} hora(s) disponibles a la semana.` : 'Sin disponibilidad registrada: el docente no podrá ser asignado (R6).';
  });

  marcado = (d: number, h: number) => this.celdas().has(`${d}-${h}`);
  inhabil = (d: number, h: number) => fueraDeFranja(this.parametros(), d, h) || bloqueado(this.parametros(), h);

  inicio(d: number, h: number, ev: MouseEvent) {
    ev.preventDefault();
    this.arrastrando = true;
    this.valorArrastre = !this.marcado(d, h);
    this.poner(d, h, this.valorArrastre);
  }
  pasar(d: number, h: number) {
    if (this.arrastrando && !this.inhabil(d, h)) this.poner(d, h, this.valorArrastre);
  }
  todo(v: boolean) {
    const s = new Set<string>();
    if (v) for (const d of this.dias) for (const h of this.horas()) if (!this.inhabil(d.valor, h)) s.add(`${d.valor}-${h}`);
    this.celdas.set(s);
    this.emitir();
  }

  private poner(d: number, h: number, v: boolean) {
    const s = new Set(this.celdas());
    v ? s.add(`${d}-${h}`) : s.delete(`${d}-${h}`);
    this.celdas.set(s);
    this.emitir();
  }

  /** Convierte las celdas en bloques contiguos por día. */
  private emitir() {
    const out: BloqueDisponible[] = [];
    for (const d of this.dias) {
      let ini: number | null = null;
      for (const h of [...this.horas(), this.horas()[this.horas().length - 1] + 1]) {
        const on = this.celdas().has(`${d.valor}-${h}`);
        if (on && ini === null) ini = h;
        if (!on && ini !== null) {
          out.push({ dia: d.valor as Dia, inicio: ini, fin: h });
          ini = null;
        }
      }
    }
    this.cambio.emit(out);
  }
}
