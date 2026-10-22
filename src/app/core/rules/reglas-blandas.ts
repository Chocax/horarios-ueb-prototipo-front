// Restricciones blandas B1–B6 (RF-11): se reportan, no bloquean la publicación.
import { IncumplimientoBlando, ParametrosProgramacion, VersionHorario } from '../models';
import { nombreDiaMin, rango, seSolapan } from '../util';
import { Catalogo } from './reglas-duras';

export function evaluarBlandas(v: VersionHorario, p: ParametrosProgramacion, cat: Catalogo, docentesIds: string[]): IncumplimientoBlando[] {
  const out: IncumplimientoBlando[] = [];
  const dur = p.duracionSesion;
  const etiquetaGrupo = (gid: string) => {
    const g = cat.grupo(gid);
    const c = g ? cat.curso(g.cursoId) : undefined;
    return `${c?.nombre ?? '?'} ${g?.codigo ?? ''}`;
  };

  // B1: sesiones de cursos con 2 o 3 sesiones en días consecutivos
  const porGrupo = new Map<string, number[]>();
  v.sesiones.forEach((s) => porGrupo.set(s.grupoId, [...(porGrupo.get(s.grupoId) ?? []), s.dia]));
  for (const [gid, dias] of porGrupo) {
    if (dias.length < 2 || dias.length > 3) continue;
    const ord = [...dias].sort((a, b) => a - b);
    const consecutivos = ord.some((d, i) => i > 0 && d - ord[i - 1] === 1);
    if (consecutivos) {
      out.push({
        regla: 'B1',
        titulo: 'Días consecutivos',
        detalle: `${etiquetaGrupo(gid)} tiene sesiones en días seguidos (${ord.map((d) => nombreDiaMin(d as any)).join(', ')}).`,
      });
    }
  }

  // B2: huecos en la jornada del docente (2 h o más sin clase entre dos sesiones del mismo día)
  const porDocenteDia = new Map<string, number[]>();
  v.sesiones.forEach((s) => {
    if (!s.docenteId) return;
    const k = `${s.docenteId}|${s.dia}`;
    porDocenteDia.set(k, [...(porDocenteDia.get(k) ?? []), s.inicio]);
  });
  for (const [k, inicios] of porDocenteDia) {
    const ord = [...inicios].sort((a, b) => a - b);
    let hueco = 0;
    for (let i = 1; i < ord.length; i++) hueco += Math.max(0, ord[i] - (ord[i - 1] + dur));
    // el almuerzo no cuenta como hueco
    const almuerzo = p.bloquesNoAsignables.reduce((t, b) => t + (ord[0] < b.inicio && ord[ord.length - 1] >= b.fin ? b.fin - b.inicio : 0), 0);
    if (hueco - almuerzo >= 2) {
      const [did, dia] = k.split('|');
      out.push({
        regla: 'B2',
        titulo: 'Huecos del docente',
        detalle: `${cat.docente(did)?.nombre ?? '?'} tiene ${hueco - almuerzo} h libres entre clases el ${nombreDiaMin(Number(dia) as any)}.`,
      });
    }
  }

  // B3: desbalance de carga (docentes casi sin carga mientras otros están al límite)
  const carga = new Map<string, number>();
  v.sesiones.forEach((s) => s.docenteId && carga.set(s.docenteId, (carga.get(s.docenteId) ?? 0) + dur));
  const llenos = docentesIds.filter((id) => {
    const d = cat.docente(id);
    return d && (carga.get(id) ?? 0) >= d.horasMaxDocencia;
  });
  const vacios = docentesIds.filter((id) => (carga.get(id) ?? 0) === 0);
  if (llenos.length && vacios.length) {
    out.push({
      regla: 'B3',
      titulo: 'Carga desbalanceada',
      detalle: `${llenos.length} docente(s) al 100 % de su carga mientras ${vacios.length} no tienen clases asignadas (${vacios
        .slice(0, 3)
        .map((id) => cat.docente(id)?.nombre)
        .join(', ')}${vacios.length > 3 ? '…' : ''}).`,
    });
  }

  // B4: cruces entre cursos distintos del mismo nivel y jornada
  const vistos = new Set<string>();
  for (const a of v.sesiones) {
    const ga = cat.grupo(a.grupoId);
    if (!ga) continue;
    const ca = cat.curso(ga.cursoId)!;
    for (const b of v.sesiones) {
      if (a.id >= b.id) continue;
      const gb = cat.grupo(b.grupoId);
      if (!gb || gb.cursoId === ga.cursoId || gb.jornada !== ga.jornada || a.dia !== b.dia) continue;
      const cb = cat.curso(gb.cursoId)!;
      if (cb.nivel !== ca.nivel || !seSolapan(a.inicio, a.inicio + dur, b.inicio, b.inicio + dur)) continue;
      const k = [ga.id, gb.id].sort().join('|');
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({
        regla: 'B4',
        titulo: 'Cruce en el mismo semestre',
        detalle: `Semestre ${ca.nivel} (${ga.jornada.toLowerCase()}): ${ca.nombre} ${ga.codigo} y ${cb.nombre} ${gb.codigo} se cruzan el ${nombreDiaMin(a.dia)} ${rango(Math.max(a.inicio, b.inicio), Math.min(a.inicio, b.inicio) + dur)}.`,
      });
    }
  }

  // B5: aulas especiales ocupadas por cursos que no las requieren
  for (const s of v.sesiones) {
    if (!s.aulaId) continue;
    const aula = cat.aula(s.aulaId);
    const g = cat.grupo(s.grupoId);
    const c = g ? cat.curso(g.cursoId) : undefined;
    if (!aula || !c || !aula.caracteristicas.length) continue;
    const sobra = aula.caracteristicas.filter((x) => !c.caracteristicasRequeridas.includes(x));
    if (sobra.length === aula.caracteristicas.length) {
      out.push({
        regla: 'B5',
        titulo: 'Aula especial mal aprovechada',
        detalle: `${c.nombre} ${g!.codigo} usa ${aula.nombre} sin necesitar sus características (${nombreDiaMin(s.dia)} ${rango(s.inicio, s.inicio + dur)}).`,
      });
    }
  }

  // B6: norma del programa — los grupos diurnos de un mismo curso los dictan docentes distintos
  const diurnos = new Map<string, Map<string, Set<string>>>(); // curso → docente → grupos
  for (const s of v.sesiones) {
    const g = cat.grupo(s.grupoId);
    if (!g || g.jornada !== 'DIURNA' || !s.docenteId) continue;
    if (!diurnos.has(g.cursoId)) diurnos.set(g.cursoId, new Map());
    const m = diurnos.get(g.cursoId)!;
    if (!m.has(s.docenteId)) m.set(s.docenteId, new Set());
    m.get(s.docenteId)!.add(g.codigo);
  }
  for (const [cursoId, m] of diurnos) {
    for (const [docId, grupos] of m) {
      if (grupos.size < 2) continue;
      out.push({
        regla: 'B6',
        titulo: 'Dos grupos diurnos con el mismo docente',
        detalle: `${cat.curso(cursoId)?.nombre}: ${cat.docente(docId)?.nombre} dicta los grupos diurnos ${[...grupos].sort().join(' y ')}; la norma pide docentes distintos.`,
      });
    }
  }
  return out;
}
