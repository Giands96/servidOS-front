import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { Page } from '../../../core/http/api.types';
import { EstadoPedido, Pedido, PedidoListado, PedidosQuery } from '../pedidos.types';

@Injectable({ providedIn: 'root' })
export class PedidosApi {
  private readonly http = inject(HttpClient);

  /** Paged list, newest first (the backend takes no `sort`). Only the params that are set are sent. */
  listar(query: PedidosQuery = {}): Observable<Page<PedidoListado>> {
    let params = new HttpParams();
    if (query.estado !== undefined) {
      params = params.set('estado', query.estado);
    }
    if (query.fecha !== undefined) {
      params = params.set('fecha', query.fecha);
    }
    if (query.porCobrar === true) {
      params = params.set('porCobrar', true);
    }
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    return this.http.get<Page<PedidoListado>>(`${API_BASE}/pedidos`, { params });
  }

  /** PENDIENTE → EN_PREPARACION. */
  confirmar(id: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${API_BASE}/pedidos/${id}/confirmar`, null);
  }

  /** Any other transition, including CANCELADO. 400 when the transition is not allowed or the order is paid. */
  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API_BASE}/pedidos/${id}/estado`, { estado });
  }
}
