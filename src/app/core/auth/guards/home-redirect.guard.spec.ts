import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { aMe } from '../../../../testing/builders';
import { SessionStore } from '../session.store';
import { homeRedirectGuard } from './home-redirect.guard';

describe('homeRedirectGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const run = () =>
    TestBed.runInInjectionContext(() =>
      homeRedirectGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as UrlTree;

  it('redirects anonymous users to /login', () => {
    expect(run().toString()).toBe('/login');
  });

  it('redirects a signed-in user to their home', () => {
    TestBed.inject(SessionStore).setUser(aMe({ rol: 'ADMINISTRADOR' }));
    expect(run().toString()).toBe('/pedidos/nuevo');
  });
});
