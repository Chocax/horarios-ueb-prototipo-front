// Docente: CU-18 Consultar horario (solo el propio y publicado) · CU-19 exportar · RF-19, RF-13
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { exportarCsv } from '../../core/export';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { cortoVinculacion, fechaCorta, nombreDia, rango } from '../../core/util';
import { Icon } from '../../shared/icon';
import { ScheduleGrid } from '../../shared/schedule-grid';

@Component({
  selector: 'app-mi-horario',
  imports: [RouterLink, Icon, ScheduleGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head no-print">
        <div>
          <div class="eyebrow">CU-18 · CU-19 · RF-19</div>
          <h1>Mi horario</h1>
          <p class="serif sub">Solo ve sus propias sesiones del horario publicado de {{ store.periodo().codigo }}.</p>
        </div>
        @if (vp()) {
          <div class="row">
            <button class="btn btn-ghost" (click)="csv()"><app-icon name="download" [size]="16" /> CSV</button>
            <button class="btn btn-primary" (click)="imprimir()"><app-icon name="printer" [size]="16" /> PDF</button>
          </div>
        }
      </div>

      @if (docente(); as d) {
        <div class="grid cols-4 no-print" style="margin-bottom:16px">
          <div class="accent tint stat"><div class="valor">{{ sesiones().length }}</div><div class="etiqueta">sesiones a la semana</div></div>
          <div class="accent marigold stat"><div class="valor">{{ horas() }} / {{ d.horasMaxDocencia }}</div><div class="etiqueta">horas asignadas / máximo</div></div>
          <div class="accent peach stat"><div class="valor">{{ cursos() }}</div><div class="etiqueta">cursos distintos</div></div>
          <div class="accent midnight stat"><div class="valor">{{ corto(d.tipoVinculacion) }}</div><div class="etiqueta">vinculación · {{ d.categoriaEscalafon }}</div></div>
        </div>

        @if (vp(); as v) {
          <div class="print-head"><strong>Horario de {{ d.nombre }}</strong> — {{ store.periodo().codigo }}, versión {{ v.numero }} publicada el {{ fecha(v.fechaPublicacion) }}</div>
          <p class="caption no-print" style="margin-bottom:10px">Versión {{ v.numero }} publicada el {{ fecha(v.fechaPublicacion) }}</p>
          <div style="overflow-x:auto"><app-schedule-grid [sesiones]="sesiones()" [parametros]="store.parametrosDe(v)" modo="docente" /></div>

          <div class="tabla-wrap" style="margin-top:16px">
            <table class="tabla">
              <thead><tr><th>Día</th><th>Hora</th><th>Curso</th><th>Grupo</th><th>Aula</th></tr></thead>
              <tbody>
                @for (s of ordenadas(); track s.id) {
                  <tr><td>{{ dia(s.dia) }}</td><td>{{ rango(s.inicio, s.inicio + store.parametrosDe(v).duracionSesion) }}</td><td>{{ curso(s.grupoId) }}</td><td>{{ grupo(s.grupoId) }}</td><td class="mono">{{ aula(s.aulaId) }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="card vacio">
            <app-icon name="calendar" [size]="30" />
            <h3>Aún no hay horario publicado en {{ store.periodo().codigo }}</h3>
            <p>Cuando la coordinación publique el horario lo verá aquí. Puede consultar el periodo 2026-1 desde el selector de la barra superior.</p>
            <div class="row" style="justify-content:center;margin-top:14px">
              @if (conPublicado(); as per) { <button class="btn btn-primary" (click)="store.seleccionarPeriodo(per.id)">Ver mi horario de {{ per.codigo }}</button> }
              <a class="btn" routerLink="/mi-disponibilidad">Registrar mi disponibilidad</a>
            </div>
          </div>
        }
      } @else {
        <div class="aviso warn"><app-icon name="alert" [size]="18" /><div>Su usuario no está vinculado a un docente. Pida al administrador que lo vincule.</div></div>
      }
    </div>
  `,
  styles: [`.print-head { display: none; } @media print { .print-head { display: block; margin-bottom: 8px; font-size: 12px; } }`],
})
export class MiHorario {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly rango = rango;
  protected readonly fecha = fechaCorta;
  protected readonly corto = cortoVinculacion;
  protected readonly vp = this.store.versionPublicada;
  protected readonly docente = computed(() => this.store.catalogo().docente(this.sesion.actual()?.docenteId ?? ''));
  /** Filtro aplicado en el "servidor": solo sesiones del docente autenticado en la versión publicada. */
  protected readonly sesiones = computed(() => (this.vp()?.sesiones ?? []).filter((s) => s.docenteId === this.sesion.actual()?.docenteId));
  protected readonly ordenadas = computed(() => [...this.sesiones()].sort((a, b) => a.dia - b.dia || a.inicio - b.inicio));
  protected readonly horas = computed(() => this.sesiones().length * this.store.parametros().duracionSesion);
  protected readonly cursos = computed(() => new Set(this.sesiones().map((s) => this.store.catalogo().grupo(s.grupoId)?.cursoId)).size);

  /** Último periodo con horario publicado (para el atajo cuando el actual aún no tiene). */
  protected readonly conPublicado = computed(() => {
    const ids = new Set(this.store.estado().versiones.filter((v) => v.estado === 'PUBLICADA').map((v) => v.periodoId));
    return [...this.store.periodos()].reverse().find((p) => ids.has(p.id) && p.id !== this.store.periodo().id) ?? null;
  });
  dia = nombreDia;
  curso = (id: string) => this.store.catalogo().curso(this.store.catalogo().grupo(id)?.cursoId ?? '')?.nombre ?? '';
  grupo = (id: string) => {
    const g = this.store.catalogo().grupo(id);
    return g ? `${g.codigo} · ${g.jornada === 'DIURNA' ? 'diurna' : 'nocturna'}` : '';
  };
  aula = (id: string | null) => (id ? this.store.catalogo().aula(id)?.codigo : '—');

  csv() {
    const v = this.vp()!;
    const n = exportarCsv(`mi_horario_${this.store.periodo().codigo}.csv`, this.sesiones(), this.store.catalogo(), this.store.parametrosDe(v).duracionSesion);
    this.toast.ok('CSV descargado', [`${n} sesión(es)`]);
  }
  imprimir() {
    window.print();
  }
}
