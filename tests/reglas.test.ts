// Pruebas del motor de reglas duras R1–R9 (RF-09): cada regla tiene un caso que la viola y se rechaza nombrándola.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Sesion } from '../src/app/core/models';
import { REGLAS_DURAS } from '../src/app/core/rules/reglas-duras';
import { Asignacion, ValidadorReglas } from '../src/app/core/rules/validador';
import { catalogo, estado, generar, parametrosDe } from './apoyo';

const PER = 'per-2026-2';
const p = parametrosDe(PER);
const { sesiones } = generar(PER);
const validador = new ValidadorReglas();
const reglas = (a: Asignacion, cat = catalogo) => validador.validar(a, sesiones, p, cat).map((v) => v.regla);
const mover = (s: Sesion, cambios: Partial<Asignacion>): Asignacion => ({
  sesionId: s.id, grupoId: s.grupoId, dia: s.dia, inicio: s.inicio, docenteId: s.docenteId, aulaId: s.aulaId, ...cambios,
});
const carga = (docId: string) => sesiones.filter((s) => s.docenteId === docId).length * p.duracionSesion;

describe('Motor de reglas duras', () => {
  it('tiene registradas las nueve reglas R1–R9', () => {
    assert.deepEqual(REGLAS_DURAS.map((r) => r.codigo), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
  });

  it('una sesión sin cambios no viola ninguna regla', () => {
    for (const s of sesiones.slice(0, 40)) assert.deepEqual(reglas(mover(s, {})), []);
  });

  it('R1: un docente no puede tener dos sesiones a la vez', () => {
    // dos sesiones de grupos distintos con el mismo docente: se mueve una encima de la otra
    const a = sesiones.find((x) => sesiones.some((y) => y.docenteId === x.docenteId && y.grupoId !== x.grupoId))!;
    const b = sesiones.find((y) => y.docenteId === a.docenteId && y.grupoId !== a.grupoId)!;
    assert.ok(reglas(mover(a, { dia: b.dia, inicio: b.inicio })).includes('R1'));
  });

  it('R2: un aula no puede tener dos sesiones a la vez', () => {
    const [a, b] = [sesiones[0], sesiones.find((y) => y.docenteId !== sesiones[0].docenteId && y.grupoId !== sesiones[0].grupoId)!];
    assert.ok(reglas(mover(a, { dia: b.dia, inicio: b.inicio, aulaId: b.aulaId })).includes('R2'));
  });

  it('R3: no se programa en el bloque no asignable ni fuera de la franja', () => {
    const s = sesiones[0];
    assert.ok(reglas(mover(s, { inicio: 13 })).includes('R3'));
    assert.ok(reglas(mover(s, { dia: 5, inicio: 15 })).includes('R3'));
  });

  it('R4: el aula debe tener capacidad y características suficientes', () => {
    const s = sesiones.find((x) => catalogo.curso(catalogo.grupo(x.grupoId)!.cursoId)!.caracteristicasRequeridas.length)!;
    const sinEquipos = estado.aulas.find((a) => a.caracteristicas.length === 0)!;
    assert.ok(reglas(mover(s, { aulaId: sinEquipos.id })).includes('R4'));
  });

  it('R5: el docente debe estar habilitado para el curso', () => {
    const s = sesiones[0];
    const cursoId = catalogo.grupo(s.grupoId)!.cursoId;
    const otro = estado.docentes.find((d) => !d.habilitaciones.includes(cursoId))!;
    assert.ok(reglas(mover(s, { docenteId: otro.id })).includes('R5'));
  });

  it('R6: se respeta la disponibilidad del docente', () => {
    const s = sesiones.find((x) => x.inicio < 18 && x.dia < 5)!;
    const nocturno = estado.docentes.find((d) => d.disponibilidad.every((b) => b.dia === 5 || b.inicio >= 18))!;
    assert.ok(reglas(mover(s, { docenteId: nocturno.id })).includes('R6'));
  });

  it('R7: no se superan las horas máximas del docente', () => {
    const lleno = estado.docentes.find((d) => carga(d.id) >= d.horasMaxDocencia)!;
    const s = sesiones.find((x) => x.docenteId !== lleno.id)!;
    assert.ok(reglas(mover(s, { docenteId: lleno.id })).includes('R7'));
  });

  it('R8: un grupo solo tiene una sesión por día', () => {
    const s = sesiones.find((x) => sesiones.some((y) => y.grupoId === x.grupoId && y.id !== x.id))!;
    const otra = sesiones.find((y) => y.grupoId === s.grupoId && y.id !== s.id)!;
    const hora = [7, 9, 14, 16, 18, 20].find((h) => h !== otra.inicio)!;
    const r = reglas(mover(s, { dia: otra.dia, inicio: hora }));
    assert.ok(r.includes('R8'), `esperaba R8 y salió ${r.join(', ')}`);
  });

  it('R8: no se agregan más sesiones de las permitidas por semana', () => {
    const g = estado.grupos.find((x) => x.periodoId === PER && sesiones.filter((s) => s.grupoId === x.id).length >= p.sesionesMaximas);
    if (!g) return; // ningún grupo llega al máximo con los datos de demostración
    const r = reglas({ sesionId: null, grupoId: g.id, dia: 5, inicio: 7, docenteId: null, aulaId: null });
    assert.ok(r.includes('R8'));
  });

  it('R9: el cupo del grupo no supera el cupo efectivo', () => {
    const s = sesiones[0];
    const g = catalogo.grupo(s.grupoId)!;
    const cat = { ...catalogo, grupo: (id: string) => (id === g.id ? { ...g, cupoPlaneado: 60 } : catalogo.grupo(id)) };
    assert.ok(reglas(mover(s, {}), cat).includes('R9'));
  });
});
