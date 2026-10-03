import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { aMe, anApiError, FAKE_ACCESS_TOKEN } from '../../../testing/builders';
import { expectApi } from '../../../testing/mock-api';
import { SessionStore } from '../auth/session.store';
import { authInterceptor } from './auth.interceptor';

const NEW_TOKEN = 'fake-new-token';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let store: SessionStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.setToken(FAKE_ACCESS_TOKEN);
    store.setUser(aMe());
  });

  afterEach(() => {
    ctrl.verify();
    vi.restoreAllMocks();
  });

  const waitForRefresh = () => vi.waitFor(() => expectApi(ctrl, 'POST', '/auth/refresh'));
  const unauthorized = () => anApiError(401, 'Unauthorized');

  it('attaches the Bearer token to API requests', () => {
    http.get('/api/v1/productos').subscribe();
    const req = expectApi(ctrl, 'GET', '/productos');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${FAKE_ACCESS_TOKEN}`);
    req.flush([]);
  });

  it('does not attach the token to non-API urls', () => {
    http.get('https://other.example.test/data').subscribe();
    const req = ctrl.expectOne('https://other.example.test/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach the token when there is none', () => {
    store.setToken(null);
    http.get('/api/v1/productos').subscribe();
    const req = expectApi(ctrl, 'GET', '/productos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it.each(['/auth/login', '/auth/refresh'])('does not attach the token to %s', (path) => {
    http.post(`/api/v1${path}`, null).subscribe();
    const req = expectApi(ctrl, 'POST', path);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: NEW_TOKEN });
  });

  it('on 401 refreshes once and retries with the new token', async () => {
    let result: unknown;
    http.get('/api/v1/productos').subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/productos').flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    (await waitForRefresh()).flush({ accessToken: NEW_TOKEN });

    const retry = await vi.waitFor(() => expectApi(ctrl, 'GET', '/productos'));
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${NEW_TOKEN}`);
    retry.flush(['ok']);
    expect(result).toEqual(['ok']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shares one refresh among 3 concurrent 401s and retries all of them', async () => {
    const results: unknown[] = [];
    for (const path of ['/a', '/b', '/c']) {
      http.get(`/api/v1${path}`).subscribe((r) => results.push(r));
    }
    for (const path of ['/a', '/b', '/c']) {
      expectApi(ctrl, 'GET', path).flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
    }

    (await waitForRefresh()).flush({ accessToken: NEW_TOKEN });

    for (const path of ['/a', '/b', '/c']) {
      const retry = await vi.waitFor(() => expectApi(ctrl, 'GET', path));
      expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${NEW_TOKEN}`);
      retry.flush(path);
    }
    expect(results.sort()).toEqual(['/a', '/b', '/c']);
  });

  it('retries directly when the token was already renewed by another flight', async () => {
    http.get('/api/v1/productos').subscribe();
    const first = expectApi(ctrl, 'GET', '/productos');
    store.setToken(NEW_TOKEN);
    first.flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    const retry = await vi.waitFor(() => expectApi(ctrl, 'GET', '/productos'));
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${NEW_TOKEN}`);
    retry.flush([]);
  });

  it('on refresh failure clears the session, navigates to /login?expired=1 and rethrows', async () => {
    let error: { status: number } | undefined;
    http.get('/api/v1/productos').subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'GET', '/productos').flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    (await waitForRefresh()).flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() => expect(error?.status).toBe(401));
    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: 1 } });
  });

  it('does not refresh again when the retried request 401s (no loop)', async () => {
    let error: { status: number } | undefined;
    http.get('/api/v1/productos').subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'GET', '/productos').flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
    (await waitForRefresh()).flush({ accessToken: NEW_TOKEN });

    const retry = await vi.waitFor(() => expectApi(ctrl, 'GET', '/productos'));
    retry.flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() => expect(error?.status).toBe(401));
    expect(store.accessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: 1 } });
    ctrl.expectNone((r) => r.url === '/api/v1/auth/refresh');
  });

  it('passes non-401 retry errors through without clearing the session', async () => {
    let error: { status: number } | undefined;
    http.get('/api/v1/productos').subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'GET', '/productos').flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
    (await waitForRefresh()).flush({ accessToken: NEW_TOKEN });

    const retry = await vi.waitFor(() => expectApi(ctrl, 'GET', '/productos'));
    retry.flush(anApiError(500, 'boom'), { status: 500, statusText: 'Server Error' });

    await vi.waitFor(() => expect(error?.status).toBe(500));
    expect(store.accessToken()).toBe(NEW_TOKEN);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['/auth/me', '/auth/login'])('does not refresh on 401 for %s', (path) => {
    let error: { status: number } | undefined;
    http.get(`/api/v1${path}`).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'GET', path).flush(unauthorized(), { status: 401, statusText: 'Unauthorized' });
    expect(error?.status).toBe(401);
    ctrl.expectNone((r) => r.url === '/api/v1/auth/refresh');
    expect(navigate).not.toHaveBeenCalled();
  });
});
