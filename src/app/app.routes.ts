import { Routes } from '@angular/router';
import { autenticado, conRol, redirigirPorRol } from './core/guards';
import { Login } from './features/auth/login';
import { Shell } from './layout/shell';

const COORD = conRol('COORDINADOR');

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Iniciar sesión · Horarios UEB' },
  {
    path: '',
    component: Shell,
    canActivate: [autenticado],
    children: [
      { path: '', pathMatch: 'full', canActivate: [redirigirPorRol], children: [] },
      { path: 'inicio', canActivate: [COORD], title: 'Inicio · Horarios UEB', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'periodos', canActivate: [conRol('COORDINADOR', 'ADMINISTRADOR')], title: 'Periodos · Horarios UEB', loadComponent: () => import('./features/periodos/periodos').then((m) => m.Periodos) },
      { path: 'docentes', canActivate: [COORD], title: 'Docentes · Horarios UEB', loadComponent: () => import('./features/docentes/docentes').then((m) => m.Docentes) },
      { path: 'cursos', canActivate: [COORD], title: 'Cursos · Horarios UEB', loadComponent: () => import('./features/cursos/cursos').then((m) => m.Cursos) },
      { path: 'aulas', canActivate: [COORD], title: 'Aulas · Horarios UEB', loadComponent: () => import('./features/aulas/aulas').then((m) => m.Aulas) },
      { path: 'grupos', canActivate: [COORD], title: 'Grupos · Horarios UEB', loadComponent: () => import('./features/grupos/grupos').then((m) => m.Grupos) },
      { path: 'importar', canActivate: [COORD], title: 'Importar · Horarios UEB', loadComponent: () => import('./features/importar/importar').then((m) => m.Importar) },
      { path: 'tablero', canActivate: [COORD], title: 'Tablero · Horarios UEB', loadComponent: () => import('./features/tablero/tablero').then((m) => m.Tablero) },
      { path: 'versiones', canActivate: [COORD], title: 'Versiones · Horarios UEB', loadComponent: () => import('./features/versiones/versiones').then((m) => m.Versiones) },
      { path: 'consulta', canActivate: [conRol('COORDINADOR', 'COMITE', 'ADMINISTRADOR')], title: 'Consulta · Horarios UEB', loadComponent: () => import('./features/consulta/consulta').then((m) => m.Consulta) },
      { path: 'reportes', canActivate: [COORD], title: 'Reportes · Horarios UEB', loadComponent: () => import('./features/reportes/reportes').then((m) => m.Reportes) },
      { path: 'inscritos', canActivate: [COORD], title: 'Inscritos · Horarios UEB', loadComponent: () => import('./features/inscritos/inscritos').then((m) => m.Inscritos) },
      { path: 'bitacora', canActivate: [conRol('COORDINADOR', 'ADMINISTRADOR')], title: 'Bitácora · Horarios UEB', loadComponent: () => import('./features/bitacora/bitacora').then((m) => m.Bitacora) },
      { path: 'usuarios', canActivate: [conRol('ADMINISTRADOR')], title: 'Usuarios · Horarios UEB', loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios) },
      { path: 'revision', canActivate: [conRol('COMITE')], title: 'Revisión · Horarios UEB', loadComponent: () => import('./features/revision/revision').then((m) => m.Revision) },
      { path: 'mi-horario', canActivate: [conRol('DOCENTE')], title: 'Mi horario · Horarios UEB', loadComponent: () => import('./features/docente/mi-horario').then((m) => m.MiHorario) },
      { path: 'mi-disponibilidad', canActivate: [conRol('DOCENTE')], title: 'Mi disponibilidad · Horarios UEB', loadComponent: () => import('./features/docente/mi-disponibilidad').then((m) => m.MiDisponibilidad) },
      { path: 'trazabilidad', title: 'Trazabilidad · Horarios UEB', loadComponent: () => import('./features/trazabilidad/trazabilidad').then((m) => m.Trazabilidad) },
    ],
  },
  { path: '**', redirectTo: '' },
];
