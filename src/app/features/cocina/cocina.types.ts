import { EstadoPedido, TipoPedido } from '../pedidos/pedidos.types';

// pedidos owns these unions; re-exported so existing cocina imports keep working.
export type { EstadoPedido, TipoPedido };

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
  /**
   * Number of the order's table (`Mesa.numero`), null without a table. Optional until the backend ships it
   * (odd/prompts/backend-numero-mesa.md); `mesaId` is the database id and is never shown as the number.
   */
  numeroMesa?: number | null;
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
