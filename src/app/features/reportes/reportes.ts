// CU-16 Consultar reportes · RF-14
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { aCsv, cortoVinculacion, descargarArchivo, nombreCaracteristica } from '../../core/util';
import { Icon } from '../../shared/icon';

type Tab = 'aulas' | 'docentes' | 'grupos';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-16 · RF-14</div>
          <h1>Reportes</h1>
          <p class="serif sub">Utilización de aulas por franja (mañana, tarde, noche y sábado), carga de cada docente frente a su máximo y grupos por debajo del cupo mínimo de {{ store.parametros().cupoMinimo }} estudiantes.</p>
        </div>
        <button class="btn btn-ghost" (click)="exportar()" [disabled]="!version()"><app-icon name="download" [size]="16" /> Exportar CSV</button>
      </div>

      <div class="row" style="margin-bottom:16px">
        <div class="tabs">
          <button [class.on]="tab() === 'aulas'" (click)="tab.set('aulas')">Ocupación de aulas</button>
          <button [class.on]="tab() === 'docentes'" (click)="tab.set('docentes')">Carga docente</button>
          <button [class.on]="tab() === 'grupos'" (click)="tab.set('grupos')">Grupos bajo el mínimo <span class="pill" [class.red]="bajoMinimo().length" style="margin-left:4px">{{ bajoMinimo().length }}</span></button>
        </div>
        <span class="spacer"></span>
        @if (tab() !== 'grupos') {
          <select (change)="versionId.set($any($event.target).value)" [disabled]="!versionesPeriodo().length" aria-label="Versión">
            @if (!versionesPeriodo().length) { <option>Sin versiones en {{ store.periodo().codigo }}</option> }
            @for (v of store.versionesPeriodo(); track v.id) { <option [value]="v.id" [selected]="v.id === version().id">Versión {{ v.numero }} · {{ v.estado.toLowerCase() }}</option> }
          </select>
        }
      </div>

      @switch (tab()) {
        @case ('aulas') {
          @if (version()) {
            <div class="grid cols-3" style="margin-bottom:16px">
              <div class="accent tint stat"><div class="valor">{{ promedio() }} %</div><div class="etiqueta">ocupación promedio ({{ horasSemana() }} h hábiles por aula)</div></div>
              <div class="accent marigold stat"><div class="valor">{{ aulas()[0]?.codigo }}</div><div class="etiqueta">aula más usada · {{ aulas()[0]?.pct }} %</div></div>
              <div class="accent peach stat"><div class="valor">{{ ociosas() }}</div><div class="etiqueta">aulas por debajo del 25 %</div></div>
            </div>
            <div class="card" style="margin-bottom:16px">
              <div class="label" style="margin-bottom:10px">Utilización de las aulas por franja</div>
              <div class="franjas">
                @for (f of resumenFranjas(); track f.clave) {
                  <div class="franja">
                    <div class="row between"><strong>{{ f.nombre }}</strong><span class="caption">{{ f.rango }}</span></div>
                    <div class="barra" [class.alta]="f.pct >= 75" style="margin:8px 0 4px"><span [style.width.%]="f.pct"></span></div>
                    <span class="caption">{{ f.pct }} % · {{ f.horas }} de {{ f.disponibles }} h-aula</span>
                  </div>
                }
              </div>
            </div>
            <div class="tabla-wrap">
              <table class="tabla">
                <thead><tr><th>Aula</th><th class="num">Capacidad</th><th>Tipo</th>
                  @for (f of franjas(); track f.clave) { <th class="num" [title]="f.rango">{{ f.nombre }}</th> }
                  <th class="num">Horas</th><th style="width:26%">Ocupación semanal</th></tr></thead>
                <tbody>
                  @for (a of aulas(); track a.id) {
                    <tr>
                      <td class="mono"><strong>{{ a.codigo }}</strong></td><td class="num">{{ a.capacidad }}</td><td>{{ a.tipo }}</td>
                      @for (x of a.porFranja; track $index) { <td class="num" [class.muted]="!x">{{ x }} %</td> }
                      <td class="num">{{ a.horas }}</td>
                      <td><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="barra" [class.alta]="a.pct >= 75" style="flex:1"><span [style.width.%]="a.pct"></span></div><span class="caption" style="width:40px">{{ a.pct }} %</span></div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else { <div class="card vacio"><p>No hay versiones del horario en este periodo.</p></div> }
        }
        @case ('docentes') {
          @if (version()) {
            <div class="grid cols-3" style="margin-bottom:16px">
              <div class="accent tint stat"><div class="valor">{{ docentes().filter(esCompleto).length }}</div><div class="etiqueta">docentes con su carga máxima</div></div>
              <div class="accent sky stat"><div class="valor">{{ docentes().filter(esParcial).length }}</div><div class="etiqueta">con carga parcial</div></div>
              <div class="accent peach stat"><div class="valor">{{ docentes().filter(esCero).length }}</div><div class="etiqueta">sin asignación (B3)</div></div>
            </div>
            <div class="tabla-wrap">
              <table class="tabla">
                <thead><tr><th>Docente</th><th>Vinculación</th><th class="num">Sesiones</th><th class="num">Horas / máx.</th><th style="width:36%">Carga</th></tr></thead>
                <tbody>
                  @for (d of docentes(); track d.id) {
                    <tr>
                      <td><strong>{{ d.nombre }}</strong></td><td><span class="pill">{{ d.vinc }}</span></td><td class="num">{{ d.sesiones }}</td><td class="num">{{ d.horas }} / {{ d.max }}</td>
                      <td><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="barra" [class.alta]="d.pct > 100" [class.media]="d.pct === 100" style="flex:1"><span [style.width.%]="d.pct > 100 ? 100 : d.pct"></span></div><span class="caption" style="width:40px">{{ d.pct }} %</span></div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else { <div class="card vacio"><p>No hay versiones del horario en este periodo.</p></div> }
        }
        @case ('grupos') {
          @if (!conInscritos()) {
            <div class="aviso warn" style="margin-bottom:14px"><app-icon name="alert" [size]="18" />
              <div>Aún no se han registrado inscritos en {{ store.periodo().codigo }}. Regístrelos o simúlelos en <a routerLink="/inscritos">Inscritos y cierre</a>.</div></div>
          }
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th>Grupo</th><th>Jornada</th><th class="num">Cupo planeado</th><th class="num">Inscritos</th><th class="num">Mínimo</th><th></th></tr></thead>
              <tbody>
                @for (g of bajoMinimo(); track g.id) {
                  <tr><td><strong>{{ store.etiquetaGrupo(g.id) }}</strong></td><td>{{ g.jornada === 'DIURNA' ? 'Diurna' : 'Nocturna' }}</td><td class="num">{{ g.cupoPlaneado }}</td>
                    <td class="num rojo">{{ g.inscritos }}</td><td class="num">{{ store.parametros().cupoMinimo }}</td>
                    <td><a class="btn btn-sm" routerLink="/inscritos">Cerrar grupo</a></td></tr>
                } @empty {
                  <tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Ningún grupo con inscritos por debajo del mínimo.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .rojo { color: var(--color-vermillion); font-weight: 600; }
      .franjas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      @media (max-width: 900px) { .franjas { grid-template-columns: 1fr 1fr; } }
      .franja { display: flex; flex-direction: column; }
    `,
  ],
})
export class Reportes {
  protected readonly store = inject(StoreService);
  protected readonly tab = signal<Tab>('aulas');
  protected readonly versionId = signal(this.store.versionPublicada()?.id ?? this.store.versionTrabajo()?.id ?? '');
  protected readonly versionesPeriodo = this.store.versionesPeriodo;
  protected readonly version = computed(() => {
    const l = this.store.versionesPeriodo();
    return l.find((v) => v.id === this.versionId()) ?? this.store.versionPublicada() ?? this.store.versionTrabajo() ?? l[0] ?? null;
  });

  protected readonly horasSemana = computed(() => {
    const p = this.store.parametros();
    const bloq = p.bloquesNoAsignables.reduce((t, b) => t + (b.fin - b.inicio), 0);
    return 5 * (p.franjaLunesViernes.fin - p.franjaLunesViernes.inicio - bloq) + (p.franjaSabado.fin - p.franjaSabado.inicio);
  });
  /**
   * Franjas del reporte (RF-14): mañana y tarde separadas por el bloque no asignable, noche desde las 18:00
   * y sábado. Las horas disponibles de cada franja salen de los parámetros del periodo.
   */
  protected readonly franjas = computed(() => {
    const p = this.store.parametros();
    const lv = p.franjaLunesViernes;
    const sab = p.franjaSabado;
    const bloque = p.bloquesNoAsignables[0] ?? { inicio: 13, fin: 14 };
    const noche = Math.max(Math.min(18, lv.fin), bloque.fin);
    const def = [
      { clave: 'manana', nombre: 'Mañana', ini: lv.inicio, fin: bloque.inicio, sabado: false },
      { clave: 'tarde', nombre: 'Tarde', ini: bloque.fin, fin: noche, sabado: false },
      { clave: 'noche', nombre: 'Noche', ini: noche, fin: lv.fin, sabado: false },
      { clave: 'sabado', nombre: 'Sábado', ini: sab.inicio, fin: sab.fin, sabado: true },
    ];
    const hh = (h: number) => String(h).padStart(2, '0') + ':00';
    return def.map((f) => ({
      ...f,
      rango: `${f.sabado ? 'sáb' : 'L–V'} ${hh(f.ini)}–${hh(f.fin)}`,
      disponibles: Math.max(0, f.fin - f.ini) * (f.sabado ? 1 : 5),
    }));
  });
  /** Índice de la franja de una sesión según su día y hora de inicio. */
  private franjaDe(dia: number, inicio: number) {
    if (dia === 5) return 3;
    const f = this.franjas();
    if (inicio >= f[2].ini) return 2;
    if (inicio >= f[1].ini) return 1;
    return 0;
  }
  protected readonly aulas = computed(() => {
    const v = this.version();
    if (!v) return [];
    const dur = this.store.parametrosDe(v).duracionSesion;
    const f = this.franjas();
    return this.store
      .aulas()
      .map((a) => {
        const ses = v.sesiones.filter((s) => s.aulaId === a.id);
        const horas = ses.length * dur;
        const hFranja = [0, 0, 0, 0];
        ses.forEach((s) => (hFranja[this.franjaDe(s.dia, s.inicio)] += dur));
        const porFranja = hFranja.map((h, i) => (f[i].disponibles ? Math.round((h / f[i].disponibles) * 100) : 0));
        return { id: a.id, codigo: a.codigo, capacidad: a.capacidad, tipo: a.caracteristicas.length ? a.caracteristicas.map(nombreCaracteristica).join(' + ') : 'Estándar', horas, hFranja, porFranja, pct: Math.round((horas / this.horasSemana()) * 100) };
      })
      .sort((a, b) => b.pct - a.pct);
  });
  /** Ocupación de todas las aulas juntas en cada franja. */
  protected readonly resumenFranjas = computed(() => {
    const n = this.aulas().length || 1;
    return this.franjas().map((f, i) => {
      const horas = this.aulas().reduce((t, a) => t + a.hFranja[i], 0);
      const disponibles = f.disponibles * n;
      return { ...f, horas, disponibles, pct: disponibles ? Math.round((horas / disponibles) * 100) : 0 };
    });
  });
  protected readonly promedio = computed(() => (this.aulas().length ? Math.round(this.aulas().reduce((t, a) => t + a.pct, 0) / this.aulas().length) : 0));
  protected readonly ociosas = computed(() => this.aulas().filter((a) => a.pct < 25).length);

  protected readonly docentes = computed(() => {
    const v = this.version();
    if (!v) return [];
    const dur = this.store.parametrosDe(v).duracionSesion;
    return this.store
      .docentes()
      .map((d) => {
        const n = v.sesiones.filter((s) => s.docenteId === d.id).length;
        const horas = n * dur;
        return { id: d.id, nombre: d.nombre, vinc: cortoVinculacion(d.tipoVinculacion), sesiones: n, horas, max: d.horasMaxDocencia, pct: d.horasMaxDocencia ? Math.round((horas / d.horasMaxDocencia) * 100) : 0 };
      })
      .sort((a, b) => b.pct - a.pct);
  });
  esCompleto = (d: { pct: number }) => d.pct >= 100;
  esParcial = (d: { pct: number }) => d.pct > 0 && d.pct < 100;
  esCero = (d: { pct: number }) => d.pct === 0;

  protected readonly conInscritos = computed(() => this.store.gruposAbiertos().some((g) => g.inscritos !== null));
  protected readonly bajoMinimo = computed(() => this.store.gruposAbiertos().filter((g) => g.inscritos !== null && g.inscritos < this.store.parametros().cupoMinimo));

  exportar() {
    const per = this.store.periodo().codigo;
    if (this.tab() === 'aulas')
      descargarArchivo(
        `reporte_aulas_${per}.csv`,
        aCsv([
          ['aula', 'capacidad', 'tipo', ...this.franjas().map((f) => `ocupacion_${f.clave}_pct`), 'horas_asignadas', 'ocupacion_semanal_pct'],
          ...this.aulas().map((a) => [a.codigo, a.capacidad, a.tipo, ...a.porFranja, a.horas, a.pct]),
        ]),
      );
    else if (this.tab() === 'docentes') descargarArchivo(`reporte_carga_docente_${per}.csv`, aCsv([['docente', 'vinculacion', 'sesiones', 'horas', 'horas_max', 'carga_pct'], ...this.docentes().map((d) => [d.nombre, d.vinc, d.sesiones, d.horas, d.max, d.pct])]));
    else descargarArchivo(`reporte_grupos_bajo_minimo_${per}.csv`, aCsv([['grupo', 'jornada', 'cupo', 'inscritos', 'minimo'], ...this.bajoMinimo().map((g) => [this.store.etiquetaGrupo(g.id), g.jornada, g.cupoPlaneado, g.inscritos, this.store.parametros().cupoMinimo])]));
  }
}
