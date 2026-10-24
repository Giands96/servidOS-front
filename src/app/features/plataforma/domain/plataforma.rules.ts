import { Page } from '../../../core/http/api.types';
import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { formatAmount } from '../../pedidos/domain/pedidos.rules';
import { formatDate } from '../../restaurante/domain/subscription.rules';
import {
  EstadoRestaurante,
  OrdenRestaurantes,
  Plan,
  Restaurante,
  RestauranteDashboard,
  SuscripcionPlataforma,
  ResumenSuscripcionDashboard,
} from '../plataforma.types';

const EM_DASH = '—';

/** Platform time zone: "today" for expiry is always the Lima day, wherever the browser is. */
const LIMA = 'America/Lima';

const limaFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** yyyy-MM-dd of `now` in Lima. */
export function limaToday(now: Date): string {
  const part = (type: string): string =>
    limaFormat.formatToParts(now).find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The tenant operates through `fechaFin` inclusive, so it is expired only when `fechaFin` is before today. */
export function isVencida(fechaFin: string, today: string): boolean {
  return fechaFin < today;
}

export interface SuscripcionView {
  label: string;
  /** null: no badge (no subscription). */
  variant: BadgeVariant | null;
  vence: string;
}

/** Badge text and end date of a list row. "Vencida" is derived: the backend keeps the estado ACTIVA past `fechaFin`. */
export function suscripcionView(
  s: ResumenSuscripcionDashboard | null,
  today: string,
): SuscripcionView {
  if (s === null) {
    return { label: 'Sin suscripción', variant: null, vence: '–' };
  }
  const vence = formatDate(s.fechaFin);
  if (isVencida(s.fechaFin, today)) {
    return { label: 'Vencida', variant: 'warn', vence };
  }
  switch (s.estado) {
    case 'ACTIVA':
      return { label: 'Activa', variant: 'ok', vence };
    case 'CANCELADA':
      return { label: 'Cancelada', variant: 'danger', vence };
    default:
      return { label: String(s.estado), variant: 'neutral', vence };
  }
}

export function planLabel(s: Pick<ResumenSuscripcionDashboard, 'nombrePlan'> | null): string {
  return s === null ? EM_DASH : s.nombrePlan;
}

export function restauranteEstadoLabel(estado: EstadoRestaurante): string {
  switch (estado) {
    case 'ACTIVO':
      return 'Activo';
    case 'INACTIVO':
      return 'Suspendido';
    default:
      return String(estado);
  }
}

export function restauranteEstadoVariant(estado: EstadoRestaurante): BadgeVariant {
  switch (estado) {
    case 'ACTIVO':
      return 'ok';
    case 'INACTIVO':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function totalLabel(total: number): string {
  return `${total} ${total === 1 ? 'restaurante' : 'restaurantes'} en la plataforma`;
}

/** Footer of the table: "1–10 de 37 · Página 1 de 4". `number` is zero-based. */
export function rangeLabel(
  page: Pick<Page<unknown>, 'number' | 'size' | 'totalElements' | 'totalPages'>,
): string {
  if (page.totalElements === 0) {
    return '0 de 0';
  }
  const from = page.number * page.size + 1;
  const to = Math.min((page.number + 1) * page.size, page.totalElements);
  return `${from}–${to} de ${page.totalElements} · Página ${page.number + 1} de ${page.totalPages}`;
}

const MAX_ALL_PAGES = 7;

/**
 * Zero-based page indexes of the numbered pager; `null` is an ellipsis gap. Every page up to 7,
 * otherwise the first, the last and the current one with its neighbours. Empty for a single page.
 */
export function pageNumbers(current: number, totalPages: number): (number | null)[] {
  if (totalPages <= 1) {
    return [];
  }
  if (totalPages <= MAX_ALL_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const shown = [...new Set([0, current - 1, current, current + 1, totalPages - 1])]
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);
  return shown.flatMap((p, i) => (i > 0 && p - shown[i - 1] > 1 ? [null, p] : [p]));
}

/** Toggles the only sortable field; no sort yet means the list is already shown A-Z, so the first order is asc. */
export function nextSort(sort: OrdenRestaurantes | undefined): OrdenRestaurantes {
  return sort === 'nombre,asc' ? 'nombre,desc' : sort === 'nombre,desc' ? 'nombre,asc' : 'nombre,asc';
}

export function sortLabel(sort: OrdenRestaurantes | undefined): string {
  return sort === 'nombre,desc' ? 'Nombre Z–A' : 'Nombre A–Z';
}

type Suscripcionable = Pick<RestauranteDashboard, 'estado' | 'suscripcion'>;

/** True when there is a subscription that is ACTIVA and not past its `fechaFin`. */
function hasVigencia(r: Suscripcionable, today: string): boolean {
  return r.suscripcion !== null && r.suscripcion.estado === 'ACTIVA' && !isVencida(r.suscripcion.fechaFin, today);
}

export interface PanelActions {
  renovar: true;
  cambiarPlan: boolean;
  estado: { target: Extract<EstadoRestaurante, 'ACTIVO' | 'INACTIVO'>; label: string };
  /** Reactivating alone leaves the tenant blocked: the UI warns and points to Renovar. */
  reactivarSinVigencia: boolean;
}

/** Owner actions of the detail panel. */
export function panelActions(r: Suscripcionable, today: string): PanelActions {
  const activo = r.estado === 'ACTIVO';
  return {
    renovar: true,
    // PATCH plan needs an ACTIVA subscription and does not reactivate an INACTIVO restaurant.
    cambiarPlan: activo && hasVigencia(r, today),
    estado: activo ? { target: 'INACTIVO', label: 'Suspender' } : { target: 'ACTIVO', label: 'Reactivar' },
    reactivarSinVigencia: r.estado === 'INACTIVO' && !hasVigencia(r, today),
  };
}

/** The backend answers 400 to the first subscription when no plan is sent. */
export function renovarPlanRequired(r: Pick<RestauranteDashboard, 'suscripcion'>): boolean {
  return r.suscripcion === null;
}

/** Preselected plan of the renew modal: the current one if still offered, else the first, else none. */
export function defaultRenovarPlanId(
  r: Pick<RestauranteDashboard, 'suscripcion'>,
  planes: readonly Pick<Plan, 'planId'>[],
): number | null {
  const current = r.suscripcion?.planId;
  if (current !== undefined && planes.some((p) => p.planId === current)) {
    return current;
  }
  return planes[0]?.planId ?? null;
}

/**
 * Plan to send to POST renovar: `undefined` renews the current plan. Only a plan that is required (no prior
 * subscription) or that differs from the current one travels; nothing is sent without a choice.
 */
export function renovarPlanIdToSend(
  r: Pick<RestauranteDashboard, 'suscripcion'>,
  chosenPlanId: number | null,
): number | undefined {
  if (chosenPlanId === null) {
    return undefined;
  }
  if (renovarPlanRequired(r) || chosenPlanId !== r.suscripcion?.planId) {
    return chosenPlanId;
  }
  return undefined;
}

/** Options of a plan select: cambiar plan never offers the plan the restaurant already has. */
export function planChoiceOptions<T extends Pick<Plan, 'planId'>>(
  kind: Extract<PanelActionKind, 'renovar' | 'plan'>,
  r: Pick<RestauranteDashboard, 'suscripcion'>,
  planes: readonly T[],
): T[] {
  const current = r.suscripcion?.planId;
  return kind === 'plan' ? planes.filter((p) => p.planId !== current) : [...planes];
}

/** Whether the confirm button of an action modal may be pressed (in-flight locking is the page's job). */
export function canConfirmAction(
  kind: PanelActionKind,
  r: Pick<RestauranteDashboard, 'suscripcion'>,
  chosenPlanId: number | null,
): boolean {
  switch (kind) {
    case 'renovar':
      return !renovarPlanRequired(r) || chosenPlanId !== null;
    case 'plan':
      return chosenPlanId !== null && chosenPlanId !== r.suscripcion?.planId;
    case 'estado':
      return true;
  }
}

export interface ActionCopy {
  heading: string;
  body: string;
  confirm: string;
}

export function renovarCopy(r: Pick<RestauranteDashboard, 'nombre'>): ActionCopy {
  return {
    heading: 'Renovar suscripción',
    body: `Registra un mes pagado para ${r.nombre}. Si la suscripción sigue vigente, el nuevo periodo empieza al día siguiente de su vencimiento.`,
    confirm: 'Renovar',
  };
}

/** Needs `today` for the reactivation warning (see `panelActions`). */
export function estadoCopy(r: RestauranteDashboard, today: string): ActionCopy {
  const { estado, reactivarSinVigencia } = panelActions(r, today);
  if (estado.target === 'INACTIVO') {
    return {
      heading: 'Suspender restaurante',
      body: `${r.nombre} quedará en solo lectura: no podrá registrar pedidos ni cambios hasta que lo reactives.`,
      confirm: 'Suspender',
    };
  }
  const warning = reactivarSinVigencia
    ? ' Su suscripción no está vigente: seguirá bloqueado hasta que renueves.'
    : '';
  return {
    heading: 'Reactivar restaurante',
    body: `${r.nombre} volverá a operar.${warning}`,
    confirm: 'Reactivar',
  };
}

export function cambiarPlanCopy(r: Pick<RestauranteDashboard, 'nombre'>): ActionCopy {
  return {
    heading: 'Cambiar plan',
    body: `Cancela la suscripción actual de ${r.nombre} y abre una nueva de un mes desde hoy con el plan elegido.`,
    confirm: 'Cambiar plan',
  };
}

export type PanelActionKind = 'renovar' | 'estado' | 'plan';

/**
 * Toast after a successful action. `r` is the row as it was before the action; for 'estado' the answered
 * estado wins, otherwise the opposite of the row's. Without a result, renovar/plan use a generic text.
 */
export function actionSuccessMessage(
  kind: PanelActionKind,
  r: Pick<RestauranteDashboard, 'estado'>,
  result?: Partial<SuscripcionPlataforma> | Partial<Restaurante>,
): string {
  const suscripcion = result !== undefined && 'fechaFin' in result ? result : undefined;
  switch (kind) {
    case 'renovar':
      return suscripcion?.fechaFin === undefined
        ? 'Suscripción renovada'
        : `Suscripción renovada hasta ${formatDate(suscripcion.fechaFin)}`;
    case 'plan':
      return suscripcion?.nombrePlan === undefined
        ? 'Plan cambiado'
        : `Plan cambiado a ${suscripcion.nombrePlan}`;
    case 'estado': {
      const answered = result !== undefined && 'slug' in result ? result.estado : undefined;
      const after = answered ?? (r.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
      return after === 'ACTIVO' ? 'Restaurante reactivado' : 'Restaurante suspendido';
    }
  }
}

/** PEN as "S/ 34.90"; another currency as its code ("USD 34.90"); an em dash for a non-finite amount. */
export function formatPrecio(precio: number, moneda: string): string {
  if (!Number.isFinite(precio)) {
    return EM_DASH;
  }
  const amount = formatAmount(precio);
  return moneda === 'PEN' ? `S/ ${amount}` : `${moneda} ${amount}`;
}

/** "Estándar · S/ 34.90". */
export function planOptionLabel(plan: Pick<Plan, 'nombre' | 'precio' | 'moneda'>): string {
  return `${plan.nombre} · ${formatPrecio(plan.precio, plan.moneda)}`;
}
