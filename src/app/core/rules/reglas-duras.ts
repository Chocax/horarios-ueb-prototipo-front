// Patrón Specification: cada restricción dura es una clase que implementa ReglaDura.
// Agregar una regla nueva = agregar una clase a REGLAS_DURAS (RNF-03).
import { Aula, Curso, Dia, Docente, Grupo, ParametrosProgramacion, Sesion, Violacion } from '../models';
import { nombreCaracteristica, nombreDiaMin, rango, seSolapan } from '../util';

export interface Catalogo {
  curso(id: string): Curso | undefined;
  grupo(id: string): Grupo | undefined;
  docente(id: string): Docente | undefined;
  aula(id: string): Aula | undefined;
}

export interface ContextoValidacion {
  /** Sesiones de la versión SIN la sesión que se evalúa. */
  otras: Sesion[];
  grupo: Grupo;
  curso: Curso;
  docente: Docente | null;
  aula: Aula | null;
  dia: Dia;
  inicio: number;
  fin: number;
  parametros: ParametrosProgramacion;
  catalogo: Catalogo;
  /** true si la sesión se agrega al grupo (no es un movimiento de una existente). */
  esNueva: boolean;
}

export interface ReglaDura {
  readonly codigo: string;
  readonly nombre: string;
  evaluar(ctx: ContextoValidacion): Violacion | null;
}

const etiquetaSesion = (s: Sesion, cat: Catalogo, dur: number) => {
  const g = cat.grupo(s.grupoId);
  const c = g ? cat.curso(g.cursoId) : undefined;
  return `${c?.nombre ?? 'otra clase'} ${g?.codigo ?? ''} · ${nombreDiaMin(s.dia)} ${rango(s.inicio, s.inicio + dur)}`;
};

export class R1DocenteSinCruces implements ReglaDura {
  readonly codigo = 'R1';
  readonly nombre = 'Un docente no puede tener dos sesiones a la vez';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.docente) return null;
    const dur = ctx.parametros.duracionSesion;
    const choque = ctx.otras.find(
      (s) => s.docenteId === ctx.docente!.id && s.dia === ctx.dia && seSolapan(s.inicio, s.inicio + dur, ctx.inicio, ctx.fin),
    );
    return choque
      ? { regla: this.codigo, mensaje: `${ctx.docente.nombre} ya tiene clase: ${etiquetaSesion(choque, ctx.catalogo, dur)}.` }
      : null;
  }
}

export class R2AulaSinCruces implements ReglaDura {
  readonly codigo = 'R2';
  readonly nombre = 'Un aula no puede tener dos sesiones a la vez';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.aula) return null;
    const dur = ctx.parametros.duracionSesion;
    const choque = ctx.otras.find(
      (s) => s.aulaId === ctx.aula!.id && s.dia === ctx.dia && seSolapan(s.inicio, s.inicio + dur, ctx.inicio, ctx.fin),
    );
    return choque
      ? { regla: this.codigo, mensaje: `El aula ${ctx.aula.codigo} ya está ocupada: ${etiquetaSesion(choque, ctx.catalogo, dur)}.` }
      : null;
  }
}

export class R3FranjaHabil implements ReglaDura {
  readonly codigo = 'R3';
  readonly nombre = 'Dentro de la franja hábil y fuera de los bloques no asignables';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    const p = ctx.parametros;
    const franja = ctx.dia === 5 ? p.franjaSabado : p.franjaLunesViernes;
    if (ctx.inicio < franja.inicio || ctx.fin > franja.fin) {
      return {
        regla: this.codigo,
        mensaje: `El ${nombreDiaMin(ctx.dia)} solo se programa entre ${rango(franja.inicio, franja.fin)}; la sesión quedaría ${rango(ctx.inicio, ctx.fin)}.`,
      };
    }
    const bloque = p.bloquesNoAsignables.find((b) => seSolapan(b.inicio, b.fin, ctx.inicio, ctx.fin));
    return bloque
      ? { regla: this.codigo, mensaje: `La sesión ${rango(ctx.inicio, ctx.fin)} cruza el bloque no asignable ${rango(bloque.inicio, bloque.fin)}.` }
      : null;
  }
}

export class R4AulaAdecuada implements ReglaDura {
  readonly codigo = 'R4';
  readonly nombre = 'Aula con capacidad y características suficientes';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.aula) return { regla: this.codigo, mensaje: 'La sesión no tiene aula asignada.' };
    if (ctx.aula.capacidad < ctx.grupo.cupoPlaneado) {
      return {
        regla: this.codigo,
        mensaje: `El aula ${ctx.aula.codigo} tiene capacidad ${ctx.aula.capacidad} y el grupo ${ctx.grupo.codigo} tiene cupo ${ctx.grupo.cupoPlaneado}.`,
      };
    }
    const faltan = ctx.curso.caracteristicasRequeridas.filter((c) => !ctx.aula!.caracteristicas.includes(c));
    if (faltan.length) {
      const txt = faltan.map((f) => nombreCaracteristica(f).toLowerCase()).join(' y ');
      return { regla: this.codigo, mensaje: `${ctx.curso.nombre} requiere ${txt} y el aula ${ctx.aula.codigo} no los tiene.` };
    }
    return null;
  }
}

export class R5DocenteHabilitado implements ReglaDura {
  readonly codigo = 'R5';
  readonly nombre = 'Docente habilitado para el curso';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.docente) return { regla: this.codigo, mensaje: 'La sesión no tiene docente asignado.' };
    return ctx.docente.habilitaciones.includes(ctx.curso.id)
      ? null
      : { regla: this.codigo, mensaje: `${ctx.docente.nombre} no está habilitado para ${ctx.curso.nombre}.` };
  }
}

export class R6DisponibilidadDocente implements ReglaDura {
  readonly codigo = 'R6';
  readonly nombre = 'Respeta la disponibilidad del docente';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.docente) return null;
    const ok = ctx.docente.disponibilidad.some((b) => b.dia === ctx.dia && b.inicio <= ctx.inicio && b.fin >= ctx.fin);
    return ok
      ? null
      : { regla: this.codigo, mensaje: `${ctx.docente.nombre} no está disponible el ${nombreDiaMin(ctx.dia)} ${rango(ctx.inicio, ctx.fin)}.` };
  }
}

export class R7CargaMaxima implements ReglaDura {
  readonly codigo = 'R7';
  readonly nombre = 'No supera las horas máximas del docente';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    if (!ctx.docente) return null;
    const dur = ctx.parametros.duracionSesion;
    const carga = ctx.otras.filter((s) => s.docenteId === ctx.docente!.id).length * dur;
    return carga + dur > ctx.docente.horasMaxDocencia
      ? {
          regla: this.codigo,
          mensaje: `${ctx.docente.nombre} quedaría con ${carga + dur} h y su máximo de docencia es ${ctx.docente.horasMaxDocencia} h.`,
        }
      : null;
  }
}

export class R8SesionesMaximas implements ReglaDura {
  readonly codigo = 'R8';
  readonly nombre = 'No supera las sesiones semanales máximas';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    const n = ctx.otras.filter((s) => s.grupoId === ctx.grupo.id).length + 1;
    return n > ctx.parametros.sesionesMaximas
      ? { regla: this.codigo, mensaje: `El grupo ${ctx.grupo.codigo} quedaría con ${n} sesiones y el máximo es ${ctx.parametros.sesionesMaximas}.` }
      : null;
  }
}

export class R9CupoMaximo implements ReglaDura {
  readonly codigo = 'R9';
  readonly nombre = 'Cupo del grupo dentro del máximo más la tolerancia';
  evaluar(ctx: ContextoValidacion): Violacion | null {
    const tope = cupoEfectivo(ctx.parametros);
    return ctx.grupo.cupoPlaneado > tope
      ? { regla: this.codigo, mensaje: `El grupo ${ctx.grupo.codigo} tiene cupo ${ctx.grupo.cupoPlaneado} y el máximo efectivo es ${tope}.` }
      : null;
  }
}

export const cupoEfectivo = (p: ParametrosProgramacion) => Math.floor(p.cupoMaximo * (1 + p.toleranciaCupo / 100));

export const REGLAS_DURAS: ReglaDura[] = [
  new R1DocenteSinCruces(),
  new R2AulaSinCruces(),
  new R3FranjaHabil(),
  new R4AulaAdecuada(),
  new R5DocenteHabilitado(),
  new R6DisponibilidadDocente(),
  new R7CargaMaxima(),
  new R8SesionesMaximas(),
  new R9CupoMaximo(),
];
