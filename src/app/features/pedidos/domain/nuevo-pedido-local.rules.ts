import { Page } from '../../../core/http/api.types';
import { elapsedMinutes } from '../../cocina/domain/cocina.rules';
import { CuentaMesa, EstadoMesa, Mesa, PedidoCuenta } from '../../mesas/mesas.types';
import { PedidoListado, TipoPedido } from '../pedidos.types';
import { formatClock } from './pedidos.rules';

/**
 * Pure rules of the table-first ("Local") flow of the new-order screen. Every function returns new
 * arrays/objects and never mutates its arguments.
 */

// ---- Steps ----

export type PasoNuevoPedido = 'TIPO' | 'MESA' | 'COMENSALES' | 'PRODUCTOS';

/** Steps of the flow for a tipo: MESA asks table and guests; DELIVERY/RECOJO go straight to the products. */
export function pasosDe(tipo: TipoPedido | null): PasoNuevoPedido[] {
  if (tipo === 'MESA') {
    return ['TIPO', 'MESA', 'COMENSALES', 'PRODUCTOS'];
  }
  return tipo === null ? ['TIPO'] : ['TIPO', 'PRODUCTOS'];
}

/** Step "Atrás" returns to; null at TIPO or when `paso` is not part of the flow of `tipo`. */
export function pasoAnterior(paso: PasoNuevoPedido, tipo: TipoPedido | null): PasoNuevoPedido | null {
  const pasos = pasosDe(tipo);
  const index = pasos.indexOf(paso);
  return index > 0 ? pasos[index - 1] : null;
}

/**
 * Walks back from `paso` to the closest earlier step the page can render (`disponibles`), so "Atrás"
 * never lands on a step that is not built yet; null at TIPO, outside the flow, or with no such step.
 */
export function pasoAnteriorDisponible(
  paso: PasoNuevoPedido,
  tipo: TipoPedido | null,
  disponibles: readonly PasoNuevoPedido[],
): PasoNuevoPedido | null {
  let anterior = pasoAnterior(paso, tipo);
  while (anterior !== null && !disponibles.includes(anterior)) {
    anterior = pasoAnterior(anterior, tipo);
  }
  return anterior;
}

/** First step after choosing the tipo: Local asks the table, Delivery/Recojo go to the products. */
export function pasoTrasTipo(tipo: TipoPedido): PasoNuevoPedido {
  return tipo === 'MESA' ? 'MESA' : 'PRODUCTOS';
}

/**
 * Step after choosing a table: a LIBRE one asks the guests. An OCUPADA one changes no step (null): its bill
 * detail opens over the picker, and "Agregar ronda" is what continues to PRODUCTOS.
 */
export function pasoTrasMesa(mesa: Pick<Mesa, 'estado'>): PasoNuevoPedido | null {
  return mesa.estado === 'LIBRE' ? 'COMENSALES' : null;
}

/**
 * Steps the page walks through once the table is known: an OCUPADA table never asks the guests, so
 * "Atrás" from PRODUCTOS skips COMENSALES for it. No table yet (or LIBRE) keeps every step.
 */
export function pasosDisponibles(mesa: Pick<Mesa, 'estado'> | null): PasoNuevoPedido[] {
  return mesa?.estado === 'OCUPADA'
    ? ['TIPO', 'MESA', 'PRODUCTOS']
    : ['TIPO', 'MESA', 'COMENSALES', 'PRODUCTOS'];
}

export type EstadoProgreso = 'done' | 'current' | 'todo';

export interface ItemProgreso {
  paso: Exclude<PasoNuevoPedido, 'TIPO'>;
  label: string;
  state: EstadoProgreso;
}

const PROGRESO_LOCAL: readonly Pick<ItemProgreso, 'paso' | 'label'>[] = [
  { paso: 'MESA', label: 'Mesa' },
  { paso: 'COMENSALES', label: 'Comensales' },
  { paso: 'PRODUCTOS', label: 'Productos' },
];

/** The "Mesa · Comensales · Productos" indicator for `paso`; at TIPO every item is still todo. */
export function progresoLocal(paso: PasoNuevoPedido): ItemProgreso[] {
  const current = PROGRESO_LOCAL.findIndex((item) => item.paso === paso);
  return PROGRESO_LOCAL.map((item, index) => ({
    ...item,
    state: current === -1 ? 'todo' : index < current ? 'done' : index === current ? 'current' : 'todo',
  }));
}

// ---- Guests ----

/** Integer within 1..capacidad: NaN and anything below 1 give 1, decimals are floored. */
export function clampComensales(value: number, capacidad: number): number {
  if (Number.isNaN(value)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.floor(value), Math.floor(capacidad)));
}

export function puedeSumarComensal(comensales: number, capacidad: number): boolean {
  return comensales < capacidad;
}

export function puedeRestarComensal(comensales: number): boolean {
  return comensales > 1;
}

/**
 * Line shown in the products summary: "Mesa 5 · 2 comensales" (singular for 1) for a LIBRE table with the
 * guests just chosen; "Mesa 5 · 3/4 comensales" for an OCUPADA one; just "Mesa 5" when its guests are unknown.
 */
export function resumenMesa(mesa: MesaCard, comensales: number): string {
  if (mesa.estado === 'LIBRE') {
    return `Mesa ${mesa.numero} · ${comensales} ${comensales === 1 ? 'comensal' : 'comensales'}`;
  }
  return mesa.comensales === null || mesa.ocupacion === null
    ? `Mesa ${mesa.numero}`
    : `Mesa ${mesa.numero} · ${mesa.ocupacion} comensales`;
}

/**
 * What "Crear pedido" must occupy first: a local order on a LIBRE table records its guests with
 * `POST /mesas/{id}/ocupar`. An OCUPADA table gets another round without touching it; other types never occupy.
 */
export function ocupacionAlCrear(
  tipo: TipoPedido,
  mesa: MesaCard | null,
  comensales: number,
): { mesaId: number; comensales: number } | null {
  if (tipo !== 'MESA' || mesa === null || mesa.estado !== 'LIBRE') {
    return null;
  }
  return { mesaId: mesa.mesaId, comensales: clampComensales(comensales, mesa.capacidad) };
}

// ---- Time alert ----

/** Legend "< 30 min · 30-60 min · > 60 min" of the design. Single source for the mesa cards. */
export const ALERTA_THRESHOLDS = { atencionMin: 30, criticaMax: 60 } as const;

export type AlertaTiempo = 'normal' | 'atencion' | 'critica';

/** < 30 normal, 30..60 (both included) atencion, > 60 critica. */
export function alertaTiempo(minutos: number): AlertaTiempo {
  if (minutos > ALERTA_THRESHOLDS.criticaMax) {
    return 'critica';
  }
  return minutos >= ALERTA_THRESHOLDS.atencionMin ? 'atencion' : 'normal';
}

// ---- Mesa cards ----

export interface MesaCard {
  mesaId: number;
  numero: number;
  estado: EstadoMesa;
  capacidad: number;
  comensales: number | null;
  /** "3/4"; "–/4" (en dash) for an OCUPADA table without guests; null for a LIBRE table. */
  ocupacion: string | null;
  /** Sum of the unpaid orders of the table; null for a LIBRE table. */
  consumido: number | null;
  /** Whole minutes since the oldest unpaid order of the table; null when LIBRE or without orders. */
  minutosAbierta: number | null;
  alerta: AlertaTiempo | null;
}

const toCents = (amount: number): number => Math.round(amount * 100);

/**
 * One card per table, ordered by `numero`. The backend has no "occupied since" field, so the time open
 * comes from the oldest unpaid order of the table and the consumption from the sum of their totals
 * (any tipo; orders without table or for an unknown table are ignored). Money is summed in integer cents.
 */
export function mesaCards(
  mesas: readonly Mesa[],
  pendientes: readonly PedidoListado[],
  now: Date,
): MesaCard[] {
  const byMesa = new Map<number, PedidoListado[]>();
  for (const pedido of pendientes) {
    if (pedido.mesaId !== null) {
      byMesa.set(pedido.mesaId, [...(byMesa.get(pedido.mesaId) ?? []), pedido]);
    }
  }
  return [...mesas]
    .sort((a, b) => a.numero - b.numero)
    .map((mesa) => {
      const base = {
        mesaId: mesa.mesaId,
        numero: mesa.numero,
        estado: mesa.estado,
        capacidad: mesa.capacidad,
        comensales: mesa.comensales,
      };
      if (mesa.estado !== 'OCUPADA') {
        return {
          ...base,
          comensales: null,
          ocupacion: null,
          consumido: null,
          minutosAbierta: null,
          alerta: null,
        };
      }
      const orders = byMesa.get(mesa.mesaId) ?? [];
      const cents = orders.reduce((sum, p) => sum + toCents(p.total), 0);
      const oldest = orders.length === 0 ? null : oldestCreatedAt(orders.map((p) => p.createdAt));
      const minutosAbierta = oldest === null ? null : elapsedMinutes(oldest, now);
      return {
        ...base,
        ocupacion: `${mesa.comensales ?? '–'}/${mesa.capacidad}`,
        consumido: cents / 100,
        minutosAbierta,
        alerta: minutosAbierta === null ? null : alertaTiempo(minutosAbierta),
      };
    });
}

/** The earliest ISO date-time of the list; unparseable values lose to parseable ones. */
function oldestCreatedAt(createdAts: readonly string[]): string {
  const time = (value: string): number => {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  return createdAts.reduce((oldest, current) => (time(current) < time(oldest) ? current : oldest));
}

// ---- Filters ----

export type FiltroMesas = 'TODAS' | 'LIBRES' | 'OCUPADAS';

export function conteoFiltros(cards: readonly MesaCard[]): Record<FiltroMesas, number> {
  const ocupadas = cards.filter((c) => c.estado === 'OCUPADA').length;
  return { TODAS: cards.length, LIBRES: cards.length - ocupadas, OCUPADAS: ocupadas };
}

export function filtrarMesas(cards: readonly MesaCard[], filtro: FiltroMesas): MesaCard[] {
  if (filtro === 'TODAS') {
    return [...cards];
  }
  const estado: EstadoMesa = filtro === 'LIBRES' ? 'LIBRE' : 'OCUPADA';
  return cards.filter((c) => c.estado === estado);
}

// ---- Paging of the unpaid orders ----

/** Largest `size` GET /pedidos accepts; the backend answers 400 above it. */
export const MAX_PAGE_SIZE = 100;

/** Page indexes still to fetch after page 0 (empty for 0 or 1 pages). */
export function paginasRestantes(page: Page<unknown>): number[] {
  return Array.from({ length: Math.max(0, page.totalPages - 1) }, (_, i) => i + 1);
}

// ---- Bill sections ----

export interface RondaCuenta {
  numero: number;
  pedido: PedidoCuenta;
}

export interface SeccionesCuenta {
  rondas: RondaCuenta[];
  paraLlevar: PedidoCuenta[];
}

const byCreatedAt = (a: PedidoCuenta, b: PedidoCuenta): number => {
  const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return diff !== 0 && !Number.isNaN(diff) ? diff : a.pedidoId - b.pedidoId;
};

/**
 * MESA orders are the rounds ("Ronda n", numbered 1..n by `createdAt`); RECOJO/DELIVERY linked to the
 * table go to `paraLlevar`, by `createdAt` and never numbered.
 */
export function seccionesCuenta(cuenta: CuentaMesa): SeccionesCuenta {
  const sorted = [...cuenta.pedidos].sort(byCreatedAt);
  return {
    rondas: sorted
      .filter((p) => p.tipoPedido === 'MESA')
      .map((pedido, index) => ({ numero: index + 1, pedido })),
    paraLlevar: sorted.filter((p) => p.tipoPedido !== 'MESA'),
  };
}

// ---- Occupied-table detail ----

/** "1 pedido" / "3 pedidos": the count of the "Pedidos abiertos" label. */
export function pedidosAbiertosLabel(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'pedido' : 'pedidos'}`;
}

/** "3/4 comensales" under the table title; null when the backend has no guests for the table. */
export function comensalesDetalleLabel(mesa: Pick<MesaCard, 'comensales' | 'ocupacion'>): string | null {
  return mesa.comensales === null || mesa.ocupacion === null ? null : `${mesa.ocupacion} comensales`;
}

/**
 * HH:mm of an order. `createdAt` has no zone (Lima local time), so it is read as written, never with `Z`;
 * an unreadable value shows an em dash.
 */
export function horaPedido(createdAt: string): string {
  const created = new Date(createdAt);
  return Number.isNaN(created.getTime()) ? '—' : formatClock(created).slice(0, 5);
}

// ---- Step 0: tipo de pedido ----

export interface OpcionTipo {
  tipoPedido: TipoPedido;
  /** "Local" for MESA: the API value stays `MESA`. */
  label: string;
  descripcion: string;
  /** Footer of the card: where the flow goes next. */
  pie: string;
}

export const OPCIONES_TIPO: readonly OpcionTipo[] = [
  {
    tipoPedido: 'MESA',
    label: 'Local',
    descripcion: 'Pedido para una mesa del salón',
    pie: 'Mesa · Comensales · Productos',
  },
  {
    tipoPedido: 'DELIVERY',
    label: 'Delivery',
    descripcion: 'Envío a domicilio',
    pie: 'Directo a productos',
  },
  {
    tipoPedido: 'RECOJO',
    label: 'Recojo',
    descripcion: 'El cliente recoge en el local',
    pie: 'Directo a productos',
  },
];

/** Label of a tipo in the new-order flow (MESA reads "Local"). */
export function tipoPasoLabel(tipo: TipoPedido): string {
  return OPCIONES_TIPO.find((opcion) => opcion.tipoPedido === tipo)?.label ?? tipo;
}

/** One-line description for the cart summary; null for MESA, whose line is the table itself. */
export function tipoPasoResumen(tipo: TipoPedido): string | null {
  return tipo === 'MESA'
    ? null
    : (OPCIONES_TIPO.find((opcion) => opcion.tipoPedido === tipo)?.descripcion ?? null);
}
