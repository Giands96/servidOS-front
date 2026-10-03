import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('redirects anonymous users from "" to /login', async () => {
    await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('redirects unknown paths through "" to /login', async () => {
    await RouterTestingHarness.create('/nope');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it.each(['/sin-permiso', '/sin-modulos', '/paywall', '/suspendido'])('renders placeholder %s', async (url) => {
    const harness = await RouterTestingHarness.create(url);
    expect(harness.routeNativeElement?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
