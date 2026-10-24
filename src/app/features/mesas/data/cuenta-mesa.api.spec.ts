import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aCuentaMesa, anApiError, aPedidoCuenta } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { CuentaMesaApi } from './cuenta-mesa.api';

describe('CuentaMesaApi', () => {
  let api: CuentaMesaApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CuentaMesaApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('obtener GETs /mesas/{id}/cuenta and returns the bill as-is (table round + takeaway)', () => {
    const cuenta = aCuentaMesa({
      mesaId: 4,
      numero: 4,
      pedidos: [
        aPedidoCuenta({ pedidoId: 10, total: 50 }),
        aPedidoCuenta({
          pedidoId: 11,
          tipoPedido: 'RECOJO',
          observacion: 'Sin cubiertos',
          items: [{ nombre: 'Chicha', cantidad: 2, subtotal: 12 }],
          total: 12,
        }),
      ],
      total: 62,
    });
    let result: unknown;
    api.obtener(4).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'GET', '/mesas/4/cuenta');
    req.flush(cuenta);
    expect(result).toEqual(cuenta);
  });

  it('returns an empty bill with no orders and total 0', () => {
    const cuenta = aCuentaMesa({ pedidos: [], total: 0 });
    let result: unknown;
    api.obtener(1).subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/mesas/1/cuenta').flush(cuenta);
    expect(result).toEqual(cuenta);
  });

  it('propagates a backend error', () => {
    let error: unknown;
    api.obtener(99).subscribe({ error: (e) => (error = e) });
    expectApi(ctrl, 'GET', '/mesas/99/cuenta').flush(anApiError(404, 'Mesa no encontrada'), {
      status: 404,
      statusText: 'Not Found',
    });
    expect((error as HttpErrorResponse).status).toBe(404);
    expect((error as HttpErrorResponse).error.message).toBe('Mesa no encontrada');
  });
});
