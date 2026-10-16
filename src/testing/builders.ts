import { MeResponse } from '../app/core/auth/auth.types';
import { Categoria, Producto } from '../app/features/catalogo/catalogo.types';
import { ColaItem, ColaPedido } from '../app/features/cocina/cocina.types';
import { ApiError, Page } from '../app/core/http/api.types';
import { PedidoListado } from '../app/features/pedidos/pedidos.types';
import {
  Plan,
  Restaurante,
  RestauranteDashboard,
  SuscripcionPlataforma,
} from '../app/features/plataforma/plataforma.types';

export type { MeResponse, Rol } from '../app/core/auth/auth.types';

export function aMe(overrides: Partial<MeResponse> = {}): MeResponse {
  const defaultSuscripcion: NonNullable<MeResponse['suscripcion']> = {
    planId: 1,
    nombrePlan: 'Plan Test',
    monto: 99,
    moneda: 'PEN',
    estado: 'ACTIVA',
    fechaFin: '2099-12-31',
    diasRestantes: 30,
    vencida: false,
  };
  return {
    usuarioId: overrides.usuarioId ?? 1,
    email: overrides.email ?? 'user@example.test',
    nombre: overrides.nombre ?? 'Test User',
    restauranteId: overrides.restauranteId !== undefined ? overrides.restauranteId : 7,
    rol: overrides.rol ?? 'ADMINISTRADOR',
    restauranteEstado:
      overrides.restauranteEstado !== undefined ? overrides.restauranteEstado : 'ACTIVO',
    suscripcion: overrides.suscripcion !== undefined ? overrides.suscripcion : defaultSuscripcion,
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

/** Row of GET /pedidos. `createdAt` has no zone (Lima local time), like the backend. */
export function aPedidoListado(overrides: Partial<PedidoListado> = {}): PedidoListado {
  return {
    pedidoId: 476,
    tipoPedido: 'MESA',
    mesaId: 7,
    estado: 'PENDIENTE',
    total: 50,
    observacion: null,
    createdAt: '2026-10-08T12:30:00',
    estadoPago: null,
    ...overrides,
  };
}

/** Spring `Page` envelope around `content`; the counters default to a single full page. */
export function aPage<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 20,
    number: 0,
    first: true,
    last: true,
    ...overrides,
  };
}

/** `ProductoResponse` of GET /productos. */
export function aProducto(overrides: Partial<Producto> = {}): Producto {
  return {
    productoId: 7,
    categoriaId: 1,
    nombre: 'Lomo saltado',
    descripcion: null,
    imagenUrl: null,
    precio: 25,
    tiempoPreparacion: 15,
    estado: 'DISPONIBLE',
    ...overrides,
  };
}

/** `CategoriaResponse` of GET /categorias. */
export function aCategoria(overrides: Partial<Categoria> = {}): Categoria {
  return {
    categoriaId: 1,
    nombre: 'Platos de fondo',
    estado: 'HABILITADO',
    ...overrides,
  };
}

/** Row of GET /restaurantes (platform dashboard). */
export function aRestauranteDashboard(overrides: Partial<RestauranteDashboard> = {}): RestauranteDashboard {
  return {
    restauranteId: 12,
    slug: 'la-cevicheria',
    nombre: 'La Cevichería',
    direccion: 'Av. Brasil 123',
    estado: 'ACTIVO',
    suscripcion: {
      suscripcionId: 30,
      planId: 1,
      nombrePlan: 'Estándar',
      estado: 'ACTIVA',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-31',
    },
    ...overrides,
  };
}

/** `RestauranteResponse` of POST /restaurantes and PATCH /restaurantes/{id}/estado. */
export function aRestaurante(overrides: Partial<Restaurante> = {}): Restaurante {
  return {
    restauranteId: 12,
    slug: 'la-cevicheria',
    nombre: 'La Cevichería',
    direccion: 'Av. Brasil 123',
    estado: 'ACTIVO',
    ...overrides,
  };
}

/** `SuscripcionResponse` of the platform subscription endpoints. */
export function aSuscripcionPlataforma(overrides: Partial<SuscripcionPlataforma> = {}): SuscripcionPlataforma {
  return {
    suscripcionId: 30,
    restauranteId: 12,
    planId: 1,
    nombrePlan: 'Estándar',
    monto: 34.9,
    moneda: 'PEN',
    estado: 'ACTIVA',
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-31',
    ...overrides,
  };
}

/** `PlanResponse` of GET /planes. */
export function aPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    planId: 1,
    nombre: 'Estándar',
    precio: 34.9,
    descripcion: null,
    estado: 'ACTIVO',
    moneda: 'PEN',
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
