import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { fallbackFilename } from '../domain/reportes.rules';
import {
  ExportQuery,
  FormatoExport,
  PeriodoQuery,
  ReporteArchivo,
  ReporteProductos,
  ReporteVentas,
  TipoReporte,
  VentasQuery,
} from '../reportes.types';

/** `filename*=UTF-8''...` (RFC 5987) wins over the plain `filename="..."` form. */
const FILENAME_STAR = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/;
const FILENAME_PLAIN = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/;

/** File name of a Content-Disposition header, or `null` when it carries none. */
function filenameFrom(header: string | null): string | null {
  if (header === null) {
    return null;
  }
  const star = FILENAME_STAR.exec(header);
  if (star !== null) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // Malformed escape: fall through to the plain form.
    }
  }
  const plain = FILENAME_PLAIN.exec(header);
  const name = (plain?.[1] ?? plain?.[2] ?? '').trim();
  return name === '' ? null : name;
}

/** Sales reports (ADMINISTRADOR only): the two views and their file exports. */
@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);

  ventas(query: VentasQuery): Observable<ReporteVentas> {
    const params = this.periodParams(query)
      .set('orden', query.orden)
      .set('page', query.page)
      .set('size', query.size);
    return this.http.get<ReporteVentas>(`${API_BASE}/reportes/ventas`, { params });
  }

  productos(query: PeriodoQuery): Observable<ReporteProductos> {
    return this.http.get<ReporteProductos>(`${API_BASE}/reportes/productos`, { params: this.periodParams(query) });
  }

  /**
   * Downloads the file of what the screen shows. Returns the bytes and the name the backend chose; saving it is
   * the page's job (the API never touches the DOM). Only the ventas export takes `orden`.
   */
  exportar(reporte: TipoReporte, formato: FormatoExport, query: ExportQuery): Observable<ReporteArchivo> {
    let params = this.periodParams(query).set('formato', formato);
    if (reporte === 'ventas' && query.orden !== undefined) {
      params = params.set('orden', query.orden);
    }
    return this.http
      .get(`${API_BASE}/reportes/${reporte}/export`, { params, responseType: 'blob', observe: 'response' })
      .pipe(
        map((res) => ({
          blob: res.body as Blob,
          filename:
            filenameFrom(res.headers.get('Content-Disposition')) ??
            fallbackFilename(reporte, query.periodo, query.desde, formato),
        })),
        catchError((error: unknown) => this.readableError(error)),
      );
  }

  /**
   * With `responseType: 'blob'` an error body arrives as a Blob too. Re-throws the same error with the JSON parsed
   * (or `null` when it is not JSON) so callers read `error.error.message` like on every other endpoint.
   */
  private readableError(error: unknown): Observable<never> {
    if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) {
      return throwError(() => error);
    }
    return from(error.error.text()).pipe(
      map((text): unknown => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      }),
      switchMap((body) =>
        throwError(
          () =>
            new HttpErrorResponse({
              error: body,
              headers: error.headers,
              status: error.status,
              statusText: error.statusText,
              url: error.url ?? undefined,
            }),
        ),
      ),
    );
  }

  /** `fecha` is left out when undefined: the backend then uses today in Lima. */
  private periodParams(query: PeriodoQuery): HttpParams {
    const params = new HttpParams().set('periodo', query.periodo);
    return query.fecha === undefined ? params : params.set('fecha', query.fecha);
  }
}
