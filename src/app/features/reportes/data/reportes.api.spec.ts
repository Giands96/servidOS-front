import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expectApi } from '../../../../testing/mock-api';
import { ReporteArchivo, ReporteProductos, ReporteVentas } from '../reportes.types';
import { ReportesApi } from './reportes.api';

const ventasReport = (): ReporteVentas => ({
  periodo: 'SEMANAL',
  desde: '2026-10-19',
  hasta: '2026-10-25',
  cantidadVentas: 1,
  totalVendido: 50,
  ventas: {
    content: [{ pedidoId: 583, fechaPago: '2026-10-23T14:52:00', tipoPedido: 'MESA', metodoPago: 'YAPE', total: 50 }],
    totalElements: 1,
    totalPages: 1,
    size: 100,
    number: 0,
    first: true,
    last: true,
  },
});

describe('ReportesApi', () => {
  let api: ReportesApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ReportesApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('ventas', () => {
    it('GETs /reportes/ventas with periodo, fecha, orden, page and size', () => {
      let result: ReporteVentas | undefined;
      api
        .ventas({ periodo: 'SEMANAL', fecha: '2026-10-23', orden: 'MAYOR_VENTA', page: 2, size: 100 })
        .subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/reportes/ventas');
      const p = req.request.params;
      expect(p.get('periodo')).toBe('SEMANAL');
      expect(p.get('fecha')).toBe('2026-10-23');
      expect(p.get('orden')).toBe('MAYOR_VENTA');
      expect(p.get('page')).toBe('2');
      expect(p.get('size')).toBe('100');
      req.flush(ventasReport());
      expect(result).toEqual(ventasReport());
    });

    it('omits fecha when it is undefined (the backend defaults to today in Lima)', () => {
      api.ventas({ periodo: 'DIARIO', orden: 'MAS_RECIENTES', page: 0, size: 100 }).subscribe();
      const req = expectApi(ctrl, 'GET', '/reportes/ventas');
      expect(req.request.params.has('fecha')).toBe(false);
      expect(req.request.params.get('page')).toBe('0');
      req.flush(ventasReport());
    });
  });

  describe('productos', () => {
    it('GETs /reportes/productos with periodo and fecha only', () => {
      const body: ReporteProductos = {
        periodo: 'MENSUAL',
        desde: '2026-10-01',
        hasta: '2026-10-31',
        cantidadVentas: 0,
        totalVendido: 0,
        productos: [],
      };
      let result: ReporteProductos | undefined;
      api.productos({ periodo: 'MENSUAL', fecha: '2026-10-23' }).subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/reportes/productos');
      expect(req.request.params.keys().sort()).toEqual(['fecha', 'periodo']);
      expect(req.request.params.get('periodo')).toBe('MENSUAL');
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('omits fecha when it is undefined', () => {
      api.productos({ periodo: 'DIARIO' }).subscribe();
      const req = expectApi(ctrl, 'GET', '/reportes/productos');
      expect(req.request.params.keys()).toEqual(['periodo']);
      req.flush({});
    });
  });

  describe('exportar', () => {
    const blob = () => new Blob(['xlsx-bytes']);

    it('GETs /reportes/ventas/export as a blob with formato, periodo, fecha and orden', () => {
      api
        .exportar('ventas', 'XLSX', { periodo: 'SEMANAL', fecha: '2026-10-23', orden: 'MAS_ANTIGUOS' })
        .subscribe();
      const req = expectApi(ctrl, 'GET', '/reportes/ventas/export');
      expect(req.request.responseType).toBe('blob');
      const p = req.request.params;
      expect(p.get('formato')).toBe('XLSX');
      expect(p.get('periodo')).toBe('SEMANAL');
      expect(p.get('fecha')).toBe('2026-10-23');
      expect(p.get('orden')).toBe('MAS_ANTIGUOS');
      req.flush(blob());
    });

    it('GETs /reportes/productos/export without orden and omits an undefined fecha', () => {
      api.exportar('productos', 'PDF', { periodo: 'DIARIO' }).subscribe();
      const req = expectApi(ctrl, 'GET', '/reportes/productos/export');
      expect(req.request.params.keys().sort()).toEqual(['formato', 'periodo']);
      req.flush(blob());
    });

    it('returns the blob and the filename of Content-Disposition', () => {
      let result: ReporteArchivo | undefined;
      api.exportar('ventas', 'XLSX', { periodo: 'SEMANAL', fecha: '2026-10-23' }).subscribe((r) => (result = r));
      const bytes = blob();
      expectApi(ctrl, 'GET', '/reportes/ventas/export').flush(bytes, {
        headers: { 'Content-Disposition': 'attachment; filename="reporte-ventas-semanal-2026-10-19.xlsx"' },
      });
      expect(result?.filename).toBe('reporte-ventas-semanal-2026-10-19.xlsx');
      expect(result?.blob).toBeInstanceOf(Blob);
    });

    it('reads the RFC 5987 filename* form (UTF-8, percent-encoded)', () => {
      let result: ReporteArchivo | undefined;
      api.exportar('productos', 'PDF', { periodo: 'MENSUAL' }).subscribe((r) => (result = r));
      expectApi(ctrl, 'GET', '/reportes/productos/export').flush(blob(), {
        headers: { 'Content-Disposition': "attachment; filename*=UTF-8''reporte%20men%C3%BA.pdf" },
      });
      expect(result?.filename).toBe('reporte menú.pdf');
    });

    it('falls back to the rule-built name when the header is missing', () => {
      let result: ReporteArchivo | undefined;
      api
        .exportar('ventas', 'XLSX', { periodo: 'SEMANAL', fecha: '2026-10-23', desde: '2026-10-19' })
        .subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/reportes/ventas/export');
      expect(req.request.params.has('desde')).toBe(false);
      req.flush(blob());
      expect(result?.filename).toBe('reporte-ventas-semanal-2026-10-19.xlsx');
    });

    it('falls back to a name without date when no desde is known and the header is missing', () => {
      let result: ReporteArchivo | undefined;
      api.exportar('productos', 'PDF', { periodo: 'DIARIO' }).subscribe((r) => (result = r));
      expectApi(ctrl, 'GET', '/reportes/productos/export').flush(blob());
      expect(result?.filename).toBe('reporte-productos-diario.pdf');
    });
  });
});
