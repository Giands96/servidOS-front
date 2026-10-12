import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Suscripcion } from '../../../core/auth/data/suscripcion.api';
import { API_BASE } from '../../../core/http/api.config';

/** GET /restaurantes/actual: only the fields the UI reads; never expose restauranteId. */
export interface RestauranteActual {
  nombre: string;
  slug?: string;
}

@Injectable({ providedIn: 'root' })
export class RestauranteApi {
  private readonly http = inject(HttpClient);

  actual(): Observable<RestauranteActual> {
    return this.http.get<RestauranteActual>(`${API_BASE}/restaurantes/actual`);
  }

  suscripcion(): Observable<Suscripcion> {
    return this.http.get<Suscripcion>(`${API_BASE}/restaurantes/actual/suscripcion`);
  }
}
