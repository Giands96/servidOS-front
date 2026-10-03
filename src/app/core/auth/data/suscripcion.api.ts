import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../http/api.config';

export interface Suscripcion {
  suscripcionId: number;
  restauranteId: number;
  planId: number;
  estado: 'ACTIVA' | 'CANCELADA';
  fechaInicio: string;
  fechaFin: string;
}

@Injectable({ providedIn: 'root' })
export class SuscripcionApi {
  private readonly http = inject(HttpClient);

  actual(): Observable<Suscripcion> {
    return this.http.get<Suscripcion>(`${API_BASE}/restaurantes/actual/suscripcion`);
  }
}
