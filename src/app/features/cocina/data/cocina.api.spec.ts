import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aColaPedido } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { CocinaApi } from './cocina.api';

describe('CocinaApi', () => {
  let api: CocinaApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CocinaApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('cola GETs /cocina/cola and returns the orders in preparation', () => {
    const orders = [aColaPedido({ pedidoId: 1 }), aColaPedido({ pedidoId: 2 })];
    let result: unknown;
    api.cola().subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/cocina/cola').flush(orders);
    expect(result).toEqual(orders);
  });

  it('listos GETs /cocina/listos with the same shape', () => {
    const orders = [aColaPedido({ pedidoId: 9, estado: 'LISTO' })];
    let result: unknown;
    api.listos().subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/cocina/listos').flush(orders);
    expect(result).toEqual(orders);
  });

  it('marcarListo POSTs a null body to /cocina/pedidos/{id}/listo and completes on 204', () => {
    let done = false;
    api.marcarListo(476).subscribe({ complete: () => (done = true) });
    const req = expectApi(ctrl, 'POST', '/cocina/pedidos/476/listo');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });
});
