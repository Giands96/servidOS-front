import { CocinaEvent, ColaPedido } from '../cocina.types';

/** Timer limits in minutes (user decision 2026-10-08). Single source for the whole board. */
export const URGENCY_THRESHOLDS = { atencionMin: 15, criticoMin: 25 } as const;

export type Urgency = 'en-tiempo' | 'atencion' | 'critico';

export interface Board {
  cola: readonly ColaPedido[];
  listos: readonly ColaPedido[];
}

export type Refetch = 'cola' | 'listos' | null;

const MS_PER_MINUTE = 60_000;

/** Whole minutes since `createdAt` (timezone-less ISO = local time). Never negative; 0 if unparsable. */
export function elapsedMinutes(createdAt: string, now: Date): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) {
    return 0;
  }
  return minutesSince(created, now);
}

/** Whole minutes since an epoch-ms instant. Never negative. */
export function minutesSince(timestampMs: number, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - timestampMs) / MS_PER_MINUTE));
}

export function urgencyOf(minutes: number): Urgency {
  if (minutes >= URGENCY_THRESHOLDS.criticoMin) {
    return 'critico';
  }
  return minutes >= URGENCY_THRESHOLDS.atencionMin ? 'atencion' : 'en-tiempo';
}

/** Oldest first; ties by pedidoId ascending. Returns a new array. */
export function sortByArrival(orders: readonly ColaPedido[]): ColaPedido[] {
  return [...orders].sort((a, b) => {
    const byTime = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return byTime !== 0 && !Number.isNaN(byTime) ? byTime : a.pedidoId - b.pedidoId;
  });
}

/**
 * Listos panel order: most recently marked first (local `listoAt` epoch ms, by pedidoId),
 * then orders whose time is unknown (no backend LISTO timestamp), newest pedidoId first.
 */
export function sortListos(
  orders: readonly ColaPedido[],
  listoAt: Readonly<Record<number, number>>,
): ColaPedido[] {
  return [...orders].sort((a, b) => {
    const ta = listoAt[a.pedidoId];
    const tb = listoAt[b.pedidoId];
    if (ta !== undefined && tb !== undefined) {
      return tb - ta || b.pedidoId - a.pedidoId;
    }
    if (ta !== undefined) {
      return -1;
    }
    if (tb !== undefined) {
      return 1;
    }
    return b.pedidoId - a.pedidoId;
  });
}

export function tipoLabel(order: Pick<ColaPedido, 'tipoPedido' | 'mesaId'>): string {
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

/** HH:mm:ss in local time. */
export function formatClock(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

export function queueSummary(count: number): string {
  return `${count} ${count === 1 ? 'pedido' : 'pedidos'} en preparación`;
}

/** Applies a WebSocket event to the board; `refetch` names the list that must be reloaded for details. */
export function applyKitchenEvent(
  board: Board,
  event: CocinaEvent,
): { board: Board; refetch: Refetch } {
  const { pedidoId, estadoAnterior, estadoNuevo } = event;
  const without = (list: readonly ColaPedido[]) => list.filter((p) => p.pedidoId !== pedidoId);

  if (estadoNuevo === 'EN_PREPARACION') {
    return { board, refetch: 'cola' };
  }

  if (estadoNuevo === 'LISTO') {
    if (board.listos.some((p) => p.pedidoId === pedidoId)) {
      return { board, refetch: null };
    }
    const moving = board.cola.find((p) => p.pedidoId === pedidoId);
    if (!moving) {
      return { board, refetch: 'listos' };
    }
    return {
      board: {
        cola: without(board.cola),
        listos: [...board.listos, { ...moving, estado: 'LISTO' }],
      },
      refetch: null,
    };
  }

  if (estadoAnterior === 'EN_PREPARACION') {
    return { board: { ...board, cola: without(board.cola) }, refetch: null };
  }
  if (estadoAnterior === 'LISTO') {
    return { board: { ...board, listos: without(board.listos) }, refetch: null };
  }
  return { board, refetch: null };
}
