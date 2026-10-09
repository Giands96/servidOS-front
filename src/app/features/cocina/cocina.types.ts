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

/** Elemento de GET /cocina/cola y GET /cocina/listos (mismo formato: `PreparacionPedidoResponse` en el OpenAPI). */
export interface ColaPedido {
  pedidoId: number;
  mesaId: number | null;
  tipoPedido: TipoPedido;
  estado: EstadoPedido;
  observacion: string | null;
  total: number;
  /** Fecha y hora ISO en UTC, p. ej. '2026-10-08T17:30:00Z'. */
  createdAt: string;
  items: ColaItem[];
}

/** STOMP message on /topic/restaurantes/{restauranteId}/cocina. */
export interface CocinaEvent {
  pedidoId: number;
  estadoAnterior: EstadoPedido;
  estadoNuevo: EstadoPedido;
}
