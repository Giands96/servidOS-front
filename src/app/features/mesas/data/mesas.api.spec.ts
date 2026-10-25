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

  it('crear POSTs { numero, capacidad } to /mesas and returns the new table', () => {
    const mesa = aMesa({ mesaId: 9, numero: 15, capacidad: 6 });
    let result: unknown;
    api.crear({ numero: 15, capacidad: 6 }).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/mesas');
    expect(req.request.body).toEqual({ numero: 15, capacidad: 6 });
    req.flush(mesa, { status: 201, statusText: 'Created' });
    expect(result).toEqual(mesa);
  });

  it('actualizar PUTs { numero, capacidad } to /mesas/{id} and returns the table', () => {
    const mesa = aMesa({ mesaId: 9, numero: 16, capacidad: 4 });
    let result: unknown;
    api.actualizar(9, { numero: 16, capacidad: 4 }).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'PUT', '/mesas/9');
    expect(req.request.body).toEqual({ numero: 16, capacidad: 4 });
    req.flush(mesa);
    expect(result).toEqual(mesa);
  });

  it('listarInactivas GETs /mesas/inactivas and returns the deactivated tables', () => {
    const mesas = [aMesa({ mesaId: 3, numero: 3, activa: false })];
    let result: unknown;
    api.listarInactivas().subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'GET', '/mesas/inactivas');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(mesas);
    expect(result).toEqual(mesas);
  });

  it('desactivar POSTs a null body to /mesas/{id}/desactivar and returns the table', () => {
    const mesa = aMesa({ mesaId: 9, activa: false });
    let result: unknown;
    api.desactivar(9).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/mesas/9/desactivar');
    expect(req.request.body).toBeNull();
    req.flush(mesa);
    expect(result).toEqual(mesa);
  });

  it('reactivar POSTs a null body to /mesas/{id}/reactivar and returns the table', () => {
    const mesa = aMesa({ mesaId: 9, activa: true });
    let result: unknown;
    api.reactivar(9).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/mesas/9/reactivar');
    expect(req.request.body).toBeNull();
    req.flush(mesa);
    expect(result).toEqual(mesa);
  });

  it('propagates a duplicate-number error from crear (400)', () => {
    let error: unknown;
    api.crear({ numero: 4, capacidad: 4 }).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'POST', '/mesas').flush(anApiError(400, 'Ya existe una mesa con ese número'), {
      status: 400,
      statusText: 'Bad Request',
    });
    expect((error as HttpErrorResponse).status).toBe(400);
    expect((error as HttpErrorResponse).error.message).toBe('Ya existe una mesa con ese número');
  });

  it('propagates a backend error from liberar (400 when the table has open orders)', () => {
    let error: unknown;
    api.liberar(7).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'POST', '/mesas/7/liberar').flush(anApiError(400, 'La mesa tiene pedidos abiertos'), {
      status: 400,
      statusText: 'Bad Request',
    });
    expect((error as HttpErrorResponse).status).toBe(400);
    expect((error as HttpErrorResponse).error.message).toBe('La mesa tiene pedidos abiertos');
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
