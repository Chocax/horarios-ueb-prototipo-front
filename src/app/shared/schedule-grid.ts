// Grilla semanal de solo lectura (consulta, mi horario, revisión del comité).
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DIAS, ParametrosProgramacion, Sesion } from '../core/models';
import { StoreService } from '../core/services/store.service';
import { hh, rango } from '../core/util';
import { ALTO_HORA, bloqueado, carriles, fueraDeFranja, horasGrilla, nombreCorto } from './semana';

@Component({
  selector: 'app-schedule-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="semana" [style.--h.px]="alto">
      <div class="col-horas">
        <div class="cab"></div>
        @for (h of horas(); track h) {
          <div class="hora">{{ hh(h) }}</div>
        }
      </div>
      @for (d of dias; track d.valor) {
        <div class="col-dia">
          <div class="cab">{{ d.nombre }}</div>
          <div class="cuerpo" [style.height.px]="horas().length * alto">
            @for (h of horas(); track h) {
              <div class="celda" [class.off]="fuera(d.valor, h)" [class.lunch]="bloq(h)" [style.top.px]="(h - horas()[0]) * alto"></div>
            }
            @for (s of porDia()[d.valor]; track s.id) {
              <button
                type="button"
                class="ses"
                [style.top.px]="(s.inicio - horas()[0]) * alto + 2"
                [style.height.px]="dur() * alto - 4"
                [style.left]="izq(s)"
                [style.width]="ancho(s)"
                [style.background]="color(s)"
                (click)="seleccion.emit(s)"
                [attr.title]="titulo(s)"
              >
                <span class="nom">{{ curso(s) }}</span>
                <span class="meta">{{ grupo(s) }} · {{ rango(s.inicio, s.inicio + dur()) }}</span>
                @if (modo() !== 'docente') {
                  <span class="meta">{{ docente(s) }}</span>
                }
                @if (modo() !== 'aula') {
                  <span class="meta">{{ aula(s) }}</span>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './semana.scss',
})
export class ScheduleGrid {
  private readonly store = inject(StoreService);
  readonly sesiones = input.required<Sesion[]>();
  readonly parametros = input.required<ParametrosProgramacion>();
  readonly modo = input<'docente' | 'aula' | 'curso' | 'nivel'>('nivel');
  readonly seleccion = output<Sesion>();

  protected readonly dias = DIAS;
  protected readonly alto = ALTO_HORA;
  protected readonly hh = hh;
  protected readonly rango = rango;
  protected readonly horas = computed(() => horasGrilla(this.parametros()));
  protected readonly dur = computed(() => this.parametros().duracionSesion);
  protected readonly lanes = computed(() => carriles(this.sesiones(), this.dur()));
  protected readonly porDia = computed(() => {
    const m: Record<number, Sesion[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    this.sesiones().forEach((s) => m[s.dia].push(s));
    return m;
  });

  fuera = (d: number, h: number) => fueraDeFranja(this.parametros(), d, h);
  bloq = (h: number) => bloqueado(this.parametros(), h);
  izq = (s: Sesion) => {
    const l = this.lanes().get(s.id) ?? { carril: 0, total: 1 };
    return `calc(${(100 / l.total) * l.carril}% + 2px)`;
  };
  ancho = (s: Sesion) => {
    const l = this.lanes().get(s.id) ?? { carril: 0, total: 1 };
    return `calc(${100 / l.total}% - 4px)`;
  };
  private cat = () => this.store.catalogo();
  curso = (s: Sesion) => {
    const g = this.cat().grupo(s.grupoId);
    return nombreCorto(this.cat().curso(g?.cursoId ?? '')?.nombre ?? '');
  };
  grupo = (s: Sesion) => {
    const g = this.cat().grupo(s.grupoId);
    return g ? `${g.codigo} ${g.jornada === 'DIURNA' ? 'D' : 'N'}` : '';
  };
  docente = (s: Sesion) => (s.docenteId ? this.cat().docente(s.docenteId)?.nombre ?? '' : 'Sin docente');
  aula = (s: Sesion) => (s.aulaId ? this.cat().aula(s.aulaId)?.codigo ?? '' : 'Sin aula');
  color = (s: Sesion) => {
    const g = this.cat().grupo(s.grupoId);
    const n = this.cat().curso(g?.cursoId ?? '')?.nivel ?? 1;
    return `var(--nivel-${Math.min(9, n)})`;
  };
  titulo = (s: Sesion) => `${this.curso(s)} ${this.grupo(s)}\n${this.docente(s)} · ${this.aula(s)}`;
}
