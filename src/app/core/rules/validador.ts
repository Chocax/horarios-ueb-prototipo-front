// ValidadorReglas (CU-11, RF-09): la misma validación se usa al generar, al mover y al publicar.
import { Dia, ParametrosProgramacion, Sesion, VersionHorario, Violacion } from '../models';
import { Catalogo, ContextoValidacion, REGLAS_DURAS, ReglaDura } from './reglas-duras';

export interface Asignacion {
  sesionId: string | null; // null = sesión nueva
  grupoId: string;
  dia: Dia;
  inicio: number;
  docenteId: string | null;
  aulaId: string | null;
}

export class ValidadorReglas {
  constructor(private readonly reglas: ReglaDura[] = REGLAS_DURAS) {}

  /** Evalúa una asignación contra todas las reglas duras y devuelve todas las violaciones. */
  validar(a: Asignacion, sesionesVersion: Sesion[], parametros: ParametrosProgramacion, cat: Catalogo): Violacion[] {
    const grupo = cat.grupo(a.grupoId);
    if (!grupo) return [{ regla: '—', mensaje: 'El grupo no existe.' }];
    const curso = cat.curso(grupo.cursoId)!;
    const ctx: ContextoValidacion = {
      otras: sesionesVersion.filter((s) => s.id !== a.sesionId),
      grupo,
      curso,
      docente: a.docenteId ? cat.docente(a.docenteId) ?? null : null,
      aula: a.aulaId ? cat.aula(a.aulaId) ?? null : null,
      dia: a.dia,
      inicio: a.inicio,
      fin: a.inicio + parametros.duracionSesion,
      parametros,
      catalogo: cat,
      esNueva: a.sesionId === null,
    };
    const out: Violacion[] = [];
    for (const r of this.reglas) {
      const v = r.evaluar(ctx);
      if (v) out.push(v);
    }
    return out;
  }

  /** Revisión completa de una versión (usada antes de publicar, RF-12). */
  validarVersion(v: VersionHorario, parametros: ParametrosProgramacion, cat: Catalogo): { sesion: Sesion; violaciones: Violacion[] }[] {
    const resultado: { sesion: Sesion; violaciones: Violacion[] }[] = [];
    const porGrupo = new Map<string, number>();
    for (const s of v.sesiones) {
      porGrupo.set(s.grupoId, (porGrupo.get(s.grupoId) ?? 0) + 1);
      const viol = this.validar(
        { sesionId: s.id, grupoId: s.grupoId, dia: s.dia, inicio: s.inicio, docenteId: s.docenteId, aulaId: s.aulaId },
        v.sesiones,
        parametros,
        cat,
      );
      if (viol.length) resultado.push({ sesion: s, violaciones: viol });
    }
    for (const [grupoId, n] of porGrupo) {
      if (n > parametros.sesionesMaximas) {
        const s = v.sesiones.find((x) => x.grupoId === grupoId)!;
        resultado.push({ sesion: s, violaciones: [{ regla: 'R8', mensaje: `El grupo tiene ${n} sesiones y el máximo es ${parametros.sesionesMaximas}.` }] });
      }
    }
    return resultado;
  }

  get reglasRegistradas() {
    return this.reglas.map((r) => ({ codigo: r.codigo, nombre: r.nombre }));
  }
}
