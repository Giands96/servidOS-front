import { CanActivateFn, Route, Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { homeRedirectGuard } from './core/auth/guards/home-redirect.guard';
import { NavIcon, routeAccess } from './core/auth/domain/navigation.rules';
import { Action } from './core/auth/domain/permissions.rules';
import { roleGuard } from './core/auth/guards/role.guard';
import { routeActionGuard } from './core/auth/guards/route-action.guard';

const placeholder = () => import('./shared/pages/module-placeholder.page').then((m) => m.ModulePlaceholderPage);

/**
 * Placeholder module route: the permission is declared once, in data, and read by the guard and the sidebar.
 * Extra guards (e.g. subscriptionGuard for write modules) go in `guards`, never in a `canActivate` override
 * after the spread: that would silently drop the permission guard.
 */
export const moduleRoute = (
  action: Action,
  label: string,
  icon: NavIcon,
  guards: CanActivateFn[] = [],
): Pick<Route, 'canActivate' | 'loadComponent' | 'data'> => ({
  canActivate: [routeActionGuard, ...guards],
  loadComponent: placeholder,
  data: routeAccess({ action, nav: { label, icon }, title: label }),
});

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
      { path: 'pedidos/nuevo', ...moduleRoute('pedidos.gestionar', 'Pedidos', 'receipt') },
      { path: 'cocina', ...moduleRoute('cocina.ver', 'Cocina', 'flame') },
      { path: 'caja', ...moduleRoute('pagos.registrar', 'Caja', 'wallet') },
      { path: 'catalogo', ...moduleRoute('catalogo.ver', 'Catálogo', 'book') },
      { path: 'usuarios', ...moduleRoute('usuarios.gestionar', 'Usuarios', 'users') },
      // Plan/subscription management screen: tenant ADMINISTRADOR only (user decision 2026-10-03).
      {
        path: 'restaurante',
        ...moduleRoute('restaurante.suscripcion.gestionar', 'Restaurante y plan', 'store'),
      },
      {
        path: 'plataforma/restaurantes',
        pathMatch: 'full',
        ...moduleRoute('plataforma.restaurantes.ver', 'Restaurantes', 'building'),
      },
      {
        path: 'plataforma/restaurantes/nuevo',
        ...moduleRoute('plataforma.restaurantes.crear', 'Crear restaurante', 'plus'),
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
