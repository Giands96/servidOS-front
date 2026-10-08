export type TipoPedido = 'MESA' | 'DELIVERY' | 'RECOJO';

export type EstadoPedido =
  'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'EN_ENTREGA' | 'ENTREGADO' | 'CANCELADO';

export interface ColaItem {
  detalleId: number;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  observacion: string | null;
}

/** Item of GET /cocina/cola and GET /cocina/listos (same shape). Shape taken from the backend change note; not verified against Swagger. */
export interface ColaPedido {
  pedidoId: number;
  mesaId: number | null;
  tipoPedido: TipoPedido;
  estado: EstadoPedido;
  observacion: string | null;
  total: number;
  /** ISO local date-time without timezone, e.g. '2026-10-08T12:30:00'. */
  createdAt: string;
  items: ColaItem[];
}

/** STOMP message on /topic/restaurantes/{restauranteId}/cocina. */
export interface CocinaEvent {
  pedidoId: number;
  estadoAnterior: EstadoPedido;
  estadoNuevo: EstadoPedido;
}
