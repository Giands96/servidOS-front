import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { EstadoPago, EstadoPedido, PedidoListado, TipoPedido } from '../pedidos.types';

/** Every estado in flow order (tab order of the list). */
export const ESTADOS_PEDIDO: readonly EstadoPedido[] = [
  'PENDIENTE',
  'EN_PREPARACION',
  'LISTO',
  'EN_ENTREGA',
  'ENTREGADO',
  'CANCELADO',
];

type Transitions = Record<TipoPedido, readonly EstadoPedido[]>;

const forAllTipos = (...estados: EstadoPedido[]): Transitions => ({
  MESA: estados,
  DELIVERY: estados,
  RECOJO: estados,
});

/** Allowed transitions, verbatim from FRONTEND_CONTEXT §7 (Pedidos). CANCELADO is listed where the contract allows it. */
export const TRANSITIONS: Readonly<Record<EstadoPedido, Transitions>> = {
  PENDIENTE: forAllTipos('EN_PREPARACION', 'CANCELADO'),
  EN_PREPARACION: forAllTipos('LISTO', 'CANCELADO'),
  LISTO: {
    MESA: ['ENTREGADO', 'CANCELADO'],
    DELIVERY: ['EN_ENTREGA', 'CANCELADO'],
    RECOJO: ['ENTREGADO', 'CANCELADO'],
  },
  EN_ENTREGA: forAllTipos('ENTREGADO', 'CANCELADO'),
  ENTREGADO: forAllTipos(),
  CANCELADO: forAllTipos(),
};

/** Forward transitions only (CANCELADO excluded, see `canCancel`). Returns a new array. */
export function nextEstados(tipo: TipoPedido, estado: EstadoPedido): EstadoPedido[] {
  return TRANSITIONS[estado][tipo].filter((next) => next !== 'CANCELADO');
}

/** Cancel is allowed when the contract has a CANCELADO transition and the order is not paid. */
export function canCancel(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
): boolean {
  return (
    TRANSITIONS[pedido.estado][pedido.tipoPedido].includes('CANCELADO') &&
    pedido.estadoPago !== 'PAGADO'
  );
}

export interface PedidoAction {
  estado: EstadoPedido;
  label: string;
  /** True only for PENDIENTE → EN_PREPARACION, which has its own endpoint (`confirmar`). */
  viaConfirmar: boolean;
}

const ACTION_LABEL: Partial<Record<EstadoPedido, string>> = {
  EN_PREPARACION: 'Enviar a cocina',
  LISTO: 'Pasar a Listo',
  EN_ENTREGA: 'Enviar a entrega',
  ENTREGADO: 'Marcar entregado',
};

/** The single forward action a list row offers, or null for a final estado. */
export function primaryAction(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado'>,
): PedidoAction | null {
  const [estado] = nextEstados(pedido.tipoPedido, pedido.estado);
  if (estado === undefined) {
    return null;
  }
  return {
    estado,
    label: ACTION_LABEL[estado] ?? estadoLabel(estado),
    viaConfirmar: pedido.estado === 'PENDIENTE',
  };
}

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  EN_ENTREGA: 'En entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const ESTADO_VARIANT: Record<EstadoPedido, BadgeVariant> = {
  PENDIENTE: 'warn',
  EN_PREPARACION: 'info',
  LISTO: 'ok',
  EN_ENTREGA: 'flow',
  ENTREGADO: 'neutral',
  CANCELADO: 'danger',
};

export function estadoLabel(estado: EstadoPedido): string {
  return ESTADO_LABEL[estado];
}

export function estadoVariant(estado: EstadoPedido): BadgeVariant {
  return ESTADO_VARIANT[estado];
}

export function estadoPagoLabel(estadoPago: EstadoPago | null): string {
  switch (estadoPago) {
    case 'PAGADO':
      return 'Pagado';
    case 'REEMBOLSADO':
      return 'Reembolsado';
    case null:
      return 'Sin cobrar';
  }
}

/** Client-side guard: the backend answers 500 (not 400) to an unknown enum value. */
export function isEstadoPedido(value: unknown): value is EstadoPedido {
  return ESTADOS_PEDIDO.includes(value as EstadoPedido);
}

export function tipoLabel(order: Pick<PedidoListado, 'tipoPedido' | 'mesaId'>): string {
  switch (order.tipoPedido) {
    case 'MESA':
      return order.mesaId === null ? 'Mesa' : `Mesa ${order.mesaId}`;
    case 'DELIVERY':
      return 'Delivery';
    case 'RECOJO':
      return 'Recojo';
  }
}

export function formatOrderNumber(pedidoId: number): string {
  return `#${String(pedidoId).padStart(4, '0')}`;
}
