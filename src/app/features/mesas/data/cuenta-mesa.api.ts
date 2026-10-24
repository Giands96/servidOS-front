import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { CuentaMesa } from '../mesas.types';

@Injectable({ providedIn: 'root' })
export class CuentaMesaApi {
  private readonly http = inject(HttpClient);

  /** Open bill of a table: unpaid, not cancelled MESA rounds plus linked RECOJO/DELIVERY. */
  obtener(mesaId: number): Observable<CuentaMesa> {
    return this.http.get<CuentaMesa>(`${API_BASE}/mesas/${mesaId}/cuenta`);
  }
}
