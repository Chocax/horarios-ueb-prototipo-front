// Pruebas del generador voraz (RF-08) con los datos de demostración.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluarBlandas } from '../src/app/core/rules/reglas-blandas';
import { ValidadorReglas } from '../src/app/core/rules/validador';
import { catalogo, estado, generar, parametrosDe } from './apoyo';

for (const [per, pendientesEsperados] of [['per-2026-1', 0], ['per-2026-2', 1]] as const) {
  describe(`Generador · ${per}`, () => {
    const r = generar(per);
    const p = parametrosDe(per);

    it('termina rápido (RNF-01)', () => assert.ok(r.milisegundos < 5000, `${r.milisegundos} ms`));

    it('la propuesta no viola ninguna regla dura', () => {
      assert.equal(new ValidadorReglas().validarVersion(r.version, p, catalogo).length, 0);
    });

    it(`deja ${pendientesEsperados} grupo(s) pendiente(s), cada uno con regla y causa`, () => {
      assert.equal(r.pendientes.length, pendientesEsperados);
      r.pendientes.forEach((x) => assert.ok(x.regla && x.causa));
    });

    it('ningún grupo queda con dos sesiones el mismo día', () => {
      const vistos = new Set<string>();
      for (const s of r.sesiones) {
        const k = `${s.grupoId}|${s.dia}`;
        assert.ok(!vistos.has(k), `grupo ${s.grupoId} repite el día ${s.dia}`);
        vistos.add(k);
      }
    });

    it('cada grupo programado tiene todas sus sesiones', () => {
      const pend = new Set(r.pendientes.map((x) => x.grupoId));
      for (const g of estado.grupos.filter((x) => x.periodoId === per && x.estado === 'ABIERTO' && !pend.has(x.id))) {
        const c = catalogo.curso(g.cursoId)!;
        const n = r.sesiones.filter((s) => s.grupoId === g.id).length;
        assert.equal(n, Math.max(p.sesionesMinimas, c.sesionesSemanales), `${c.nombre} ${g.codigo}`);
      }
    });

    it('la mayoría de grupos diurnos queda en L-X, M-J o L-X-V a la misma hora', () => {
      let total = 0, habituales = 0;
      for (const g of estado.grupos.filter((x) => x.periodoId === per && x.jornada === 'DIURNA')) {
        const l = r.sesiones.filter((s) => s.grupoId === g.id).sort((a, b) => a.dia - b.dia);
        if (l.length < 2) continue;
        total++;
        const dias = l.map((s) => s.dia).join(',');
        if (['0,2', '1,3', '0,2,4'].includes(dias) && new Set(l.map((s) => s.inicio)).size === 1) habituales++;
      }
      assert.ok(habituales / total >= 0.75, `${habituales} de ${total}`);
    });

    it('la norma de dos docentes en el día es blanda: a lo sumo se reporta como B6', () => {
      const b6 = evaluarBlandas(r.version, p, catalogo, estado.docentes.map((d) => d.id)).filter((b) => b.regla === 'B6');
      assert.ok(b6.length <= 1);
      b6.forEach((b) => assert.match(b.detalle, /Investigación tecnológica/));
    });
  });
}

describe('Generador · horario de atención', () => {
  it('no programa clases del docente encima de su horario de atención', async () => {
    const { GeneradorVoraz } = await import('../src/app/core/scheduling/generador');
    const per = 'per-2026-2';
    const german = estado.docentes.find((d) => d.nombre === 'Germán Augusto Neuta')!;
    const bloqueos = [7, 9, 11, 14, 16, 18, 20].map((h) => ({ docenteId: german.id, dia: 4 as const, inicio: h, fin: h + 2 }));
    const r = new GeneradorVoraz().generar({
      grupos: estado.grupos.filter((g) => g.periodoId === per && g.estado === 'ABIERTO'),
      docentes: estado.docentes, aulas: estado.aulas, parametros: parametrosDe(per), catalogo, bloqueosDocente: bloqueos,
    });
    assert.equal(r.sesiones.filter((s) => s.docenteId === german.id && s.dia === 4).length, 0);
  });
});
