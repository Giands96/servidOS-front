import { RestauranteEstado } from '../../core/auth/auth.types';

export type EstadoRestaurante = RestauranteEstado;

export type EstadoSuscripcion = 'ACTIVA' | 'CANCELADA';

/** Only fields verified against the live backend: an unknown sort field makes it answer 500. */
export type OrdenRestaurantes = 'nombre,asc' | 'nombre,desc';

/** Subscription summary embedded in a dashboard row; dates are yyyy-MM-dd. */
export interface ResumenSuscripcionDashboard {
  suscripcionId: number;
  planId: number;
  nombrePlan: string;
  estado: EstadoSuscripcion;
  fechaInicio: string;
  fechaFin: string;
}

/** Row of GET /restaurantes. */
export interface RestauranteDashboard {
  restauranteId: number;
  slug: string;
  nombre: string;
  direccion: string | null;
  estado: EstadoRestaurante;
  /** null when the restaurant has never had a subscription. */
  suscripcion: ResumenSuscripcionDashboard | null;
}

/** `RestauranteResponse`. */
export interface Restaurante {
  restauranteId: number;
  slug: string;
  nombre: string;
  direccion: string | null;
  estado: EstadoRestaurante;
}

/** `SuscripcionResponse` of the platform subscription endpoints. */
export interface SuscripcionPlataforma {
  suscripcionId: number;
  restauranteId: number;
  planId: number;
  nombrePlan: string;
  monto: number;
  moneda: string;
  estado: EstadoSuscripcion;
  fechaInicio: string;
  fechaFin: string;
}

/** `PlanResponse` of GET /planes (the backend only lists ACTIVO plans). */
export interface Plan {
  planId: number;
  nombre: string;
  precio: number;
  descripcion: string | null;
  estado: string;
  moneda: string;
}

/** Owner account created together with the restaurant (`AdministradorRequest`). */
export interface AdministradorRequest {
  /** 2-100 characters. */
  nombre: string;
  /** Up to 100 characters, not blank. */
  apellido: string;
  /** Up to 150 characters; unique in the whole platform. */
  email: string;
  /** 8-72 characters; write-only, the backend never returns it. */
  password: string;
}

/** Owner summary inside `RestauranteCreadoResponse`. */
export interface AdministradorResumen {
  usuarioId: number;
  email: string;
  nombre: string;
}

/** `RestauranteCreadoResponse` of POST /restaurantes: the restaurant plus its new owner. */
export interface RestauranteCreado extends Restaurante {
  administrador: AdministradorResumen;
}

export interface CrearRestauranteRequest {
  slug: string;
  nombre: string;
  direccion?: string;
  planId: number;
  demo?: boolean;
  /** 1-30; only meaningful when `demo` is true. */
  demoDias?: number;
  administrador: AdministradorRequest;
}

export interface RenovarSuscripcionRequest {
  /** Required by the backend when the restaurant has no prior subscription. */
  planId?: number;
}

export interface ListarRestaurantesQuery {
  page: number;
  size: number;
  sort?: OrdenRestaurantes;
}
