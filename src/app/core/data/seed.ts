// Datos de demostración. El plan de estudios corresponde al de Ingeniería de Sistemas de la UEB;
// los nombres de docentes se tomaron como referencia de horarios reales, pero su vinculación,
// escalafón, disponibilidad, correos y cupos son FICTICIOS, solo para el prototipo.
import {
  Aula, BloqueDisponible, Caracteristica, Curso, Dia, Docente, EstadoApp, Grupo, Jornada, OfertaCurso,
  ParametrosProgramacion, PeriodoAcademico, Usuario, Vinculacion,
} from '../models';
import { hashClave } from '../util';

export const PARAMETROS_POR_DEFECTO: ParametrosProgramacion = {
  franjaLunesViernes: { inicio: 7, fin: 22 },
  franjaSabado: { inicio: 7, fin: 13 },
  bloquesNoAsignables: [{ inicio: 12, fin: 13 }],
  duracionSesion: 2,
  cupoMaximo: 40,
  toleranciaCupo: 10,
  cupoMinimo: 10,
  sesionesMinimas: 1,
  sesionesMaximas: 4,
  horasMaxPorVinculacion: { TIEMPO_COMPLETO: 16, TRES_CUARTOS: 12, MEDIO_TIEMPO: 8, CUARTO_TIEMPO: 4 },
};

const EC: Caracteristica = 'EQUIPOS_COMPUTO';
const MM: Caracteristica = 'MOBILIARIO_MOVIL';
const LR: Caracteristica = 'LAB_REDES';
const LF: Caracteristica = 'LAB_FISICA';

/** [nombre, nivel, créditos, características, sesiones (opcional), jornada de referencia (todos abren diurno y nocturno)] */
type DefCurso = [string, number, number, Caracteristica[], number?, Jornada?];
const PENSUM: DefCurso[] = [
  ['Matemáticas básicas', 1, 3, []],
  ['Lógica matemática', 1, 2, []],
  ['Matemáticas discretas', 1, 3, []],
  ['Fundamentos de programación', 1, 3, [EC]],
  ['Introducción a la ingeniería de sistemas', 1, 3, []],
  ['Estructuras del pensamiento I', 1, 1, [MM]],
  ['Cálculo diferencial', 2, 3, []],
  ['Álgebra lineal', 2, 3, []],
  ['Física I (Mecánica)', 2, 3, [LF]],
  ['Lógica difusa', 2, 2, []],
  ['Programación I', 2, 4, [EC]],
  ['Estructuras del pensamiento II', 2, 1, [MM]],
  ['Seminario de bioética', 2, 1, []],
  ['Cálculo integral', 3, 3, []],
  ['Estadística y probabilidad', 3, 2, []],
  ['Física II (Electricidad)', 3, 3, [LF]],
  ['Programación II', 3, 4, [EC]],
  ['Estructuras de datos', 3, 3, [EC]],
  ['Proyecto núcleo I', 3, 1, [MM]],
  ['Estructuras del pensamiento III', 3, 1, [MM]],
  ['Matemáticas aplicadas', 4, 3, []],
  ['Complejidad algorítmica', 4, 3, []],
  ['Bases de datos I', 4, 3, [EC]],
  ['Sistemas digitales y arquitectura', 4, 2, []],
  ['Dirección y planeación', 4, 3, [MM]],
  ['Estructuras del pensamiento IV', 4, 1, [MM]],
  ['Dinámica de sistemas', 5, 3, [], undefined, 'DIURNA'],
  ['Ingeniería de software I', 5, 3, [], undefined, 'DIURNA'],
  ['Bases de datos II', 5, 3, [EC], undefined, 'DIURNA'],
  ['Sistemas operacionales', 5, 3, [EC], undefined, 'DIURNA'],
  ['Microprocesadores y programación assembler', 5, 2, [EC], undefined, 'DIURNA'],
  ['Historia y filosofía de la ingeniería', 5, 1, [], undefined, 'DIURNA'],
  ['Labor social', 6, 2, [], 1, 'DIURNA'],
  ['Modelos y simulación de sistemas', 6, 3, [], undefined, 'DIURNA'],
  ['Ingeniería de software II', 6, 3, [], undefined, 'NOCTURNA'],
  ['Redes de datos I', 6, 3, [EC, LR], undefined, 'NOCTURNA'],
  ['Gestión de proyectos', 6, 3, [MM], undefined, 'DIURNA'],
  ['Proyecto núcleo II', 6, 1, [MM], undefined, 'DIURNA'],
  ['Investigación tecnológica y de ingeniería', 6, 2, [], undefined, 'NOCTURNA'],
  ['Taller de práctica profesional', 7, 1, [MM], undefined, 'NOCTURNA'],
  ['Electiva profesional I', 7, 2, [], undefined, 'NOCTURNA'],
  ['Ingeniería de software III', 7, 3, [], undefined, 'NOCTURNA'],
  ['Redes de datos II', 7, 3, [EC, LR], undefined, 'NOCTURNA'],
  ['Gestión de tecnología e innovación', 7, 2, [], undefined, 'NOCTURNA'],
  ['Legislación, normatividad y ciudadanía', 7, 1, [], undefined, 'NOCTURNA'],
  ['Seminario de investigación', 7, 3, [MM], undefined, 'NOCTURNA'],
  ['Electiva profesional II', 8, 2, [], undefined, 'NOCTURNA'],
  ['Compiladores', 8, 3, [EC], undefined, 'NOCTURNA'],
  ['Seguridad de la información', 8, 3, [EC, LR], undefined, 'NOCTURNA'],
  ['Sistemas inteligentes', 8, 2, [EC], undefined, 'NOCTURNA'],
  ['Proyecto de grado I', 8, 3, [], undefined, 'NOCTURNA'],
  ['Electiva profesional III', 9, 2, [], undefined, 'NOCTURNA'],
  ['Proyecto de grado II', 9, 2, [], 1, 'NOCTURNA'],
];

const sesionesPorCreditos = (c: number) => (c <= 1 ? 1 : c === 4 ? 3 : 2);

export function construirCursos(): Curso[] {
  const porNivel: Record<number, number> = {};
  return PENSUM.map(([nombre, nivel, creditos, car, ses]) => {
    porNivel[nivel] = (porNivel[nivel] ?? 0) + 1;
    const codigo = `ISI-${nivel}${String(porNivel[nivel]).padStart(2, '0')}`;
    return {
      id: `cur-${codigo.toLowerCase()}`,
      codigo,
      nombre,
      nivel,
      creditos,
      sesionesSemanales: ses ?? sesionesPorCreditos(creditos),
      caracteristicasRequeridas: car,
    };
  });
}

/** Bloques del campus que usa la Facultad de Ingeniería (datos de referencia para el prototipo). */
export const BLOQUES: { codigo: string; nombre: string; descripcion: string }[] = [
  { codigo: 'A', nombre: 'Bloque A', descripcion: 'Pisos 2, 3 y 4, salones 1 a 4: todos son salas de cómputo. En el piso 3 está la Facultad de Ingeniería.' },
  { codigo: 'B', nombre: 'Bloque B', descripcion: 'Pisos 2 y 3, salones 1 a 13: del 1 al 5 son salones de sillas y tablero; del 6 al 13, salas de cómputo.' },
  { codigo: 'E', nombre: 'Bloque E', descripcion: 'Piso 1, salones 1 a 5: salones dotados con mobiliario móvil; se pueden pedir portátiles.' },
  { codigo: 'F', nombre: 'Bloque F', descripcion: 'Pisos 2 y 3: salas de cómputo 1 a 4; en el piso 2, laboratorios de redes y de seguridad de la información. Pisos 4, 5 y 7: salones de sillas y tablero.' },
  { codigo: 'G', nombre: 'Bloque G', descripcion: 'Laboratorios de física (G-LAB).' },
  { codigo: 'I', nombre: 'Bloque I', descripcion: 'Piso 1, salones 1 a 10; pisos 2 y 3, salones 1 a 4: salones de sillas y tablero.' },
];

export function construirAulas(): Aula[] {
  const out: Aula[] = [];
  const a = (bloque: string, piso: number, num: number, tipo: 'std' | 'pc' | 'mm', capacidad: number) => {
    const codigo = `${bloque}-${piso}${String(num).padStart(2, '0')}`;
    const nombre = tipo === 'pc' ? `Sala de cómputo ${codigo}` : `Salón ${codigo}`;
    const caracteristicas: Caracteristica[] = tipo === 'pc' ? [EC] : tipo === 'mm' ? [MM] : [];
    out.push({ id: `aula-${codigo.toLowerCase()}`, codigo, nombre, capacidad, caracteristicas, bloque, piso });
  };
  // Bloque A: pisos 2–4, salas de cómputo 1–4 (en el piso 3 funciona la Facultad)
  for (const piso of [2, 3, 4]) for (let n = 1; n <= 4; n++) a('A', piso, n, 'pc', n <= 2 ? 35 : 30);
  // Bloque B: pisos 2–3, salones 1–13 (6 en adelante con computadores)
  for (const piso of [2, 3]) for (let n = 1; n <= 13; n++) a('B', piso, n, n >= 6 ? 'pc' : 'std', n >= 6 ? (n % 2 ? 30 : 35) : n <= 2 ? 45 : 40);
  // Bloque I: piso 1 salones 1–10, pisos 2–3 salones 1–4
  for (let n = 1; n <= 10; n++) a('I', 1, n, 'std', n <= 4 ? 45 : 40);
  for (const piso of [2, 3]) for (let n = 1; n <= 4; n++) a('I', piso, n, 'std', 35);
  // Bloque F: pisos 2–3 cómputo; piso 2 laboratorios; pisos 4, 5 y 7 salones
  for (const piso of [2, 3]) for (let n = 1; n <= 4; n++) a('F', piso, n, 'pc', piso === 2 ? 30 : 35);
  out.push(
    { id: 'aula-f-205', codigo: 'F-205', nombre: 'Laboratorio de redes y telecomunicaciones', capacidad: 35, caracteristicas: [EC, LR], bloque: 'F', piso: 2 },
    { id: 'aula-f-206', codigo: 'F-206', nombre: 'Laboratorio de seguridad de la información', capacidad: 35, caracteristicas: [EC, LR], bloque: 'F', piso: 2 },
  );
  for (const piso of [4, 5, 7]) for (let n = 1; n <= 4; n++) a('F', piso, n, 'std', n <= 2 ? 40 : 35);
  // Bloque E: piso 1, salones con mobiliario móvil
  for (let n = 1; n <= 5; n++) a('E', 1, n, 'mm', 40);
  // Bloque G: laboratorios de física
  for (let n = 1; n <= 3; n++)
    out.push({ id: `aula-g-lab${n}`, codigo: `G-LAB${n}`, nombre: `Laboratorio de física ${n}`, capacidad: 40, caracteristicas: [LF], bloque: 'G', piso: 1 });
  return out;
}

// Plantillas de disponibilidad (ficticias)
const LV = [0, 1, 2, 3, 4] as Dia[];
const SAB: BloqueDisponible = { dia: 5, inicio: 7, fin: 13 };
const todoElDia = (): BloqueDisponible[] => [...LV.map((dia) => ({ dia, inicio: 7, fin: 22 })), SAB];
const soloNoche = (): BloqueDisponible[] => [...LV.map((dia) => ({ dia, inicio: 18, fin: 22 })), SAB];
const mananaYNoche = (): BloqueDisponible[] => LV.flatMap((dia) => [{ dia, inicio: 7, fin: 12 }, { dia, inicio: 18, fin: 22 }]);
const tardeYNoche = (): BloqueDisponible[] => [...LV.map((dia) => ({ dia, inicio: 13, fin: 22 })), SAB];
const tardeNocheSinSabado = (): BloqueDisponible[] => LV.map((dia) => ({ dia, inicio: 13, fin: 22 }));
const diurno = (): BloqueDisponible[] => [...LV.map((dia) => ({ dia, inicio: 7, fin: 18 })), SAB];
const diurnoSinSabado = (): BloqueDisponible[] => LV.map((dia) => ({ dia, inicio: 7, fin: 18 }));
const nocheEntreSemana = (): BloqueDisponible[] => LV.map((dia) => ({ dia, inicio: 18, fin: 22 }));
const viernesYSabado = (): BloqueDisponible[] => [{ dia: 4, inicio: 7, fin: 22 }, SAB];

/** [nombre, vinculación, escalafón, disponibilidad, horas máximas si difieren de la vinculación] */
type DefDocente = [string, Vinculacion, string, () => BloqueDisponible[], number?];
// Nombres reales tomados como referencia del Excel de horarios; los marcados (*) son ficticios para completar la planta.
// Vinculación, escalafón, disponibilidad y cursos habilitados son FICTICIOS.
const D: DefDocente[] = [
  // Docentes con usuario en la demo
  ['Edward Paul Guillén Pinto', 'TIEMPO_COMPLETO', 'Asociado', nocheEntreSemana],
  ['Cristian Fabián Vanegas', 'TIEMPO_COMPLETO', 'Asociado', tardeNocheSinSabado],
  ['Saudiel Orlando López', 'TIEMPO_COMPLETO', 'Asistente', diurno, 18],
  ['Germán Augusto Neuta', 'MEDIO_TIEMPO', 'Asistente', viernesYSabado],
  // Ciencias básicas
  ['José Luis Espinosa Reina', 'TIEMPO_COMPLETO', 'Asociado', todoElDia],
  ['Luz Maricel Elorreaga', 'TIEMPO_COMPLETO', 'Asistente', diurno],
  ['Angie Alejandra Olarte', 'TIEMPO_COMPLETO', 'Asistente', diurno],
  ['Diana Patricia Velandia', 'TRES_CUARTOS', 'Asistente', tardeYNoche], // (*)
  ['Ricardo Andrés Montoya', 'TRES_CUARTOS', 'Asistente', soloNoche], // (*)
  ['Camila Andrea Torres', 'MEDIO_TIEMPO', 'Instructor', soloNoche], // (*)
  ['Mauricio Esteban Lara', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['William Arley Rincón', 'TIEMPO_COMPLETO', 'Asistente', mananaYNoche],
  ['Martín Humberto Tello', 'MEDIO_TIEMPO', 'Asociado', tardeYNoche],
  ['Liliana Patricia Ochoa', 'MEDIO_TIEMPO', 'Asistente', diurno], // (*)
  ['Mónica Yasmín Rueda', 'TRES_CUARTOS', 'Asistente', diurno],
  ['Carlos Alberto Díaz', 'TIEMPO_COMPLETO', 'Asistente', todoElDia],
  ['Jairo Alberto Peña', 'MEDIO_TIEMPO', 'Asistente', soloNoche], // (*)
  ['Gabriel Enrique Gutiérrez', 'TIEMPO_COMPLETO', 'Asistente', todoElDia],
  // Programación, datos y computación
  ['Paola Andrea Sarmiento', 'TIEMPO_COMPLETO', 'Asociado', diurno], // (*)
  ['Felipe Alejandro Castañeda', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['Daniel Felipe Rozo', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['Wilson Mauro Rojas Reales', 'TIEMPO_COMPLETO', 'Titular', todoElDia],
  ['Armando Ricardo Medina', 'TIEMPO_COMPLETO', 'Asociado', todoElDia],
  ['Andrés Mauricio Pulido', 'TIEMPO_COMPLETO', 'Asistente', soloNoche], // (*)
  ['Christian Felipe Duarte Arévalo', 'TRES_CUARTOS', 'Asistente', todoElDia],
  ['Laura Viviana Castro', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['Iván Leonardo Becerra', 'TIEMPO_COMPLETO', 'Asociado', todoElDia], // (*)
  ['Samuel Galindo Pinzón', 'TRES_CUARTOS', 'Asistente', todoElDia],
  ['Antonio Ávila Segura', 'MEDIO_TIEMPO', 'Asistente', diurno],
  ['Germán Enrique Campos', 'TRES_CUARTOS', 'Instructor', diurno],
  ['Wilmer Alonso Pardo', 'MEDIO_TIEMPO', 'Instructor', soloNoche], // (*)
  ['Hernán Darío Zapata', 'TIEMPO_COMPLETO', 'Asistente', diurno], // (*)
  ['Mauricio Alejandro Cely', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['Paula Marcela Ruiz', 'MEDIO_TIEMPO', 'Asistente', diurno], // (*)
  // Ingeniería de software y gestión
  ['David Esteban Rodríguez Gómez', 'TIEMPO_COMPLETO', 'Asistente', todoElDia],
  ['Laura Marcela Quintero', 'TRES_CUARTOS', 'Asistente', diurno], // (*)
  ['Sandra Milena Cárdenas', 'TRES_CUARTOS', 'Asociado', diurno], // (*)
  ['Jonathan Briceño Barrera', 'TRES_CUARTOS', 'Asistente', soloNoche],
  ['Pedro Barahona Moreno', 'TRES_CUARTOS', 'Asistente', diurno],
  ['Jorge Alberto Puerto', 'TIEMPO_COMPLETO', 'Asociado', diurno],
  ['Carlos Hernán Medina Ayala', 'TRES_CUARTOS', 'Asociado', diurno],
  ['Leonardo Juan Ramírez', 'MEDIO_TIEMPO', 'Asistente', diurno],
  ['Carlos Aníbal Rodríguez', 'TRES_CUARTOS', 'Asociado', diurno],
  ['Edier Ernesto Espinosa Díaz', 'TRES_CUARTOS', 'Asistente', diurno],
  ['Fabián Andrés Gómez', 'TRES_CUARTOS', 'Instructor', soloNoche], // (*)
  ['Héctor Julio Vargas', 'TRES_CUARTOS', 'Asistente', soloNoche], // (*)
  ['Javier Andrés Almeida Moreno', 'TIEMPO_COMPLETO', 'Asistente', soloNoche],
  // Única docente diurna habilitada en Investigación tecnológica: la norma de dos docentes deja un grupo pendiente
  ['Mónica Liliana Bernal', 'TIEMPO_COMPLETO', 'Asociado', diurno], // (*)
  ['Manuel Fernando Torres', 'MEDIO_TIEMPO', 'Asociado', soloNoche],
  ['Camilo Gutiérrez Sierra', 'MEDIO_TIEMPO', 'Instructor', soloNoche],
  ['Juliana Marcela Ortiz', 'TIEMPO_COMPLETO', 'Asistente', todoElDia], // (*)
  // Formación humanística
  ['Sergio Andrés Henao', 'TRES_CUARTOS', 'Instructor', todoElDia],
  ['Juan Pablo Sánchez', 'TRES_CUARTOS', 'Instructor', diurno],
  ['Julián Camilo Riaño', 'MEDIO_TIEMPO', 'Instructor', diurno],
  ['Claudia Patricia Suárez', 'MEDIO_TIEMPO', 'Instructor', diurno], // (*)
];

/**
 * Cursos que puede orientar cada docente, por curso. Norma del programa: en el día cada curso abre al menos
 * dos grupos con docentes distintos, así que cada curso tiene dos o más docentes con disponibilidad diurna
 * (salvo el caso de prueba de Investigación tecnológica) y al menos uno con disponibilidad nocturna.
 */
const HABILITADOS: Record<string, string[]> = {
  'Matemáticas básicas': ['José Luis Espinosa Reina', 'Angie Alejandra Olarte', 'Luz Maricel Elorreaga', 'Ricardo Andrés Montoya', 'Diana Patricia Velandia'],
  'Lógica matemática': ['Saudiel Orlando López', 'William Arley Rincón', 'Liliana Patricia Ochoa', 'Martín Humberto Tello'],
  'Matemáticas discretas': ['Saudiel Orlando López', 'José Luis Espinosa Reina', 'Liliana Patricia Ochoa', 'Ricardo Andrés Montoya', 'Diana Patricia Velandia'],
  'Fundamentos de programación': ['Cristian Fabián Vanegas', 'Paola Andrea Sarmiento', 'Felipe Alejandro Castañeda', 'Daniel Felipe Rozo'],
  'Introducción a la ingeniería de sistemas': ['Pedro Barahona Moreno', 'Edier Ernesto Espinosa Díaz', 'Fabián Andrés Gómez'],
  'Estructuras del pensamiento I': ['Juan Pablo Sánchez', 'Sergio Andrés Henao', 'Claudia Patricia Suárez'],
  'Cálculo diferencial': ['José Luis Espinosa Reina', 'Luz Maricel Elorreaga', 'Angie Alejandra Olarte', 'Ricardo Andrés Montoya', 'Camila Andrea Torres'],
  'Álgebra lineal': ['José Luis Espinosa Reina', 'Mauricio Esteban Lara', 'Diana Patricia Velandia', 'Camila Andrea Torres'],
  'Física I (Mecánica)': ['Mónica Yasmín Rueda', 'Carlos Alberto Díaz', 'Jairo Alberto Peña'],
  'Lógica difusa': ['William Arley Rincón', 'Martín Humberto Tello', 'Liliana Patricia Ochoa'],
  'Programación I': ['Paola Andrea Sarmiento', 'Felipe Alejandro Castañeda', 'Daniel Felipe Rozo', 'Andrés Mauricio Pulido'],
  'Estructuras del pensamiento II': ['Sergio Andrés Henao', 'Juan Pablo Sánchez', 'Claudia Patricia Suárez'],
  'Seminario de bioética': ['Julián Camilo Riaño', 'Claudia Patricia Suárez', 'Héctor Julio Vargas'],
  'Cálculo integral': ['Luz Maricel Elorreaga', 'Angie Alejandra Olarte', 'Mauricio Esteban Lara', 'Liliana Patricia Ochoa', 'Ricardo Andrés Montoya', 'Camila Andrea Torres'],
  'Estadística y probabilidad': ['Angie Alejandra Olarte', 'Carlos Alberto Díaz', 'Mauricio Esteban Lara', 'Diana Patricia Velandia'],
  'Física II (Electricidad)': ['Mónica Yasmín Rueda', 'Carlos Alberto Díaz', 'Jairo Alberto Peña'],
  'Programación II': ['Wilson Mauro Rojas Reales', 'Paola Andrea Sarmiento', 'Daniel Felipe Rozo', 'Andrés Mauricio Pulido'],
  'Estructuras de datos': ['Wilson Mauro Rojas Reales', 'Armando Ricardo Medina', 'Felipe Alejandro Castañeda', 'Andrés Mauricio Pulido'],
  'Proyecto núcleo I': ['Leonardo Juan Ramírez', 'Carlos Aníbal Rodríguez', 'Fabián Andrés Gómez'],
  'Estructuras del pensamiento III': ['Juan Pablo Sánchez', 'Sergio Andrés Henao', 'Claudia Patricia Suárez'],
  'Matemáticas aplicadas': ['Luz Maricel Elorreaga', 'Gabriel Enrique Gutiérrez', 'Mauricio Esteban Lara', 'Diana Patricia Velandia'],
  'Complejidad algorítmica': ['Wilson Mauro Rojas Reales', 'Armando Ricardo Medina', 'Iván Leonardo Becerra'],
  'Bases de datos I': ['Armando Ricardo Medina', 'Christian Felipe Duarte Arévalo', 'Laura Viviana Castro', 'Andrés Mauricio Pulido'],
  'Sistemas digitales y arquitectura': ['Antonio Ávila Segura', 'Samuel Galindo Pinzón', 'Germán Enrique Campos', 'Wilmer Alonso Pardo'],
  'Dirección y planeación': ['Cristian Fabián Vanegas', 'Pedro Barahona Moreno', 'Jorge Alberto Puerto'],
  'Estructuras del pensamiento IV': ['Sergio Andrés Henao', 'Juan Pablo Sánchez', 'Claudia Patricia Suárez'],
  'Dinámica de sistemas': ['Gabriel Enrique Gutiérrez', 'Carlos Aníbal Rodríguez', 'Edier Ernesto Espinosa Díaz'],
  'Ingeniería de software I': ['David Esteban Rodríguez Gómez', 'Laura Marcela Quintero', 'Sandra Milena Cárdenas', 'Jonathan Briceño Barrera'],
  'Bases de datos II': ['Christian Felipe Duarte Arévalo', 'Laura Viviana Castro', 'Andrés Mauricio Pulido'],
  'Sistemas operacionales': ['Samuel Galindo Pinzón', 'Mauricio Alejandro Cely', 'Germán Enrique Campos', 'Wilmer Alonso Pardo'],
  'Microprocesadores y programación assembler': ['Antonio Ávila Segura', 'Germán Enrique Campos', 'Wilmer Alonso Pardo'],
  'Historia y filosofía de la ingeniería': ['Saudiel Orlando López', 'Julián Camilo Riaño', 'Héctor Julio Vargas'],
  'Labor social': ['Edier Ernesto Espinosa Díaz', 'Juan Pablo Sánchez', 'Héctor Julio Vargas'],
  'Modelos y simulación de sistemas': ['Carlos Aníbal Rodríguez', 'Gabriel Enrique Gutiérrez', 'Mauricio Esteban Lara'],
  'Ingeniería de software II': ['David Esteban Rodríguez Gómez', 'Laura Marcela Quintero', 'Jonathan Briceño Barrera'],
  'Redes de datos I': ['Edward Paul Guillén Pinto', 'Hernán Darío Zapata', 'Mauricio Alejandro Cely'],
  'Gestión de proyectos': ['Cristian Fabián Vanegas', 'Jorge Alberto Puerto', 'Carlos Hernán Medina Ayala'],
  'Proyecto núcleo II': ['Cristian Fabián Vanegas', 'Leonardo Juan Ramírez', 'Carlos Aníbal Rodríguez'],
  'Investigación tecnológica y de ingeniería': ['Edward Paul Guillén Pinto', 'Mónica Liliana Bernal'],
  'Taller de práctica profesional': ['Leonardo Juan Ramírez', 'Carlos Hernán Medina Ayala', 'Fabián Andrés Gómez'],
  'Electiva profesional I': ['Laura Marcela Quintero', 'Juliana Marcela Ortiz', 'Manuel Fernando Torres'],
  'Ingeniería de software III': ['David Esteban Rodríguez Gómez', 'Sandra Milena Cárdenas', 'Jonathan Briceño Barrera'],
  'Redes de datos II': ['Edward Paul Guillén Pinto', 'Hernán Darío Zapata', 'Mauricio Alejandro Cely'],
  'Gestión de tecnología e innovación': ['Saudiel Orlando López', 'Jorge Alberto Puerto', 'Carlos Hernán Medina Ayala', 'Héctor Julio Vargas'],
  'Legislación, normatividad y ciudadanía': ['Germán Augusto Neuta', 'Julián Camilo Riaño', 'Héctor Julio Vargas'],
  'Seminario de investigación': ['Saudiel Orlando López', 'Mónica Liliana Bernal', 'Carlos Hernán Medina Ayala', 'Javier Andrés Almeida Moreno'],
  'Electiva profesional II': ['Germán Augusto Neuta', 'Juliana Marcela Ortiz', 'Manuel Fernando Torres', 'Camilo Gutiérrez Sierra'],
  Compiladores: ['Iván Leonardo Becerra', 'Wilson Mauro Rojas Reales', 'Armando Ricardo Medina'],
  'Seguridad de la información': ['Edward Paul Guillén Pinto', 'Hernán Darío Zapata', 'Paula Marcela Ruiz'],
  'Sistemas inteligentes': ['Juliana Marcela Ortiz', 'Iván Leonardo Becerra', 'Martín Humberto Tello', 'Manuel Fernando Torres'],
  'Proyecto de grado I': ['Mónica Liliana Bernal', 'Sandra Milena Cárdenas', 'Javier Andrés Almeida Moreno'],
  'Electiva profesional III': ['Juliana Marcela Ortiz', 'Mónica Liliana Bernal', 'Laura Marcela Quintero', 'Camilo Gutiérrez Sierra', 'Javier Andrés Almeida Moreno'],
  'Proyecto de grado II': ['Mónica Liliana Bernal', 'Sandra Milena Cárdenas', 'Javier Andrés Almeida Moreno'],
};

/**
 * Asignaciones acordadas con los docentes que tienen usuario en la demo: el generador los intenta primero en
 * esos grupos (curso → código de grupo → docente).
 */
export const PREFERENCIAS: [string, string, string][] = [
  ['Redes de datos I', 'G3', 'Edward Paul Guillén Pinto'],
  ['Redes de datos II', 'G3', 'Edward Paul Guillén Pinto'],
  ['Investigación tecnológica y de ingeniería', 'G3', 'Edward Paul Guillén Pinto'],
  ['Seguridad de la información', 'G3', 'Edward Paul Guillén Pinto'],
  ['Fundamentos de programación', 'G3', 'Cristian Fabián Vanegas'],
  ['Dirección y planeación', 'G3', 'Cristian Fabián Vanegas'],
  ['Gestión de proyectos', 'G3', 'Cristian Fabián Vanegas'],
  ['Proyecto núcleo II', 'G3', 'Cristian Fabián Vanegas'],
  ['Historia y filosofía de la ingeniería', 'G1', 'Saudiel Orlando López'],
  ['Matemáticas discretas', 'G1', 'Saudiel Orlando López'],
  ['Gestión de tecnología e innovación', 'G1', 'Saudiel Orlando López'],
  ['Lógica matemática', 'G1', 'Saudiel Orlando López'],
  ['Seminario de investigación', 'G3', 'Saudiel Orlando López'],
  ['Legislación, normatividad y ciudadanía', 'G1', 'Germán Augusto Neuta'],
  ['Legislación, normatividad y ciudadanía', 'G3', 'Germán Augusto Neuta'],
  ['Electiva profesional II', 'G1', 'Germán Augusto Neuta'],
];

/** Usuario de correo ficticio: inicial del nombre + primer apellido. */
const usuarioCorreo = (nombre: string) => {
  const p = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(' ');
  return `${p[0][0]}${p[p.length >= 4 ? 2 : p.length - 1]}`;
};

export function construirDocentes(cursos: Curso[]): Docente[] {
  const nombres = new Set(D.map((d) => d[0]));
  for (const [curso, lista] of Object.entries(HABILITADOS)) {
    if (!cursos.some((c) => c.nombre === curso)) throw new Error('Curso no encontrado en semilla: ' + curso);
    lista.forEach((n) => {
      if (!nombres.has(n)) throw new Error('Docente no encontrado en semilla: ' + n);
    });
  }
  return D.map(([nombre, vin, esc, disp, horas], i) => ({
    id: `doc-${String(i + 1).padStart(2, '0')}`,
    identificador: `D${String(1001 + i)}`,
    nombre,
    correoInstitucional: `${usuarioCorreo(nombre)}@ueb.demo`,
    tipoVinculacion: vin,
    categoriaEscalafon: esc,
    horasMaxDocencia: horas ?? PARAMETROS_POR_DEFECTO.horasMaxPorVinculacion[vin],
    habilitaciones: cursos.filter((c) => HABILITADOS[c.nombre]?.includes(nombre)).map((c) => c.id),
    disponibilidad: disp(),
  }));
}

/** Cursos con suficiente demanda nocturna para abrir un segundo grupo de noche. */
const DOS_GRUPOS_NOCHE = ['Matemáticas básicas', 'Cálculo diferencial'];

/**
 * Oferta y grupos del periodo. Norma del programa: en el día cada curso abre al menos dos grupos (G1 y G2),
 * dictados por docentes distintos; en la noche abre un grupo (G3) y, si la demanda lo justifica, un segundo (G4).
 */
export function construirOfertaYGrupos(periodoId: string, cursos: Curso[], variante: 'actual' | 'historico', docentes: Docente[] = []) {
  const ofertas: OfertaCurso[] = [];
  const grupos: Grupo[] = [];
  const pref = periodoId.replace('per-', '');
  const idDocente = (n: string) => docentes.find((d) => d.nombre === n)?.id ?? null;
  for (const c of cursos) {
    const basico = c.nivel <= 4;
    const nNoche = DOS_GRUPOS_NOCHE.includes(c.nombre) ? 2 : 1;
    const cupoMax = c.caracteristicasRequeridas.includes('EQUIPOS_COMPUTO') ? 35 : 40;
    // demanda ficticia: más estudiantes en los primeros semestres
    const base = basico ? 96 + ((c.creditos * 7 + c.nivel * 3) % 14) : 54 + ((c.creditos * 7 + c.nivel * 3) % 22);
    const demanda = base + (nNoche - 1) * 36;
    ofertas.push({ periodoId, cursoId: c.id, demandaEstimada: demanda });
    const total = 2 + nNoche;
    const cupo = basico ? cupoMax : Math.min(cupoMax, Math.ceil(demanda / total) + 2);
    const codigos: [string, Jornada][] = [['G1', 'DIURNA'], ['G2', 'DIURNA'], ['G3', 'NOCTURNA']];
    if (nNoche === 2) codigos.push(['G4', 'NOCTURNA']);
    for (const [codigo, jornada] of codigos) {
      // en 2026-1 Investigación tecnológica solo abrió un grupo diurno
      if (variante === 'historico' && c.nombre === 'Investigación tecnológica y de ingeniería' && codigo === 'G2') continue;
      // Programación I G1 se planea para 44 estudiantes: no hay sala de cómputo de ese tamaño (pendiente por R4)
      const cupoG = variante === 'actual' && c.nombre === 'Programación I' && codigo === 'G1' ? 44 : cupo;
      const p = PREFERENCIAS.find(([curso, cod]) => curso === c.nombre && cod === codigo);
      grupos.push({
        id: `grp-${pref}-${c.codigo.toLowerCase()}-${codigo.toLowerCase()}`,
        periodoId,
        cursoId: c.id,
        codigo,
        jornada,
        cupoPlaneado: cupoG,
        inscritos: null,
        estado: 'ABIERTO',
        docentePreferido: p ? idDocente(p[2]) : null,
      });
    }
  }
  return { ofertas, grupos };
}

export function construirUsuarios(docentes: Docente[]): Usuario[] {
  const clave = hashClave('demo123');
  const doc = (nombre: string) => docentes.find((d) => d.nombre === nombre)!;
  const u = (id: string, nombre: string, correo: string, rol: Usuario['rol'], activo = true, docenteId?: string): Usuario => ({
    id, nombre, correo, hashClave: clave, rol, activo, docenteId,
  });
  const dn = doc('Germán Augusto Neuta');
  const ds = doc('Saudiel Orlando López');
  const dv = doc('Cristian Fabián Vanegas');
  const dg = doc('Edward Paul Guillén Pinto');
  return [
    u('usr-coord', 'Diana Marcela Rojas', 'coordinacion@ueb.demo', 'COORDINADOR'),
    u('usr-comite1', 'Andrés Felipe Castro', 'comite.software@ueb.demo', 'COMITE'),
    u('usr-comite2', 'Paula Andrea Gómez', 'comite.ciencias@ueb.demo', 'COMITE'),
    u('usr-admin', 'Administrador del sistema', 'admin@ueb.demo', 'ADMINISTRADOR'),
    u('usr-doc1', dn.nombre, dn.correoInstitucional, 'DOCENTE', true, dn.id),
    u('usr-doc2', ds.nombre, ds.correoInstitucional, 'DOCENTE', true, ds.id),
    u('usr-doc3', dv.nombre, dv.correoInstitucional, 'DOCENTE', true, dv.id),
    u('usr-doc4', dg.nombre, dg.correoInstitucional, 'DOCENTE', true, dg.id),
    u('usr-inactivo', 'Usuario retirado', 'retirado@ueb.demo', 'DOCENTE', false),
  ];
}

export function construirPeriodos(): PeriodoAcademico[] {
  const p = (anio: number, semestre: 1 | 2, estado: 'ABIERTO' | 'CERRADO'): PeriodoAcademico => ({
    id: `per-${anio}-${semestre}`,
    codigo: `${anio}-${semestre}`,
    anio,
    semestre,
    estado,
    parametros: structuredClone(PARAMETROS_POR_DEFECTO),
  });
  return [p(2026, 1, 'CERRADO'), p(2026, 2, 'ABIERTO')];
}

export const VERSION_ESQUEMA = 5;

/** Estado inicial sin versiones; el store genera y publica el horario histórico de 2026-1 al arrancar. */
export function estadoInicial(): EstadoApp {
  const cursos = construirCursos();
  const docentes = construirDocentes(cursos);
  const periodos = construirPeriodos();
  const h = construirOfertaYGrupos('per-2026-1', cursos, 'historico', docentes);
  const a = construirOfertaYGrupos('per-2026-2', cursos, 'actual', docentes);
  return {
    version: VERSION_ESQUEMA,
    periodos,
    cursos,
    ofertas: [...h.ofertas, ...a.ofertas],
    docentes,
    aulas: construirAulas(),
    grupos: [...h.grupos, ...a.grupos],
    versiones: [],
    observaciones: [],
    usuarios: construirUsuarios(docentes),
    bitacora: [],
    periodoActivoId: 'per-2026-2',
  };
}
