import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { aMe } from '../../../../testing/builders';
import { ResumenSuscripcion, Rol } from '../auth.types';
import { SessionStore } from '../session.store';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { roleGuard } from './role.guard';
import { routeActionGuard } from './route-action.guard';
import { subscriptionGuard } from './subscription.guard';

type GuardResult = boolean | UrlTree;

async function run(guard: CanActivateFn, data: Record<string, unknown> = {}): Promise<GuardResult> {
  const result = TestBed.runInInjectionContext(() =>
    guard({ data } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
  return (isObservable(result) ? firstValueFrom(result as Observable<GuardResult>) : result) as GuardResult;
}

describe('route guards', () => {
  let store: SessionStore;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  const signIn = (rol: Rol, restauranteId: number | null = 7) => store.setUser(aMe({ rol, restauranteId }));
  const urlOf = (result: GuardResult) => (result instanceof UrlTree ? result.toString() : result);

  describe('authGuard', () => {
    it('allows an authenticated user', async () => {
      signIn('ADMINISTRADOR');
      expect(await run(authGuard)).toBe(true);
    });

    it('redirects anonymous users to /login', async () => {
      expect(urlOf(await run(authGuard))).toBe('/login');
    });
  });

  describe('guestGuard', () => {
    it('allows anonymous users', async () => {
      expect(await run(guestGuard)).toBe(true);
    });

    it('redirects an authenticated user to their home', async () => {
      signIn('RECEPCION');
      expect(urlOf(await run(guestGuard))).toBe('/pedidos');
    });
  });

  describe('roleGuard', () => {
    it('allows when the action is permitted', async () => {
      signIn('ADMINISTRADOR');
      expect(await run(roleGuard('pedidos.gestionar'))).toBe(true);
    });

    it('allows RECEPCION on pedidos.gestionar', async () => {
      signIn('RECEPCION');
      expect(await run(roleGuard('pedidos.gestionar'))).toBe(true);
    });

    it.each(['cocina.ver', 'catalogo.disponibilidad'] as const)('allows COCINERO on %s', async (action) => {
      signIn('COCINERO');
      expect(await run(roleGuard(action))).toBe(true);
    });

    it('denies COCINERO on catalogo.editar', async () => {
      signIn('COCINERO');
      expect(urlOf(await run(roleGuard('catalogo.editar')))).toBe('/sin-permiso');
    });

    it.each(['ADMINISTRADOR', 'RECEPCION', 'CAJERO'] as const)('allows %s on pagos.registrar', async (rol) => {
      signIn(rol);
      expect(await run(roleGuard('pagos.registrar'))).toBe(true);
    });

    it('sends MESERO on pagos.registrar to /sin-permiso', async () => {
      signIn('MESERO');
      expect(urlOf(await run(roleGuard('pagos.registrar')))).toBe('/sin-permiso');
    });

    it('sends anonymous users to /sin-permiso', async () => {
      expect(urlOf(await run(roleGuard('catalogo.ver')))).toBe('/sin-permiso');
    });
  });

  describe('routeActionGuard', () => {
    it('allows when the route action is permitted', async () => {
      signIn('RECEPCION');
      expect(await run(routeActionGuard, { action: 'pedidos.gestionar' })).toBe(true);
    });

    it('sends a role without the route action to /sin-permiso', async () => {
      signIn('COCINERO');
      expect(urlOf(await run(routeActionGuard, { action: 'pagos.registrar' }))).toBe('/sin-permiso');
    });

    it('fails closed when the route declares no action', async () => {
      signIn('ADMINISTRADOR');
      expect(urlOf(await run(routeActionGuard, {}))).toBe('/sin-permiso');
    });

    it('sends anonymous users to /sin-permiso', async () => {
      expect(urlOf(await run(routeActionGuard, { action: 'catalogo.ver' }))).toBe('/sin-permiso');
    });
  });

  describe('subscriptionGuard', () => {
    const base = aMe().suscripcion!;
    const withSubscription = (overrides: Partial<ResumenSuscripcion>) => ({
      suscripcion: { ...base, ...overrides },
    });

    // The decision comes from the session user (GET /auth/me); the guard makes no HTTP call
    // (ctrl.verify() in afterEach fails on any unexpected request).
    const blockedCases = [
      ['restaurant INACTIVO', { restauranteEstado: 'INACTIVO' }],
      ['no subscription', { suscripcion: null }],
      ['ACTIVA vencida', withSubscription({ estado: 'ACTIVA', vencida: true })],
      ['CANCELADA vencida', withSubscription({ estado: 'CANCELADA', vencida: true })],
    ] as const;

    it.each(blockedCases)('sends an ADMINISTRADOR with %s to /paywall', async (_name, overrides) => {
      store.setUser(aMe({ rol: 'ADMINISTRADOR', ...overrides }));
      expect(urlOf(await run(subscriptionGuard))).toBe('/paywall');
    });

    it.each(blockedCases)('sends a non-admin with %s to /suspendido', async (_name, overrides) => {
      store.setUser(aMe({ rol: 'MESERO', ...overrides }));
      expect(urlOf(await run(subscriptionGuard))).toBe('/suspendido');
    });

    it('allows a healthy tenant (ACTIVO + ACTIVA, not vencida)', async () => {
      signIn('ADMINISTRADOR');
      expect(await run(subscriptionGuard)).toBe(true);
    });

    it('allows CANCELADA while not vencida (operates until fechaFin)', async () => {
      store.setUser(aMe({ ...withSubscription({ estado: 'CANCELADA', vencida: false }) }));
      expect(await run(subscriptionGuard)).toBe(true);
    });

    it('allows a platform session (no tenant to block)', async () => {
      store.setUser(
        aMe({ rol: 'SUPERADMIN', restauranteId: null, restauranteEstado: null, suscripcion: null }),
      );
      expect(await run(subscriptionGuard)).toBe(true);
    });
  });
});
