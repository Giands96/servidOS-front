import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { aMe, anApiError } from '../../../testing/builders';
import { expectApi } from '../../../testing/mock-api';
import { Rol } from '../auth/auth.types';
import { SessionStore } from '../auth/session.store';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let store: SessionStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    ctrl.verify();
    vi.restoreAllMocks();
  });

  const fail = (status: number, text: string) => {
    let error: { status: number } | undefined;
    http.post('/api/v1/pedidos', {}).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'POST', '/pedidos').flush(anApiError(status, 'msg'), { status, statusText: text });
    return error;
  };

  const asUser = (rol: Rol) => store.setUser(aMe({ rol }));

  it('402 navigates ADMINISTRADOR to /paywall and rethrows', () => {
    asUser('ADMINISTRADOR');
    expect(fail(402, 'Payment Required')?.status).toBe(402);
    expect(navigate).toHaveBeenCalledWith(['/paywall']);
  });

  it('402 navigates non-admin roles to /suspendido and rethrows', () => {
    asUser('MESERO');
    expect(fail(402, 'Payment Required')?.status).toBe(402);
    expect(navigate).toHaveBeenCalledWith(['/suspendido']);
  });

  it('403 rethrows without navigating', () => {
    asUser('RECEPCION');
    expect(fail(403, 'Forbidden')?.status).toBe(403);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('other errors rethrow without navigating', () => {
    asUser('ADMINISTRADOR');
    expect(fail(500, 'Server Error')?.status).toBe(500);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores non-API urls', () => {
    let error: { status: number } | undefined;
    http.get('https://other.example.test/x').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('https://other.example.test/x').flush('x', { status: 402, statusText: 'Payment Required' });
    expect(error?.status).toBe(402);
    expect(navigate).not.toHaveBeenCalled();
  });
});
