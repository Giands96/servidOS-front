import { MeResponse } from '../../../core/auth/auth.types';
import { can } from '../../../core/auth/domain/permissions.rules';
import { Page } from '../../../core/http/api.types';
import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { IconName } from '../../../shared/ui/icon/icon.component';
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
export function transitionsOf(tipo: TipoPedido, estado: EstadoPedido): readonly EstadoPedido[] {
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

/**
 * Who moves the orders: `completo` is the whole contract matrix (ADMINISTRADOR, RECEPCION); `salon` is the waiter
 * (MESERO), limited by `movimientoPermitido`.
 */
export type AlcancePedidos = 'completo' | 'salon';

export function alcanceDe(user: Pick<MeResponse, 'rol' | 'restauranteId'> | null): AlcancePedidos {
  return can(user, 'pedidos.gestionar') ? 'completo' : 'salon';
}

/**
 * Role filter on top of the contract transitions, mirror of CambiarEstadoPedidoUseCase: the waiter confirms
 * (PENDIENTE → EN_PREPARACION, any tipo) and delivers a MESA order that is LISTO; nothing else, never a cancel.
 * The backend stays authoritative (403).
 */
export function movimientoPermitido(
  alcance: AlcancePedidos,
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado'>,
  target: EstadoPedido,
): boolean {
  if (alcance === 'completo') {
    return true;
  }
  const confirma = pedido.estado === 'PENDIENTE' && target === 'EN_PREPARACION';
  const entregaEnMesa = pedido.tipoPedido === 'MESA' && pedido.estado === 'LISTO' && target === 'ENTREGADO';
  return confirma || entregaEnMesa;
}

/** Cancel is allowed when the contract has a CANCELADO transition, the order is not paid and the role may cancel. */
export function canCancel(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado' | 'estadoPago'>,
  alcance: AlcancePedidos = 'completo',
): boolean {
  return (
    transitionsOf(pedido.tipoPedido, pedido.estado).includes('CANCELADO') &&
    pedido.estadoPago !== 'PAGADO' &&
    movimientoPermitido(alcance, pedido, 'CANCELADO')
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

/** The single forward action a list row offers, or null for a final estado or a move the role may not make. */
export function primaryAction(
  pedido: Pick<PedidoListado, 'tipoPedido' | 'estado'>,
  alcance: AlcancePedidos = 'completo',
): PedidoAction | null {
  const [estado] = nextEstados(pedido.tipoPedido, pedido.estado);
  if (estado === undefined || !movimientoPermitido(alcance, pedido, estado)) {
    return null;
  }
  return {
    estado,
    label: ACTION_LABEL[estado] ?? estadoLabel(estado),
    viaConfirmar: pedido.estado === 'PENDIENTE',
  };
}

const EM_DASH = '—';

/** Own-key lookup: a value outside the table (or an inherited key such as "constructor") yields `undefined`. */
function ownValue<V>(table: Readonly<Record<string, V>>, key: unknown): V | undefined {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined;
}

/** Raw value as display text for a value outside the unions; an em dash when it is empty or null-ish. */
function rawText(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text === '' ? EM_DASH : text;
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

/** Rows come from an unvalidated API answer: an unknown estado shows its raw text. */
export function estadoLabel(estado: EstadoPedido): string {
  return ownValue(ESTADO_LABEL, estado) ?? rawText(estado);
}

/** An unknown estado gets the neutral badge. */
export function estadoVariant(estado: EstadoPedido): BadgeVariant {
  return ownValue(ESTADO_VARIANT, estado) ?? 'neutral';
}

export function estadoPagoLabel(estadoPago: EstadoPago | null): string {
  switch (estadoPago) {
    case 'PAGADO':
      return 'Pagado';
    case 'REEMBOLSADO':
      return 'Reembolsado';
    case null:
      return 'Sin cobrar';
    default:
      return rawText(estadoPago);
  }
}

/** Client-side guard: the backend answers 500 (not 400) to an unknown enum value. */
export function isEstadoPedido(value: unknown): value is EstadoPedido {
  return ESTADOS_PEDIDO.includes(value as EstadoPedido);
}

/** Plain label of each tipo (no mesa number); also the wording of the new-order toggle. */
export const TIPO_LABEL: Readonly<Record<TipoPedido, string>> = {
  MESA: 'Mesa',
  DELIVERY: 'Delivery',
  RECOJO: 'Recojo',
};

/** "Mesa 7" from `numeroMesa`; just "Mesa" while the number is unknown (never the `mesaId` database id). */
export function tipoLabel(order: Pick<PedidoListado, 'tipoPedido' | 'numeroMesa'>): string {
  switch (order.tipoPedido) {
    case 'MESA':
      return order.numeroMesa == null ? TIPO_LABEL.MESA : `${TIPO_LABEL.MESA} ${order.numeroMesa}`;
    case 'DELIVERY':
      return TIPO_LABEL.DELIVERY;
    case 'RECOJO':
      return TIPO_LABEL.RECOJO;
    default:
      return rawText(order.tipoPedido);
  }
}

const TIPO_ICON: Readonly<Record<TipoPedido, IconName>> = {
  MESA: 'utensils',
  DELIVERY: 'bike',
  RECOJO: 'bag',
};

/** Icon of a tipo, or null for a value outside the union (own-key lookup, like the other display helpers). */
export function tipoIcon(tipo: TipoPedido): IconName | null {
  return ownValue(TIPO_ICON, tipo) ?? null;
}

export function formatOrderNumber(pedidoId: number): string {
  return `#${String(pedidoId).padStart(4, '0')}`;
}

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

/** Two decimals with comma thousands separators ("18,452.50"); rounds like `toFixed`. Expects a finite number. */
export function formatAmount(amount: number): string {
  const fixed = amount.toFixed(2);
  const sign = fixed.startsWith('-') ? '-' : '';
  const [integer, decimals] = fixed.slice(sign.length).split('.');
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`;
}

/** Peruvian soles with two decimals ("S/ 18,452.50"); an em dash when the amount is not a finite number. */
export function formatMoney(amount: number): string {
  return Number.isFinite(amount) ? `S/ ${formatAmount(amount)}` : EM_DASH;
}

/**
 * Whether the list offers the "Cobrar" shortcut: never charged and not cancelled, any other estado
 * (same rule as the backend `porCobrar`; ENTREGADO without payment is valid).
 */
export function isCobrable(pedido: Pick<PedidoListado, 'estado' | 'estadoPago'>): boolean {
  return pedido.estadoPago === null && pedido.estado !== 'CANCELADO';
}

/** Text of the "Cobrar" shortcut ("Cobrar S/ 72.00"). */
export function cobrarLabel(total: number): string {
  return `Cobrar ${formatMoney(total)}`;
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

/** Toast text after a successful transition. Total: an estado outside the union gets a generic text. */
export function transitionMessage(pedidoId: number, estado: EstadoPedido): string {
  const label = ownValue(ESTADO_LABEL, estado);
  return label === undefined
    ? `${formatOrderNumber(pedidoId)} actualizado`
    : `${formatOrderNumber(pedidoId)} ahora está ${label.toLowerCase()}`;
}

/** Copy of the cancel confirmation; it names the order so the wrong row is not cancelled by mistake. */
export function cancelCopy(pedido: Pick<PedidoListado, 'pedidoId' | 'tipoPedido' | 'numeroMesa'>): {
  heading: string;
  message: string;
} {
  const number = formatOrderNumber(pedido.pedidoId);
  return {
    heading: `Cancelar pedido ${number}`,
    message: `Se cancelará el pedido ${number} (${tipoLabel(pedido)}). Esta acción no se puede deshacer.`,
  };
}

/**
 * A list row accepts no action while its transition is in flight AND, once applied, until the list reload answers:
 * in between, the row still shows its old estado, so a second click would re-send a transition already done.
 */
export function isRowBusy(
  pedidoId: number,
  inFlight: ReadonlySet<number>,
  awaitingReload: ReadonlySet<number>,
): boolean {
  return inFlight.has(pedidoId) || awaitingReload.has(pedidoId);
}

/**
 * Whether a rejected transition should reload the current view. An HTTP 4xx most likely means the row is stale
 * (the kitchen already advanced it, someone else cancelled or charged it), so the list must converge. A network
 * error (status 0) or a 5xx says nothing about the row: only the toast is shown.
 */
export function shouldReloadAfterRejection(status: number): boolean {
  return status >= 400 && status < 500;
}

export type LoadFailureView = 'keep-rows' | 'error-panel';

/**
 * What a failed list request shows. A reload of the SAME view (Actualizar, or the automatic reload after an
 * action) over rows that are already loaded keeps those rows and leaves the toast to report the error; the full
 * error panel is for loads with no data to show (first load, tab change, page change).
 */
export function failedLoadView(load: { hadData: boolean; sameView: boolean }): LoadFailureView {
  return load.hadData && load.sameView ? 'keep-rows' : 'error-panel';
}
