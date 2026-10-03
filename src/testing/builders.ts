import { ApiError } from '../app/core/http/api.types';

export type Rol =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'MODERADOR'
  | 'ADMINISTRADOR'
  | 'RECEPCION'
  | 'COCINERO'
  | 'MESERO'
  | 'CAJERO'
  | 'REPARTIDOR';

export interface MeResponse {
  usuarioId: number;
  email: string;
  nombre: string;
  /** null for platform sessions (SUPERADMIN). */
  restauranteId: number | null;
  rol: Rol;
}

export function aMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    usuarioId: 1,
    email: 'user@example.test',
    nombre: 'Test User',
    restauranteId: 7,
    rol: 'ADMINISTRADOR',
    ...overrides,
  };
}

export function anApiError(status: number, message: string): ApiError {
  return {
    timestamp: '2026-01-01T00:00:00Z',
    status: String(status),
    message,
    path: '/api/v1/test',
    traceID: 'fake-trace-id',
  };
}

/** Placeholder token for tests; never use a real-looking JWT. */
export const FAKE_ACCESS_TOKEN = 'fake-access-token';
