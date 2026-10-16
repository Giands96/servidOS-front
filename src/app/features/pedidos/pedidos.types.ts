export type TipoPedido = 'MESA' | 'DELIVERY' | 'RECOJO';

export type EstadoPedido =
  'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'EN_ENTREGA' | 'ENTREGADO' | 'CANCELADO';

/** Payment state of an order as the list reports it; `null` means it was never charged. */
export type EstadoPago = 'PAGADO' | 'REEMBOLSADO';

/** Row of GET /pedidos. */
export interface PedidoListado {
  pedidoId: number;
  tipoPedido: TipoPedido;
  mesaId: number | null;
  estado: EstadoPedido;
  total: number;
  observacion: string | null;
  /** Lima local date-time WITHOUT zone, e.g. '2026-10-08T12:30:00'. Never append `Z`. */
  createdAt: string;
  estadoPago: EstadoPago | null;
}

/** `PedidoResponse`: answer of POST /pedidos/{id}/confirmar and PATCH /pedidos/{id}/estado. */
export interface Pedido {
  pedidoId: number;
  tipoPedido: TipoPedido;
  mesaId: number | null;
  estado: EstadoPedido;
  total: number;
}

export interface CrearPedidoItem {
  productoId: number;
  /** Integer >= 1 (the backend answers 422 otherwise). */
  cantidad: number;
  observacion?: string;
}

/**
 * Body of POST /pedidos. There is deliberately no amount, price or total: the backend computes them.
 * `mesaId` is only sent for MESA (any `mesaId` that arrives is validated against the tables).
 */
export interface CrearPedidoRequest {
  tipoPedido: TipoPedido;
  mesaId?: number;
  observacion?: string;
  items: CrearPedidoItem[];
}

/** Query of GET /pedidos. Unset fields are not sent. */
export interface PedidosQuery {
  estado?: EstadoPedido;
  /** `yyyy-MM-dd` (Lima day). */
  fecha?: string;
  /** Only sent when true: not cancelled and never charged. */
  porCobrar?: boolean;
  /** Zero-based page. */
  page?: number;
  /** 1-100; the backend answers 400 outside that range. */
  size?: number;
}
