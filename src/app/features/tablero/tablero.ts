// CU-10 Generar propuesta · CU-11 Validar restricciones duras · CU-12 Ajustar horario · CU-13 Revisar blandas
// RF-08, RF-09, RF-10, RF-11
import { CdkDrag, CdkDragEnd, CdkDragMove, CdkDragPlaceholder, CdkDragStart, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Caracteristica, Dia, DIAS, GrupoPendiente, Sesion, Violacion } from '../../core/models';
import { REGLAS_DURAS } from '../../core/rules/reglas-duras';
import { Resultado, StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { cortoVinculacion, fechaCorta, hh, nombreCaracteristica, rango } from '../../core/util';
import { Icon } from '../../shared/icon';
import { ALTO_HORA, bloqueado, carriles, fueraDeFranja, horasGrilla, mapaColores, nombreCorto } from '../../shared/semana';

type Modo = 'nivel' | 'curso' | 'docente' | 'aula';

@Component({
  selector: 'app-tablero',
  imports: [FormsModule, RouterLink, Icon, CdkDrag, CdkDropList, CdkDragPlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tablero.html',
  styleUrls: ['../../shared/semana.scss', './tablero.scss'],
})
export class Tablero {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly dias = DIAS;
  protected readonly alto = ALTO_HORA;
  protected readonly hh = hh;
  protected readonly rango = rango;
  protected readonly fecha = fechaCorta;
  protected readonly reglas = REGLAS_DURAS;
  protected readonly car = nombreCaracteristica;
  protected readonly cars = (l?: Caracteristica[]) => (l?.length ? l.map(nombreCaracteristica).join(' + ') : 'Estándar');
  protected readonly cortoV = cortoVinculacion;

  private readonly columnas = viewChildren<ElementRef<HTMLElement>>('cuerpo');

  // ---------------------------------------------------------------- versión y filtros
  protected readonly vt = this.store.versionTrabajo;
  protected readonly vp = this.store.versionPublicada;
  /** Versión que se muestra: el borrador si existe; si no, la publicada en solo lectura. */
  protected readonly v = computed(() => this.vt() ?? this.vp());
  protected readonly editable = computed(() => !!this.vt());
  protected readonly p = computed(() => (this.v() ? this.store.parametrosDe(this.v()!) : this.store.parametros()));
  protected readonly horas = computed(() => horasGrilla(this.p()));
  protected readonly dur = computed(() => this.p().duracionSesion);

  protected readonly modo = signal<Modo>('nivel');
  protected readonly nivel = signal(1);
  protected readonly jornada = signal<'' | 'DIURNA' | 'NOCTURNA'>('');
  protected readonly docenteId = signal('');
  protected readonly aulaId = signal('');
  protected readonly cursoId = signal('');
  /** '' = todos los grupos del curso */
  protected readonly grupoId = signal('');
  protected readonly verBlandas = signal(false);

  constructor() {
    // /tablero?curso=…&grupo=… abre directamente la vista de un curso (desde Grupos y demanda)
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (!q.get('curso')) return;
      this.modo.set('curso');
      this.cursoId.set(q.get('curso')!);
      this.grupoId.set(q.get('grupo') ?? '');
    });
  }

  /** Cursos con grupos abiertos en el periodo, por semestre. */
  protected readonly cursosConGrupos = computed(() => {
    const ids = new Set(this.store.gruposAbiertos().map((g) => g.cursoId));
    return this.store.cursos().filter((c) => ids.has(c.id)).sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre));
  });
  protected readonly gruposDelCurso = computed(() =>
    this.store.gruposAbiertos().filter((g) => g.cursoId === this.cursoId()).sort((a, b) => a.codigo.localeCompare(b.codigo)),
  );
  elegirCurso(id: string) {
    this.cursoId.set(id);
    this.grupoId.set('');
  }
  verCurso(id: string) {
    this.modo.set('curso');
    this.elegirCurso(id);
  }

  protected readonly docentesConClase = computed(() => {
    const ids = new Set(this.v()?.sesiones.map((s) => s.docenteId));
    return this.store.docentes().filter((d) => ids.has(d.id));
  });

  protected readonly visibles = computed(() => {
    const v = this.v();
    if (!v) return [];
    const cat = this.store.catalogo();
    return v.sesiones.filter((s) => {
      const g = cat.grupo(s.grupoId);
      const c = g ? cat.curso(g.cursoId) : undefined;
      switch (this.modo()) {
        case 'nivel':
          return c?.nivel === this.nivel() && (!this.jornada() || g?.jornada === this.jornada());
        case 'docente':
          return !!this.docenteId() && s.docenteId === this.docenteId();
        case 'aula':
          return !!this.aulaId() && s.aulaId === this.aulaId();
        case 'curso':
          return !!this.cursoId() && g?.cursoId === this.cursoId() && (!this.grupoId() || s.grupoId === this.grupoId());
      }
    });
  });

  // ---------------------------------------------------------------- colores
  /** Por semestre: un color por curso. Por curso: un color por grupo. Docente/aula: un color por curso. */
  protected readonly colores = computed(() => {
    const cat = this.store.catalogo();
    if (this.modo() === 'curso') return mapaColores(this.gruposDelCurso().map((g) => g.id));
    const cursos = [...new Set(this.visibles().map((s) => cat.grupo(s.grupoId)?.cursoId ?? ''))].sort((a, b) =>
      (cat.curso(a)?.nombre ?? '').localeCompare(cat.curso(b)?.nombre ?? ''),
    );
    return mapaColores(cursos);
  });
  /** Leyenda de la vista actual: qué color es cada curso (o cada grupo en la vista por curso). */
  protected readonly leyendaColores = computed(() => {
    const cat = this.store.catalogo();
    const v = this.v();
    const dur = this.dur();
    if (this.modo() === 'curso') {
      return this.gruposDelCurso().map((g) => {
        const ses = v?.sesiones.filter((s) => s.grupoId === g.id) ?? [];
        const doc = [...new Set(ses.map((s) => this.docente(s.docenteId)))].join(', ');
        const dias = ses
          .slice()
          .sort((a, b) => a.dia - b.dia)
          .map((s) => `${this.dias[s.dia].corto} ${rango(s.inicio, s.inicio + dur)}`)
          .join(' · ');
        return {
          id: g.id,
          color: this.colores().get(g.id) ?? '#eee',
          titulo: `${g.codigo} · ${g.jornada === 'DIURNA' ? 'diurna' : 'nocturna'}`,
          detalle: ses.length ? `${dias}${doc ? ' — ' + doc : ''}` : 'Pendiente: sin sesiones ubicadas',
          curso: g.cursoId,
        };
      });
    }
    return [...this.colores().entries()].map(([cursoId, color]) => ({
      id: cursoId,
      color,
      titulo: cat.curso(cursoId)?.nombre ?? '',
      detalle: '',
      curso: cursoId,
    }));
  });
  protected readonly lanes = computed(() => carriles(this.visibles(), this.dur()));
  protected readonly porDia = computed(() => {
    const m: Record<number, Sesion[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    this.visibles().forEach((s) => m[s.dia].push(s));
    return m;
  });

  // ---------------------------------------------------------------- reglas
  protected readonly violaciones = computed(() => (this.v() ? this.store.violacionesDe(this.v()!) : []));
  private readonly conViolacion = computed(() => new Set(this.violaciones().map((x) => x.sesion.id)));
  protected readonly blandas = computed(() => (this.v() ? this.store.blandasDe(this.v()!) : []));
  protected readonly blandasPorRegla = computed(() => {
    const m = new Map<string, { regla: string; titulo: string; items: string[] }>();
    for (const b of this.blandas()) {
      if (!m.has(b.regla)) m.set(b.regla, { regla: b.regla, titulo: b.titulo, items: [] });
      m.get(b.regla)!.items.push(b.detalle);
    }
    return [...m.values()].sort((a, b) => a.regla.localeCompare(b.regla));
  });
  protected readonly pendientes = computed(() => this.v()?.pendientes ?? []);

  // ---------------------------------------------------------------- selección y arrastre
  protected readonly sel = signal<Sesion | null>(null);
  protected readonly selViol = signal<Violacion[]>([]);
  protected edDia: Dia = 0;
  protected edInicio = 7;
  protected edDocente: string | null = null;
  protected edAula: string | null = null;
  protected readonly destino = signal<{ dia: number; inicio: number } | null>(null);
  protected readonly ultimoRechazo = signal<{ titulo: string; violaciones: Violacion[] } | null>(null);
  private arrastro = false;
  private offsetY = 0;

  // ---------------------------------------------------------------- etiquetas
  private cat = () => this.store.catalogo();
  grupoDe = (s: Sesion | GrupoPendiente) => this.cat().grupo(s.grupoId);
  cursoDe = (s: Sesion | GrupoPendiente) => this.cat().curso(this.grupoDe(s)?.cursoId ?? '');
  nombre = (s: Sesion) => nombreCorto(this.cursoDe(s)?.nombre ?? '');
  grupoTxt = (s: Sesion) => {
    const g = this.grupoDe(s);
    return g ? `${g.codigo} ${g.jornada === 'DIURNA' ? 'D' : 'N'}` : '';
  };
  docente = (id: string | null) => (id ? this.cat().docente(id)?.nombre ?? '' : 'Sin docente');
  aula = (id: string | null) => (id ? this.cat().aula(id)?.codigo ?? '' : 'Sin aula');
  color = (s: Sesion) =>
    (this.modo() === 'curso' ? this.colores().get(s.grupoId) : this.colores().get(this.grupoDe(s)?.cursoId ?? '')) ??
    `var(--nivel-${Math.min(9, this.cursoDe(s)?.nivel ?? 1)})`;
  malo = (s: Sesion) => this.conViolacion().has(s.id);
  fuera = (d: number, h: number) => fueraDeFranja(this.p(), d, h);
  bloq = (h: number) => bloqueado(this.p(), h);
  izq = (s: Sesion) => {
    const l = this.lanes().get(s.id) ?? { carril: 0, total: 1 };
    return `calc(${(100 / l.total) * l.carril}% + 2px)`;
  };
  ancho = (s: Sesion) => {
    const l = this.lanes().get(s.id) ?? { carril: 0, total: 1 };
    return `calc(${100 / l.total}% - 4px)`;
  };
  etiquetaPend = (x: GrupoPendiente) => this.store.etiquetaGrupo(x.grupoId);
  ubicadas = (x: GrupoPendiente) => this.v()?.sesiones.filter((s) => s.grupoId === x.grupoId).length ?? 0;
  requeridas = (x: GrupoPendiente) => this.store.sesionesRequeridas(x.grupoId);

  // ---------------------------------------------------------------- acciones
  generar() {
    const r = this.store.generarPropuesta();
    if (r.ok && r.valor) {
      this.sel.set(null);
      this.toast.ok(`Versión ${r.valor.numero} generada`, [
        `${r.valor.sesiones.length} sesiones ubicadas sin violar R1–R9`,
        `${r.valor.pendientes.length} grupo(s) pendiente(s) con su causa`,
      ]);
    } else this.toast.error(r.mensaje ?? 'No se pudo generar');
  }

  abrir(s: Sesion) {
    if (this.arrastro) return;
    this.sel.set(s);
    this.selViol.set(this.violaciones().find((x) => x.sesion.id === s.id)?.violaciones ?? []);
    this.edDia = s.dia;
    this.edInicio = s.inicio;
    this.edDocente = s.docenteId;
    this.edAula = s.aulaId;
  }
  cerrarDetalle() {
    this.sel.set(null);
  }

  docentesPara(s: Sesion) {
    const g = this.grupoDe(s);
    return this.store.docentes().filter((d) => d.habilitaciones.includes(g?.cursoId ?? '') || d.id === s.docenteId);
  }
  aulasOrden = computed(() => [...this.store.aulas()].sort((a, b) => a.codigo.localeCompare(b.codigo)));
  horasInicio = computed(() => this.horas().slice(0, Math.max(1, this.horas().length - this.dur() + 1)));

  aplicarDetalle() {
    const s = this.sel()!;
    const r = this.store.moverSesion(this.vt()!.id, s.id, {
      dia: Number(this.edDia) as Dia,
      inicio: Number(this.edInicio),
      docenteId: this.edDocente,
      aulaId: this.edAula,
    });
    if (r.ok) {
      this.selViol.set([]);
      const nueva = this.vt()!.sesiones.find((x) => x.id === s.id)!;
      this.sel.set(nueva);
      this.toast.ok('Cambio guardado', [`${this.nombre(nueva)} ${this.grupoTxt(nueva)}: ${this.dias[nueva.dia].nombre} ${rango(nueva.inicio, nueva.inicio + this.dur())}, ${this.aula(nueva.aulaId)}`]);
    } else {
      this.selViol.set(r.violaciones ?? []);
      this.rechazo(r, `${this.nombre(s)} ${this.grupoTxt(s)} → ${this.dias[Number(this.edDia)].nombre} ${rango(Number(this.edInicio), Number(this.edInicio) + this.dur())}`);
    }
  }

  // arrastre de sesiones del tablero (RF-10)
  inicioArrastre(e: CdkDragStart) {
    this.arrastro = true;
    const ev = e.event as MouseEvent & TouchEvent;
    const y = ev.touches?.[0]?.clientY ?? ev.clientY;
    this.offsetY = y - e.source.element.nativeElement.getBoundingClientRect().top;
  }
  moviendo(e: CdkDragMove) {
    this.destino.set(this.calcularDestino(e.pointerPosition.x, e.pointerPosition.y));
  }
  finArrastre(e: CdkDragEnd, s: Sesion) {
    const d = this.calcularDestino(e.dropPoint.x, e.dropPoint.y);
    e.source.reset();
    this.destino.set(null);
    setTimeout(() => (this.arrastro = false), 60);
    if (!d || (d.dia === s.dia && d.inicio === s.inicio)) return;
    const r = this.store.moverSesion(this.vt()!.id, s.id, { dia: d.dia as Dia, inicio: d.inicio });
    if (r.ok) {
      this.ultimoRechazo.set(null);
      this.toast.ok('Sesión movida', [`${this.nombre(s)} ${this.grupoTxt(s)} → ${this.dias[d.dia].nombre} ${rango(d.inicio, d.inicio + this.dur())}`]);
      if (this.sel()?.id === s.id) this.abrir(this.vt()!.sesiones.find((x) => x.id === s.id)!);
    } else this.rechazo(r, `${this.nombre(s)} → ${this.dias[d.dia].nombre} ${rango(d.inicio, d.inicio + this.dur())}`);
  }

  // arrastre desde la bandeja de pendientes
  inicioPend(e: CdkDragStart) {
    this.offsetY = 0;
    this.arrastro = true;
  }
  moviendoPend(e: CdkDragMove) {
    this.destino.set(this.calcularDestino(e.pointerPosition.x, e.pointerPosition.y, true));
  }
  finPend(e: CdkDragEnd, x: GrupoPendiente) {
    const d = this.calcularDestino(e.dropPoint.x, e.dropPoint.y, true);
    this.destino.set(null);
    setTimeout(() => (this.arrastro = false), 60);
    if (!d) return;
    const r = this.store.ubicarSesionPendiente(this.vt()!.id, x.grupoId, d.dia as Dia, d.inicio);
    if (r.ok) this.toast.ok('Sesión ubicada', [r.mensaje ?? '']);
    else this.rechazo(r, `${this.etiquetaPend(x)} → ${this.dias[d.dia].nombre} ${rango(d.inicio, d.inicio + this.dur())}`);
  }
  reintentar(x: GrupoPendiente) {
    const r = this.store.reintentarPendiente(this.vt()!.id, x.grupoId);
    if (r.ok) this.toast.ok('Grupo ubicado', [r.mensaje ?? '']);
    else this.toast.error(r.mensaje ?? 'Sigue pendiente', r.errores);
  }

  /** Traduce un punto de pantalla a (día, hora de inicio) usando la columna bajo el puntero. */
  private calcularDestino(x: number, y: number, desdePuntero = false): { dia: number; inicio: number } | null {
    const cols = this.columnas();
    for (let i = 0; i < cols.length; i++) {
      const r = cols[i].nativeElement.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top - 30 && y <= r.bottom + 30) {
        const top = desdePuntero ? y - r.top - this.alto / 2 : y - this.offsetY - r.top;
        const inicio = this.horas()[0] + Math.round(top / this.alto);
        return { dia: i, inicio };
      }
    }
    return null;
  }

  private rechazo(r: Resultado, que?: string) {
    const v = r.violaciones ?? [];
    this.ultimoRechazo.set({ titulo: que ?? r.mensaje ?? 'Movimiento rechazado', violaciones: v });
    this.toast.error(`${r.mensaje ?? 'Movimiento rechazado'}${v.length ? ' · ' + [...new Set(v.map((x) => x.regla))].join(', ') : ''}`, v.map((x) => `${x.regla} · ${x.mensaje}`));
  }

  nombreRegla(c: string) {
    return REGLAS_DURAS.find((r) => r.codigo === c)?.nombre ?? c;
  }
}
