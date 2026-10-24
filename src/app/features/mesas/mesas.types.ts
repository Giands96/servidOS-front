import { EstadoPedido, TipoPedido } from '../pedidos/pedidos.types';

export type EstadoMesa = 'LIBRE' | 'OCUPADA';

/** `MesaResponse` of GET /mesas. `comensales` is null while the table is LIBRE. */
export interface Mesa {
  mesaId: number;
  numero: number;
  capacidad: number;
  comensales: number | null;
  estado: EstadoMesa;
  activa: boolean;
}

/** Body of POST /mesas/{id}/ocupar; `comensales` goes from 1 to the table capacity. */
export interface OcuparMesaRequest {
  comensales: number;
}

/** `ItemCuentaResponse`: one line of a bill order. */
export interface ItemCuenta {
  nombre: string;
  cantidad: number;
  subtotal: number;
}

/** `PedidoCuentaResponse`: an unpaid, not cancelled order of the bill (MESA round or linked RECOJO/DELIVERY). */
export interface PedidoCuenta {
  pedidoId: number;
  tipoPedido: TipoPedido;
  estado: EstadoPedido;
  createdAt: string;
  items: ItemCuenta[];
  observacion: string | null;
  total: number;
}

/** `CuentaMesaResponse` of GET /mesas/{mesaId}/cuenta. Empty bill: `pedidos: []`, `total: 0`. */
export interface CuentaMesa {
  mesaId: number;
  numero: number;
  estado: EstadoMesa;
  comensales: number | null;
  capacidad: number;
  pedidos: PedidoCuenta[];
  total: number;
}
