# Manual de usuario y pruebas del prototipo
_Sistema de programación de horarios de clases · Ingeniería de Sistemas UEB_ · Proyecto Núcleo II · Grupo 7

## 1. Introducción
Este manual explica cómo ejecutar el prototipo de alta fidelidad del sistema de programación de horarios y cómo comprobar, paso a paso, que cumple los 22 requerimientos funcionales (RF-01 a RF-22) y los 20 casos de uso (CU-01 a CU-20) del entregable de análisis y diseño.

El prototipo es el **front-end en Angular** de la arquitectura definida (Angular + Spring Boot + MySQL). Para que se pueda probar sin servidor, la capa de servicios está simulada dentro del navegador: el servicio `StoreService hace las veces del backend (valida permisos por rol, aplica las reglas R1–R9, versiona el horario y escribe la bitácora) y guarda los datos en el `localStorage. Cuando exista el backend, ese servicio se reemplaza por llamadas HTTP sin tocar las pantallas.

Todos los datos son **de demostración**. El plan de estudios es el de Ingeniería de Sistemas de la UEB; los nombres de docentes se tomaron como referencia del Excel de horarios, pero su vinculación, escalafón, disponibilidad y correo (`@ueb.demo) son ficticios.

## 2. Instalación y ejecución
**Requisitos**
- **Node.js 20.19 o superior** (o 22.12+). Verifique con `node -v.
- npm 10 o superior (viene con Node).
- Un navegador moderno (Chrome, Edge o Firefox) a 1366 px de ancho o más.

**Pasos**
1. Descomprima `horarios-ueb.zip y abra una terminal dentro de la carpeta `horarios-ueb.
2. Instale las dependencias: `npm install (la primera vez tarda 1–2 minutos).
3. Inicie el servidor de desarrollo: `npm start.
4. Abra `http://localhost:4200. Verá la pantalla de inicio de sesión.

**Notas**
- El archivo `.npmrc trae `legacy-peer-deps=true para evitar conflictos de dependencias de npm.
- Si el puerto 4200 está ocupado: `npm start -- --port 4300.
- Compilación de producción: `npm run build (queda en `dist/horarios-ueb/browser y funciona desde cualquier servidor estático porque usa rutas con `#).
- Para volver a los datos iniciales en cualquier momento: botón **Restablecer datos de demostración** en la pantalla de inicio de sesión.

## 3. Cuentas de demostración (contraseña `demo123`)
| Rol | Correo | Qué puede hacer |
|---|---|---|
| Coordinador de horarios | coordinacion@ueb.demo | Todo el flujo: parámetros, catálogo, importación, grupos, tablero, versiones, reportes, inscritos y bitácora. |
| Comité Táctico / de Área | comite.software@ueb.demo · comite.ciencias@ueb.demo | Revisión de propuestas (solo lectura), observaciones y consulta del horario. |
| Docente | gneuta@ueb.demo (Germán Augusto Neuta) · slopez@ueb.demo (Saudiel Orlando López) · cvanegas@ueb.demo · eguillen@ueb.demo | Su propio horario publicado y su disponibilidad. |
| Administrador | admin@ueb.demo | Usuarios y roles, periodos, consulta y bitácora. |
| Usuario desactivado | retirado@ueb.demo | No puede iniciar sesión (prueba de RF-22). |

## 4. Datos de demostración
- **Periodos:** 2026-1 (cerrado, con su horario publicado) y 2026-2 (abierto, sin versiones). El periodo activo se cambia en la barra superior.
- **Plan de estudios:** 53 cursos de 1.º a 9.º semestre con su nivel, créditos, sesiones semanales y tipo de aula (sala de cómputo, mobiliario móvil, laboratorio de redes o de física).
- **Grupos 2026-2:** 161. **Norma del programa:** en el día cada curso abre al menos dos grupos (G1 y G2) dictados por docentes distintos; en la noche abre un grupo (G3) y, cuando la demanda lo justifica, un segundo (G4: Matemáticas básicas y Cálculo diferencial).
- **Docentes:** 55, cada curso con al menos dos docentes diurnos habilitados y uno nocturno (salvo el caso de prueba). Vinculación TC, ¾, ½ o ¼ con 16, 12, 8 y 4 horas máximas [confirmar con la Facultad]. Los nombres reales vienen del Excel de referencia; los demás son ficticios.
- **Aulas:** 86 en los bloques que usa la Facultad. A: pisos 2–4, salas de cómputo (la Facultad está en el piso 3). B: pisos 2–3, salones 1–5 de sillas y tablero y 6–13 de cómputo. I: piso 1 (1–10) y pisos 2–3 (1–4), sillas y tablero. F: pisos 2–3 de cómputo, laboratorios de redes y de seguridad en el piso 2, y pisos 4, 5 y 7 de sillas y tablero. E: piso 1 con mobiliario móvil. G: laboratorios de física (G-LAB).
- **Horarios generados:** el generador arma patrones como los de la Universidad (lunes-miércoles, martes-jueves, lunes-miércoles-viernes, misma hora), evita cruces entre cursos del mismo semestre y jornada, y compacta el día. La jornada nocturna va de 18:00 a 22:00 y usa el sábado en la mañana. Un grupo nunca tiene dos sesiones el mismo día (R8); en 2.º y 3.º semestre nocturno las sesiones no caben sin un cruce, y el panel de blandas lo reporta (B4).
- **Parámetros:** L–V 07:00–22:00, sábado 07:00–13:00, bloque no asignable 12:00–13:00, sesiones de 2 h, cupo 40 + 10 % = 44, mínimo 10 inscritos, 1 a 4 sesiones por semana.
- **Casos de prueba de la demo:** al generar 2026-2 queda un grupo sin ubicar, *Programación I G1* (cupo 44 y la sala de cómputo más grande es de 35, R4). Además, *Investigación tecnológica* solo tiene una docente diurna habilitada, así que dicta G1 y G2: el generador lo acepta y lo reporta como restricción blanda **B6** (la norma de dos docentes distintos en el día es ideal, no obligatoria).
- **Docentes con usuario:** Edward Paul Guillén Pinto (noche: Redes I, Redes II, Investigación tecnológica y Seguridad), Cristian Fabián Vanegas (tarde-noche: Fundamentos de programación, Dirección y planeación, Gestión de proyectos y Proyecto núcleo II), Saudiel Orlando López (día, sábados y viernes en la noche: Historia y filosofía, Matemáticas discretas, Gestión de tecnología, Seminario de investigación y Lógica matemática) y Germán Augusto Neuta (viernes y sábados: Legislación y una Electiva profesional). Estas asignaciones se guardan como *docente preferente* del grupo y el generador las intenta primero.

## 5. Organización del código
| Carpeta | Contenido |
|---|---|
| `src/app/core/models.ts` | Entidades del diagrama de clases y del MER (Periodo, Curso, Docente, Aula, Grupo, Sesión, Versión, Observación, Usuario, Bitácora). |
| `src/app/core/rules/` | Reglas duras R1–R9, una clase por regla (patrón Specification) y el validador; reglas blandas B1–B6. |
| `src/app/core/scheduling/` | Generador voraz: ubica primero los grupos con menos opciones; lo que no cabe queda pendiente con su causa. |
| `src/app/core/services/` | StoreService (backend simulado), sesión y avisos. |
| `src/app/core/import/csv.ts` | Importación CSV todo o nada con errores por fila. |
| `src/app/features/` | Una carpeta por pantalla (componentes standalone, signals, carga diferida). |
| `src/app/shared/` | Componentes reutilizables: grilla semanal, editor de disponibilidad, modal, iconos, avisos. |
| `public/muestras/` | Archivos CSV de muestra (válidos y con errores) para las pruebas de importación. |

## 6. Guion de pruebas
### P-01 · Inicio de sesión y control de acceso
_Rol: Todos · Cubre: CU-01 · RF-15 · RF-22_

**Pasos**
1. En la pantalla de inicio de sesión, pulse la cuenta **Usuario retirado**.
2. Escriba `coordinacion@ueb.demo con una contraseña incorrecta y pulse **Entrar**.
3. Pulse la cuenta **Diana Marcela Rojas** (coordinadora).

**Resultado esperado**
- El usuario retirado ve «El usuario está desactivado».
- La clave incorrecta muestra «Correo o contraseña incorrectos».
- La coordinadora entra a **Inicio**, con el flujo del periodo según el BPMN.

### P-02 · Revisar los parámetros del periodo
_Rol: Coordinador · Cubre: CU-03 · RF-01 · RF-02_

**Pasos**
1. Menú **Periodos y parámetros**.
2. Revise la franja, el bloque no asignable, la duración, el cupo, la tolerancia y las horas por vinculación.

**Resultado esperado**
- Se ven los valores por defecto y el cupo efectivo calculado (44 estudiantes).
- Los periodos cerrados se muestran en solo lectura.

### P-03 · Registrar un docente
_Rol: Coordinador · Cubre: CU-04 · RF-03_

**Pasos**
1. Menú **Docentes** → **Nuevo docente**.
2. Escriba solo el nombre y pulse **Guardar**.
3. Elija la vinculación *Medio tiempo* y guarde.

**Resultado esperado**
- Sin vinculación se rechaza: «Seleccione el tipo de vinculación».
- Al elegir la vinculación, las horas máximas se llenan solas (8 h) y el docente queda en la lista.

### P-04 · Disponibilidad y habilitaciones
_Rol: Coordinador · Cubre: CU-05 · RF-04_

**Pasos**
1. En **Docentes** abra *Andrés Mauricio Pulido*.
2. Pestaña **Cursos habilitados**: vea los cursos que puede orientar.
3. Pestaña **Disponibilidad**: haga clic o arrastre sobre la grilla para marcar o desmarcar horas.

**Resultado esperado**
- Su disponibilidad es nocturna (18:00–22:00) y sábados en la mañana.
- Las horas fuera de la franja y el bloque de 12:00 no se pueden marcar.
- En el tablero, solo los docentes habilitados aparecen como opción para un curso (R5).

### P-05 · Cursos y aulas
_Rol: Coordinador · Cubre: CU-06 · RF-05 · RF-06_

**Pasos**
1. Menú **Cursos**: filtre por semestre 2 y abra *Programación I*.
2. Menú **Aulas**: haga clic en cada bloque para filtrar y revise capacidades, pisos y características.

**Resultado esperado**
- Programación I exige *Equipos de cómputo*; solo podrá ir a salas de cómputo (R4).
- Las salas de cómputo tienen 30 o 35 puestos: por eso un grupo de 44 no cabe (pendiente intencional).
- Cada bloque muestra su descripción; en el bloque A, piso 3, figura la Facultad de Ingeniería.

### P-06 · Importar un CSV con errores
_Rol: Coordinador · Cubre: CU-07 · RF-17_

**Pasos**
1. Menú **Importar datos** → pestaña **Cursos**.
2. En *cursos_plan_50_con_errores.csv* pulse **Probar**.
3. Ahora pruebe *cursos_plan_50.csv* (la versión corregida) y pulse **Confirmar importación**.
4. Opcional: descargue la plantilla, edítela en Excel y súbala arrastrándola al recuadro.

**Resultado esperado**
- Con errores: «No se cargó ningún registro» y la lista de las filas 8, 21 y 39 con su motivo.
- Corregido: «Archivo válido: 50 filas», vista previa y, al confirmar, registro en la bitácora.

### P-07 · Generar la propuesta inicial
_Rol: Coordinador · Cubre: CU-10 · CU-11 · RF-08 · RF-09_

**Pasos**
1. Menú **Tablero del horario** → **Generar propuesta inicial**.
2. Use los filtros *Por semestre / Por curso / Por docente / Por aula*. Por semestre, cada curso tiene su color y su nombre aparece arriba de la grilla.

**Resultado esperado**
- Se crea la versión 1 (borrador) en milisegundos: unas 287 sesiones y 0 violaciones duras.
- Cada semestre queda con sus clases en patrones cómodos (lunes-miércoles, martes-jueves) para la jornada diurna y la nocturna.
- Queda 1 grupo en la bandeja de **Pendientes** con su regla y causa (Programación I G1, R4).
- En **Restricciones blandas** aparece B6: Investigación tecnológica G1 y G2 con la misma docente.

### P-08 · Arrastrar a un bloque no válido (R3)
_Rol: Coordinador · Cubre: CU-12 · CU-11 · RF-10_

**Pasos**
1. En el tablero (semestre 1), arrastre una sesión de la mañana hasta las 12:00 del mismo día.
2. Repita arrastrando una sesión al sábado a las 15:00.

**Resultado esperado**
- Mientras arrastra se ve el destino; en rojo si cae en un bloque prohibido.
- Al soltar, la sesión vuelve a su lugar y aparece «Movimiento rechazado» con la regla R3 (y las demás que viole).

### P-09 · Cruce de docente (R1) y movimiento válido
_Rol: Coordinador · Cubre: CU-12 · RF-10_

**Pasos**
1. Cambie a **Por docente** y elija un docente con varias sesiones.
2. Arrastre una de sus sesiones encima de otra suya.
3. Arrastre una sesión a un hueco libre en el que el docente esté disponible.

**Resultado esperado**
- El cruce se rechaza con R1 (y R2 si también choca el aula).
- El movimiento válido se guarda («Sesión movida») y queda en la bitácora.

### P-10 · Editar una sesión desde el panel
_Rol: Coordinador · Cubre: CU-12 · RF-09_

**Pasos**
1. Haga clic en una sesión de un curso de laboratorio (p. ej. *Programación I G2*, semestre 2).
2. En el panel cambie el aula a un salón sin computadores (p. ej. *I-101 · 45 puestos*) y pulse **Validar y aplicar**.
3. Abra la lista de docentes del panel.

**Resultado esperado**
- Se rechaza con R4: el aula no tiene los equipos de cómputo que exige el curso.
- La lista solo muestra los docentes habilitados para el curso, con su carga (R5, R7).

### P-11 · Restricciones blandas
_Rol: Coordinador · Cubre: CU-13 · RF-11_

**Pasos**
1. En el tablero pulse **Restricciones blandas** y despliegue cada grupo.

**Resultado esperado**
- Se listan los avisos B1–B6 (días consecutivos, huecos del docente, cruces del mismo semestre, dos grupos diurnos con el mismo docente…).
- Son informativos: no impiden publicar.

### P-12 · Publicación bloqueada
_Rol: Coordinador · Cubre: CU-14 · RF-12_

**Pasos**
1. Menú **Versiones y publicación** → **Publicar** en la versión 1.

**Resultado esperado**
- La publicación se bloquea y se lista la causa (el grupo pendiente). Las restricciones blandas, como B6, no bloquean.

### P-13 · Resolver el pendiente de Programación I (R4)
_Rol: Coordinador · Cubre: CU-08 · CU-12 · RF-07_

**Pasos**
1. Menú **Grupos y demanda**: busque *Programación I* y haga clic en el grupo **G1 · Diurna · 44**.
2. Cambie el cupo a 35 y guarde.
3. Vuelva al tablero y pulse **Reintentar** en la tarjeta del pendiente.
4. Alternativa: importe *aulas_nuevas.csv* (sala de cómputo F-305 de 45 puestos) y reintente sin cambiar el cupo.

**Resultado esperado**
- El grupo queda ubicado con sus 3 sesiones y sale de la bandeja.

### P-14 · Norma de dos docentes en el día (B6) con un docente importado
_Rol: Coordinador · Cubre: CU-07 · CU-04 · CU-05 · CU-13 · CU-12_

**Pasos**
1. En el tablero abra **Restricciones blandas** y despliegue **B6**: Mónica Liliana Bernal dicta G1 y G2 de Investigación tecnológica.
2. En **Importar datos** → **Docentes**, pruebe primero *docentes_con_errores.csv* (3 filas con error, no carga nada).
3. Pruebe *docentes_nuevos.csv* y confirme: entran 2 docentes; Natalia Ruiz Prieto queda habilitada para Investigación tecnológica.
4. En la pestaña **Disponibilidad** pruebe *disponibilidad_con_errores.csv* (3 errores) y luego confirme *disponibilidad_docentes_nuevos.csv*.
5. En el tablero elija **Por curso** → *Investigación tecnológica* → tarjeta **G2**. Abra cada sesión, cambie el docente a *Natalia Ruiz Prieto* y pulse **Validar y aplicar**. (Otra opción: en *Grupos y demanda* ponerla como docente preferente del G2 y regenerar.)

**Resultado esperado**
- Antes: el grupo sí quedó programado y B6 lo avisa, sin bloquear la publicación (la norma es ideal, no obligatoria).
- Después: G2 queda con Natalia, distinta de la docente del G1, y el aviso B6 desaparece.

### P-15 · Revisión del comité
_Rol: Comité · Cubre: CU-18 · CU-20 · RF-20 · RF-15_

**Pasos**
1. Cierre sesión y entre con *Andrés Felipe Castro* (comité).
2. En **Revisión de propuestas** recorra los semestres.
3. Elija *Concepto favorable* o *Requiere ajustes*, escriba una observación y pulse **Enviar al coordinador**.
4. Escriba en la barra de direcciones `#/tablero.
5. En **Trazabilidad** pulse **Mover una sesión**.

**Resultado esperado**
- La observación queda asociada a la versión.
- El comité no ve el tablero en el menú y, si escribe la ruta, recibe «Acceso denegado».
- La llamada directa se rechaza: «Operación rechazada por el servidor» y queda en la bitácora.

### P-16 · Publicar el horario
_Rol: Coordinador · Cubre: CU-14 · RF-12 · RF-20_

**Pasos**
1. Entre como coordinadora. En **Inicio** y en **Versiones** verá la observación del comité.
2. Pulse **Publicar** y confirme.

**Resultado esperado**
- La versión 1 queda **Publicada · oficial**; la barra superior muestra «Publicado: versión 1».

### P-17 · Restaurar una versión
_Rol: Coordinador · Cubre: CU-15 · RF-12_

**Pasos**
1. En **Versiones** pulse **Restaurar como borrador** en la versión publicada.

**Resultado esperado**
- Se crea la versión 2 en borrador; la publicada no cambia. Puede seguir ajustando la 2 en el tablero.

### P-18 · Horario del docente
_Rol: Docente · Cubre: CU-18 · CU-19 · CU-05 · RF-19 · RF-13 · RF-04_

**Pasos**
1. Entre con *Germán Augusto Neuta* (o con *Saudiel Orlando López*, *Cristian Fabián Vanegas* o *Edward Paul Guillén Pinto*).
2. Revise **Mi horario** y descargue el **CSV**; pulse **PDF** (imprimir → Guardar como PDF).
3. En **Mi disponibilidad** cambie algunas horas y guarde.
4. Escriba la ruta `#/consulta.

**Resultado esperado**
- Solo ve sus propias sesiones del horario publicado (no ve borradores).
- El CSV trae una fila por sesión; el PDF sale en horizontal.
- La disponibilidad se guarda y queda en la bitácora.
- La consulta general le es denegada.

### P-19 · Consultar y exportar el horario
_Rol: Coordinador · Cubre: CU-18 · CU-19 · RF-19 · RF-13_

**Pasos**
1. Menú **Consultar horario**: pruebe *Semestre*, *Docente*, *Aula* y *Curso*.
2. Pulse **CSV completo** y ábralo en Excel. Pulse **PDF**.

**Resultado esperado**
- La vista por aula muestra su ocupación semanal completa.
- El CSV (separado por punto y coma) trae código, curso, semestre, grupo, jornada, docente, aula, día, hora de inicio y de fin.

### P-20 · Inscritos y cierre de grupos
_Rol: Coordinador · Cubre: CU-17 · RF-21_

**Pasos**
1. Menú **Inscritos y cierre** → **Simular inscritos** (o escriba los números a mano).
2. Marque *Mostrar solo los grupos por debajo del mínimo*.
3. Pulse **Cerrar grupo** en uno y confirme.

**Resultado esperado**
- Los grupos con menos de 10 inscritos aparecen señalados.
- Al cerrarlo se eliminan sus sesiones del borrador y de la publicada (docente y aula libres) y se registra en la bitácora.

### P-21 · Reportes
_Rol: Coordinador · Cubre: CU-16 · RF-14_

**Pasos**
1. Menú **Reportes**: pestañas *Ocupación de aulas*, *Carga docente* y *Grupos bajo el mínimo*.
2. Pulse **Exportar CSV**.

**Resultado esperado**
- Porcentaje de ocupación por aula, horas asignadas frente al máximo de cada docente y grupos con inscritos por debajo del mínimo.

### P-22 · Periodos independientes
_Rol: Coordinador · Cubre: CU-03 · RF-16 · RF-01_

**Pasos**
1. En **Periodos y parámetros** → **Nuevo periodo** 2027-1, con *Copiar la oferta* marcado.
2. Cambie la franja del sábado a 8–12 y guarde.
3. Seleccione 2026-2 en la lista.
4. Vuelva a 2027-1, genere una propuesta en el tablero y revise el sábado.

**Resultado esperado**
- 2026-2 conserva el sábado 7–13 y su versión publicada no cambia.
- En 2027-1 ninguna sesión del sábado queda fuera de 08:00–12:00.

### P-23 · Demanda y número de grupos
_Rol: Coordinador · Cubre: CU-08 · CU-09 · RF-18 · RF-07_

**Pasos**
1. Con el periodo 2027-1 activo (para no alterar 2026-2), vaya a **Grupos y demanda** y busque *Cálculo integral*.
2. Escriba demanda 130 y salga del campo.
3. Escriba 2 en *Ajustar número de grupos* y pulse **Aplicar**; luego 3.
4. Abra un grupo e intente cupo 45; luego 44.

**Resultado esperado**
- Sugiere 4 grupos (130 ÷ 40, redondeando hacia arriba).
- Con 2 se rechaza (65 por grupo > 44, R9); con 3 se acepta (43,3 por grupo).
- El cupo 45 se rechaza y el 44 se acepta (R9).

### P-24 · Usuarios y roles
_Rol: Administrador · Cubre: CU-02 · RF-22 · RF-15_

**Pasos**
1. Entre con *admin@ueb.demo*.
2. **Nuevo usuario** con rol Docente, vinculado a un docente, y contraseña inicial.
3. Edítelo y cámbiele el rol a Comité. Luego pulse **Desactivar**.
4. Intente iniciar sesión con ese usuario.

**Resultado esperado**
- El usuario se crea; el cambio de rol y la desactivación quedan en la bitácora.
- El usuario desactivado no puede iniciar sesión.

### P-25 · Bitácora
_Rol: Coordinador o administrador · Cubre: RF-15_

**Pasos**
1. Menú **Bitácora**: filtre por acción o busque por texto. Exporte a CSV.

**Resultado esperado**
- Están los inicios de sesión, generaciones, movimientos, importaciones, publicaciones, cierres de grupo y los intentos rechazados por permisos, con usuario y fecha-hora.

### P-26 · Ver un curso con todos sus grupos
_Rol: Coordinador · Cubre: CU-12 · CU-18 · RF-10 · RF-19_

**Pasos**
1. En el tablero, vista **Por semestre**, haga clic en el nombre de un curso (arriba de la grilla), o elija **Por curso** y seleccione *Estructuras de datos*.
2. Haga clic en la tarjeta de un grupo (G1, G2, G3) para dejar solo ese grupo en la grilla; otro clic vuelve a mostrarlos todos.
3. En **Consultar horario → Curso** elija el mismo curso y, si quiere, un grupo.

**Resultado esperado**
- En la vista por curso cada grupo tiene su color, y su tarjeta muestra días, horas y docente.
- En *Consultar horario* la leyenda indica el color y el docente de cada grupo.

### P-27 · Ficha de un grupo
_Rol: Coordinador · Cubre: CU-08 · RF-07_

**Pasos**
1. Menú **Grupos y demanda**: haga clic en un grupo (por ejemplo *Matemáticas básicas G3*), o en **Ver horario de sus grupos** debajo del nombre del curso.
2. En la ficha pulse **Comparar con los otros grupos del curso**.

**Resultado esperado**
- La ficha muestra jornada, cupo, inscritos, estado, sesiones por semana, tipo de aula y el horario del grupo (día, hora, aula y docente), o la regla y la causa si quedó pendiente. Debajo sigue la configuración del grupo.
- El enlace abre el tablero en la vista de ese curso.

### P-28 · Dos sesiones del mismo grupo el mismo día (R8)
_Rol: Coordinador · Cubre: CU-12 · CU-11 · RF-09 · RF-10_

**Pasos**
1. En el tablero, vista **Por curso**, elija un curso y deje solo su G1.
2. Abra una de sus sesiones y, en el panel, cámbiela al día de la otra sesión del grupo, a una hora libre. Pulse **Validar y aplicar** (o arrástrela a ese día).

**Resultado esperado**
- Se rechaza con R8: «… ya tiene clase el jueves (16:00–18:00); un grupo solo puede tener una sesión por día».
- El generador tampoco pone dos sesiones de un grupo el mismo día, ni siquiera el sábado.

## 7. Matriz de trazabilidad
| RF | CU | Pruebas |
|---|---|---|
| RF-01 | CU-03 | P-02, P-08, P-22 |
| RF-02 | CU-03 | P-02 |
| RF-03 | CU-04 | P-03 |
| RF-04 | CU-05 | P-04, P-14, P-18 |
| RF-05 | CU-06 | P-05 |
| RF-06 | CU-06 | P-05, P-10 |
| RF-07 | CU-08 | P-13, P-23, P-27 |
| RF-08 | CU-10 | P-07 |
| RF-09 | CU-11 | P-07 a P-10, P-23, P-28 |
| RF-10 | CU-12 | P-08, P-09, P-10, P-26, P-28 |
| RF-11 | CU-13 | P-11, P-14 |
| RF-12 | CU-14, CU-15 | P-12, P-16, P-17 |
| RF-13 | CU-19 | P-18, P-19 |
| RF-14 | CU-16 | P-21 |
| RF-15 | CU-01 | P-01, P-15, P-25 |
| RF-16 | CU-03 | P-22 |
| RF-17 | CU-07 | P-06, P-14 |
| RF-18 | CU-09 | P-23 |
| RF-19 | CU-18 | P-15, P-18, P-19, P-26 |
| RF-20 | CU-20 | P-15, P-16 |
| RF-21 | CU-17 | P-20 |
| RF-22 | CU-02 | P-01, P-24 |

## 8. Solución de problemas
| Situación | Qué hacer |
|---|---|
| `npm install falla por dependencias | Verifique que el archivo `.npmrc esté en la carpeta y use Node 20.19+ o 22.12+. |
| «Port 4200 is already in use» | `npm start -- --port 4300 |
| Los datos quedaron en un estado raro | Botón **Restablecer datos de demostración** en la pantalla de inicio de sesión. |
| No veo el horario como docente | El periodo 2026-2 no tiene horario publicado hasta P-16; use el botón «Ver mi horario de 2026-1». |
| Veo los datos viejos (salones L-1, T-1…) | La app detecta la versión nueva de los datos y los reinicia sola; si no, use «Restablecer datos de demostración». |
| El PDF sale cortado | En el diálogo de impresión elija orientación horizontal y «Guardar como PDF». |
