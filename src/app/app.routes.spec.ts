import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { aMe } from '../testing/builders';
import { SessionStore } from './core/auth/session.store';
import { routes } from './app.routes';

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

  it('lets the SUPERADMIN open the platform list', async () => {
    signIn({ rol: 'SUPERADMIN', restauranteId: null });
    const harness = await RouterTestingHarness.create('/plataforma/restaurantes');
    expect(url()).toBe('/plataforma/restaurantes');
    expect(harness.routeNativeElement?.textContent).toContain('Plataforma');
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
