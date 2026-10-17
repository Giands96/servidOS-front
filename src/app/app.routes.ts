import { CanActivateFn, Route, Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { homeRedirectGuard } from './core/auth/guards/home-redirect.guard';
import { NavIcon, routeAccess } from './core/auth/domain/navigation.rules';
import { Action } from './core/auth/domain/permissions.rules';
import { roleGuard } from './core/auth/guards/role.guard';
import { routeActionGuard } from './core/auth/guards/route-action.guard';
import { subscriptionGuard } from './core/auth/guards/subscription.guard';

const placeholder = () =>
  import('./shared/pages/module-placeholder.page').then((m) => m.ModulePlaceholderPage);

/**
 * Placeholder module route: the permission is declared once, in data, and read by the guard and the sidebar.
 * A `null` icon declares a route without a sidebar entry (reached from another screen, e.g. /pedidos/nuevo).
 * Extra guards (e.g. subscriptionGuard for write modules) go in `guards`, never in a `canActivate` override
 * after the spread: that would silently drop the permission guard.
 */
export const moduleRoute = (
  action: Action,
  label: string,
  icon: NavIcon | null,
  guards: CanActivateFn[] = [],
  load: Route['loadComponent'] = placeholder,
): Pick<Route, 'canActivate' | 'loadComponent' | 'data'> => ({
  canActivate: [routeActionGuard, ...guards],
  loadComponent: load,
  data: routeAccess({ action, ...(icon === null ? {} : { nav: { label, icon } }), title: label }),
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
      // No subscriptionGuard on the list: confirming, advancing and cancelling pass while the tenant is blocked (402
      // only hits POST /pedidos). The guard sits on /pedidos/nuevo, the one screen that creates orders.
      {
        path: 'pedidos',
        pathMatch: 'full',
        ...moduleRoute('pedidos.gestionar', 'Pedidos', 'receipt', [], () =>
          import('./features/pedidos/pedidos.page').then((m) => m.PedidosPage),
        ),
      },
      {
        path: 'pedidos/nuevo',
        ...moduleRoute('pedidos.gestionar', 'Nuevo pedido', null, [subscriptionGuard], () =>
          import('./features/pedidos/nuevo-pedido.page').then((m) => m.NuevoPedidoPage),
        ),
      },
      // No subscriptionGuard: marking LISTO is allowed while the subscription is blocked (402 does not apply).
      {
        path: 'cocina',
        ...moduleRoute('cocina.ver', 'Cocina', 'flame', [], () =>
          import('./features/cocina/cocina.page').then((m) => m.CocinaPage),
        ),
      },
      // No subscriptionGuard: charging passes while the tenant is blocked (contract §5).
      {
        path: 'caja',
        ...moduleRoute('pagos.registrar', 'Caja', 'wallet', [], () =>
          import('./features/pagos/caja.page').then((m) => m.CajaPage),
        ),
      },
      // No subscriptionGuard: reading the menu works while the tenant is blocked (402 only hits the writes).
      {
        path: 'catalogo',
        ...moduleRoute('catalogo.ver', 'Catálogo', 'book', [], () =>
          import('./features/catalogo/catalogo.page').then((m) => m.CatalogoPage),
        ),
      },
      { path: 'usuarios', ...moduleRoute('usuarios.gestionar', 'Usuarios', 'users') },
      // Plan/subscription management screen: tenant ADMINISTRADOR only (user decision 2026-10-03).
      {
        path: 'restaurante',
        ...moduleRoute('restaurante.suscripcion.gestionar', 'Restaurante y plan', 'store'),
      },
      {
        path: 'plataforma/restaurantes',
        pathMatch: 'full',
        ...moduleRoute('plataforma.restaurantes.ver', 'Restaurantes', 'building', [], () =>
          import('./features/plataforma/restaurantes.page').then((m) => m.RestaurantesPage),
        ),
      },
      {
        path: 'plataforma/restaurantes/nuevo',
        ...moduleRoute('plataforma.restaurantes.crear', 'Crear restaurante', 'plus', [], () =>
          import('./features/plataforma/crear-restaurante.page').then((m) => m.CrearRestaurantePage),
        ),
      },
      {
        path: 'sin-permiso',
        loadComponent: () =>
          import('./shared/pages/sin-permiso.page').then((m) => m.SinPermisoPage),
      },
      {
        path: 'sin-modulos',
        loadComponent: () =>
          import('./shared/pages/sin-modulos.page').then((m) => m.SinModulosPage),
      },
      {
        path: 'paywall',
        canActivate: [roleGuard('restaurante.suscripcion.gestionar')],
        loadComponent: () =>
          import('./features/restaurante/paywall.page').then((m) => m.PaywallPage),
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
