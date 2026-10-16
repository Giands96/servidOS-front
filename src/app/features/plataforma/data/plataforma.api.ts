import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { Page } from '../../../core/http/api.types';
import {
  CrearRestauranteRequest,
  EstadoRestaurante,
  ListarRestaurantesQuery,
  Plan,
  RenovarSuscripcionRequest,
  Restaurante,
  RestauranteCreado,
  RestauranteDashboard,
  SuscripcionPlataforma,
} from '../plataforma.types';

@Injectable({ providedIn: 'root' })
export class PlataformaApi {
  private readonly http = inject(HttpClient);

  /** Paged restaurants dashboard. `sort` is typed to the verified fields: an unknown one makes the backend answer 500. */
  listar({ page, size, sort }: ListarRestaurantesQuery): Observable<Page<RestauranteDashboard>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (sort !== undefined) {
      params = params.set('sort', sort);
    }
    return this.http.get<Page<RestauranteDashboard>>(`${API_BASE}/restaurantes`, { params });
  }

  /**
   * Creates a restaurant and its owner in one transaction (201). 400 on duplicate slug, unknown plan or invalid
   * demo; 409 when the owner email is already registered; 422 on validation.
   */
  crear(request: CrearRestauranteRequest): Observable<RestauranteCreado> {
    return this.http.post<RestauranteCreado>(`${API_BASE}/restaurantes`, request);
  }

  detalle(id: number): Observable<Restaurante> {
    return this.http.get<Restaurante>(`${API_BASE}/restaurantes/${id}`);
  }

  suscripcion(id: number): Observable<SuscripcionPlataforma> {
    return this.http.get<SuscripcionPlataforma>(`${API_BASE}/restaurantes/${id}/suscripcion`);
  }

  /** Records one paid month. `planId` is required by the backend when there is no prior subscription. */
  renovar(id: number, planId?: number): Observable<SuscripcionPlataforma> {
    const body: RenovarSuscripcionRequest = planId === undefined ? {} : { planId };
    return this.http.post<SuscripcionPlataforma>(`${API_BASE}/restaurantes/${id}/suscripcion/renovar`, body);
  }

  /** 400 when the restaurant is already in that state. */
  cambiarEstado(id: number, estado: EstadoRestaurante): Observable<Restaurante> {
    return this.http.patch<Restaurante>(`${API_BASE}/restaurantes/${id}/estado`, { estado });
  }

  /** 400 unless the current subscription is ACTIVA. */
  cambiarPlan(id: number, nuevoPlanId: number): Observable<SuscripcionPlataforma> {
    return this.http.patch<SuscripcionPlataforma>(`${API_BASE}/restaurantes/${id}/plan`, { nuevoPlanId });
  }

  planes(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${API_BASE}/planes`);
  }
}
