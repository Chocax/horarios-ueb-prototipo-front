# 📝 Pendientes, supuestos y cambios para hacer en vivo

Lo que quedó **a propósito** sin resolver en el prototipo, lo que **asumimos** y hay que confirmar con el cliente, y los cambios que se pueden hacer **en el momento** (por ejemplo, en el video de validación con un tercero, cuando pida un ajuste).

> Demo: **https://horarios-ueb.vercel.app** · Contraseña de todas las cuentas: `demo123`
> Antes de cada demostración: **Restablecer datos de demostración** en el login.

---

## 1. Pendientes intencionales de la demo

Al generar la propuesta de **2026-2** quedan dos grupos sin ubicar. Están ahí para mostrar que el generador no se detiene, explica la causa y que el coordinador puede resolverlo.

| Grupo pendiente | Regla | Por qué queda pendiente | Cómo se resuelve en vivo |
|---|---|---|---|
| **Programación I G1** (diurno) | R4 | Su cupo planeado es 44 y la sala de cómputo más grande tiene 35 puestos. | *Grupos y demanda* → clic en `G1 · Diurna · 44` → cupo **35** → Guardar → *Tablero* → **Reintentar**. Otra opción: *Importar datos → Aulas* → `aulas_nuevas.csv` (sala F-305 de 45 puestos) → Reintentar. |
| **Investigación tecnológica G2** (diurno) | R5 · norma de dos docentes | La única docente diurna habilitada (Mónica Liliana Bernal) ya dicta el G1, y la norma pide docentes distintos en el día. | *Importar datos → Docentes* → `docentes_nuevos.csv` → Confirmar; pestaña *Disponibilidad* → `disponibilidad_docentes_nuevos.csv` → Confirmar → *Tablero* → **Reintentar**. Otra opción: *Docentes* → habilitar a otro docente diurno para el curso. |

Mientras estén pendientes, **publicar se bloquea** y lista las dos causas (prueba de RF-12).

> [!TIP]
> En el código: el cupo 44 está en `src/app/core/data/seed.ts` (línea con `cupoG = variante === 'actual' && c.nombre === 'Programación I'`), y la única docente diurna de Investigación tecnológica está en `HABILITADOS['Investigación tecnológica y de ingeniería']`. Para que la demo arranque sin pendientes, basta con quitar la condición del cupo y agregar un docente diurno a esa lista.

---

## 2. Supuestos que hay que confirmar con el cliente

| # | Supuesto | Dónde está | Cómo se cambia |
|---|---|---|---|
| S-1 | Horas máximas por vinculación: TC 16, ¾ 12, ½ 8, ¼ 4 | Parámetros del periodo | *Periodos y parámetros* → «Horas máximas de docencia por vinculación» (sin tocar código) |
| S-2 | **Saudiel Orlando López tiene 18 h** de tope (no 16) para que le quepan sus 5 materias | `seed.ts`, docente con `18` al final | Cambiarlo en *Docentes* → Horas máximas. Con 16, una de sus 5 materias pasa a otro docente o queda pendiente. |
| S-3 | **Bloque F, piso 4** = salones de sillas y tablero (no se especificó) | `construirAulas()` en `seed.ts` | En *Aulas* editar F-401 a F-404 y marcar *Equipos de cómputo* si son salas |
| S-4 | **Bloque E** = salones con mobiliario móvil (ahí van Estructuras del pensamiento, Proyecto núcleo, Dirección y planeación, etc.) | `construirAulas()` | En *Aulas* quitar o poner la característica |
| S-5 | Capacidades de las aulas (30–45 puestos) son estimadas | `construirAulas()` | En *Aulas* editar la capacidad, o importar un CSV con las reales |
| S-6 | Jornada nocturna = 18:00–22:00 de lunes a viernes + sábado en la mañana, con una sola sesión del grupo por día | Generador (`horasLV` y `horasSab`) | Ver el cambio C-6 |
| S-7 | Segundo grupo nocturno solo en Matemáticas básicas y Cálculo diferencial | `DOS_GRUPOS_NOCHE` en `seed.ts` | Agregar el nombre del curso a la lista, o crear el G4 en *Grupos y demanda* con **+** |
| S-8 | Demanda estimada por curso es ficticia | Ofertas en `seed.ts` | *Grupos y demanda* → columna Demanda, o *Importar → Cursos* con la columna `demanda` |
| S-9 | Vinculación, escalafón, disponibilidad y correos de los docentes son ficticios; 23 nombres son inventados (marcados con `// (*)` en `seed.ts`) | `seed.ts` | *Docentes* o *Importar → Docentes / Disponibilidad* |

---

## 3. Cambios para hacer en vivo, sin tocar código

Si el tercero del video pide algo, la mayoría se hace desde la misma app. Ideas de pedidos y cómo responder:

| Si piden… | Se hace así | Qué demuestra |
|---|---|---|
| «Que el sábado sea de 8 a 12» | *Periodos y parámetros* → Sábado inicio 8, fin 12 → Guardar → *Tablero* → **Regenerar propuesta** | RF-01: parámetros sin desplegar software |
| «Que los grupos sean de máximo 35» | *Periodos y parámetros* → Cupo máximo 35 → Guardar | RF-02 y R9 recalculados al instante |
| «Que no haya clase de 12 a 2» | *Periodos y parámetros* → bloque no asignable 12–14 → Guardar → Regenerar | RF-01 |
| «Este profe no puede los lunes» | *Docentes* → abrir → *Disponibilidad* → desmarcar el lunes → Guardar → Regenerar o mover sus sesiones | RF-04 y R6 |
| «Este profe también puede dar X materia» | *Docentes* → *Cursos habilitados* → marcar → Guardar | RF-04 y R5 |
| «Muevan esta clase al jueves» | *Tablero* → arrastrar la sesión, o clic → panel → día/hora → *Validar y aplicar* | RF-10; si choca, el sistema dice qué regla viola |
| «Cambien el salón de este grupo» | *Tablero* → clic en la sesión → Aula → *Validar y aplicar* | R2 y R4 |
| «Abran otro grupo de esta materia» | *Grupos y demanda* → **+** en el curso (jornada y cupo) → *Tablero* → Reintentar o Regenerar | RF-07 |
| «Que este grupo lo dé tal profe» | *Grupos y demanda* → clic en el grupo → *Docente preferente* → Regenerar | Asignación acordada |
| «Este grupo tiene pocos inscritos» | *Inscritos y cierre* → escribir el número → *Cerrar grupo* | RF-21 |
| «Quiero el horario en Excel» | *Consultar horario* → **CSV completo** | RF-13 |
| «Muéstrenme solo una materia y sus grupos» | *Tablero* → **Por curso** (o clic en el nombre del curso arriba de la grilla) → clic en un grupo para aislarlo | RF-10 y RF-19 |
| «¿Qué horario tiene este grupo?» | *Grupos y demanda* → clic en el grupo: ficha con días, horas, aula y docente | RF-07 |
| «Pongan las dos clases del grupo el mismo día» | Se rechaza con **R8** (un grupo solo tiene una sesión por día) | Regla dura del Programa |
| «Que el comité diga que hay que cambiar algo» | Entrar como comité → *Revisión* → *Requiere ajustes* + observación | RF-20 |

Después de cualquier cambio de parámetros, la propuesta ya generada **no se modifica sola**: hay que **Regenerar propuesta** o ajustar en el tablero.

---

## 4. Cambios de código ya ubicados (por si piden algo que no es configurable)

| # | Cambio | Archivo y lugar |
|---|---|---|
| C-1 | Quitar los pendientes intencionales | `seed.ts`: condición del cupo 44 de Programación I y lista `HABILITADOS['Investigación tecnológica y de ingeniería']` |
| C-2 | Cambiar las asignaciones fijas de los docentes con usuario | `seed.ts` → `PREFERENCIAS` (curso, código de grupo, docente) |
| C-3 | Cambiar quién puede dictar cada curso | `seed.ts` → `HABILITADOS` |
| C-4 | Agregar o quitar docentes | `seed.ts` → lista `D` (nombre, vinculación, escalafón, disponibilidad, horas opcionales) |
| C-5 | Más grupos nocturnos | `seed.ts` → `DOS_GRUPOS_NOCHE` |
| C-6 | Franjas que usa el generador (p. ej. noche desde las 16:00) | `src/app/core/scheduling/generador.ts` → `const horasLV = diurna ? [7, 9, 14, 16] : [18, 20];` (agregar `16` en la parte nocturna) |
| C-7 | Pesos del generador (qué tanto evita días seguidos, sábados, huecos, cruces) | `generador.ts` → método `candidatos()` (`consecutivos * 6`, sábado `12`/`3`, `huecos * 4`, cruce `40`) |
| C-8 | Reglas duras nuevas | `src/app/core/rules/reglas-duras.ts`: nueva clase que implemente `ReglaDura` y agregarla a `REGLAS_DURAS` |
| C-9 | Reglas blandas nuevas | `src/app/core/rules/reglas-blandas.ts` y la lista `REGLAS_BLANDAS` de `core/data/trazabilidad.ts` |
| C-10 | Valores por defecto de los parámetros | `seed.ts` → `PARAMETROS_POR_DEFECTO` |
| C-11 | Permitir dos sesiones del mismo grupo el mismo día (p. ej. un bloque de 4 h el sábado) | `reglas-duras.ts` → clase `R8SesionesMaximas` (quitar la parte de «mismo día») y `generador.ts` → `candidatos()` |

> [!IMPORTANT]
> Si se cambian los datos de `seed.ts`, hay que subir `VERSION_ESQUEMA` en ese mismo archivo (hoy está en 6; pasarlo a 7) para que los navegadores que ya abrieron la demo descarten los datos viejos.

Flujo para publicar un cambio: `git add .` → `git commit -m "fix: …"` → `git push` → Vercel lo despliega solo en uno o dos minutos.

---

## 5. Limitaciones conocidas del prototipo

- **Sin backend real.** El servicio `StoreService` hace de servidor dentro del navegador; los datos viven en el `localStorage` de cada persona y no se comparten entre equipos. En el sistema real esto lo hace la API en Spring Boot con MySQL.
- **Contraseñas simuladas.** Se guardan con un resumen (hash) de demostración, no con un algoritmo seguro como bcrypt.
- **Cruces inevitables en la noche.** 2.º y 3.º semestre nocturno tienen más sesiones que franjas libres (lunes a viernes de 6 a 10 p. m. + sábado en la mañana), así que el generador deja algunos cruces del mismo semestre y los reporta como **B4**. Se eliminan abriendo más franja nocturna (C-6) o reduciendo sesiones.
- **El generador es voraz**, no óptimo: da una solución válida y cómoda en milisegundos, pero no garantiza el mínimo de restricciones blandas.
- **La reubicación de estudiantes** al cerrar un grupo se decide fuera del sistema, como dice el requerimiento RF-21.
- **No hay notificaciones** (correo) al publicar ni al registrar observaciones.
- **PDF por impresión del navegador**, no generado en servidor.
