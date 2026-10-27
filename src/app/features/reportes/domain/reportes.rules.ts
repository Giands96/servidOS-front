import { Page } from '../../../core/http/api.types';
import { tipoLabel } from '../../pedidos/domain/pedidos.rules';
import { FormatoExport, OrdenVentas, Periodo, TipoReporte, VentaReporte } from '../reportes.types';

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

/** "Mesa 4" from `numeroMesa`, "Mesa" while the number is unknown (never the id), "Delivery", "Recojo". */
export function tipoVentaLabel(venta: Pick<VentaReporte, 'tipoPedido' | 'numeroMesa'>): string {
  return tipoLabel({ tipoPedido: venta.tipoPedido, numeroMesa: venta.numeroMesa ?? null });
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

/** Tab of the screen; the same word names the report to export. */
export type ReportesTab = TipoReporte;

/** Everything the screen shows depends on these five values; they live in the URL. */
export interface ReportesView {
  periodo: Periodo;
  /** Any day of the period, `yyyy-MM-dd`, never after today. */
  fecha: string;
  tab: ReportesTab;
  orden: OrdenVentas;
  /** 0-based page of the sales table. */
  page: number;
}

const PERIODOS: readonly Periodo[] = ['DIARIO', 'SEMANAL', 'MENSUAL'];
const ORDENES: readonly OrdenVentas[] = ['MAS_RECIENTES', 'MAS_ANTIGUOS', 'MAYOR_VENTA'];
const DEFAULT_PERIODO: Periodo = 'SEMANAL';
const DEFAULT_TAB: ReportesTab = 'ventas';
const DEFAULT_ORDEN: OrdenVentas = 'MAS_RECIENTES';
const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PAGE_PATTERN = /^[1-9]\d{0,8}$/;

/** A calendar date written `yyyy-MM-dd` that exists (no 2026-02-30). */
function isRealYmd(value: string): boolean {
  const match = YMD_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const { y, m, d } = parseYmd(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Reads the screen state from the query params, each value on its own: an unknown or malformed one falls back to
 * its default (week, today, Ventas, newest first, first page) instead of failing. `page` travels 1-based.
 */
export function parseReportesView(get: (key: string) => string | null, today: string): ReportesView {
  const periodo = PERIODOS.find((p) => p === get('periodo')) ?? DEFAULT_PERIODO;
  const fecha = get('fecha') ?? '';
  const page = get('page') ?? '';
  return {
    periodo,
    fecha: isRealYmd(fecha) && fecha <= today ? fecha : today,
    tab: get('tab') === 'productos' ? 'productos' : DEFAULT_TAB,
    orden: ORDENES.find((o) => o === get('orden')) ?? DEFAULT_ORDEN,
    page: PAGE_PATTERN.test(page) ? Number(page) - 1 : 0,
  };
}

/** Query params of a view for `router.navigate`: a value equal to its default is `null` so it leaves the URL. */
export function reportesQueryParams(view: ReportesView, today: string): Record<string, string | null> {
  return {
    periodo: view.periodo === DEFAULT_PERIODO ? null : view.periodo,
    fecha: view.fecha === today ? null : view.fecha,
    tab: view.tab === DEFAULT_TAB ? null : view.tab,
    orden: view.orden === DEFAULT_ORDEN ? null : view.orden,
    page: view.page === 0 ? null : String(view.page + 1),
  };
}

export type PagerItem = number | 'gap';

const PAGER_FULL_LIMIT = 7;

/**
 * Buttons of the sales pager, 0-based: all pages when there are few, otherwise the first, the last and the current
 * one with its neighbours, with an ellipsis ('gap') for each hidden run. A run of a single page is shown instead.
 */
export function pagerItems(current: number, totalPages: number): PagerItem[] {
  if (totalPages <= PAGER_FULL_LIMIT) {
    return Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i);
  }
  const last = totalPages - 1;
  const shown = [...new Set([0, current - 1, current, current + 1, last].filter((p) => p >= 0 && p <= last))].sort(
    (a, b) => a - b,
  );
  const items: PagerItem[] = [];
  shown.forEach((page, index) => {
    const previous = shown[index - 1];
    if (previous !== undefined && page - previous === 2) {
      items.push(previous + 1);
    } else if (previous !== undefined && page - previous > 2) {
      items.push('gap');
    }
    items.push(page);
  });
  return items;
}

/** Second line of the export menu: what the file will contain, "Ventas · 19 – 25 oct 2026". */
export function exportMenuLine(tab: ReportesTab, range: string | null): string {
  const name = tab === 'ventas' ? 'Ventas' : 'Productos más vendidos';
  return range === null ? name : `${name} · ${range}`;
}

/** Reference date as shown in the date button: "23/10/2026". */
export function formatFechaButton(fecha: string): string {
  const { y, m, d } = parseYmd(fecha);
  return `${two(d)}/${two(m)}/${y}`;
}
