export type PlatformRol = 'SUPERADMIN' | 'ADMIN' | 'MODERADOR';

export type RestauranteRol =
  | 'ADMINISTRADOR'
  | 'RECEPCION'
  | 'COCINERO'
  | 'MESERO'
  | 'CAJERO'
  | 'REPARTIDOR';

export type Rol = PlatformRol | RestauranteRol;

export type RestauranteEstado = 'ACTIVO' | 'INACTIVO';

/** Subscription summary embedded in GET /auth/me (not the full Suscripcion entity). */
export interface ResumenSuscripcion {
  planId: number;
  nombrePlan: string;
  monto: number;
  moneda: string;
  estado: 'ACTIVA' | 'CANCELADA';
  /** yyyy-MM-dd; the tenant operates through this day inclusive. */
  fechaFin: string;
  diasRestantes: number;
  /** true once fechaFin has passed: writes are blocked (HTTP 402). */
  vencida: boolean;
}

/** Response of GET /auth/me. */
export interface MeResponse {
  usuarioId: number;
  email: string;
  nombre: string;
  /** null for platform sessions. */
  restauranteId: number | null;
  rol: Rol;
  /** null for platform sessions. */
  restauranteEstado: RestauranteEstado | null;
  /** null for platform sessions and for tenants without a subscription. */
  suscripcion: ResumenSuscripcion | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
}
