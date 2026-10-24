import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { EstadoMesa, Mesa, OcuparMesaRequest } from '../mesas.types';

@Injectable({ providedIn: 'root' })
export class MesasApi {
  private readonly http = inject(HttpClient);

  /** Active tables ordered by number. `estado` is sent only when given. */
  listar(estado?: EstadoMesa): Observable<Mesa[]> {
    let params = new HttpParams();
    if (estado !== undefined) {
      params = params.set('estado', estado);
    }
    return this.http.get<Mesa[]>(`${API_BASE}/mesas`, { params });
  }

  /** LIBRE → OCUPADA with the guests count (1..capacidad). 400 when the table is already OCUPADA. */
  ocupar(mesaId: number, comensales: number): Observable<Mesa> {
    const body: OcuparMesaRequest = { comensales };
    return this.http.post<Mesa>(`${API_BASE}/mesas/${mesaId}/ocupar`, body);
  }

  /** OCUPADA → LIBRE. 400 when the table is LIBRE or still has unpaid orders. */
  liberar(mesaId: number): Observable<Mesa> {
    return this.http.post<Mesa>(`${API_BASE}/mesas/${mesaId}/liberar`, null);
  }
}
