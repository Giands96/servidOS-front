import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aPago } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { PagosApi } from './pagos.api';

describe('PagosApi', () => {
  let api: PagosApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PagosApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('registrar', () => {
    it('POSTs /pagos with the order and method only when no optional field is given', () => {
      api.registrar({ pedidoId: 476, metodoPago: 'YAPE' }).subscribe();
      const req = expectApi(ctrl, 'POST', '/pagos');
      expect(req.request.body).toEqual({ pedidoId: 476, metodoPago: 'YAPE' });
      expect(Object.keys(req.request.body as object)).toEqual(['pedidoId', 'metodoPago']);
      req.flush(aPago());
    });

    it('sends montoEntregado and referenciaExterna when they are set', () => {
      api
        .registrar({ pedidoId: 476, metodoPago: 'EFECTIVO', montoEntregado: 60, referenciaExterna: 'OP-123' })
        .subscribe();
      const req = expectApi(ctrl, 'POST', '/pagos');
      expect(req.request.body).toEqual({
        pedidoId: 476,
        metodoPago: 'EFECTIVO',
        montoEntregado: 60,
        referenciaExterna: 'OP-123',
      });
      req.flush(aPago());
    });

    it('keeps montoEntregado 0 (falsy but sent when set)', () => {
      api.registrar({ pedidoId: 1, metodoPago: 'EFECTIVO', montoEntregado: 0 }).subscribe();
      const req = expectApi(ctrl, 'POST', '/pagos');
      expect(req.request.body).toEqual({ pedidoId: 1, metodoPago: 'EFECTIVO', montoEntregado: 0 });
      req.flush(aPago());
    });

    it('omits undefined optional fields instead of sending them as undefined', () => {
      api
        .registrar({ pedidoId: 1, metodoPago: 'PLIN', montoEntregado: undefined, referenciaExterna: undefined })
        .subscribe();
      const req = expectApi(ctrl, 'POST', '/pagos');
      expect(Object.keys(req.request.body as object)).toEqual(['pedidoId', 'metodoPago']);
      req.flush(aPago());
    });

    it('returns the created payment as the server sent it', () => {
      const pago = aPago({ pagoId: 31, pedidoId: 476, monto: 50, vuelto: 10, metodoPago: 'EFECTIVO' });
      let result: unknown;
      api.registrar({ pedidoId: 476, metodoPago: 'EFECTIVO', montoEntregado: 60 }).subscribe((r) => (result = r));
      expectApi(ctrl, 'POST', '/pagos').flush(pago, { status: 201, statusText: 'Created' });
      expect(result).toEqual(pago);
    });
  });
});
