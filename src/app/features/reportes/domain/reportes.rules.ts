import { Page } from '../../../core/http/api.types';
import { tipoLabel } from '../../pedidos/domain/pedidos.rules';
import { FormatoExport, Periodo, TipoReporte, VentaReporte } from '../reportes.types';

/*
 * Pure rules of the reports screen. Dates travel as `yyyy-MM-dd` strings and all calendar math runs on
 * year/month/day numbers (never on a `Date` parsed from the string, which would read it as UTC). Month and weekday
 * names are fixed arrays so the output never depends on the runtime ICU locale.
 */

const EM_DASH = '—';
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const MONTHS_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;
/** Indexed by `getUTCDay()`: Sunday first. */
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

const two = (n: number): string => String(n).padStart(2, '0');

function parseYmd(fecha: string): Ymd {
  const [y, m, d] = fecha.split('-').map(Number);
  return { y, m, d };
}

const formatYmd = ({ y, m, d }: Ymd): string => `${y}-${two(m)}-${two(d)}`;

const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

const weekdayOf = ({ y, m, d }: Ymd): string => WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

/** "23 oct 2026" */
const dayMonthYear = ({ y, m, d }: Ymd): string => `${d} ${MONTHS_SHORT[m - 1]} ${y}`;

/** Which parts the two ends of a range share: decides how much of the start date can be dropped. */
function sharedParts(from: Ymd, to: Ymd): { year: boolean; month: boolean } {
  return { year: from.y === to.y, month: from.y === to.y && from.m === to.m };
}

/** "19 – 25 oct 2026", "28 sep – 4 oct 2026", "29 dic 2025 – 4 ene 2026". */
function compactRange(from: Ymd, to: Ymd, joiner: string, prefix: string): string {
  const shared = sharedParts(from, to);
  const start = shared.month
    ? `${from.d}`
    : shared.year
      ? `${from.d} ${MONTHS_SHORT[from.m - 1]}`
      : dayMonthYear(from);
  return `${prefix}${start}${joiner}${dayMonthYear(to)}`;
}

/** Header label of the range: "Jue 23 oct 2026", "19 – 25 oct 2026", "Octubre 2026". */
export function rangeLabel(periodo: Periodo, desde: string, hasta: string): string {
  const from = parseYmd(desde);
  const to = parseYmd(hasta);
  switch (periodo) {
    case 'DIARIO':
      return `${weekdayOf(from)} ${dayMonthYear(from)}`;
    case 'SEMANAL':
      return compactRange(from, to, ' – ', '');
    case 'MENSUAL':
      return `${MONTHS_LONG[from.m - 1]} ${from.y}`;
  }
}

/** Caption under the total card: "Jue 23 oct 2026", "Semana del 19 al 25 oct 2026", "Del 1 al 31 oct 2026". */
export function periodCaption(periodo: Periodo, desde: string, hasta: string): string {
  const from = parseYmd(desde);
  const to = parseYmd(hasta);
  switch (periodo) {
    case 'DIARIO':
      return rangeLabel(periodo, desde, hasta);
    case 'SEMANAL':
      return compactRange(from, to, ' al ', 'Semana del ');
    case 'MENSUAL':
      return compactRange(from, to, ' al ', 'Del ');
  }
}

/**
 * Reference date of the previous (-1) or next (+1) period. Day moves 1 day, week 7 days, month 1 month keeping the
 * day of the month, clamped to the length of the target month (31 mar -> 28 feb).
 */
export function shiftFecha(periodo: Periodo, fecha: string, dir: -1 | 1): string {
  const { y, m, d } = parseYmd(fecha);
  if (periodo === 'MENSUAL') {
    const index = y * 12 + (m - 1) + dir;
    const ny = Math.floor(index / 12);
    const nm = (index % 12) + 1;
    return formatYmd({ y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) });
  }
  const step = periodo === 'SEMANAL' ? 7 : 1;
  const moved = new Date(Date.UTC(y, m - 1, d + dir * step));
  return formatYmd({ y: moved.getUTCFullYear(), m: moved.getUTCMonth() + 1, d: moved.getUTCDate() });
}

/** The "next" arrow is disabled while the period already contains today (or lies ahead). `yyyy-MM-dd` sorts as text. */
export function canGoNext(hasta: string, today: string): boolean {
  return hasta < today;
}

/** `yyyy-MM-dd` of an instant in America/Lima (the backend's reference zone), whatever the browser zone is. */
export function todayInLima(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export type VentaDateVariant = 'full' | 'short' | 'phone';

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

/**
 * Payment moment of a sale. `fechaPago` has no zone and is already Lima time, so its clock parts are printed as they
 * come, with no zone conversion. full "Jue 23 oct 2026 · 14:52", short "23 oct · 14:52", phone "Jue 23 oct · 14:52".
 * An unreadable value shows an em dash.
 */
export function ventaDateTime(fechaPago: string, variant: VentaDateVariant): string {
  const match = DATETIME_PATTERN.exec(fechaPago);
  if (match === null) {
    return EM_DASH;
  }
  const date: Ymd = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  const time = `${match[4]}:${match[5]}`;
  const dayMonth = `${date.d} ${MONTHS_SHORT[date.m - 1]}`;
  switch (variant) {
    case 'full':
      return `${weekdayOf(date)} ${dayMonthYear(date)} · ${time}`;
    case 'short':
      return `${dayMonth} · ${time}`;
    case 'phone':
      return `${weekdayOf(date)} ${dayMonth} · ${time}`;
  }
}

/** "Mesa 4" when the table is known, "Mesa" otherwise (the contract has no table yet), "Delivery", "Recojo". */
export function tipoVentaLabel(venta: Pick<VentaReporte, 'tipoPedido' | 'mesaId'>): string {
  return tipoLabel({ tipoPedido: venta.tipoPedido, mesaId: venta.mesaId ?? null });
}

/** Share of the top amount, 0..1, for the ranking bars. 0 when there is no positive top amount. */
export function barRatio(monto: number, maxMonto: number): number {
  if (!(maxMonto > 0)) {
    return 0;
  }
  return Math.min(Math.max(monto / maxMonto, 0), 1);
}

/**
 * File name used when the response carries no Content-Disposition. Same naming as the backend:
 * `reporte-{ventas|productos}-{diario|semanal|mensual}-{desde}.{xlsx|pdf}`; the date is left out when unknown.
 */
export function fallbackFilename(
  reporte: TipoReporte,
  periodo: Periodo,
  desde: string | undefined,
  formato: FormatoExport,
): string {
  const parts = ['reporte', reporte, periodo.toLowerCase(), ...(desde === undefined ? [] : [desde])];
  return `${parts.join('-')}.${formato.toLowerCase()}`;
}

/** Footer of the sales table: "Mostrando 1–100 de 214 ventas" (phone "1–100 de 214"); "Sin ventas" when empty. */
export function pageSummary(page: Pick<Page<unknown>, 'content' | 'number' | 'size' | 'totalElements'>, variant: 'full' | 'phone'): string {
  if (page.totalElements === 0 || page.content.length === 0) {
    return 'Sin ventas';
  }
  const from = page.number * page.size + 1;
  const to = from + page.content.length - 1;
  const range = `${from}–${to} de ${page.totalElements}`;
  return variant === 'phone' ? range : `Mostrando ${range} ${page.totalElements === 1 ? 'venta' : 'ventas'}`;
}

/** Phone pager text "Pág. 1 de 3"; an empty result still reads "Pág. 1 de 1". */
export function pageIndicator(page: Pick<Page<unknown>, 'number' | 'totalPages'>): string {
  return `Pág. ${page.number + 1} de ${Math.max(page.totalPages, 1)}`;
}
