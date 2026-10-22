// CU-18 Consultar horario · CU-19 Exportar horario · RF-19, RF-13
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { exportarCsv } from '../../core/export';
import { Sesion } from '../../core/models';
import { SessionService } from '../../core/services/session.service';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreDia, rango } from '../../core/util';
import { Icon } from '../../shared/icon';
import { ScheduleGrid } from '../../shared/schedule-grid';

type Modo = 'docente' | 'aula' | 'curso' | 'nivel';

@Component({
  selector: 'app-consulta',
  imports: [FormsModule, Icon, ScheduleGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head no-print">
        <div>
          <div class="eyebrow">CU-18 · CU-19 · RF-19 · RF-13</div>
          <h1>Consultar horario</h1>
          <p class="serif sub">Vea el horario por docente, por aula, por curso o por semestre del plan. Exporte a CSV (una fila por sesión) o a PDF.</p>
        </div>
        @if (puedeExportar() && version()) {
          <div class="row">
            <button class="btn btn-ghost" (click)="csv(false)"><app-icon name="download" [size]="16" /> CSV de esta vista</button>
            <button class="btn btn-ghost" (click)="csv(true)"><app-icon name="download" [size]="16" /> CSV completo</button>
            <button class="btn btn-primary" (click)="imprimir()"><app-icon name="printer" [size]="16" /> PDF</button>
          </div>
        }
      </div>

      <div class="card no-print" style="margin-bottom:16px">
        <div class="row" style="gap:12px">
          <div class="field" style="min-width:230px"><label>Versión</label>
            <select (change)="versionId.set($any($event.target).value)" [disabled]="!versionesPeriodo().length">
              @if (!versionesPeriodo().length) { <option>Sin versiones en {{ store.periodo().codigo }}</option> }
              @for (v of versiones(); track v.id) { <option [value]="v.id" [selected]="v.id === version().id">Versión {{ v.numero }} · {{ v.estado === 'PUBLICADA' ? 'publicada' : v.estado === 'BORRADOR' ? 'borrador' : 'archivada' }}</option> }
            </select>
          </div>
          <div class="field"><label>Ver por</label>
            <div class="tabs">
              <button [class.on]="modo() === 'nivel'" (click)="modo.set('nivel')">Semestre</button>
              <button [class.on]="modo() === 'docente'" (click)="modo.set('docente')">Docente</button>
              <button [class.on]="modo() === 'aula'" (click)="modo.set('aula')">Aula</button>
              <button [class.on]="modo() === 'curso'" (click)="modo.set('curso')">Curso</button>
            </div>
          </div>
          <div class="field" style="min-width:280px;flex:1"><label>{{ etiquetaFiltro() }}</label>
            @switch (modo()) {
              @case ('nivel') {
                <select [ngModel]="nivel()" (ngModelChange)="nivel.set(+$event)">@for (n of [1,2,3,4,5,6,7,8,9]; track n) { <option [ngValue]="n">Semestre {{ n }}</option> }</select>
              }
              @case ('docente') {
                <select [ngModel]="docenteId()" (ngModelChange)="docenteId.set($event)"><option value="">Seleccione…</option>@for (d of store.docentes(); track d.id) { <option [value]="d.id">{{ d.nombre }}</option> }</select>
              }
              @case ('aula') {
                <select [ngModel]="aulaId()" (ngModelChange)="aulaId.set($event)"><option value="">Seleccione…</option>@for (a of aulas(); track a.id) { <option [value]="a.id">{{ a.codigo }} · {{ a.capacidad }} puestos</option> }</select>
              }
              @case ('curso') {
                <select [ngModel]="cursoId()" (ngModelChange)="cursoId.set($event)"><option value="">Seleccione…</option>@for (c of cursos(); track c.id) { <option [value]="c.id">{{ c.nombre }} (sem. {{ c.nivel }})</option> }</select>
              }
            }
          </div>
        </div>
      </div>

      @if (version(); as v) {
        <div class="print-head">
          <strong>Universidad El Bosque · Ingeniería de Sistemas</strong> — Horario {{ store.periodo().codigo }}, versión {{ v.numero }} ({{ v.estado.toLowerCase() }}) · {{ titulo() }}
        </div>
        <div class="row between no-print" style="margin-bottom:10px">
          <h2 style="font-size:18px">{{ titulo() }}</h2>
          <span class="caption">{{ sesiones().length }} sesión(es) · {{ horas() }} h semanales</span>
        </div>
        @if (sesiones().length) {
          <div style="overflow-x:auto"><app-schedule-grid [sesiones]="sesiones()" [parametros]="store.parametrosDe(v)" [modo]="modo()" (seleccion)="sel.set($event)" /></div>
          @if (sel(); as s) {
            <div class="aviso no-print" style="margin-top:12px">
              <app-icon name="pin" [size]="18" />
              <div><strong>{{ store.etiquetaGrupo(s.grupoId) }}</strong> · {{ dia(s) }} {{ rango(s.inicio, s.inicio + store.parametrosDe(v).duracionSesion) }} · {{ docente(s) }} · aula {{ aula(s) }}</div>
            </div>
          }
        } @else {
          <div class="card vacio"><p>No hay sesiones para este filtro.</p></div>
        }
      } @else {
        <div class="card vacio"><h3>No hay versiones del horario en {{ store.periodo().codigo }}</h3></div>
      }
    </div>
  `,
  styles: [
    `
      .print-head { display: none; }
      @media print { .print-head { display: block; margin-bottom: 8px; font-size: 12px; } }
    `,
  ],
})
export class Consulta {
  protected readonly store = inject(StoreService);
  private readonly sesion = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  protected readonly rango = rango;

  protected readonly versiones = this.store.versionesPeriodo;
  protected readonly versionId = signal<string>(
    this.route.snapshot.queryParamMap.get('version') ?? this.store.versionPublicada()?.id ?? this.store.versionTrabajo()?.id ?? this.store.versionesPeriodo()[0]?.id ?? '',
  );
  protected readonly versionesPeriodo = this.store.versionesPeriodo;
  protected readonly version = computed(() => {
    const l = this.store.versionesPeriodo();
    return l.find((v) => v.id === this.versionId()) ?? this.store.versionPublicada() ?? this.store.versionTrabajo() ?? l[0] ?? null;
  });
  protected readonly modo = signal<Modo>('nivel');
  protected readonly nivel = signal(1);
  protected readonly docenteId = signal('');
  protected readonly aulaId = signal('');
  protected readonly cursoId = signal('');
  protected readonly sel = signal<Sesion | null>(null);
  protected readonly puedeExportar = computed(() => this.sesion.tieneRol('COORDINADOR', 'ADMINISTRADOR'));

  protected readonly aulas = computed(() => [...this.store.aulas()].sort((a, b) => a.codigo.localeCompare(b.codigo)));
  protected readonly cursos = computed(() => [...this.store.cursos()].sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre)));

  protected readonly sesiones = computed(() => {
    const v = this.version();
    if (!v) return [];
    const cat = this.store.catalogo();
    return v.sesiones.filter((s) => {
      const g = cat.grupo(s.grupoId);
      switch (this.modo()) {
        case 'nivel':
          return cat.curso(g?.cursoId ?? '')?.nivel === this.nivel();
        case 'docente':
          return s.docenteId === this.docenteId();
        case 'aula':
          return s.aulaId === this.aulaId();
        case 'curso':
          return g?.cursoId === this.cursoId();
      }
    });
  });
  protected readonly horas = computed(() => this.sesiones().length * (this.version() ? this.store.parametrosDe(this.version()!).duracionSesion : 2));
  protected readonly etiquetaFiltro = computed(() => ({ nivel: 'Semestre', docente: 'Docente', aula: 'Aula', curso: 'Curso' })[this.modo()]);
  protected readonly titulo = computed(() => {
    const cat = this.store.catalogo();
    switch (this.modo()) {
      case 'nivel':
        return `Semestre ${this.nivel()}`;
      case 'docente':
        return this.docenteId() ? `Docente: ${cat.docente(this.docenteId())?.nombre}` : 'Seleccione un docente';
      case 'aula':
        return this.aulaId() ? `Aula ${cat.aula(this.aulaId())?.codigo}` : 'Seleccione un aula';
      case 'curso':
        return this.cursoId() ? cat.curso(this.cursoId())?.nombre ?? '' : 'Seleccione un curso';
    }
  });

  dia = (s: Sesion) => nombreDia(s.dia);
  docente = (s: Sesion) => (s.docenteId ? this.store.catalogo().docente(s.docenteId)?.nombre : '—');
  aula = (s: Sesion) => (s.aulaId ? this.store.catalogo().aula(s.aulaId)?.codigo : '—');

  csv(completo: boolean) {
    const v = this.version()!;
    const ses = completo ? v.sesiones : this.sesiones();
    const sufijo = completo ? 'completo' : this.titulo().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-');
    const n = exportarCsv(`horario_${this.store.periodo().codigo}_v${v.numero}_${sufijo}.csv`, ses, this.store.catalogo(), this.store.parametrosDe(v).duracionSesion);
    this.toast.ok('CSV descargado', [`${n} fila(s), una por sesión`]);
  }
  imprimir() {
    window.print();
  }
}
