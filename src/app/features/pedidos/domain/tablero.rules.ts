import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { limaToday } from '../../plataforma/domain/plataforma.rules';
import { EstadoPedido, PedidoListado, PedidosQuery, TipoPedido } from '../pedidos.types';
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

// ----------------------------------------------------------------------------------------- view + data

export type Vista = 'tablero' | 'lista';

/** The `?vista=` query value: only "lista" selects the list; anything else is the board (the default view). */
export function parseVista(raw: unknown): Vista {
  return raw === 'lista' ? 'lista' : 'tablero';
}

/** The backend caps `size` at 100. */
const COLUMN_SIZE = 100;

/** Request of one board column: its first 100 orders. */
export function columnQuery(column: BoardColumn): PedidosQuery {
  return { estado: column, page: 0, size: COLUMN_SIZE };
}

/** Request of a closed column's count: only `totalElements` of today's orders is read, so one row is enough. */
export function closedCountQuery(estado: EstadoPedido, now: Date): PedidosQuery {
  return { estado, fecha: todayLima(now), page: 0, size: 1 };
}

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

export type DropStateKind = 'idle' | 'origin' | 'allowed' | 'locked';

export interface ColumnDropState {
  kind: DropStateKind;
  /** Why a locked column refuses the dragged order; null otherwise. */
  reason: string | null;
}

/** How a column looks while `dragged` is being dragged (`null`: nothing is). */
export function columnDropState(
  dragged: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'> | null,
  estado: EstadoPedido,
): ColumnDropState {
  if (dragged === null) {
    return { kind: 'idle', reason: null };
  }
  if (dragged.estado === estado) {
    return { kind: 'origin', reason: null };
  }
  const target = dropTargets(dragged).find((t) => t.estado === estado);
  return target?.allowed === true
    ? { kind: 'allowed', reason: null }
    : { kind: 'locked', reason: target?.reason ?? null };
}

/** Caption of a collapsed column: today's scope while idle, the drop invitation or the refusal while dragging. */
export function closedColumnHint(estado: EstadoPedido, state: ColumnDropState): string {
  if (state.kind === 'allowed') {
    return estado === 'CANCELADO' ? 'Soltar para cancelar' : 'Soltar para marcar entregado';
  }
  if (state.kind === 'locked') {
    return state.reason ?? 'No disponible';
  }
  return 'Hoy';
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
  pedido: Pick<PedidoListado, 'tipoPedido' | 'numeroMesa' | 'estado' | 'estadoPago'>,
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

// ------------------------------------------------------------------------------------- menu popover

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Fixed position of the "⋯" popover: under its button, right-aligned to it, flipped above when there is no room
 * below (and room above), always kept `margin` px inside the viewport.
 */
export function menuPlacement(
  anchor: Rect,
  menu: Size,
  viewport: Size,
  margin = 8,
  gap = 4,
): { top: number; left: number } {
  const maxLeft = Math.max(margin, viewport.width - menu.width - margin);
  const left = Math.min(Math.max(anchor.right - menu.width, margin), maxLeft);
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - menu.height;
  const fitsBelow = below + menu.height <= viewport.height - margin;
  const top = fitsBelow || above < margin ? below : above;
  return { top: Math.max(margin, Math.min(top, viewport.height - margin - menu.height)), left };
}

/**
 * Whether a `resize` should close the "⋯" popover. Mobile browsers fire `resize` when the URL bar shows or hides
 * (height only), which must not dismiss the menu; a width change (rotation, split screen) invalidates its position.
 */
export function shouldCloseOnResize(previousWidth: number, nextWidth: number): boolean {
  return previousWidth !== nextWidth;
}

/**
 * Arrow-key navigation of the menu: the next enabled entry in `step` direction, wrapping around. From `-1`
 * (nothing focused) it lands on the first (down) or last (up) enabled entry. `-1` when none is enabled.
 */
export function nextEnabledIndex(items: readonly { allowed: boolean }[], current: number, step: 1 | -1): number {
  const count = items.length;
  const start = current >= 0 ? current : step > 0 ? -1 : count;
  for (let offset = 1; offset <= count; offset++) {
    const index = (((start + step * offset) % count) + count) % count;
    if (items[index].allowed) {
      return index;
    }
  }
  return -1;
}
