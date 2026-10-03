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
import { aMe, anApiError } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { Rol } from '../auth.types';
import { SessionStore } from '../session.store';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { roleGuard } from './role.guard';
import { subscriptionGuard } from './subscription.guard';

type GuardResult = boolean | UrlTree;

async function run(guard: CanActivateFn): Promise<GuardResult> {
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
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
      expect(urlOf(await run(guestGuard))).toBe('/cocina');
    });
  });

  describe('roleGuard', () => {
    it('allows when the action is permitted', async () => {
      signIn('ADMINISTRADOR');
      expect(await run(roleGuard('pedidos.gestionar'))).toBe(true);
    });

    it('sends RECEPCION on pedidos.gestionar to /sin-permiso', async () => {
      signIn('RECEPCION');
      expect(urlOf(await run(roleGuard('pedidos.gestionar')))).toBe('/sin-permiso');
    });

    it('sends anonymous users to /sin-permiso', async () => {
      expect(urlOf(await run(roleGuard('catalogo.ver')))).toBe('/sin-permiso');
    });
  });

  describe('subscriptionGuard', () => {
    const subscription = (estado: 'ACTIVA' | 'CANCELADA') => ({
      suscripcionId: 1,
      restauranteId: 7,
      planId: 1,
      estado,
      fechaInicio: '2026-01-01',
      fechaFin: '2026-02-01',
    });
    const check = async (respond: (req: ReturnType<typeof expectApi>) => void): Promise<GuardResult> => {
      const pending = run(subscriptionGuard);
      respond(expectApi(ctrl, 'GET', '/restaurantes/actual/suscripcion'));
      return pending;
    };

    it('allows an ACTIVA subscription', async () => {
      signIn('ADMINISTRADOR');
      expect(await check((r) => r.flush(subscription('ACTIVA')))).toBe(true);
    });

    it('sends an ADMINISTRADOR with CANCELADA to /paywall', async () => {
      signIn('ADMINISTRADOR');
      expect(urlOf(await check((r) => r.flush(subscription('CANCELADA'))))).toBe('/paywall');
    });

    it('sends a non-admin with CANCELADA to /suspendido', async () => {
      signIn('MESERO');
      expect(urlOf(await check((r) => r.flush(subscription('CANCELADA'))))).toBe('/suspendido');
    });

    it('fails open on request error (the backend still enforces 402)', async () => {
      signIn('ADMINISTRADOR');
      const result = await check((r) =>
        r.flush(anApiError(500, 'boom'), { status: 500, statusText: 'Server Error' }),
      );
      expect(result).toBe(true);
    });
  });
});
