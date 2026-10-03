export type PlatformRol = 'SUPERADMIN' | 'ADMIN' | 'MODERADOR';

export type RestauranteRol =
  | 'ADMINISTRADOR'
  | 'RECEPCION'
  | 'COCINERO'
  | 'MESERO'
  | 'CAJERO'
  | 'REPARTIDOR';

export type Rol = PlatformRol | RestauranteRol;

/** Response of GET /auth/me. */
export interface MeResponse {
  usuarioId: number;
  email: string;
  nombre: string;
  /** null for platform sessions. */
  restauranteId: number | null;
  rol: Rol;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
}
