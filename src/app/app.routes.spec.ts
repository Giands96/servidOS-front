import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { aMe } from '../testing/builders';
import { SessionStore } from './core/auth/session.store';
import { moduleRoute, routes } from './app.routes';
import { Rol } from './core/auth/auth.types';
import { navEntriesFrom, navFor } from './core/auth/domain/navigation.rules';
import { can, homeFor } from './core/auth/domain/permissions.rules';
import { routeActionGuard } from './core/auth/guards/route-action.guard';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const signIn = (overrides: Parameters<typeof aMe>[0] = {}) => TestBed.inject(SessionStore).setUser(aMe(overrides));
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
    const harness = await RouterTestingHarness.create('/caja');
    expect(url()).toBe('/caja');
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

  it('lets the SUPERADMIN open the platform list', async () => {
    signIn({ rol: 'SUPERADMIN', restauranteId: null });
    const harness = await RouterTestingHarness.create('/plataforma/restaurantes');
    expect(url()).toBe('/plataforma/restaurantes');
    expect(harness.routeNativeElement?.textContent).toContain('Plataforma');
  });

  it.each(['SUPERADMIN', 'ADMIN'] as const)('lets platform %s open Crear restaurante', async (rol) => {
    signIn({ rol, restauranteId: null });
    await RouterTestingHarness.create('/plataforma/restaurantes/nuevo');
    expect(url()).toBe('/plataforma/restaurantes/nuevo');
  });

  it('moduleRoute keeps the permission guard first when extra guards are added', () => {
    const extra = () => true;
    expect(moduleRoute('pagos.registrar', 'Caja', 'wallet', [extra]).canActivate).toEqual([routeActionGuard, extra]);
  });

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
      routeActionGuard({ data: route.data } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
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
      if (!visible.includes(path) && !intentionallyHidden) {
        expect(enterable(route, user), `${rol} must not enter hidden ${path}`).toBe(false);
      }
    }
  });

  it.each(ROLES)('homeFor(%s) targets an existing route the role can enter', (rol, restauranteId) => {
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
  });
});
