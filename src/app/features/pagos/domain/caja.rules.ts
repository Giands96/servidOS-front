import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { IconName } from '../../../shared/ui/icon/icon.component';
import {
  estadoLabel,
  estadoVariant,
  formatMoney,
  formatOrderNumber,
  tipoIcon,
  tipoLabel,
} from '../../pedidos/domain/pedidos.rules';
import { PedidoListado } from '../../pedidos/pedidos.types';
import { MetodoPago, Pago, RegistrarPagoRequest } from '../pagos.types';

/** Icons the method tiles need; the page writer maps each to the shared icon set. */
export type MetodoIcon = 'banknote' | 'creditCard' | 'smartphone' | 'wallet';

export interface MetodoOption {
  metodo: MetodoPago;
  label: string;
  icon: MetodoIcon;
}

/** Method tiles in design order. */
export const METODOS_PAGO: readonly MetodoOption[] = [
  { metodo: 'EFECTIVO', label: 'Efectivo', icon: 'banknote' },
  { metodo: 'TARJETA_CREDITO', label: 'Tarjeta crédito', icon: 'creditCard' },
  { metodo: 'TARJETA_DEBITO', label: 'Tarjeta débito', icon: 'creditCard' },
  { metodo: 'YAPE', label: 'Yape', icon: 'smartphone' },
  { metodo: 'PLIN', label: 'Plin', icon: 'smartphone' },
  { metodo: 'OTROS', label: 'Otros', icon: 'wallet' },
];

export const referenciaHint = 'Para tarjeta, Yape o Plin ingresa el N.º de voucher u operación (opcional).';

const REFERENCIA_MAX = 100;
const MONTO_PATTERN = /^\d+(\.\d{1,2})?$/;
const BILLS: readonly number[] = [10, 20, 50, 100, 200];
const MAX_ROUND_AMOUNTS = 3;
const ROUND_STEP = 50;

/** Soles to integer cents, so sums and comparisons carry no float noise. */
const toCents = (soles: number): number => Math.round(soles * 100);

export function metodoLabel(metodo: MetodoPago): string {
  return METODOS_PAGO.find((o) => o.metodo === metodo)?.label ?? String(metodo);
}

/** Every non-cash method may carry a voucher or operation number. */
export function pideReferencia(metodo: MetodoPago): boolean {
  return metodo !== 'EFECTIVO';
}

/**
 * Reads an amount typed by the cashier: "100", "100.5", "100,50" or " S/ 100.00 ". At most two decimals,
 * never negative; anything else is `null`.
 */
export function parseMonto(text: string): number | null {
  const cleaned = text.replace(/^\s*S\/\s*/i, '').trim().replace(',', '.');
  return MONTO_PATTERN.test(cleaned) ? Number(cleaned) : null;
}

/** Change to hand back (soles), or `null` when no amount was given or it does not cover the total. */
export function vueltoPreview(totalSoles: number, entregado: number | null): number | null {
  if (entregado === null) {
    return null;
  }
  const diff = toCents(entregado) - toCents(totalSoles);
  return diff < 0 ? null : diff / 100;
}

export interface QuickAmount {
  label: string;
  monto: number;
}

/** "Exacto" plus up to three round amounts above the total (the next multiples of 50 from S/ 200 up). */
export function quickAmounts(total: number): QuickAmount[] {
  const above = BILLS.filter((b) => b > total);
  const rounds =
    total >= BILLS[BILLS.length - 1]
      ? Array.from({ length: MAX_ROUND_AMOUNTS }, (_, i) => (Math.floor(total / ROUND_STEP) + 1 + i) * ROUND_STEP)
      : above.slice(0, MAX_ROUND_AMOUNTS);
  return [{ label: 'Exacto', monto: total }, ...rounds.map((monto) => ({ label: `S/ ${monto}`, monto }))];
}

/** Form state of the charge panel; the amount keeps its raw text. */
export interface CobroDraft {
  metodo: MetodoPago | null;
  montoEntregado: string;
  referencia: string;
}

export type CobroField = keyof CobroDraft;

export type CobroErrors = Partial<Record<CobroField, string>>;

export function emptyCobroDraft(): CobroDraft {
  return { metodo: 'EFECTIVO', montoEntregado: '', referencia: '' };
}

/** Field errors in Spanish; an empty object means the draft can be sent. */
export function validateCobro(d: CobroDraft, total: number): CobroErrors {
  const errors: CobroErrors = {};
  if (d.metodo === null) {
    errors.metodo = 'Elige un método de pago';
  } else if (d.metodo === 'EFECTIVO') {
    if (d.montoEntregado.trim() === '') {
      errors.montoEntregado = 'Ingresa el monto entregado';
    } else {
      const monto = parseMonto(d.montoEntregado);
      if (monto === null) {
        errors.montoEntregado = 'Ingresa un monto válido (ej. 100.00)';
      } else if (toCents(monto) < toCents(total)) {
        errors.montoEntregado = 'El monto no alcanza para el total';
      }
    }
  }
  if (d.referencia.trim().length > REFERENCIA_MAX) {
    errors.referencia = `Máximo ${REFERENCIA_MAX} caracteres`;
  }
  return errors;
}

/**
 * Builds the POST /pagos body. Cash sends the amount handed over (no reference); the other methods send the
 * trimmed reference only when it is not blank. Throws for an invalid draft: the page validates first.
 */
export function toRegistrarPagoRequest(pedidoId: number, d: CobroDraft, total: number): RegistrarPagoRequest {
  if (d.metodo === null || Object.keys(validateCobro(d, total)).length > 0) {
    throw new Error('Cobro inválido: llama a validateCobro antes de toRegistrarPagoRequest');
  }
  if (d.metodo === 'EFECTIVO') {
    return { pedidoId, metodoPago: 'EFECTIVO', montoEntregado: parseMonto(d.montoEntregado) as number };
  }
  const referencia = d.referencia.trim();
  return referencia === ''
    ? { pedidoId, metodoPago: d.metodo }
    : { pedidoId, metodoPago: d.metodo, referenciaExterna: referencia };
}

/** Backend validation field names (422) to the draft keys they belong under. */
const SERVER_FIELDS: ReadonlyMap<string, CobroField> = new Map<string, CobroField>([
  ['montoEntregado', 'montoEntregado'],
  ['referenciaExterna', 'referencia'],
  ['metodoPago', 'metodo'],
]);

/**
 * Errors to show under the charge fields for a rejected payment: a 400 that mentions the amount goes under
 * "Monto entregado"; a 422 carries "campo: mensaje; campo: mensaje", mapped per field. Anything else is `{}`
 * and the page shows a toast.
 */
export function cobroFieldErrors(status: number, message: string | null): CobroErrors {
  if (message === null) {
    return {};
  }
  if (status === 400) {
    return /monto/i.test(message) ? { montoEntregado: message } : {};
  }
  if (status === 422) {
    const errors: CobroErrors = {};
    for (const part of message.split('; ')) {
      const colon = part.indexOf(':');
      const field = colon < 0 ? undefined : SERVER_FIELDS.get(part.slice(0, colon).trim());
      if (field !== undefined) {
        errors[field] = part.slice(colon + 1).trim();
      }
    }
    return errors;
  }
  return {};
}

export interface PorCobrarCard {
  pedidoId: number;
  numero: string;
  titulo: string;
  icon: IconName | null;
  estado: string;
  estadoVariant: BadgeVariant;
  total: string;
}

export function porCobrarCard(pedido: PedidoListado): PorCobrarCard {
  return {
    pedidoId: pedido.pedidoId,
    numero: formatOrderNumber(pedido.pedidoId),
    titulo: tipoLabel(pedido),
    icon: tipoIcon(pedido.tipoPedido),
    estado: estadoLabel(pedido.estado),
    estadoVariant: estadoVariant(pedido.estado),
    total: formatMoney(pedido.total),
  };
}

export function porCobrarHeading(total: number): string {
  return `POR COBRAR · ${total}`;
}

export function cobroHeading(pedido: Pick<PedidoListado, 'pedidoId' | 'tipoPedido' | 'mesaId'>): string {
  return `Cobrar pedido ${formatOrderNumber(pedido.pedidoId)} · ${tipoLabel(pedido)}`;
}

export function submitLabel(total: number): string {
  return `Registrar pago · ${formatMoney(total)}`;
}

/** Toast after a successful charge: cash with change shows the server's change, otherwise the method. */
export function pagoRegistradoMessage(pago: Pago, pedido: Pick<PedidoListado, 'pedidoId'>): string {
  const numero = formatOrderNumber(pedido.pedidoId);
  const detail =
    pago.metodoPago === 'EFECTIVO' && pago.vuelto !== null && pago.vuelto > 0
      ? `Vuelto ${formatMoney(pago.vuelto)}`
      : metodoLabel(pago.metodoPago);
  return `Pago registrado · ${numero} · ${detail}`;
}

export function ultimoPagoLabel(pago: Pago, pedido: Pick<PedidoListado, 'pedidoId'>): string {
  return `Último pago: ${formatOrderNumber(pedido.pedidoId)} · ${metodoLabel(pago.metodoPago)} · ${formatMoney(pago.monto)}`;
}

/** Positive integer from the `?pedido=` query, or `null`. */
export function parsePedidoParam(value: string | null): number | null {
  const text = value?.trim() ?? '';
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
