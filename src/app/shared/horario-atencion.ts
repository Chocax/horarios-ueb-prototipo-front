// Horario de atención por materia (cambio solicitado en la validación del prototipo con el docente de Legislación).
// Lo usan el docente («Mi disponibilidad») y la coordinadora («Docentes» → pestaña «Horario de atención»).
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dia, DIAS, HorarioAtencion, ModoAtencion } from '../core/models';
import { StoreService } from '../core/services/store.service';
import { ToastService } from '../core/services/toast.service';
import { hh, nuevoId } from '../core/util';
import { Icon } from './icon';
import { bloqueado, horasGrilla } from './semana';

interface Fila {
  cursoId: string;
  curso: string;
  nivel: number;
  modo: ModoAtencion | 'NINGUNO';
  dia: Dia;
  inicio: number;
  duracion: 1 | 2;
  lugar: string;
  guardado: HorarioAtencion | null;
}

@Component({
  selector: 'app-horario-atencion',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="caption intro">
      Espacio semanal de 1 o 2 horas por materia para tutorías, preguntas u orientación. Si no tiene una hora fija, elija
      <strong>Acordar con el docente</strong> e indique cómo contactarlo. No puede cruzarse con sus clases ni con el almuerzo; el generador no
      programa clases encima.
    </p>
    @if (filas().length) {
      <div class="filas">
        @for (f of filas(); track f.cursoId) {
          <div class="fila" [class.sin]="f.modo === 'NINGUNO'">
            <div class="cab">
              <div>
                <strong>{{ f.curso }}</strong>
                <span class="caption"> · semestre {{ f.nivel }}</span>
              </div>
              <span class="pill" [class.green]="f.guardado?.modo === 'HORARIO'" [class.blue]="f.guardado?.modo === 'ACORDAR'">{{ store.textoAtencion(f.guardado) }}</span>
            </div>
            <div class="controles">
              <div class="field">
                <label>Modalidad</label>
                <select [(ngModel)]="f.modo" [attr.aria-label]="'Modalidad ' + f.curso">
                  <option value="HORARIO">Horario fijo</option>
                  <option value="ACORDAR">Acordar con el docente</option>
                  <option value="NINGUNO">Sin definir</option>
                </select>
              </div>
              @if (f.modo === 'HORARIO') {
                <div class="field">
                  <label>Día</label>
                  <select [(ngModel)]="f.dia">@for (d of dias; track d.valor) { <option [ngValue]="d.valor">{{ d.nombre }}</option> }</select>
                </div>
                <div class="field">
                  <label>Desde</label>
                  <select [(ngModel)]="f.inicio">@for (h of horasInicio(); track h) { <option [ngValue]="h">{{ hh(h) }}</option> }</select>
                </div>
                <div class="field">
                  <label>Duración</label>
                  <select [(ngModel)]="f.duracion"><option [ngValue]="1">1 hora</option><option [ngValue]="2">2 horas</option></select>
                </div>
              }
              @if (f.modo !== 'NINGUNO') {
                <div class="field lugar">
                  <label>{{ f.modo === 'ACORDAR' ? 'Cómo contactarlo' : 'Lugar (opcional)' }}</label>
                  <input type="text" [(ngModel)]="f.lugar" [placeholder]="f.modo === 'ACORDAR' ? 'Correo o indicación' : 'Sala, bloque o enlace'" />
                </div>
              }
              <button type="button" class="btn btn-sm btn-primary" (click)="guardar(f)"><app-icon name="check" [size]="14" /> Guardar</button>
            </div>
            @if (aviso(f); as a) { <div class="aviso warn mini"><app-icon name="alert" [size]="14" /><span>{{ a }}</span></div> }
            @if (errores()[f.cursoId]; as errs) {
              <div class="errores mini"><ul>@for (x of errs; track x) { <li>{{ x }}</li> }</ul></div>
            }
          </div>
        }
      </div>
    } @else {
      <p class="muted">El docente aún no tiene materias asignadas en {{ store.periodo().codigo }}. Cuando se genere el horario (o se le asigne un grupo como docente preferente) podrá registrar aquí su horario de atención.</p>
    }
  `,
  styles: [
    `
      .intro { margin: 0 0 12px; line-height: 1.5; }
      .filas { display: grid; gap: 10px; }
      .fila { border: 1px solid var(--hairline); border-radius: 10px; padding: 12px 14px; background: #fff; }
      .fila.sin { background: var(--surface-muted, #fafaf9); }
      .cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
      .controles { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
      .controles .field { min-width: 110px; }
      .controles .field.lugar { flex: 1 1 200px; }
      .mini { margin-top: 10px; font-size: 12.5px; padding: 8px 10px; }
    `,
  ],
})
export class HorarioAtencionEditor {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly docenteId = input.required<string>();

  protected readonly dias = DIAS;
  protected readonly hh = hh;
  protected readonly errores = signal<Record<string, string[]>>({});
  private readonly version = signal(0);

  /** Horas de inicio posibles: dentro de la grilla y fuera del bloque de almuerzo. */
  protected readonly horasInicio = computed(() => {
    const p = this.store.parametros();
    return horasGrilla(p).filter((h) => !bloqueado(p, h));
  });

  protected readonly filas = computed<Fila[]>(() => {
    this.version();
    const id = this.docenteId();
    return this.store.cursosDictados(id).map((c) => {
      const g = this.store.atencionDe(id, c.id);
      return {
        cursoId: c.id,
        curso: c.nombre,
        nivel: c.nivel,
        modo: g?.modo ?? 'NINGUNO',
        dia: (g?.dia ?? 0) as Dia,
        inicio: g?.inicio ?? 11,
        duracion: g?.inicio != null && g.fin != null && g.fin - g.inicio === 2 ? 2 : 1,
        lugar: g?.lugar ?? '',
        guardado: g,
      };
    });
  });

  aviso(f: Fila) {
    return f.guardado ? this.store.avisoAtencion(f.guardado) : null;
  }

  guardar(f: Fila) {
    const id = this.docenteId();
    let r;
    if (f.modo === 'NINGUNO') {
      if (!f.guardado) return;
      r = this.store.eliminarAtencion(f.guardado);
    } else {
      r = this.store.guardarAtencion({
        id: f.guardado?.id ?? nuevoId('ate'),
        periodoId: this.store.periodo().id,
        docenteId: id,
        cursoId: f.cursoId,
        modo: f.modo,
        dia: f.modo === 'HORARIO' ? (Number(f.dia) as Dia) : null,
        inicio: f.modo === 'HORARIO' ? Number(f.inicio) : null,
        fin: f.modo === 'HORARIO' ? Number(f.inicio) + Number(f.duracion) : null,
        lugar: f.lugar.trim(),
      });
    }
    this.errores.update((e) => ({ ...e, [f.cursoId]: r.ok ? [] : (r.errores ?? [r.mensaje ?? 'Error']) }));
    if (r.ok) {
      this.version.update((v) => v + 1);
      this.toast.ok('Horario de atención guardado', [`${f.curso}: ${this.store.textoAtencion(this.store.atencionDe(id, f.cursoId))}`]);
    }
  }
}
