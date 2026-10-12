import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { aCategoria, aPage, aProducto } from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { CatalogoApi, CATALOGO_MAX_PAGES, CATALOGO_PAGE_SIZE } from './catalogo.api';

describe('CatalogoApi', () => {
  let api: CatalogoApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CatalogoApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('productos', () => {
    it('GETs /productos with no params when no query is given and returns the page', () => {
      const page = aPage([aProducto({ productoId: 1 }), aProducto({ productoId: 2 })]);
      let result: unknown;
      api.productos().subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/productos');
      expect(req.request.params.keys()).toEqual([]);
      req.flush(page);
      expect(result).toEqual(page);
    });

    it('sends every param that is set', () => {
      api.productos({ categoriaId: 3, page: 2, size: 50 }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/productos').request;
      expect(params.get('categoriaId')).toBe('3');
      expect(params.get('page')).toBe('2');
      expect(params.get('size')).toBe('50');
    });

    it('omits undefined params and never sends sort', () => {
      api.productos({ categoriaId: undefined, page: undefined, size: undefined }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/productos').request;
      expect(params.keys()).toEqual([]);
      expect(params.has('sort')).toBe(false);
    });

    it('keeps page 0 and categoriaId 0 (falsy but sent when set)', () => {
      api.productos({ page: 0, categoriaId: 0 }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/productos').request;
      expect(params.get('page')).toBe('0');
      expect(params.get('categoriaId')).toBe('0');
    });
  });

  describe('categorias', () => {
    it('GETs /categorias with no params when no query is given and returns the page', () => {
      const page = aPage([aCategoria({ categoriaId: 1 })]);
      let result: unknown;
      api.categorias().subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/categorias');
      expect(req.request.params.keys()).toEqual([]);
      req.flush(page);
      expect(result).toEqual(page);
    });

    it('sends page and size when set, including page 0', () => {
      api.categorias({ page: 0, size: 10 }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/categorias').request;
      expect(params.get('page')).toBe('0');
      expect(params.get('size')).toBe('10');
      expect(params.has('sort')).toBe(false);
    });
  });

  interface WholeCatalogCase {
    name: string;
    path: string;
    call: (a: CatalogoApi) => Observable<unknown[]>;
    build: (id: number) => unknown;
  }

  const WHOLE_CATALOG_CASES: WholeCatalogCase[] = [
    {
      name: 'todosLosProductos',
      path: '/productos',
      call: (a: CatalogoApi) => a.todosLosProductos(),
      build: (id: number) => aProducto({ productoId: id }),
    },
    {
      name: 'todasLasCategorias',
      path: '/categorias',
      call: (a: CatalogoApi) => a.todasLasCategorias(),
      build: (id: number) => aCategoria({ categoriaId: id }),
    },
  ];

  describe.each(WHOLE_CATALOG_CASES)('$name', ({ path, call, build }) => {
    const pageOf = (items: unknown[], number: number, last: boolean) =>
      aPage(items, { number, first: number === 0, last, size: CATALOGO_PAGE_SIZE });

    it('requests page 0 with an explicit size and no sort, then emits the single page content', () => {
      const results: unknown[] = [];
      call(api).subscribe((r) => results.push(r));
      const req = expectApi(ctrl, 'GET', path);
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe(String(CATALOGO_PAGE_SIZE));
      expect(req.request.params.has('sort')).toBe(false);
      expect(req.request.params.has('categoriaId')).toBe(false);
      req.flush(pageOf([build(1), build(2)], 0, true));
      expect(results).toEqual([[build(1), build(2)]]);
    });

    it('follows the pages until last and concatenates the content in order', () => {
      const results: unknown[] = [];
      call(api).subscribe((r) => results.push(r));

      const first = expectApi(ctrl, 'GET', path);
      expect(first.request.params.get('page')).toBe('0');
      first.flush(pageOf([build(1), build(2)], 0, false));
      expect(results).toEqual([]);

      const second = expectApi(ctrl, 'GET', path);
      expect(second.request.params.get('page')).toBe('1');
      expect(second.request.params.get('size')).toBe(String(CATALOGO_PAGE_SIZE));
      second.flush(pageOf([build(3)], 1, false));

      const third = expectApi(ctrl, 'GET', path);
      expect(third.request.params.get('page')).toBe('2');
      third.flush(pageOf([build(4), build(5)], 2, true));

      expect(results).toEqual([[build(1), build(2), build(3), build(4), build(5)]]);
    });

    it('emits an empty list for an empty catalog', () => {
      const results: unknown[] = [];
      call(api).subscribe((r) => results.push(r));
      expectApi(ctrl, 'GET', path).flush(pageOf([], 0, true));
      expect(results).toEqual([[]]);
    });

    it('errors on a failing later page and emits no partial list', () => {
      const results: unknown[] = [];
      let error: unknown;
      call(api).subscribe({ next: (r) => results.push(r), error: (e) => (error = e) });
      expectApi(ctrl, 'GET', path).flush(pageOf([build(1)], 0, false));
      expectApi(ctrl, 'GET', path).flush(
        { message: 'boom' },
        { status: 500, statusText: 'Server Error' },
      );
      expect(results).toEqual([]);
      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect((error as HttpErrorResponse).status).toBe(500);
    });

    it('errors when the first page fails', () => {
      let error: unknown;
      call(api).subscribe({ error: (e) => (error = e) });
      expectApi(ctrl, 'GET', path).flush(null, { status: 403, statusText: 'Forbidden' });
      expect((error as HttpErrorResponse).status).toBe(403);
    });

    it('stops at the page cap with an error when last never turns true', () => {
      const results: unknown[] = [];
      let error: unknown;
      call(api).subscribe({ next: (r) => results.push(r), error: (e) => (error = e) });

      for (let page = 0; page < CATALOGO_MAX_PAGES; page++) {
        const req = expectApi(ctrl, 'GET', path);
        expect(req.request.params.get('page')).toBe(String(page));
        req.flush(pageOf([build(page)], page, false));
      }

      // No request beyond the cap (ctrl.verify() in afterEach also checks it).
      ctrl.expectNone((req) => req.url.endsWith(path));
      expect(results).toEqual([]);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(String(CATALOGO_MAX_PAGES));
    });

    it('accepts a catalog that ends exactly on the last allowed page', () => {
      const results: unknown[] = [];
      call(api).subscribe((r) => results.push(r));
      for (let page = 0; page < CATALOGO_MAX_PAGES; page++) {
        expectApi(ctrl, 'GET', path).flush(
          pageOf([build(page)], page, page === CATALOGO_MAX_PAGES - 1),
        );
      }
      expect(results).toHaveLength(1);
      expect((results[0] as unknown[]).length).toBe(CATALOGO_MAX_PAGES);
    });
  });
});
