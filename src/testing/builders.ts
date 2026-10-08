import { MeResponse } from '../app/core/auth/auth.types';
import { ColaItem, ColaPedido } from '../app/features/cocina/cocina.types';
import { ApiError } from '../app/core/http/api.types';

export type { MeResponse, Rol } from '../app/core/auth/auth.types';

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

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
};

/** Builds the backend envelope; `status` is formatted like Spring: '402 Payment Required'. */
export function anApiError(status: number, message: string): ApiError {
  return {
    timestamp: '2026-01-01T00:00:00Z',
    status: STATUS_TEXT[status] ? `${status} ${STATUS_TEXT[status]}` : `${status}`,
    message,
    path: '/api/v1/test',
    traceID: 'fake-trace-id',
  };
}

/** Placeholder token for tests; never use a real-looking JWT. */
export const FAKE_ACCESS_TOKEN = 'fake-access-token';

export function aColaPedido(overrides: Partial<ColaPedido> = {}): ColaPedido {
  return {
    pedidoId: 476,
    mesaId: 7,
    tipoPedido: 'MESA',
    estado: 'EN_PREPARACION',
    observacion: null,
    total: 50,
    createdAt: '2026-10-08T12:30:00',
    items: [aColaItem()],
    ...overrides,
  };
}

export function aColaItem(overrides: Partial<ColaItem> = {}): ColaItem {
  return {
    detalleId: 9,
    productoId: 7,
    nombreProducto: 'Chicharrón de pescado',
    cantidad: 2,
    observacion: null,
    ...overrides,
  };
}
