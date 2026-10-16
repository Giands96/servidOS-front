import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aPage, aPedidoListado } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { CrearPedidoRequest, Pedido } from '../pedidos.types';
import { PedidosApi } from './pedidos.api';

const aPedido = (overrides: Partial<Pedido> = {}): Pedido => ({
  pedidoId: 476,
  tipoPedido: 'MESA',
  mesaId: 7,
  estado: 'EN_PREPARACION',
  total: 50,
  ...overrides,
});

describe('PedidosApi', () => {
  let api: PedidosApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PedidosApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('listar', () => {
    it('GETs /pedidos with no params when no query is given and returns the page', () => {
      const page = aPage([aPedidoListado({ pedidoId: 1 }), aPedidoListado({ pedidoId: 2 })]);
      let result: unknown;
      api.listar().subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/pedidos');
      expect(req.request.params.keys()).toEqual([]);
      req.flush(page);
      expect(result).toEqual(page);
    });

    it('sends every param that is set, with the date as yyyy-MM-dd', () => {
      api
        .listar({ estado: 'LISTO', fecha: '2026-10-08', porCobrar: true, page: 2, size: 50 })
        .subscribe();
      const { params } = expectApi(ctrl, 'GET', '/pedidos').request;
      expect(params.get('estado')).toBe('LISTO');
      expect(params.get('fecha')).toBe('2026-10-08');
      expect(params.get('porCobrar')).toBe('true');
      expect(params.get('page')).toBe('2');
      expect(params.get('size')).toBe('50');
    });

    it('omits undefined params', () => {
      api.listar({ estado: undefined, fecha: undefined, page: undefined }).subscribe();
      expect(expectApi(ctrl, 'GET', '/pedidos').request.params.keys()).toEqual([]);
    });

    it('omits porCobrar unless it is true', () => {
      api.listar({ porCobrar: false, estado: 'PENDIENTE' }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/pedidos').request;
      expect(params.has('porCobrar')).toBe(false);
      expect(params.get('estado')).toBe('PENDIENTE');
    });

    it('keeps page 0 (a falsy but valid value)', () => {
      api.listar({ page: 0 }).subscribe();
      expect(expectApi(ctrl, 'GET', '/pedidos').request.params.get('page')).toBe('0');
    });
  });

  describe('crear', () => {
    it('POSTs the request as is to /pedidos and returns the new order', () => {
      const request: CrearPedidoRequest = {
        tipoPedido: 'MESA',
        mesaId: 7,
        observacion: 'Sin ají',
        items: [
          { productoId: 3, cantidad: 2 },
          { productoId: 5, cantidad: 1, observacion: 'Bien cocido' },
        ],
      };
      const pedido = aPedido({ estado: 'PENDIENTE', total: 70 });
      let result: unknown;
      api.crear(request).subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'POST', '/pedidos');
      expect(req.request.body).toEqual(request);
      req.flush(pedido, { status: 201, statusText: 'Created' });
      expect(result).toEqual(pedido);
    });

    it('propagates a backend error (e.g. 400 "Producto no disponible")', () => {
      let error: unknown;
      api.crear({ tipoPedido: 'RECOJO', items: [{ productoId: 3, cantidad: 1 }] }).subscribe({
        error: (e) => (error = e),
      });
      expectApi(ctrl, 'POST', '/pedidos').flush(
        { message: 'Producto no disponible: 3' },
        { status: 400, statusText: 'Bad Request' },
      );
      expect((error as HttpErrorResponse).status).toBe(400);
      expect((error as HttpErrorResponse).error.message).toBe('Producto no disponible: 3');
    });
  });

  it('confirmar POSTs a null body to /pedidos/{id}/confirmar and returns the order', () => {
    const pedido = aPedido({ estado: 'EN_PREPARACION' });
    let result: unknown;
    api.confirmar(476).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'POST', '/pedidos/476/confirmar');
    expect(req.request.body).toBeNull();
    req.flush(pedido);
    expect(result).toEqual(pedido);
  });

  it('cambiarEstado PATCHes { estado } to /pedidos/{id}/estado and returns the order', () => {
    const pedido = aPedido({ estado: 'LISTO' });
    let result: unknown;
    api.cambiarEstado(476, 'LISTO').subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'PATCH', '/pedidos/476/estado');
    expect(req.request.body).toEqual({ estado: 'LISTO' });
    req.flush(pedido);
    expect(result).toEqual(pedido);
  });
});
