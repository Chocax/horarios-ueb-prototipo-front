// Datos comunes de las pruebas: el estado de demostración y la propuesta generada para un periodo.
import { estadoInicial } from '../src/app/core/data/seed';
import { Catalogo } from '../src/app/core/rules/reglas-duras';
import { GeneradorVoraz } from '../src/app/core/scheduling/generador';
import { VersionHorario } from '../src/app/core/models';

export const estado = estadoInicial();

export const catalogo: Catalogo = {
  curso: (id) => estado.cursos.find((c) => c.id === id),
  grupo: (id) => estado.grupos.find((g) => g.id === id),
  docente: (id) => estado.docentes.find((d) => d.id === id),
  aula: (id) => estado.aulas.find((a) => a.id === id),
};

export const parametrosDe = (periodoId: string) => estado.periodos.find((p) => p.id === periodoId)!.parametros;

export function generar(periodoId: string) {
  const r = new GeneradorVoraz().generar({
    grupos: estado.grupos.filter((g) => g.periodoId === periodoId && g.estado === 'ABIERTO'),
    docentes: estado.docentes,
    aulas: estado.aulas,
    parametros: parametrosDe(periodoId),
    catalogo,
  });
  const version = { id: 'v-prueba', sesiones: r.sesiones, pendientes: r.pendientes } as unknown as VersionHorario;
  return { ...r, version };
}
