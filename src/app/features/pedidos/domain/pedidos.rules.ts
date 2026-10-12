import { Page } from '../../../core/http/api.types';
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

/**
 * Table lookup that survives a value outside the unions (the row comes from an unvalidated API answer):
 * an unknown estado or tipo has no transitions, and inherited keys such as "constructor" are not read.
 */
function transitionsOf(tipo: TipoPedido, estado: EstadoPedido): readonly EstadoPedido[] {
  if (!Object.hasOwn(TRANSITIONS, estado)) {
    return [];
  }
  const byTipo = TRANSITIONS[estado];
  return Object.hasOwn(byTipo, tipo) ? byTipo[tipo] : [];
}

/** Forward transitions only (CANCELADO excluded, see `canCancel`). Returns a new array. */
export function nextEstados(tipo: TipoPedido, estado: EstadoPedido): EstadoPedido[] {
  return transitionsOf(tipo, estado).filter((next) => next !== 'CANCELADO');
}

/** Cancel is allowed when the contract has a CANCELADO transition and the order is not paid. */
export function canCancel(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
): boolean {
  return (
    transitionsOf(pedido.tipoPedido, pedido.estado).includes('CANCELADO') &&
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

const EM_DASH = '—';

const two = (n: number): string => String(n).padStart(2, '0');

/** HH:mm:ss in local time. */
export function formatClock(date: Date): string {
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

/**
 * Creation time of a list row. `createdAt` has no zone: it is Lima local time and is read as local time
 * (never append `Z`). Today shows HH:mm; another day adds dd/MM. An unreadable value shows an em dash.
 */
export function formatCreatedAt(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return EM_DASH;
  }
  const time = formatClock(created).slice(0, 5);
  const sameDay =
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate();
  return sameDay ? time : `${two(created.getDate())}/${two(created.getMonth() + 1)} ${time}`;
}

/** Peruvian soles with two decimals ("S/ 86.00"); an em dash when the amount is not a finite number. */
export function formatMoney(amount: number): string {
  return Number.isFinite(amount) ? `S/ ${amount.toFixed(2)}` : EM_DASH;
}

/** The order observation, or an em dash when it is empty (the list rows carry no items). */
export function observacionText(observacion: string | null): string {
  const text = observacion?.trim() ?? '';
  return text === '' ? EM_DASH : text;
}

export interface EstadoTab {
  /** `null` is "Todos": the list is requested without an `estado` filter. */
  estado: EstadoPedido | null;
  label: string;
}

/** Tabs of the list: "Todos" plus one per estado in flow order. No counts: the API has none per estado. */
export const ESTADO_TABS: readonly EstadoTab[] = [
  { estado: null, label: 'Todos' },
  ...ESTADOS_PEDIDO.map((estado) => ({ estado, label: estadoLabel(estado) })),
];

export function emptyHeading(estado: EstadoPedido | null): string {
  return estado === null
    ? 'Todavía no hay pedidos'
    : `No hay pedidos en estado ${estadoLabel(estado)}`;
}

export interface PagerView {
  visible: boolean;
  text: string;
  canPrev: boolean;
  canNext: boolean;
}

/** Pager state from the Spring page counters (`number` is zero-based). Hidden for a single page. */
export function pagerView(page: Pick<Page<unknown>, 'number' | 'totalPages' | 'first' | 'last'>): PagerView {
  return {
    visible: page.totalPages > 1,
    text: `Página ${page.number + 1} de ${page.totalPages}`,
    canPrev: !page.first,
    canNext: !page.last,
  };
}

/**
 * When a reload lands past the end (the last row of the last page moved out of the tab), the page index
 * to request instead; `null` when the page is fine. The result is always smaller than `number`, so it
 * cannot loop.
 */
export function fallbackPage(page: Pick<Page<unknown>, 'number' | 'totalPages'>): number | null {
  if (page.number > 0 && page.number >= page.totalPages) {
    return Math.max(0, page.totalPages - 1);
  }
  return null;
}

/** Toast text after a successful transition. */
export function transitionMessage(pedidoId: number, estado: EstadoPedido): string {
  return `${formatOrderNumber(pedidoId)} ahora está ${estadoLabel(estado).toLowerCase()}`;
}

/** Copy of the cancel confirmation; it names the order so the wrong row is not cancelled by mistake. */
export function cancelCopy(pedido: Pick<PedidoListado, 'pedidoId' | 'tipoPedido' | 'mesaId'>): {
  heading: string;
  message: string;
} {
  const number = formatOrderNumber(pedido.pedidoId);
  return {
    heading: `Cancelar pedido ${number}`,
    message: `Se cancelará el pedido ${number} (${tipoLabel(pedido)}). Esta acción no se puede deshacer.`,
  };
}
