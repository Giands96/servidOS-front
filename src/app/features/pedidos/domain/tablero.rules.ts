import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { limaToday } from '../../plataforma/domain/plataforma.rules';
import { EstadoPedido, PedidoListado, TipoPedido } from '../pedidos.types';
import {
  PedidoAction,
  TIPO_LABEL,
  canCancel,
  estadoLabel,
  estadoPagoLabel,
  estadoVariant,
  formatMoney,
  formatOrderNumber,
  primaryAction,
  tipoLabel,
  transitionMessage,
  transitionsOf,
} from './pedidos.rules';

export type BoardColumn = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'EN_ENTREGA';

/** Columns that hold cards, in flow order. */
export const BOARD_COLUMNS: readonly BoardColumn[] = [
  'PENDIENTE',
  'EN_PREPARACION',
  'LISTO',
  'EN_ENTREGA',
];

/** Collapsed columns: they only show today's count and act as drop zones. */
export const CLOSED_COLUMNS: readonly EstadoPedido[] = ['ENTREGADO', 'CANCELADO'];

const ALL_COLUMNS: readonly EstadoPedido[] = [...BOARD_COLUMNS, ...CLOSED_COLUMNS];

const PAID_CANCEL_REASON = 'Un pedido pagado no se puede cancelar';

// ---------------------------------------------------------------------------------------------- filters

export type TipoFiltro = 'TODOS' | TipoPedido;

export interface TipoFilterChip {
  filtro: TipoFiltro;
  label: string;
  count: number;
}

/** Chips "Todos / Mesa / Delivery / Recojo" with their counts over the given (active) orders. */
export function tipoFilterChips(pedidos: readonly Pick<PedidoListado, 'tipoPedido'>[]): TipoFilterChip[] {
  const count = (tipo: TipoPedido): number => pedidos.filter((p) => p.tipoPedido === tipo).length;
  return [
    { filtro: 'TODOS', label: 'Todos', count: pedidos.length },
    { filtro: 'MESA', label: TIPO_LABEL.MESA, count: count('MESA') },
    { filtro: 'DELIVERY', label: TIPO_LABEL.DELIVERY, count: count('DELIVERY') },
    { filtro: 'RECOJO', label: TIPO_LABEL.RECOJO, count: count('RECOJO') },
  ];
}

export function filterByTipo(pedidos: readonly PedidoListado[], filtro: TipoFiltro): PedidoListado[] {
  return filtro === 'TODOS' ? [...pedidos] : pedidos.filter((p) => p.tipoPedido === filtro);
}

/** Orders per board column, keeping the input order. An estado that is not a board column is ignored. */
export function groupByColumn(pedidos: readonly PedidoListado[]): Record<BoardColumn, PedidoListado[]> {
  const groups: Record<BoardColumn, PedidoListado[]> = {
    PENDIENTE: [],
    EN_PREPARACION: [],
    LISTO: [],
    EN_ENTREGA: [],
  };
  for (const pedido of pedidos) {
    if (Object.hasOwn(groups, pedido.estado)) {
      groups[pedido.estado as BoardColumn].push(pedido);
    }
  }
  return groups;
}

// ------------------------------------------------------------------------------------- drag & drop

/** The card may be dropped on `target` only along a transition of the contract (CANCELADO also needs an unpaid order). */
export function canDrop(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
  target: EstadoPedido,
): boolean {
  if (!transitionsOf(pedido.tipoPedido, pedido.estado).includes(target)) {
    return false;
  }
  return target === 'CANCELADO' ? canCancel(pedido) : true;
}

export interface DropTarget {
  estado: EstadoPedido;
  allowed: boolean;
  /** Spanish explanation of a refusal; null when allowed or when it is the order's own column. */
  reason: string | null;
}

function refusalReason(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
  target: EstadoPedido,
): string | null {
  if (canDrop(pedido, target)) {
    return null;
  }
  if (target === 'EN_ENTREGA' && pedido.tipoPedido !== 'DELIVERY') {
    return 'Solo pedidos delivery';
  }
  if (
    target === 'CANCELADO' &&
    pedido.estadoPago === 'PAGADO' &&
    transitionsOf(pedido.tipoPedido, pedido.estado).includes('CANCELADO')
  ) {
    return PAID_CANCEL_REASON;
  }
  return `No disponible desde ${estadoLabel(pedido.estado)}`;
}

/** Verdict for every column (board and closed), so the board can lock the invalid ones while dragging. */
export function dropTargets(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
): DropTarget[] {
  return ALL_COLUMNS.map((estado) => ({
    estado,
    allowed: canDrop(pedido, estado),
    reason: estado === pedido.estado ? null : refusalReason(pedido, estado),
  }));
}

// ------------------------------------------------------------------------------------- "⋯ Mover a…"

export type MoveDirection = 'forward' | 'back' | 'done' | 'cancel';

export interface MoveMenuItem {
  estado: EstadoPedido;
  label: string;
  allowed: boolean;
  reason: string | null;
  /** Second line of the entry: the refusal reason, or "Sin cobro registrado" for an allowed Cancelar. */
  sublabel: string | null;
  /** True for the primary ("Siguiente") target. */
  next: boolean;
  direction: MoveDirection;
}

export interface MoveMenu {
  heading: string;
  items: MoveMenuItem[];
}

function directionOf(current: EstadoPedido, target: EstadoPedido): MoveDirection {
  if (target === 'CANCELADO') {
    return 'cancel';
  }
  if (target === 'ENTREGADO') {
    return 'done';
  }
  return ALL_COLUMNS.indexOf(target) < ALL_COLUMNS.indexOf(current) ? 'back' : 'forward';
}

/**
 * Entries of the "Mover {pedido} a…" menu: the primary target first, then the other allowed ones, then the
 * disabled ones (with their reason), and Cancelar pedido last. The order's own column is not listed.
 */
export function moveMenu(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'mesaId' | 'estado' | 'estadoPago'>,
): MoveMenu {
  const primary = primaryAction(pedido)?.estado ?? null;
  const entries = dropTargets(pedido).filter((t) => t.estado !== pedido.estado);
  const toItem = (t: DropTarget): MoveMenuItem => {
    const cancel = t.estado === 'CANCELADO';
    return {
      estado: t.estado,
      label: cancel ? 'Cancelar pedido' : estadoLabel(t.estado),
      allowed: t.allowed,
      reason: t.reason,
      sublabel: cancel && t.allowed ? 'Sin cobro registrado' : t.reason,
      next: t.allowed && t.estado === primary,
      direction: directionOf(pedido.estado, t.estado),
    };
  };
  const rank = (item: MoveMenuItem): number => (item.next ? 0 : item.allowed ? 1 : 2);
  const regular = entries
    .filter((t) => t.estado !== 'CANCELADO')
    .map(toItem)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
  const cancel = entries.filter((t) => t.estado === 'CANCELADO').map(toItem);
  return { heading: `Mover ${tipoLabel(pedido)} a…`, items: [...regular, ...cancel] };
}

export type MoveRequest = { kind: 'confirmar' } | { kind: 'estado'; estado: EstadoPedido };

/** The API call that performs a move: `confirmar` for PENDIENTE → EN_PREPARACION, PATCH estado otherwise. */
export function moveRequest(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
  target: EstadoPedido,
): MoveRequest {
  if (!canDrop(pedido, target)) {
    throw new Error(`Movimiento no permitido: ${pedido.estado} → ${target}`);
  }
  return pedido.estado === 'PENDIENTE' && target === 'EN_PREPARACION'
    ? { kind: 'confirmar' }
    : { kind: 'estado', estado: target };
}

export function moveSuccessMessage(pedido: Pick<PedidoListado, 'pedidoId'>, target: EstadoPedido): string {
  return transitionMessage(pedido.pedidoId, target);
}

// ------------------------------------------------------------------------------------------- card

const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
/** Lima is UTC-5 all year (no DST). */
const LIMA_OFFSET = '-05:00';

/**
 * Whole minutes since creation. `createdAt` has no zone and is Lima local time, so it is read as UTC-5 explicitly
 * (the browser zone is irrelevant). Never negative; 0 when the value is unreadable.
 */
export function elapsedMinutes(createdAt: string, now: Date): number {
  const iso = HAS_ZONE.test(createdAt) ? createdAt : `${createdAt}${LIMA_OFFSET}`;
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) {
    return 0;
  }
  return Math.max(0, Math.floor((now.getTime() - created) / 60_000));
}

/** "12 min" under an hour, "1 h 05 min" from an hour on. */
export function elapsedLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export interface CardView {
  titulo: string;
  numero: string;
  minutos: string;
  pago: string;
  pagado: boolean;
  total: string;
  observacion: string | null;
  primary: PedidoAction | null;
}

export function cardView(pedido: PedidoListado, now: Date): CardView {
  const observacion = pedido.observacion?.trim() ?? '';
  return {
    titulo: tipoLabel(pedido),
    numero: formatOrderNumber(pedido.pedidoId),
    minutos: elapsedLabel(elapsedMinutes(pedido.createdAt, now)),
    pago: estadoPagoLabel(pedido.estadoPago),
    pagado: pedido.estadoPago === 'PAGADO',
    total: formatMoney(pedido.total),
    observacion: observacion === '' ? null : observacion,
    primary: primaryAction(pedido),
  };
}

export interface ColumnHeader {
  label: string;
  count: number;
  /** Colour of the dot: the same variant as the estado badge. */
  dot: BadgeVariant;
}

export function columnHeader(estado: EstadoPedido, count: number): ColumnHeader {
  return { label: estadoLabel(estado), count, dot: estadoVariant(estado) };
}

/** `yyyy-MM-dd` of today in Lima: the `fecha` filter of the Entregado / Cancelado counts. */
export function todayLima(now: Date): string {
  return limaToday(now);
}
