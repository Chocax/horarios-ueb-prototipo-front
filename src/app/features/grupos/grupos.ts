// CU-08 Gestionar grupos · CU-09 Sugerir número de grupos · RF-07, RF-18
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Curso, Grupo, Sesion } from '../../core/models';
import { cupoEfectivo } from '../../core/rules/reglas-duras';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { nombreCaracteristica, nombreDia, normalizar, nuevoId, rango } from '../../core/util';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

@Component({
  selector: 'app-grupos',
  imports: [FormsModule, RouterLink, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">CU-08 · CU-09 · RF-07 · RF-18</div>
          <h1>Grupos y demanda</h1>
          <p class="serif sub">Norma del programa: en el día cada curso abre al menos dos grupos (G1 y G2), idealmente con docentes distintos; en la noche, uno (G3) y, si la demanda lo justifica, un segundo (G4). Registre la demanda estimada por curso; el sistema sugiere demanda ÷ {{ p().cupoMaximo }} grupos, redondeando hacia arriba. Puede ajustar la sugerencia mientras cada grupo quede dentro del cupo efectivo de {{ efectivo() }}.</p>
        </div>
      </div>

      <div class="aviso" style="margin-bottom:16px">
        <app-icon name="alert" [size]="18" />
        <div>Todos los semestres abren <strong>dos grupos diurnos (G1, G2)</strong> con docentes distintos y <strong>un grupo nocturno (G3)</strong>; Matemáticas básicas y Cálculo diferencial abren un segundo grupo nocturno (G4). Cupo máximo {{ p().cupoMaximo }} + tolerancia {{ p().toleranciaCupo }} % = <strong>{{ efectivo() }}</strong> (R9).</div>
      </div>

      <div class="row" style="margin-bottom:14px">
        <input type="search" placeholder="Buscar curso…" [ngModel]="q()" (ngModelChange)="q.set($event)" style="max-width:320px" />
        <select [ngModel]="fNivel()" (ngModelChange)="fNivel.set(+$event)" aria-label="Semestre">
          <option [ngValue]="0">Todos los semestres</option>
          @for (n of [1,2,3,4,5,6,7,8,9]; track n) { <option [ngValue]="n">Semestre {{ n }}</option> }
        </select>
        <span class="caption">{{ filas().length }} curso(s) · {{ store.gruposAbiertos().length }} grupos abiertos</span>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Curso</th><th class="num">Demanda</th><th class="num">Sugeridos</th><th>Grupos abiertos</th><th style="width:250px">Ajustar número de grupos</th></tr></thead>
          <tbody>
            @for (f of filas(); track f.curso.id) {
              <tr>
                <td>
                  <strong>{{ f.curso.nombre }}</strong><div class="caption">{{ f.curso.codigo }} · semestre {{ f.curso.nivel }}</div>
                  @if (f.grupos.length) {
                    <a class="ver-horario" routerLink="/tablero" [queryParams]="{ curso: f.curso.id }"><app-icon name="eye" [size]="13" /> Ver horario de sus grupos</a>
                  }
                </td>
                <td class="num"><input type="number" class="mini" [ngModel]="f.demanda" (change)="demanda(f.curso, $any($event.target).value)" min="0" [attr.aria-label]="'Demanda ' + f.curso.nombre" /></td>
                <td class="num"><span class="pill blue">{{ f.sugeridos }}</span></td>
                <td>
                  <div class="row" style="gap:6px">
                    @for (g of f.grupos; track g.id) {
                      <button type="button" class="chip" [class.n]="g.jornada === 'NOCTURNA'" [class.mal]="g.cupoPlaneado > efectivo()" [class.pend]="pendiente(g.id)" (click)="editar(g)" [title]="'Ver la ficha del grupo ' + g.codigo">
                        {{ g.codigo }} · {{ g.jornada === 'DIURNA' ? 'Diurna' : 'Nocturna' }} · {{ g.cupoPlaneado }}
                      </button>
                    }
                    <button type="button" class="btn icon-btn" title="Agregar grupo" (click)="nuevo(f.curso)"><app-icon name="plus" [size]="14" /></button>
                  </div>
                </td>
                <td>
                  <div class="row" style="gap:6px;flex-wrap:nowrap">
                    <input type="number" class="mini" #n [value]="f.grupos.length || f.sugeridos" min="1" [attr.aria-label]="'Número de grupos ' + f.curso.nombre" />
                    <button class="btn btn-sm" (click)="aplicar(f.curso, +n.value)">Aplicar</button>
                    @if (f.sugeridos && f.sugeridos !== f.grupos.length) {
                      <button class="btn btn-sm btn-ghost" (click)="aplicar(f.curso, f.sugeridos)">Usar {{ f.sugeridos }}</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (edit(); as e) {
      <app-modal [titulo]="(esNuevo() ? 'Nuevo grupo · ' : '') + etiqueta(e)" [subtitulo]="esNuevo() ? 'El cupo planeado se valida contra el cupo efectivo (R9).' : subtituloFicha(e)" [ancho]="!esNuevo()" (cerrar)="edit.set(null)">
        @if (!esNuevo()) {
          <!-- ficha del grupo: datos, horario y docente en la versión vigente -->
          <div class="ficha">
            <div class="datos">
              <div><span class="caption">Jornada</span><strong>{{ e.jornada === 'DIURNA' ? 'Diurna' : 'Nocturna' }}</strong></div>
              <div><span class="caption">Cupo planeado</span><strong>{{ original()?.cupoPlaneado }} / {{ efectivo() }}</strong></div>
              <div><span class="caption">Inscritos</span><strong>{{ e.inscritos ?? 'Sin registrar' }}</strong></div>
              <div><span class="caption">Estado</span><strong>{{ e.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado' }}</strong></div>
              <div><span class="caption">Sesiones por semana</span><strong>{{ requeridas(e) }} × {{ p().duracionSesion }} h</strong></div>
              <div><span class="caption">Aula requerida</span><strong>{{ aulaRequerida(e) }}</strong></div>
            </div>

            <div class="label" style="margin:16px 0 6px">Horario {{ etiquetaVersion() }}</div>
            @if (!versionVista()) {
              <p class="muted">Aún no hay propuesta de horario en {{ store.periodo().codigo }}. Genérela desde el tablero.</p>
            } @else {
              @if (sesionesGrupo(e.id).length) {
                <div class="tabla-wrap">
                  <table class="tabla compacta">
                    <thead><tr><th>Día</th><th>Hora</th><th>Aula</th><th>Docente</th></tr></thead>
                    <tbody>
                      @for (x of sesionesGrupo(e.id); track x.id) {
                        <tr><td>{{ dia(x) }}</td><td>{{ hora(x) }}</td><td class="mono">{{ aula(x) }}</td><td>{{ docente(x) }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              @if (pendiente(e.id); as pe) {
                <div class="errores" style="margin-top:10px"><span class="regla">{{ pe.regla }}</span> Pendiente: {{ pe.causa }}</div>
              } @else if (!sesionesGrupo(e.id).length) {
                <p class="muted">El grupo no tiene sesiones en esta versión (puede estar cerrado o haberse creado después de generarla).</p>
              }
            }
            @if (docentesGrupo(e.id).length) {
              <div class="label" style="margin:16px 0 6px">Horario de atención del docente</div>
              @for (d of docentesGrupo(e.id); track d) {
                <div class="caption atencion-linea"><strong>{{ nombreDocente(d) }}:</strong> {{ store.textoAtencion(store.atencionDe(d, e.cursoId)) }}</div>
              }
            }
            <div class="row" style="margin-top:12px;gap:8px">
              <a class="btn btn-sm" routerLink="/tablero" [queryParams]="{ curso: e.cursoId, grupo: e.id }"><app-icon name="board" [size]="14" /> Ver en el tablero</a>
              <a class="btn btn-sm btn-ghost" routerLink="/tablero" [queryParams]="{ curso: e.cursoId }"><app-icon name="eye" [size]="14" /> Comparar con los otros grupos del curso</a>
            </div>
          </div>
          <div class="label" style="margin:20px 0 10px">Configuración del grupo</div>
        }
        <div class="form-grid">
          <div class="field"><label>Código</label><input type="text" [(ngModel)]="e.codigo" /></div>
          <div class="field"><label>Jornada</label>
            <select [(ngModel)]="e.jornada"><option value="DIURNA">Diurna (07:00–18:00)</option><option value="NOCTURNA">Nocturna (18:00–22:00)</option></select>
          </div>
          <div class="field"><label>Cupo planeado (máx. {{ efectivo() }})</label><input type="number" [(ngModel)]="e.cupoPlaneado" min="1" /></div>
          <div class="field"><label>Docente preferente (opcional)</label>
            <select [(ngModel)]="e.docentePreferido">
              <option [ngValue]="null">Sin preferencia: lo elige el generador</option>
              @for (d of habilitadosDe(e.cursoId); track d.id) { <option [ngValue]="d.id">{{ d.nombre }}</option> }
            </select>
            <span class="caption">El generador lo intenta primero en este grupo (asignación acordada con el docente).</span>
          </div>
        </div>
        @if (e.jornada === 'DIURNA') {
          <p class="caption" style="margin-top:10px">Norma del programa (blanda, B6): lo ideal es que los grupos diurnos de un curso los dicten docentes distintos; se acepta el mismo docente cuando no hay otro disponible.</p>
        }
        @if (error()) { <div class="errores" style="margin-top:14px">{{ error() }}</div> }
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="edit.set(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="guardar(e)">Guardar grupo</button>
        </div>
      </app-modal>
    }
  `,
  styles: [
    `
      .mini { width: 76px; padding: 5px 8px; text-align: right; }
      .chip { font: inherit; font-size: 12.5px; font-weight: 500; border: 1px solid var(--hairline); background: #fff8e6; border-radius: 99px; padding: 3px 10px; cursor: pointer; }
      .chip.n { background: #e8eefc; }
      .chip.mal { background: #fdeeec; border-color: var(--color-coral); color: #8e1a0a; }
      .chip:hover { border-color: var(--color-notion-blue); }
      .chip.pend { border-color: var(--color-coral); border-style: dashed; }
      .atencion-linea { font-size: 13px; color: var(--ink-80, #333); }
      .ver-horario { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; margin-top: 4px; }
      .ficha .datos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 16px; }
      .ficha .datos > div { display: flex; flex-direction: column; }
      .tabla.compacta td, .tabla.compacta th { padding-top: 6px; padding-bottom: 6px; }
      @media (max-width: 640px) { .ficha .datos { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 900px) { .tabla-wrap > table.tabla { min-width: 1040px; } .chip { white-space: nowrap; } }
    `,
  ],
})
export class Grupos {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly q = signal('');
  protected readonly fNivel = signal(0);
  protected readonly edit = signal<Grupo | null>(null);
  protected readonly esNuevo = signal(false);
  protected readonly error = signal('');
  protected readonly p = this.store.parametros;
  protected readonly efectivo = computed(() => cupoEfectivo(this.p()));

  protected readonly filas = computed(() => {
    const q = normalizar(this.q());
    const ofertados = new Set(this.store.ofertasPeriodo().map((o) => o.cursoId));
    return [...this.store.cursos()]
      .filter((c) => ofertados.has(c.id) || this.store.gruposAbiertos().some((g) => g.cursoId === c.id))
      .filter((c) => (!q || normalizar(c.nombre).includes(q)) && (!this.fNivel() || c.nivel === this.fNivel()))
      .sort((a, b) => a.nivel - b.nivel || a.codigo.localeCompare(b.codigo))
      .map((curso) => {
        const s = this.store.sugerenciaGrupos(curso.id);
        return {
          curso,
          demanda: s.demanda,
          sugeridos: s.sugeridos,
          grupos: this.store.gruposAbiertos().filter((g) => g.cursoId === curso.id).sort((a, b) => a.codigo.localeCompare(b.codigo)),
        };
      });
  });

  /** Versión que se muestra en la ficha: el borrador si existe; si no, la publicada. */
  protected readonly versionVista = computed(() => this.store.versionTrabajo() ?? this.store.versionPublicada());
  protected readonly etiquetaVersion = computed(() => {
    const v = this.versionVista();
    return v ? `· versión ${v.numero} (${v.estado === 'BORRADOR' ? 'borrador' : 'publicada'})` : '';
  });
  /** Grupo tal como está guardado (la ficha muestra datos guardados, no lo que se edita en el formulario). */
  protected readonly original = computed(() => this.store.gruposPeriodo().find((g) => g.id === this.edit()?.id) ?? null);
  sesionesGrupo(grupoId: string): Sesion[] {
    return (this.versionVista()?.sesiones ?? []).filter((x) => x.grupoId === grupoId).sort((a, b) => a.dia - b.dia || a.inicio - b.inicio);
  }
  pendiente(grupoId: string) {
    return this.versionVista()?.pendientes.find((x) => x.grupoId === grupoId) ?? null;
  }
  requeridas(g: Grupo) {
    return this.store.sesionesRequeridas(g.id);
  }
  aulaRequerida(g: Grupo) {
    const c = this.store.catalogo().curso(g.cursoId);
    return c?.caracteristicasRequeridas.length ? c.caracteristicasRequeridas.map(nombreCaracteristica).join(' + ') : 'Salón estándar';
  }
  subtituloFicha(g: Grupo) {
    const c = this.store.catalogo().curso(g.cursoId);
    const docs = [...new Set(this.sesionesGrupo(g.id).map((x) => this.docente(x)))];
    return `${c?.codigo} · semestre ${c?.nivel}${docs.length ? ' · ' + docs.join(', ') : ''}`;
  }
  docentesGrupo = (grupoId: string) => [...new Set(this.sesionesGrupo(grupoId).map((x) => x.docenteId).filter((x): x is string => !!x))];
  nombreDocente = (id: string) => this.store.catalogo().docente(id)?.nombre ?? '';
  dia = (x: Sesion) => nombreDia(x.dia);
  hora = (x: Sesion) => rango(x.inicio, x.inicio + this.store.parametrosDe(this.versionVista()!).duracionSesion);
  aula = (x: Sesion) => (x.aulaId ? this.store.catalogo().aula(x.aulaId)?.codigo ?? '' : 'Sin aula');
  docente = (x: Sesion) => (x.docenteId ? this.store.catalogo().docente(x.docenteId)?.nombre ?? '' : 'Sin docente');

  habilitadosDe(cursoId: string) {
    return this.store.docentes().filter((d) => d.habilitaciones.includes(cursoId));
  }
  etiqueta(g: Grupo) {
    return `${this.store.catalogo().curso(g.cursoId)?.nombre ?? ''} ${g.codigo}`;
  }
  demanda(c: Curso, v: string) {
    const r = this.store.actualizarDemanda(c.id, Number(v));
    if (!r.ok) this.toast.error(r.mensaje ?? 'Error');
    else {
      const s = this.store.sugerenciaGrupos(c.id);
      this.toast.info(`Demanda de ${c.nombre}: ${s.demanda}`, [`Se sugieren ${s.sugeridos} grupo(s) (${s.demanda} ÷ ${this.p().cupoMaximo}, hacia arriba). Mínimo posible: ${s.minimo}.`]);
    }
  }
  aplicar(c: Curso, n: number) {
    const r = this.store.aplicarNumeroGrupos(c.id, n);
    if (r.ok) this.toast.ok('Grupos actualizados', [r.mensaje ?? '']);
    else this.toast.error('No se puede aplicar', [r.mensaje ?? '']);
  }
  editar(g: Grupo) {
    this.error.set('');
    this.esNuevo.set(false);
    this.edit.set({ ...g });
  }
  nuevo(c: Curso) {
    const n = this.store.gruposPeriodo().filter((g) => g.cursoId === c.id).length + 1;
    this.error.set('');
    this.esNuevo.set(true);
    this.edit.set({
      id: nuevoId('grp'),
      periodoId: this.store.periodo().id,
      cursoId: c.id,
      codigo: `G${n}`,
      jornada: n <= 2 ? 'DIURNA' : 'NOCTURNA',
      cupoPlaneado: this.p().cupoMaximo,
      inscritos: null,
      estado: 'ABIERTO',
    });
  }
  guardar(g: Grupo) {
    const r = this.store.guardarGrupo({ ...g, cupoPlaneado: Number(g.cupoPlaneado) });
    if (!r.ok) {
      this.error.set(r.mensaje ?? 'Error');
      return;
    }
    this.edit.set(null);
    this.toast.ok(`Grupo ${this.etiqueta(g)} guardado`, this.store.versionTrabajo() ? ['Si estaba pendiente, use «Reintentar» en el tablero.'] : undefined);
  }
}
