import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, reduce, throwError } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { Page } from '../../../core/http/api.types';
import {
  Categoria,
  CategoriasQuery,
  CrearCategoriaRequest,
  EstadoProducto,
  GuardarProductoRequest,
  Producto,
  ProductosQuery,
} from '../catalogo.types';

/**
 * Page size used when the whole catalog is loaded. Only `/pedidos` documents a range (1-100); for
 * `/productos` and `/categorias` the maximum is unconfirmed, so this stays well under it. A restaurant menu
 * is a few dozen dishes: one or two requests.
 */
export const CATALOGO_PAGE_SIZE = 50;

/**
 * Hard cap on the pages followed by `todosLosProductos` / `todasLasCategorias` (20 x 50 = 1000 rows), so a
 * wrong `last` flag can never keep the client requesting forever. Reaching it is an error, not a truncation.
 */
export const CATALOGO_MAX_PAGES = 20;

/** Catalog access: reads plus the product/category writes. */
@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly http = inject(HttpClient);

  /** One page of products (no `sort`: the accepted field names are unconfirmed). Only set params are sent. */
  productos(query: ProductosQuery = {}): Observable<Page<Producto>> {
    let params = new HttpParams();
    if (query.categoriaId !== undefined) {
      params = params.set('categoriaId', query.categoriaId);
    }
    params = withPaging(params, query);
    return this.http.get<Page<Producto>>(`${API_BASE}/productos`, { params });
  }

  /** One page of categories. Only set params are sent. */
  categorias(query: CategoriasQuery = {}): Observable<Page<Categoria>> {
    return this.http.get<Page<Categoria>>(`${API_BASE}/categorias`, {
      params: withPaging(new HttpParams(), query),
    });
  }

  /** One product by id. */
  producto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${API_BASE}/productos/${id}`);
  }

  crearProducto(req: GuardarProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(`${API_BASE}/productos`, req);
  }

  /** Full replace: the caller sends every field, `estado` included. */
  actualizarProducto(id: number, req: GuardarProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${API_BASE}/productos/${id}`, req);
  }

  cambiarEstadoProducto(id: number, estado: EstadoProducto): Observable<Producto> {
    return this.http.patch<Producto>(`${API_BASE}/productos/${id}/estado`, { estado });
  }

  crearCategoria(req: CrearCategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(`${API_BASE}/categorias`, req);
  }

  /** The whole menu: every page from 0 until `last`, in order. Any failing page fails the whole load. */
  todosLosProductos(): Observable<Producto[]> {
    return this.todas((page) => this.productos({ page, size: CATALOGO_PAGE_SIZE }));
  }

  /** Every category: every page from 0 until `last`, in order. Any failing page fails the whole load. */
  todasLasCategorias(): Observable<Categoria[]> {
    return this.todas((page) => this.categorias({ page, size: CATALOGO_PAGE_SIZE }));
  }

  private todas<T>(fetchPage: (page: number) => Observable<Page<T>>): Observable<T[]> {
    return fetchPage(0).pipe(
      // `index` counts the emissions (the first answer is 0), i.e. the page just received.
      expand((received, index) => {
        if (received.last) {
          return EMPTY;
        }
        const next = index + 1;
        return next >= CATALOGO_MAX_PAGES
          ? throwError(
              () => new Error(`El catálogo supera el máximo de ${CATALOGO_MAX_PAGES} páginas`),
            )
          : fetchPage(next);
      }),
      reduce<Page<T>, T[]>((all, received) => all.concat(received.content), []),
    );
  }
}

function withPaging(params: HttpParams, query: { page?: number; size?: number }): HttpParams {
  if (query.page !== undefined) {
    params = params.set('page', query.page);
  }
  if (query.size !== undefined) {
    params = params.set('size', query.size);
  }
  return params;
}
