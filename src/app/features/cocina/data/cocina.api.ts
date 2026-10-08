import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { ColaPedido } from '../cocina.types';

@Injectable({ providedIn: 'root' })
export class CocinaApi {
  private readonly http = inject(HttpClient);

  /** Orders in EN_PREPARACION (no pagination). */
  cola(): Observable<ColaPedido[]> {
    return this.http.get<ColaPedido[]>(`${API_BASE}/cocina/cola`);
  }

  /** Orders in LISTO, same shape as `cola`. */
  listos(): Observable<ColaPedido[]> {
    return this.http.get<ColaPedido[]>(`${API_BASE}/cocina/listos`);
  }

  /** EN_PREPARACION → LISTO. 204 on success; 400 if the order is not in preparation. */
  marcarListo(pedidoId: number): Observable<void> {
    return this.http.post<void>(`${API_BASE}/cocina/pedidos/${pedidoId}/listo`, null);
  }
}
