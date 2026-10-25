import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { EstadoMesa, GuardarMesaRequest, Mesa, OcuparMesaRequest } from '../mesas.types';

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

  /** Tables dadas de baja, ordered by number (ADMINISTRADOR). */
  listarInactivas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(`${API_BASE}/mesas/inactivas`);
  }

  /** A new table is born LIBRE. 400 when the number is already used by an active table. */
  crear(request: GuardarMesaRequest): Observable<Mesa> {
    return this.http.post<Mesa>(`${API_BASE}/mesas`, request);
  }

  /** 400 when the number is taken or the capacity is below the seated guests. */
  actualizar(mesaId: number, request: GuardarMesaRequest): Observable<Mesa> {
    return this.http.put<Mesa>(`${API_BASE}/mesas/${mesaId}`, request);
  }

  /** Soft delete; only a LIBRE table without open orders. Its number becomes free. */
  desactivar(mesaId: number): Observable<Mesa> {
    return this.http.post<Mesa>(`${API_BASE}/mesas/${mesaId}/desactivar`, null);
  }

  /** 400 when the table is already active or its number is now used by another active table. */
  reactivar(mesaId: number): Observable<Mesa> {
    return this.http.post<Mesa>(`${API_BASE}/mesas/${mesaId}/reactivar`, null);
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
