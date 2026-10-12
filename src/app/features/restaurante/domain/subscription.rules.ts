import { Suscripcion } from '../../../core/auth/data/suscripcion.api';
import { BadgeVariant } from '../../../shared/ui/badge/badge.component';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-09-14[T...]" -> "14 sep 2026". Non-ISO or impossible dates are returned untouched. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match === null) {
    return iso;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return iso;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatPeriod(inicio: string, fin: string): string {
  return `${formatDate(inicio)} – ${formatDate(fin)}`;
}

/** wa.me link with a prefilled message; null when the phone has no digits (number not configured). */
export function whatsappPaymentLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits === '' ? null : `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Prefilled WhatsApp text confirming the Yape payment; generic when the restaurant name is unknown. */
export function paymentConfirmationMessage(restaurante: string | null): string {
  const nombre = restaurante?.trim() ?? '';
  return nombre === ''
    ? 'Hola, realicé el pago de la suscripción de ServidOS.'
    : `Hola, realicé el pago de la suscripción de ServidOS del restaurante ${nombre}.`;
}

export function estadoLabel(estado: Suscripcion['estado']): string {
  return estado === 'ACTIVA' ? 'Activa' : 'Cancelada';
}

export function estadoVariant(estado: Suscripcion['estado']): BadgeVariant {
  return estado === 'ACTIVA' ? 'ok' : 'danger';
}
