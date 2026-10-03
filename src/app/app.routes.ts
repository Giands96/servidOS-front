import { Routes } from '@angular/router';
import { guestGuard } from './core/auth/guards/guest.guard';
import { homeRedirectGuard } from './core/auth/guards/home-redirect.guard';

// Placeholder routes: feature routes are added from Phase 2 on.
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'sin-permiso',
    loadComponent: () => import('./shared/pages/sin-permiso.page').then((m) => m.SinPermisoPage),
  },
  {
    path: 'sin-modulos',
    loadComponent: () => import('./shared/pages/sin-modulos.page').then((m) => m.SinModulosPage),
  },
  {
    path: 'paywall',
    loadComponent: () => import('./shared/pages/paywall.page').then((m) => m.PaywallPage),
  },
  {
    path: 'suspendido',
    loadComponent: () => import('./shared/pages/suspendido.page').then((m) => m.SuspendidoPage),
  },
  { path: '**', redirectTo: '' },
];
