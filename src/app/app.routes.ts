import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { homeRedirectGuard } from './core/auth/guards/home-redirect.guard';
import { roleGuard } from './core/auth/guards/role.guard';

const placeholder = () => import('./shared/pages/module-placeholder.page').then((m) => m.ModulePlaceholderPage);

/*
 * Module routes below are placeholders replaced in later phases.
 * Write modules (pedidos, caja, usuarios, catalogo editing) add subscriptionGuard when they are built.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell.layout').then((m) => m.ShellLayout),
    children: [
      { path: 'pedidos/nuevo', canActivate: [roleGuard('pedidos.gestionar')], loadComponent: placeholder, data: { title: 'Pedidos' } },
      { path: 'cocina', canActivate: [roleGuard('cocina.ver')], loadComponent: placeholder, data: { title: 'Cocina' } },
      { path: 'caja', canActivate: [roleGuard('pagos.registrar')], loadComponent: placeholder, data: { title: 'Caja' } },
      { path: 'catalogo', canActivate: [roleGuard('catalogo.ver')], loadComponent: placeholder, data: { title: 'Catálogo' } },
      { path: 'usuarios', canActivate: [roleGuard('usuarios.gestionar')], loadComponent: placeholder, data: { title: 'Usuarios' } },
      {
        path: 'restaurante',
        canActivate: [roleGuard('restaurante.ver')],
        loadComponent: placeholder,
        data: { title: 'Restaurante y plan' },
      },
      {
        path: 'plataforma/restaurantes',
        pathMatch: 'full',
        canActivate: [roleGuard('plataforma.restaurantes.ver')],
        loadComponent: placeholder,
        data: { title: 'Restaurantes' },
      },
      {
        path: 'plataforma/restaurantes/nuevo',
        canActivate: [roleGuard('plataforma.restaurantes.crear')],
        loadComponent: placeholder,
        data: { title: 'Crear restaurante' },
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
        canActivate: [roleGuard('restaurante.suscripcion.gestionar')],
        loadComponent: () => import('./features/restaurante/paywall.page').then((m) => m.PaywallPage),
      },
      {
        path: 'suspendido',
        loadComponent: () => import('./shared/pages/suspendido.page').then((m) => m.SuspendidoPage),
      },
    ],
  },
  // Render instead of redirecting to '': a redirect loops while a role's home route does not exist.
  {
    path: '**',
    loadComponent: () => import('./shared/pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
