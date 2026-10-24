import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Route,
  Router,
  RouterStateSnapshot,
  Routes,
  provideRouter,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { aMe } from '../testing/builders';
import { SessionStore } from './core/auth/session.store';
import { moduleRoute, routes } from './app.routes';
import { Rol } from './core/auth/auth.types';
import { navEntriesFrom, navFor } from './core/auth/domain/navigation.rules';
import { can, homeFor } from './core/auth/domain/permissions.rules';
import { routeActionGuard } from './core/auth/guards/route-action.guard';
import { subscriptionGuard } from './core/auth/guards/subscription.guard';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const signIn = (overrides: Parameters<typeof aMe>[0] = {}) =>
    TestBed.inject(SessionStore).setUser(aMe(overrides));
  const url = () => TestBed.inject(Router).url;

  it('redirects anonymous users from "" to /login', async () => {
    await RouterTestingHarness.create('/');
    expect(url()).toBe('/login');
  });

  it('renders a not-found page for unknown paths instead of redirecting (no redirect loop)', async () => {
    const harness = await RouterTestingHarness.create('/nope');
    expect(url()).toBe('/nope');
    expect(harness.routeNativeElement?.textContent).toContain('404');
  });

  it.each(['/cocina', '/sin-permiso', '/sin-modulos', '/paywall', '/suspendido'])(
    'sends anonymous users from %s to /login',
    async (target) => {
      await RouterTestingHarness.create(target);
      expect(url()).toBe('/login');
    },
  );

  it('renders a module inside the shell for an allowed role', async () => {
    signIn({ rol: 'ADMINISTRADOR' });
    const harness = await RouterTestingHarness.create('/usuarios');
    expect(url()).toBe('/usuarios');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Módulo en construcción');
    expect(text).toContain('Restaurante y plan');
  });

  it('sends a role without the action to /sin-permiso', async () => {
    signIn({ rol: 'RECEPCION' });
    await RouterTestingHarness.create('/usuarios');
    expect(url()).toBe('/sin-permiso');
  });

  it('keeps tenant users out of platform routes and vice versa', async () => {
    signIn({ rol: 'ADMINISTRADOR' });
    const harness = await RouterTestingHarness.create('/plataforma/restaurantes');
    expect(url()).toBe('/sin-permiso');
    TestBed.inject(SessionStore).setUser(aMe({ rol: 'SUPERADMIN', restauranteId: null }));
    await harness.navigateByUrl('/pedidos/nuevo');
    expect(url()).toBe('/sin-permiso');
  });

  it('lets the tenant ADMINISTRADOR open Restaurante y plan', async () => {
    signIn({ rol: 'ADMINISTRADOR' });
    const harness = await RouterTestingHarness.create('/restaurante');
    expect(url()).toBe('/restaurante');
    expect(harness.routeNativeElement?.textContent).toContain('Restaurante y plan');
  });

  it.each(['RECEPCION', 'COCINERO'] as const)('keeps %s out of Restaurante y plan', async (rol) => {
    signIn({ rol });
    await RouterTestingHarness.create('/restaurante');
    expect(url()).toBe('/sin-permiso');
  });

  it('lets the tenant ADMINISTRADOR open Reportes', async () => {
    signIn({ rol: 'ADMINISTRADOR' });
    const harness = await RouterTestingHarness.create('/reportes');
    expect(url()).toBe('/reportes');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Reportes');
  });

  it.each(['RECEPCION', 'COCINERO', 'CAJERO'] as const)('keeps %s out of Reportes', async (rol) => {
    signIn({ rol });
    await RouterTestingHarness.create('/reportes');
    expect(url()).toBe('/sin-permiso');
  });

  it('declares /reportes with its permission and a chart entry between Catálogo and Usuarios', () => {
    const reportes = shellChild('reportes');
    expect(reportes.canActivate).toEqual([routeActionGuard]);
    expect(reportes.data).toMatchObject({
      action: 'reportes.ver',
      nav: { label: 'Reportes', icon: 'chart' },
    });
    const labels = navEntriesFrom(routes).map((e) => e.label);
    expect(labels.indexOf('Reportes')).toBe(labels.indexOf('Catálogo') + 1);
    expect(labels.indexOf('Usuarios')).toBe(labels.indexOf('Reportes') + 1);
  });

  it('lets the SUPERADMIN open the platform list', async () => {
    signIn({ rol: 'SUPERADMIN', restauranteId: null });
    const harness = await RouterTestingHarness.create('/plataforma/restaurantes');
    expect(url()).toBe('/plataforma/restaurantes');
    expect(harness.routeNativeElement?.textContent).toContain('Plataforma');
  });

  it.each(['SUPERADMIN', 'ADMIN'] as const)(
    'lets platform %s open Crear restaurante',
    async (rol) => {
      signIn({ rol, restauranteId: null });
      await RouterTestingHarness.create('/plataforma/restaurantes/nuevo');
      expect(url()).toBe('/plataforma/restaurantes/nuevo');
    },
  );

  it('moduleRoute keeps the permission guard first when extra guards are added', () => {
    const extra = () => true;
    expect(moduleRoute('pagos.registrar', 'Caja', 'wallet', [extra]).canActivate).toEqual([
      routeActionGuard,
      extra,
    ]);
  });

  it('moduleRoute can swap the placeholder for a real page without dropping the permission guard', () => {
    const load = () => Promise.resolve(class {});
    const route = moduleRoute('cocina.ver', 'Cocina', 'flame', [], load);
    expect(route.loadComponent).toBe(load);
    expect(route.canActivate).toEqual([routeActionGuard]);
  });

  it('/cocina has no subscriptionGuard (marking LISTO is allowed under 402) and loads the board page', async () => {
    const shell = routes.find((r) => (r.children?.length ?? 0) > 0)!;
    const cocina = shell.children!.find((r) => r.path === 'cocina')!;
    expect(cocina.canActivate).toEqual([routeActionGuard]);
    const page = await (cocina.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/CocinaPage$/);
  });

  it('/caja loads the cashier page with no subscriptionGuard (payments pass while blocked) and keeps its sidebar entry', async () => {
    const caja = shellChild('caja');
    expect(caja.canActivate).toEqual([routeActionGuard]);
    expect(caja.data).toMatchObject({
      action: 'pagos.registrar',
      nav: { label: 'Caja', icon: 'wallet' },
    });
    const page = await (caja.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/CajaPage$/);
  });

  it('moduleRoute without an icon declares the permission and title but no sidebar entry', () => {
    const route = moduleRoute('pedidos.gestionar', 'Nuevo pedido', null);
    expect(route.data).toEqual({ action: 'pedidos.gestionar', title: 'Nuevo pedido' });
    expect(navEntriesFrom([{ path: 'x', ...route }])).toEqual([]);
  });

  const shellChild = (path: string): Route => {
    const shell = routes.find((r) => (r.children?.length ?? 0) > 0)!;
    return shell.children!.find((r) => r.path === path)!;
  };

  it('/pedidos is the single "Pedidos" sidebar entry, with no subscriptionGuard (a blocked tenant still closes orders)', async () => {
    const pedidos = shellChild('pedidos');
    expect(pedidos.canActivate).toEqual([routeActionGuard]);
    expect(pedidos.data).toMatchObject({
      action: 'pedidos.gestionar',
      nav: { label: 'Pedidos', icon: 'receipt' },
    });
    const page = await (pedidos.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/PedidosPage$/);
    expect(navEntriesFrom(routes).filter((e) => e.label === 'Pedidos')).toHaveLength(1);
  });

  it('/pedidos/nuevo loads the new-order page behind the permission and subscription guards, without a sidebar entry', async () => {
    const nuevo = shellChild('pedidos/nuevo');
    // Creating an order is the one pedidos write a lapsed tenant cannot do (402), so only this route is guarded.
    expect(nuevo.canActivate).toEqual([routeActionGuard, subscriptionGuard]);
    expect(nuevo.data).toEqual({ action: 'pedidos.gestionar', title: 'Nuevo pedido' });
    const page = await (nuevo.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/NuevoPedidoPage$/);
  });

  it('/pedidos keeps no subscriptionGuard next to the guarded /pedidos/nuevo', () => {
    expect(shellChild('pedidos').canActivate).not.toContain(subscriptionGuard);
    expect(shellChild('pedidos/nuevo').canActivate).toContain(subscriptionGuard);
  });

  it('/plataforma/restaurantes loads the restaurants list page behind the permission guard and keeps its sidebar entry', async () => {
    const lista = shellChild('plataforma/restaurantes');
    expect(lista.canActivate).toEqual([routeActionGuard]);
    expect(lista.data).toMatchObject({
      action: 'plataforma.restaurantes.ver',
      nav: { label: 'Restaurantes', icon: 'building' },
    });
    const page = await (lista.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/RestaurantesPage$/);
  });

  it('/plataforma/restaurantes/nuevo loads the create-restaurant page behind the permission guard, without a sidebar entry change', async () => {
    const nuevo = shellChild('plataforma/restaurantes/nuevo');
    expect(nuevo.canActivate).toEqual([routeActionGuard]);
    expect(nuevo.data).toMatchObject({
      action: 'plataforma.restaurantes.crear',
      nav: { label: 'Crear restaurante', icon: 'plus' },
    });
    const page = await (nuevo.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/CrearRestaurantePage$/);
  });

  it('/catalogo loads the menu page with no subscriptionGuard (reads must work while blocked) and keeps its sidebar entry', async () => {
    const catalogo = shellChild('catalogo');
    expect(catalogo.canActivate).toEqual([routeActionGuard]);
    expect(catalogo.data).toMatchObject({
      action: 'catalogo.ver',
      nav: { label: 'Catálogo', icon: 'book' },
    });
    const page = await (catalogo.loadComponent as () => Promise<{ name: string }>)();
    expect(page.name).toMatch(/CatalogoPage$/);
  });

  // Regression: the paywall's read-only exit goes to homeFor(user); a guarded home bounced blocked tenants back to it.
  it.each(['ADMINISTRADOR', 'RECEPCION', 'COCINERO', 'MESERO', 'CAJERO', 'REPARTIDOR'] as const)(
    'the home of a %s tenant carries no subscriptionGuard (a blocked tenant can always reach it)',
    (rol) => {
      const home = homeFor(aMe({ rol })).slice(1);
      const route = shellChild(home);
      expect(route).toBeDefined();
      expect(route.canActivate ?? []).not.toContain(subscriptionGuard);
    },
  );

  it('renders the 403 page with a button to the role home', async () => {
    signIn({ rol: 'RECEPCION' });
    const harness = await RouterTestingHarness.create('/sin-permiso');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('403 · SIN PERMISO');
    expect(text).toContain('Ir a Pedidos');
  });

  it('shows the paywall to the tenant administrator', async () => {
    signIn({ rol: 'ADMINISTRADOR' });
    const harness = await RouterTestingHarness.create('/paywall');
    expect(url()).toBe('/paywall');
    expect(harness.routeNativeElement?.textContent).toContain('Renovar suscripción');
  });

  it('keeps the paywall away from roles that cannot renew', async () => {
    signIn({ rol: 'RECEPCION' });
    await RouterTestingHarness.create('/paywall');
    expect(url()).toBe('/sin-permiso');
  });
});

describe('routes as the single source of module permissions', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  const entries = navEntriesFrom(routes);
  const ROLES: readonly (readonly [Rol, number | null])[] = [
    ['ADMINISTRADOR', 7],
    ['RECEPCION', 7],
    ['COCINERO', 7],
    ['MESERO', 7],
    ['CAJERO', 7],
    ['REPARTIDOR', 7],
    ['SUPERADMIN', null],
    ['ADMIN', null],
    ['MODERADOR', null],
  ];

  /** Module routes = routes declaring data.action, with their absolute path. */
  const moduleRoutes = (): { path: string; route: Route }[] => {
    const out: { path: string; route: Route }[] = [];
    const walk = (list: Routes, prefix: string) => {
      for (const route of list) {
        const path = [prefix, route.path].filter((s) => s).join('/');
        if (route.data?.['action']) {
          out.push({ path: '/' + path, route });
        }
        walk(route.children ?? [], path);
      }
    };
    walk(routes, '');
    return out;
  };

  const enterable = (route: Route, user: ReturnType<typeof aMe>): boolean => {
    TestBed.inject(SessionStore).setUser(user);
    const result = TestBed.runInInjectionContext(() =>
      routeActionGuard(
        { data: route.data } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    return result === true;
  };

  it.each(ROLES)('menu == enterable modules for %s', (rol, restauranteId) => {
    const user = aMe({ rol, restauranteId });
    const visible = navFor(user, entries).map((e) => e.route);
    for (const path of visible) {
      const found = moduleRoutes().find((m) => m.path === path);
      expect(found, path).toBeDefined();
      expect(enterable(found!.route, user), `${rol} should enter ${path}`).toBe(true);
    }
    // 'Crear restaurante' is intentionally hidden for SUPERADMIN, who reaches it from the list screen.
    for (const { path, route } of moduleRoutes()) {
      const intentionallyHidden =
        path === '/plataforma/restaurantes/nuevo' && visible.includes('/plataforma/restaurantes');
      if (route.data!['nav'] === undefined) {
        // Routes without a sidebar entry (e.g. /pedidos/nuevo) are enterable exactly when the action is allowed.
        expect(enterable(route, user), `${rol} on nav-less ${path}`).toBe(can(user, route.data!['action']));
      } else if (!visible.includes(path) && !intentionallyHidden) {
        expect(enterable(route, user), `${rol} must not enter hidden ${path}`).toBe(false);
      }
    }
  });

  it.each(ROLES)(
    'homeFor(%s) targets an existing route the role can enter',
    (rol, restauranteId) => {
      const user = aMe({ rol, restauranteId });
      const home = homeFor(user);
      const found = moduleRoutes().find((m) => m.path === home);
      if (found) {
        expect(enterable(found.route, user)).toBe(true);
        expect(can(user, found.route.data!['action'])).toBe(true);
      } else {
        // Not a permissioned module: must still be a declared route (e.g. /sin-modulos).
        expect(JSON.stringify(routes)).toContain(`"path":"${home.slice(1)}"`);
      }
    },
  );
});
