<p align="center">
  <img src="docs/img/banner.png" alt="Horarios UEB: programación de horarios de clases sin choques, del borrador a la publicación" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white" alt="Angular 21">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Angular%20CDK-drag%20%26%20drop-0075de" alt="Angular CDK">
  <img src="https://img.shields.io/badge/estilos-SCSS%20%C2%B7%20DESIGN.md-ffb110?labelColor=111111" alt="SCSS">
  <img src="https://img.shields.io/badge/despliegue-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Proyecto%20N%C3%BAcleo%20II-Grupo%207-02093a" alt="Proyecto Núcleo II · Grupo 7">
</p>

<p align="center">
  <b>Prototipo funcional de alta fidelidad del sistema de programación de horarios de clases</b><br>

</p>

<p align="center">
  <a href="https://horarios-ueb.vercel.app"><b>🚀 Ver la demo en vivo → horarios-ueb.vercel.app</b></a> · contraseña <code>demo123</code>
</p>

<p align="center">
  <img src="docs/img/demo.gif" alt="Demo: la coordinadora genera la propuesta, arrastra una sesión al bloque no asignable y el sistema la rechaza con la regla R3; luego la mueve a un hueco válido y se guarda" width="92%">
</p>

> [!NOTE]
> Es el **front-end en Angular** de la arquitectura definida en el entregable (Angular + Spring Boot + MySQL). Para poder probarlo sin servidor, el backend está **simulado dentro del navegador**: valida permisos por rol, aplica las reglas R1–R9, versiona el horario y escribe la bitácora. Todos los datos son **de demostración**.

---

## 📑 Contenido

- [El problema](#-el-problema)
- [Qué hace el prototipo](#-qué-hace-el-prototipo)
- [Roles y cuentas de demostración](#-roles-y-cuentas-de-demostración)
- [Recorrido por las pantallas](#-recorrido-por-las-pantallas)
- [Normas y reglas del negocio](#-normas-y-reglas-del-negocio)
- [Cómo arma el horario el generador](#-cómo-arma-el-horario-el-generador)
- [Datos de demostración](#-datos-de-demostración)
- [Arquitectura del prototipo](#-arquitectura-del-prototipo)
- [Guía de instalación y ejecución](#-guía-de-instalación-y-ejecución)
- [Despliegue en Vercel](#-despliegue-en-vercel)
- [Requerimientos funcionales y no funcionales](#-requerimientos-funcionales-y-no-funcionales)
- [Casos de uso](#-casos-de-uso)
- [Trazabilidad con los requerimientos](#-trazabilidad-con-los-requerimientos)
- [Contexto del proyecto y estado](#-contexto-del-proyecto-y-estado)
- [Solución de problemas](#-solución-de-problemas)
- [Documentos del proyecto](#-documentos-del-proyecto)

## 🤔 El problema

El caso *«El Reto de la Programación de Horarios de Clases»* describe cómo el Programa arma hoy los horarios en hojas de cálculo: cada semestre hay que cruzar a mano docentes con su vinculación y disponibilidad, cursos con sus sesiones semanales, aulas con capacidades y características distintas, y grupos que no pueden pasar de 40 estudiantes (con 10 % de tolerancia). Cualquier cambio de última hora puede dejar a un docente en dos salones a la vez o a un grupo de 40 en un aula de 30, y nadie lo nota hasta el primer día de clases.

El sistema propuesto genera una propuesta válida, deja ajustarla arrastrando sesiones sin romper ninguna regla, la somete al concepto del comité y la publica solo cuando no tiene choques.

## ✨ Qué hace el prototipo

| | Funcionalidad | Dónde verla |
|---|---|---|
| ⚙️ | Periodos académicos con sus propios parámetros (franjas, bloque no asignable, cupos, horas por vinculación) | *Periodos y parámetros* |
| 🧑‍🏫 | Docentes con vinculación, escalafón, cursos habilitados y disponibilidad semanal (editor de grilla) | *Docentes* · *Mi disponibilidad* |
| 🕐 | **Horario de atención por materia** (cambio pedido en la validación): 1 o 2 h semanales fijas o «acordar con el docente»; lo registra el docente o la coordinadora y el generador no programa clases encima | *Mi disponibilidad* · *Docentes → Horario de atención* · *Mi horario* |
| 🏫 | 86 aulas reales por bloque y piso (A, B, E, F, G, I) con salas de cómputo, laboratorios de redes y de física | *Aulas* |
| 📥 | Importación CSV **todo o nada**: si una fila falla no se carga nada y se listan las filas con su motivo | *Importar datos* |
| 👥 | Demanda por curso, sugerencia de número de grupos y docente preferente por grupo | *Grupos y demanda* |
| 🪄 | **Generación automática** de la propuesta en milisegundos, con grupos pendientes y su causa | *Tablero* |
| 🖱️ | **Tablero semanal con arrastrar y soltar**: cada movimiento se valida contra R1–R9 y, si viola una regla, la sesión vuelve y se nombra la regla | *Tablero* |
| 🎨 | **Vista por curso**: un color por grupo, con su horario y docente; por semestre, un color por curso | *Tablero → Por curso* · *Consultar horario → Curso* |
| 🗂️ | **Ficha del grupo**: datos, horario (día, hora, aula, docente) o causa del pendiente, y su configuración | *Grupos y demanda* → clic en el grupo |
| 📊 | Restricciones blandas B1–B6 (informativas, no bloquean) | *Tablero → Restricciones blandas* |
| 🗳️ | Concepto del comité por versión, publicación bloqueada si hay choques o pendientes, restauración de versiones | *Revisión* · *Versiones* |
| 🔎 | Consulta por docente, aula, curso o semestre y exportación a CSV y PDF | *Consultar horario* · *Mi horario* |
| 📈 | Reportes de ocupación de aulas por franja (mañana, tarde, noche, sábado), carga docente y grupos bajo el mínimo; registro de inscritos y cierre de grupos | *Reportes* · *Inscritos y cierre* |
| 🔐 | Inicio de sesión, menú y rutas por rol, rechazo en el "servidor" de acciones sin permiso y bitácora de auditoría | *Login* · *Bitácora* · *Trazabilidad* |

## 👥 Roles y cuentas de demostración

Todas las cuentas usan la contraseña **`demo123`**. En la pantalla de inicio de sesión basta con hacer clic en la cuenta; cada una lleva una marquilla con el color de su rol y debajo hay un desplegable que explica qué hace cada rol.

| Rol | Cuenta | Qué puede hacer |
|---|---|---|
| 🟡 **Coordinador de horarios** | `coordinacion@ueb.demo` | Todo el proceso del periodo: parámetros, catálogo, importación, grupos, generación, tablero, publicación, reportes, inscritos y bitácora. |
| 🔵 **Comité Táctico / de Área** | `comite.software@ueb.demo` · `comite.ciencias@ueb.demo` | Revisa las versiones en modo lectura y registra su concepto. No puede tocar el horario. |
| 🟢 **Docente** | `cvanegas@ueb.demo` · `eguillen@ueb.demo` · `slopez@ueb.demo` · `gneuta@ueb.demo` | Ve y exporta **solo su horario publicado** y registra su disponibilidad. |
| ⚫ **Administrador** | `admin@ueb.demo` | Usuarios y roles; además periodos, consulta y bitácora. |
| ⚪ Desactivado | `retirado@ueb.demo` | No puede iniciar sesión (prueba de RF-22). |

<p align="center">
  <img src="docs/img/login.png" alt="Pantalla de inicio de sesión con las cuentas de demostración y la marquilla de color de cada rol" width="90%">
</p>

## 🧭 Recorrido por las pantallas

El menú del coordinador sigue el orden del proceso del BPMN: **Planeación → Programación → Seguimiento**. Cada pantalla indica en su encabezado los casos de uso y requerimientos que cubre.

<table>
  <tr>
    <td width="50%"><img src="docs/img/inicio.png" alt="Inicio del coordinador"><br><b>Inicio</b> · estado del periodo y los 7 pasos del flujo, con lo hecho y lo pendiente.</td>
    <td width="50%"><img src="docs/img/aulas.png" alt="Aulas por bloque"><br><b>Aulas</b> · 86 salones por bloque y piso; clic en un bloque para filtrar.</td>
  </tr>
  <tr>
    <td><img src="docs/img/tablero.png" alt="Tablero con pendientes"><br><b>Tablero</b> · propuesta generada, bandeja de pendientes con su regla y causa.</td>
    <td><img src="docs/img/tablero-detalle.png" alt="Panel de detalle de una sesión"><br><b>Detalle de sesión</b> · cambiar día, hora, docente (solo habilitados) o aula, validando R1–R9.</td>
  </tr>
  <tr>
    <td><img src="docs/img/importar-errores.png" alt="Importación CSV rechazada"><br><b>Importar CSV</b> · 50 filas con 3 inválidas: no carga nada y lista las filas 8, 21 y 39.</td>
    <td><img src="docs/img/publicacion-bloqueada.png" alt="Publicación bloqueada"><br><b>Publicación bloqueada</b> · no se publica con grupos pendientes ni violaciones duras.</td>
  </tr>
  <tr>
    <td><img src="docs/img/comite.png" alt="Revisión del comité"><br><b>Comité</b> · revisa por semestre y registra su concepto para la versión.</td>
    <td><img src="docs/img/versiones.png" alt="Versión publicada"><br><b>Versiones</b> · publicada con la observación del comité; restaurar crea un borrador nuevo.</td>
  </tr>
  <tr>
    <td><img src="docs/img/mi-horario.png" alt="Horario del docente"><br><b>Mi horario</b> · el docente solo ve sus sesiones publicadas y las exporta.</td>
    <td><img src="docs/img/reportes.png" alt="Reportes"><br><b>Reportes</b> · ocupación de aulas por franja, carga docente y grupos bajo el mínimo.</td>
  </tr>
  <tr>
    <td><img src="docs/img/curso.png" alt="Vista por curso"><br><b>Vista por curso</b> · un color por grupo, con su horario y docente.</td>
    <td><img src="docs/img/atencion.png" alt="Horario de atención"><br><b>Horario de atención</b> · cambio pedido en la validación: 1–2 h por materia o «acordar con el docente».</td>
  </tr>
</table>

## 📐 Normas y reglas del negocio

### Parámetros por defecto (editables por periodo, RF-01 · RF-02 · RF-16)

| Parámetro | Valor |
|---|---|
| Franja lunes a viernes | 07:00 – 22:00 |
| Franja sábado | 07:00 – 13:00 |
| Bloque no asignable (almuerzo) | 13:00 – 14:00 |
| Duración de la sesión | 2 horas |
| Cupo máximo por grupo | 40 + 10 % de tolerancia = **44** (cupo efectivo) |
| Cupo mínimo para no cerrar | 10 inscritos |
| Sesiones por semana | 1 a 4 (según créditos: 1 → 1, 2–3 → 2, 4 → 3) |
| Horas máximas por vinculación | TC 16 · ¾ 12 · ½ 8 · ¼ 4 *[confirmar con la Facultad]* |

### Norma de grupos y jornadas del Programa

> [!IMPORTANT]
> - **En el día**, cada curso abre **mínimo dos grupos (G1 y G2)**, idealmente con **dos docentes distintos** (ver B6).
> - **En la noche**, cada curso abre **un grupo (G3)**; solo cuando la demanda lo justifica abre un segundo (**G4**, como Matemáticas básicas y Cálculo diferencial). Nunca más de dos.
> - La **jornada diurna** usa 07–09, 09–11, 11–13, 14–16 y 16–18 de lunes a viernes (el almuerzo es de 13 a 14); la **nocturna** usa 18–20 y 20–22 de lunes a viernes y el **sábado en la mañana**.
> - **Un grupo tiene como máximo una sesión por día** (regla dura R8): nunca dos bloques de la misma materia el mismo día, tampoco el sábado.
> - La norma de **dos docentes distintos en el día es ideal, no obligatoria**: casi siempre se cumple, pero hay casos en que no hay otro docente. El generador busca primero un docente distinto y, si no lo hay, repite docente y la versión lo reporta como restricción blanda **B6** (no bloquea la publicación).

### Docentes con usuario en la demo (asignaciones acordadas)

Estos grupos guardan un **docente preferente**: el generador intenta primero a ese docente y así sus horarios quedan como se acordó.

| Docente | Jornada | Cursos |
|---|---|---|
| Edward Paul Guillén Pinto | Noche (lunes a viernes) | Redes de datos I, Redes de datos II, Investigación tecnológica y de ingeniería, Seguridad de la información |
| Cristian Fabián Vanegas | Tarde-noche | Fundamentos de programación, Dirección y planeación, Gestión de proyectos, Proyecto núcleo II |
| Saudiel Orlando López | Día, sábados y viernes en la noche | Historia y filosofía de la ingeniería, Matemáticas discretas, Gestión de tecnología e innovación, Seminario de investigación, Lógica matemática |
| Germán Augusto Neuta | Viernes y sábados | Legislación, normatividad y ciudadanía, Electiva profesional II |

### Restricciones duras (bloquean · RF-09)

Cada una es una clase en `src/app/core/rules/reglas-duras.ts` (patrón Specification). Se evalúan al generar, al mover una sesión, al editarla desde el panel y antes de publicar.

| Regla | Qué impide |
|---|---|
| **R1** | Un docente con dos sesiones a la vez |
| **R2** | Un aula con dos sesiones a la vez |
| **R3** | Sesiones fuera de la franja hábil o sobre el bloque no asignable |
| **R4** | Aulas sin la capacidad o las características que pide el curso |
| **R5** | Docentes no habilitados para el curso |
| **R6** | Sesiones fuera de la disponibilidad del docente |
| **R7** | Superar las horas máximas de docencia del docente |
| **R8** | Más sesiones semanales de las permitidas, o **dos sesiones del mismo grupo el mismo día** |
| **R9** | Grupos con cupo por encima del cupo efectivo |

### Restricciones blandas (se reportan, no bloquean · RF-11)

| Regla | Qué reporta |
|---|---|
| **B1** | Cursos de 2 o 3 sesiones en días seguidos |
| **B2** | Huecos de 2 h o más en el día de un docente (el almuerzo no cuenta) |
| **B3** | Docentes al 100 % mientras otros no tienen clases |
| **B4** | Cruces entre cursos del mismo semestre y jornada |
| **B5** | Aulas especiales usadas por cursos que no las necesitan |
| **B6** | Dos grupos diurnos del mismo curso con el mismo docente (norma del Programa) |

## 🧠 Cómo arma el horario el generador

```mermaid
flowchart TD
    A[Grupos abiertos del periodo] --> B[Ordenar: primero los que tienen docente preferente,<br>luego los de menos opciones docentes × aulas]
    B --> C{¿Cumple R8 y R9?<br>¿Hay docentes y aulas aptas?}
    C -- No --> P[Pendiente con su regla y causa]
    C -- Sí --> D[Docentes habilitados con disponibilidad en la jornada,<br>primero los que no dictan otro grupo diurno del curso (B6)<br>y sin cruzar su horario de atención]
    D --> E[Patrones de días a la misma hora:<br>L-X · M-J · X-V · L-X-V · un día + sábado en la noche<br>una sola sesión por día]
    E --> F[Costo de cada patrón: días seguidos, sábado diurno,<br>huecos y cruces del semestre, carga del docente]
    F --> G{¿El más barato pasa R1–R9?}
    G -- Sí --> H[Se asigna docente, aula y bloques]
    G -- No --> I[Siguiente patrón / siguiente docente / sesión por sesión]
    I --> G
    I -- Nada cabe --> P
```

El resultado con los datos de demostración: **~289 sesiones en milisegundos, 0 violaciones duras**, el 96 % de los grupos diurnos (78 de 81) en L-X, M-J o L-X-V a la misma hora, usando también la franja de 11 a 13 (el resto, donde el docente solo puede viernes y sábado o no cabe otro patrón) y 1 pendiente intencional para probar su resolución (*Programación I G1* por R4). *Investigación tecnológica* queda con la misma docente en G1 y G2 y aparece como aviso **B6**. Así queda, por ejemplo, el 6.º semestre:

<p align="center">
  <img src="docs/img/tablero-semestre-6.png" alt="Horario del sexto semestre en jornada diurna y nocturna" width="90%">
</p>

## 🗂️ Datos de demostración

- **Plan de estudios** real de Ingeniería de Sistemas de la UEB: 53 cursos de 1.º a 9.º semestre.
- **Periodos:** 2026-1 cerrado con su horario publicado y 2026-2 abierto, sin versiones.
- **161 grupos** en 2026-2 según la norma de jornadas.
- **55 docentes.** Los nombres reales vienen del Excel de horarios de referencia; los demás son ficticios. Vinculación, escalafón, disponibilidad y correos (`@ueb.demo`) son inventados.
- **86 aulas** en los bloques que usa la Facultad:

| Bloque | Pisos y salones | Tipo |
|---|---|---|
| **A** | Pisos 2, 3 y 4 · salones 1–4 (en el piso 3 está la **Facultad de Ingeniería**) | Salas de cómputo |
| **B** | Pisos 2 y 3 · salones 1–13 | 1–5 sillas y tablero · 6–13 salas de cómputo |
| **E** | Piso 1 · salones 1–5 | Mobiliario móvil (se pueden pedir portátiles) |
| **F** | Pisos 2, 3, 4, 5 y 7 | Pisos 2–3 salas de cómputo y laboratorios de redes y de seguridad (piso 2) · pisos 4, 5 y 7 sillas y tablero |
| **G** | G-LAB1 a G-LAB3 | Laboratorios de física |
| **I** | Piso 1 · salones 1–10 · pisos 2 y 3 · salones 1–4 | Sillas y tablero |

- **CSV de muestra** (válidos y con errores) en [`public/muestras/`](public/muestras).

## 🏗️ Arquitectura del prototipo

```mermaid
flowchart LR
    subgraph UI[Pantallas · componentes standalone]
        T[Tablero] --- V[Versiones] --- C[Consulta] --- O[Otras 14 pantallas]
    end
    UI --> S[StoreService<br><i>backend simulado</i>]
    S --> R[Reglas R1–R9<br>Specification]
    S --> G[GeneradorHorario<br>voraz por patrones]
    S --> B[Reglas blandas B1–B6]
    S --> L[(localStorage<br>estado + bitácora)]
    S -. en producción .-> API[API REST Spring Boot] --> DB[(MySQL)]
```

| Carpeta | Contenido |
|---|---|
| `src/app/core/models.ts` | Entidades del diagrama de clases y del MER |
| `src/app/core/rules/` | Reglas duras R1–R9, validador y reglas blandas B1–B6 |
| `tests/` | Pruebas automáticas del motor de reglas y del generador (`npm test`); las corre GitHub Actions en cada push (`.github/workflows/ci.yml`) |
| `src/app/core/scheduling/` | Generador por patrones semanales (interfaz `GeneradorHorario`, intercambiable) |
| `src/app/core/services/` | `StoreService` (hace de backend: permisos, reglas, versiones, bitácora), sesión y avisos |
| `src/app/core/import/` | Importación CSV todo o nada |
| `src/app/core/data/` | Datos de demostración (plan, docentes, aulas, grupos) y matriz de trazabilidad |
| `src/app/features/` | Una carpeta por pantalla (carga diferida por ruta y guardas por rol) |
| `src/app/shared/` | Grilla semanal, editor de disponibilidad, modal, iconos, avisos |

**Stack:** Angular 21 (componentes standalone, signals, sin zone.js, control flow `@if/@for`), Angular CDK para arrastrar y soltar, SCSS con los tokens del DESIGN.md del equipo (estilo Notion), Inter y Source Serif 4.

## 🧰 Guía de instalación y ejecución

> [!TIP]
> Solo necesitas **Node.js 20.19 o superior** (o 22.12+). Compruébalo con `node -v`.

```bash
git clone https://github.com/Chocax/horarios-ueb.git
cd horarios-ueb
npm install
npm start          # abre http://localhost:4200
```

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/horarios-ueb/browser` |
| `npm test` | 27 pruebas del motor de reglas (R1–R9) y del generador; GitHub Actions las corre en cada push a `main` |

El archivo `.npmrc` trae `legacy-peer-deps=true` para evitar conflictos de dependencias de npm. Los datos viven en el `localStorage` de tu navegador: el botón **Restablecer datos de demostración** del inicio de sesión los deja como al principio.

## ▲ Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. Vercel detecta Angular solo. Si pide datos: *Build command* `npm run build` · *Output directory* `dist/horarios-ueb/browser`.
4. **Deploy.** Cada `git push` a `main` vuelve a desplegar.

Las rutas usan `#` (por ejemplo `https://horarios-ueb.vercel.app/#/tablero`), así que no hace falta configurar reescrituras. Si alguien abre el link de una pantalla sin haber iniciado sesión, primero ve el login y después llega a esa pantalla.

## 📋 Requerimientos funcionales y no funcionales

Tomados del entregable de levantamiento de requerimientos, con los ajustes que se hicieron después en el prototipo (marcados en negrita). La **prueba de aceptación** es la misma que muestra la pantalla *Trazabilidad*.

| RF | Requerimiento | CU | Prueba de aceptación en el prototipo | Prioridad |
|---|---|---|---|---|
| **RF-01** | Configurar, sin modificar el código, los parámetros de programación: franja hábil por día (L–V 07:00–22:00; sábado 07:00–13:00), bloques no asignables (por defecto el almuerzo, **13:00–14:00**) y duración del bloque de clase (por defecto 2 horas). | CU-03 | Cambiar la franja del sábado a 8–12 y regenerar: ninguna sesión queda fuera. | Alta |
| **RF-02** | Configurar los parámetros de aforo y frecuencia: cupo máximo por grupo (40), tolerancia (10 %), cupo mínimo de cierre (10) y número mínimo (1) y máximo (4) de sesiones semanales por curso. | CU-03 | Cupo máximo 35 → R9 y reportes usan el nuevo valor. | Alta |
| **RF-03** | Registrar docentes con su tipo de vinculación (tiempo completo, ¾, ½, ¼), categoría de escalafón y horas máximas de docencia directa, tomadas por defecto de la vinculación. | CU-04 | Docente sin vinculación u horas negativas se rechaza. | Alta |
| **RF-04** | Registrar, por docente, su disponibilidad horaria y los cursos que está habilitado para orientar. La disponibilidad la puede registrar el coordinador o el propio docente. | CU-05 | Docente no habilitado no aparece; disponibilidad nocturna impide 16:00 (R6). | Alta |
| **RF-05** | Registrar cursos del plan de estudios con su nivel (semestre), número de sesiones semanales y las características de aula que requieren. | CU-06 | Curso con cómputo solo va a laboratorios (R4). | Alta |
| **RF-06** | Registrar aulas con su capacidad y características (equipos de cómputo, mobiliario móvil). | CU-06 | Aula de 30 rechaza grupo de 40 (R4). | Alta |
| **RF-07** | Crear grupos (secciones) de un curso para un periodo académico, con su cupo planeado. | CU-08 | Cupo 44 se acepta, 45 se rechaza (R9). | Alta |
| **RF-08** | Generar una propuesta inicial de horario que asigne a cada grupo un docente, un aula y sus bloques. Los grupos sin asignación válida quedan pendientes, con la causa, sin detener la generación. | CU-10 | Generar: 1 pendiente con su causa (R4), 0 violaciones; la norma de dos docentes aparece como B6. | Alta |
| **RF-09** | Validar toda asignación contra las restricciones duras R1 a R9. | CU-11 | Cada rechazo nombra la regla violada. | Alta |
| **RF-10** | Ajustar la propuesta arrastrando y soltando sobre un tablero semanal, rechazando en el acto todo movimiento que viole una restricción dura e indicando la regla violada. | CU-12 | Arrastrar a 13:00 (almuerzo) o a un choque de docente: vuelve y muestra R3/R1. | Alta |
| **RF-11** | Reportar el cumplimiento de las restricciones blandas **B1 a B6** (B6 se agregó en el prototipo), sin bloquear la publicación. | CU-13 | Panel de blandas; no bloquea la publicación. | Media |
| **RF-12** | Versionar el horario, publicar una versión como oficial e impedir publicar una versión con violaciones duras o grupos pendientes. Restaurar una versión anterior como nuevo borrador. | CU-14, CU-15 | Publicar con pendientes se bloquea; restaurar crea borrador. | Alta |
| **RF-13** | Exportar el horario publicado en CSV y PDF. | CU-19 | CSV con una fila por sesión; PDF por impresión. | Media |
| **RF-14** | Generar reportes de utilización de aulas, carga por docente y grupos por debajo del cupo mínimo. | CU-16 | % de ocupación, horas vs. máximo y grupos < 10. | Media |
| **RF-15** | Autenticar usuarios, restringir las operaciones según el rol y registrar en bitácora toda creación, modificación y publicación con usuario y fecha-hora. | CU-01 | Comité no ve el tablero y el servidor rechaza la acción directa. | Alta |
| **RF-16** | Crear periodos académicos (p. ej. 2026-2), cada uno con sus propios parámetros, sin que cambiar uno altere los horarios de otros. | CU-03 | Cambiar parámetros de 2027-1 no altera 2026-2. | Alta |
| **RF-17** | Importar docentes, disponibilidades, cursos y aulas desde CSV con plantilla. Si hay errores no se carga nada y se informan todos con su fila y motivo. | CU-07 | 50 filas con 3 inválidas: no carga nada y lista las 3. | Alta |
| **RF-18** | Registrar la demanda estimada por curso y sugerir el número de grupos (demanda ÷ cupo máximo, hacia arriba); el coordinador puede ajustar la sugerencia dentro del cupo efectivo. | CU-09 | Demanda 130 → 4 grupos; se puede bajar a 3 pero no a 2. | Media |
| **RF-19** | Consultar el horario por docente, aula, curso y nivel. Un docente solo ve su propio horario publicado. | CU-18 | El docente solo ve sus sesiones publicadas. | Media |
| **RF-20** | El Comité Táctico y los Comités de Área registran concepto u observaciones sobre una versión, visibles para el coordinador. | CU-20 | El coordinador ve la observación en la versión. | Media |
| **RF-21** | Registrar inscritos por grupo, señalar los que están bajo el cupo mínimo y permitir cerrarlos, liberando docente y aula. La reubicación de estudiantes se decide fuera del sistema. | CU-17 | Grupo con 8 inscritos se cierra y libera docente y aula. | Media |
| **RF-22** | El administrador crea, desactiva y modifica usuarios y les asigna un rol (coordinador, comité, docente, administrador). | CU-02 | Usuario desactivado no inicia sesión; cambio de rol en bitácora. | Alta |
| **RF-23** | 🆕 **Horario de atención** (pedido en la validación con el profesor Germán Augusto Neuta): cada docente, o el coordinador en su nombre, registra por materia un espacio semanal de 1 o 2 horas (día, hora, lugar) o indica que se acuerda con el docente. No puede cruzarse con sus clases, el almuerzo ni salir de su disponibilidad, y el generador no programa clases encima. | CU-21 | Germán Neuta: Legislación viernes 12–13 y la electiva «acordar con el docente»; 3 h o cruce con su clase se rechazan. | Alta |

**No funcionales (ISO/IEC 25010)**

| RNF | Categoría | Requerimiento | Estado en el prototipo |
|---|---|---|---|
| **RNF-01** | Eficiencia | Generar la propuesta (60 grupos, 30 docentes, 20 aulas) en máx. 60 s y validar un movimiento en menos de 1 s. | ✅ ~70 ms con 161 grupos |
| **RNF-02** | Usabilidad | Un coordinador nuevo arma un horario tras 30 min de inducción; los rechazos se explican en lenguaje del dominio y en español. | ✅ Validado con un tercero |
| **RNF-03** | Mantenibilidad (modularidad) | Las reglas duras viven en un componente aislado: agregar una no toca la interfaz ni la persistencia. | ✅ `core/rules/` |
| **RNF-04** | Mantenibilidad (modificabilidad) | El generador se consume por una interfaz y se puede sustituir sin cambiar quien lo invoca. | ✅ Interfaz `GeneradorHorario` |
| **RNF-05** | Fiabilidad | Ninguna versión publicada tiene violaciones duras; se conservan las anteriores para revertir. | ✅ |
| **RNF-06** | Seguridad | Autenticación, contraseñas con hash y sal, HTTPS, permisos aplicados en el servidor y bitácora no modificable. | 🟡 Simulado en el navegador |
| **RNF-07** | Compatibilidad y portabilidad | Chromium y Firefox desde 1366×768; despliegue reproducible desde configuración. | ✅ Vercel + `npm install` |
| **RNF-08** | Cumplimiento normativo | Datos personales según la Ley 1581 de 2012: solo nombre, identificador, correo institucional, vinculación y disponibilidad. | ✅ Datos ficticios |
| **RNF-09** | Seguridad (integridad) | La base de datos impide con restricciones declarativas dos sesiones del mismo docente o aula en el mismo bloque; mover es atómico. | ⏳ Sprint 5 (BD física) |
| **RNF-10** | Fiabilidad (recuperabilidad) | Procedimiento de respaldo y restauración en máx. 30 min. | ⏳ Sprint 5–6 |

## 🎭 Casos de uso

| CU | Nombre | Actor | Pantalla |
|---|---|---|---|
| CU-01 | Iniciar sesión | Todos | `#/login` |
| CU-02 | Gestionar usuarios y roles | Administrador | `#/usuarios` |
| CU-03 | Configurar periodo académico | Coordinador | `#/periodos` |
| CU-04 | Gestionar docentes | Coordinador | `#/docentes` |
| CU-05 | Registrar disponibilidad | Coordinador, Docente | `#/mi-disponibilidad` |
| CU-06 | Gestionar cursos y aulas | Coordinador | `#/cursos` |
| CU-07 | Importar datos del periodo | Coordinador | `#/importar` |
| CU-08 | Gestionar grupos | Coordinador | `#/grupos` |
| CU-09 | Sugerir número de grupos | Coordinador | `#/grupos` |
| CU-10 | Generar propuesta de horario | Coordinador | `#/tablero` |
| CU-11 | Validar restricciones duras | (incluido) | `#/tablero` |
| CU-12 | Ajustar horario | Coordinador | `#/tablero` |
| CU-13 | Revisar restricciones blandas | Coordinador | `#/tablero` |
| CU-14 | Publicar horario | Coordinador | `#/versiones` |
| CU-15 | Restaurar versión del horario | Coordinador | `#/versiones` |
| CU-16 | Consultar reportes | Coordinador | `#/reportes` |
| CU-17 | Cerrar grupos | Coordinador | `#/inscritos` |
| CU-18 | Consultar horario | Coordinador, Docente, Comité | `#/consulta` |
| CU-19 | Exportar horario | Coordinador | `#/consulta` |
| CU-20 | Registrar observaciones | Comité | `#/revision` |
| CU-21 | Registrar horario de atención | Docente, Coordinador | `#/mi-disponibilidad` |

## 🔗 Trazabilidad con los requerimientos

| Requerimientos | Casos de uso | Pantallas |
|---|---|---|
| RF-01, RF-02, RF-16 | CU-03 | Periodos y parámetros |
| RF-03, RF-04 | CU-04, CU-05 | Docentes · Mi disponibilidad |
| RF-23 | CU-21 | Mi disponibilidad · Docentes → Horario de atención · Mi horario |
| RF-05, RF-06 | CU-06 | Cursos · Aulas |
| RF-17 | CU-07 | Importar datos |
| RF-07, RF-18 | CU-08, CU-09 | Grupos y demanda |
| RF-08 a RF-11 | CU-10 a CU-13 | Tablero del horario |
| RF-12, RF-20 | CU-14, CU-15, CU-20 | Versiones · Revisión (comité) |
| RF-13, RF-19 | CU-18, CU-19 | Consultar horario · Mi horario |
| RF-14, RF-21 | CU-16, CU-17 | Reportes · Inscritos y cierre |
| RF-15, RF-22 | CU-01, CU-02 | Login · Usuarios · Bitácora · Trazabilidad |

La pantalla **Trazabilidad** del prototipo tiene la matriz completa con la prueba de aceptación de cada RF. El guion de pruebas paso a paso (P-01 a P-29) está en [`MANUAL.md`](MANUAL.md) y en PDF en [`docs/`](docs).

## 🧭 Contexto del proyecto y estado

Resumen para retomar el proyecto en las siguientes entregas.

**Caso:** *El Reto de la Programación de Horarios de Clases* (Programa de Ingeniería de Sistemas, UEB). Proyecto Núcleo II, Grupo 7, periodo 2026-2.

**Equipo:** Hernando Javier García Mogollón · Jhonatan Lara Gómez · Juanita Mejía Pineda · Laura Gabriela Díaz Amaya · Santiago Pinzón Vásquez.

### Entregas hechas

| Entrega | Contenido | Estado |
|---|---|---|
| Levantamiento de requerimientos | RF-01 a RF-22, RNF-01 a RNF-10, reglas R1–R9 y B1–B5, matriz caso → requerimientos | ✅ |
| Análisis y diseño | BPMN, casos de uso CU-01 a CU-20, MER, diagrama de clases, arquitectura (Angular + Spring Boot + MySQL) | ✅ |
| Cronograma, recursos y costos | EDT, PERT, Gantt (Excel base del Jira) | ✅ |
| Prototipo de alta fidelidad + validación | Esta app, Jira con épicas e historias enlazadas al prototipo, validación con el profesor **Germán Augusto Neuta** (Legislación) en [video](https://youtu.be/jlXAin0M4f0), documento en Word ([`docs/Grupo7_Prototipo_y_Validacion.docx`](docs/Grupo7_Prototipo_y_Validacion.docx)) y presentación ([`docs/Grupo7_Presentacion_Horarios.pdf`](docs/Grupo7_Presentacion_Horarios.pdf)) | ✅ |

### Jira (proyecto HDC · Horarios de Clases)

- **Épicas de la EDT** (EDT 1 a 6: gestión, requisitos, diseño, construcción, pruebas, cierre) con los hitos H1 a H5 como tareas.
- **Épicas funcionales** EF-01 Acceso y administración · EF-02 Configuración del periodo · EF-03 Catálogo académico · EF-04 Oferta y grupos · **EF-05 Generación y ajuste** · **EF-06 Revisión y publicación** (las dos con ciclo funcional completo) · EF-07 Consulta y exportación · EF-08 Seguimiento.
- Cada historia funcional tiene criterios de aceptación como lista de verificación, RF/CU, responsable, enlace a la pantalla del prototipo y captura de evidencia (en [`docs/evidencias/`](docs/evidencias)).
- **Sprints:** S1 Requisitos (H1), S2 Diseño (H2), S3 Construcción base y S4 Motor y prototipo **finalizados** · **S5 Verificación en curso** · S6 Cierre (H5) pendiente.
- La historia **HDC-86** (RF-23, horario de atención) se creó en S5 a partir de la validación.

### Decisiones tomadas en el prototipo (cambios respecto a los entregables)

| Decisión | Antes | Ahora |
|---|---|---|
| Almuerzo | 12:00–13:00 | **13:00–14:00**, con clases de 11 a 13 |
| Una sesión por grupo y día | No estaba | Regla dura dentro de **R8** |
| Dos docentes distintos en el día | Norma | Restricción blanda **B6** (se acepta si no hay otro docente) |
| Restricciones blandas | B1–B5 | **B1–B6** |
| Horario de atención | No estaba | **RF-23 / CU-21** (pedido en la validación) |
| Backend | Spring Boot + MySQL | Simulado en el navegador (`StoreService` + `localStorage`) para el prototipo |

### Lo que falta (sprints S5 y S6)

- **S5 Verificación:** base de datos física y datos semilla (HDC-9, con RNF-09), plan de pruebas, pruebas de integración y de interfaz, prueba con un juego de datos real del Programa, corrección de defectos y matriz de riesgos.
- **S6 Cierre:** despliegue en ambiente de demostración, documento final en formato IEEE y manual de usuario, capacitación, ensayo y sustentación final (H5).
- Supuestos por confirmar con el cliente y cambios fáciles de hacer: ver [`PENDIENTES.md`](PENDIENTES.md).

## 🛠️ Solución de problemas

| Situación | Qué hacer |
|---|---|
| `npm install` falla por dependencias | Verifica que esté el `.npmrc` y usa Node 20.19+ o 22.12+ |
| «Port 4200 is already in use» | `npm start -- --port 4300` |
| Los datos quedaron raros | **Restablecer datos de demostración** en el login |
| El docente no ve su horario | 2026-2 no tiene horario publicado hasta que la coordinación publica; el botón «Ver mi horario de 2026-1» cambia de periodo |
| El PDF sale cortado | En el diálogo de impresión elige orientación horizontal |

## 📚 Documentos del proyecto

- Levantamiento de requerimientos (RF-01 a RF-22 y RNF con ISO/IEC 25010); RF-23 se agregó después de la validación
- Entregable de análisis y diseño: BPMN, casos de uso CU-01 a CU-20, MER, diagrama de clases y arquitectura (CU-21 se agregó después)
- [Prototipo de alta fidelidad, trazabilidad en Jira y validación con usuario (Word)](docs/Grupo7_Prototipo_y_Validacion.docx) · [Presentación (PDF)](docs/Grupo7_Presentacion_Horarios.pdf) · [Video de la validación](https://youtu.be/jlXAin0M4f0)
- [Manual del prototipo en PDF](docs/Grupo7_Manual_Prototipo_Horarios.pdf)
- Cronograma, recursos y costos (EDT, PERT, Gantt)
- [Manual de usuario y pruebas](MANUAL.md)
- [Pendientes, supuestos y cambios en vivo](PENDIENTES.md)

---

<p align="center">
  <img src="public/ueb-simbolo.png" alt="Universidad El Bosque" width="48"><br>
  <sub>Proyecto Núcleo II · 2026-2 · Universidad El Bosque · Datos de demostración, sin información real de estudiantes ni docentes.</sub>
</p>
