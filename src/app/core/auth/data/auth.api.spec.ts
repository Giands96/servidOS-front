import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aMe, FAKE_ACCESS_TOKEN } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { AuthApi } from './auth.api';

describe('AuthApi', () => {
  let api: AuthApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuthApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('login posts credentials with cookies enabled', () => {
    let result: unknown;
    api.login({ email: 'a@b.test', password: 'secret-pass' }).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/auth/login');
    expect(req.request.body).toEqual({ email: 'a@b.test', password: 'secret-pass' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: FAKE_ACCESS_TOKEN });
    expect(result).toEqual({ accessToken: FAKE_ACCESS_TOKEN });
  });

  it('refresh posts a null body with credentials and X-Requested-With', () => {
    api.refresh().subscribe();
    const req = expectApi(ctrl, 'POST', '/auth/refresh');
    expect(req.request.body).toBeNull();
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    req.flush({ accessToken: FAKE_ACCESS_TOKEN });
  });

  it('logout posts with credentials and X-Requested-With', () => {
    api.logout().subscribe();
    const req = expectApi(ctrl, 'POST', '/auth/logout');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('me gets the current user', () => {
    let result: unknown;
    api.me().subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'GET', '/auth/me');
    req.flush(aMe());
    expect(result).toEqual(aMe());
  });
});
