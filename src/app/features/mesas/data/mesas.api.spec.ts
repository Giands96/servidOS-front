import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aMesa, anApiError } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { MesasApi } from './mesas.api';

describe('MesasApi', () => {
  let api: MesasApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MesasApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('listar', () => {
    it('GETs /mesas with no params when no estado is given and returns the tables', () => {
      const mesas = [aMesa({ mesaId: 1 }), aMesa({ mesaId: 2, numero: 2 })];
      let result: unknown;
      api.listar().subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/mesas');
      expect(req.request.params.keys()).toEqual([]);
      req.flush(mesas);
      expect(result).toEqual(mesas);
    });

    it('sends estado when it is given', () => {
      api.listar('OCUPADA').subscribe();
      expect(expectApi(ctrl, 'GET', '/mesas').request.params.get('estado')).toBe('OCUPADA');
    });
  });

  it('ocupar POSTs { comensales } to /mesas/{id}/ocupar and returns the table', () => {
    const mesa = aMesa({ mesaId: 7, estado: 'OCUPADA', comensales: 3 });
    let result: unknown;
    api.ocupar(7, 3).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/mesas/7/ocupar');
    expect(req.request.body).toEqual({ comensales: 3 });
    req.flush(mesa);
    expect(result).toEqual(mesa);
  });

  it('liberar POSTs a null body to /mesas/{id}/liberar and returns the table', () => {
    const mesa = aMesa({ mesaId: 7, estado: 'LIBRE', comensales: null });
    let result: unknown;
    api.liberar(7).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/mesas/7/liberar');
    expect(req.request.body).toBeNull();
    req.flush(mesa);
    expect(result).toEqual(mesa);
  });

  it('propagates a backend error (e.g. 400 when the table is already occupied)', () => {
    let error: unknown;
    api.ocupar(7, 2).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'POST', '/mesas/7/ocupar').flush(anApiError(400, 'La mesa ya está ocupada'), {
      status: 400,
      statusText: 'Bad Request',
    });
    expect((error as HttpErrorResponse).status).toBe(400);
    expect((error as HttpErrorResponse).error.message).toBe('La mesa ya está ocupada');
  });
});
