import { aColaItem, aColaPedido } from '../../../../testing/builders';
import { CocinaEvent } from '../cocina.types';
import {
  Board,
  URGENCY_THRESHOLDS,
  applyKitchenEvent,
  elapsedMinutes,
  formatOrderNumber,
  sortByArrival,
  tipoLabel,
  urgencyOf,
} from './cocina.rules';

const at = (hhmmss: string) => new Date(`2026-10-08T${hhmmss}`);

describe('URGENCY_THRESHOLDS', () => {
  it('is the single source of the timer limits', () => {
    expect(URGENCY_THRESHOLDS).toEqual({ atencionMin: 15, criticoMin: 25 });
  });
});

describe('elapsedMinutes', () => {
  it.each([
    ['12:30:00', '12:30:00', 0],
    ['12:30:00', '12:30:59', 0],
    ['12:30:00', '12:31:00', 1],
    ['12:30:00', '12:54:30', 24],
    ['12:30:00', '13:30:00', 60],
    ['12:30:00', '12:29:00', 0], // clock skew: never negative
  ])('created %s, now %s -> %d min', (created, now, expected) => {
    expect(elapsedMinutes(`2026-10-08T${created}`, at(now))).toBe(expected);
  });

  it('treats a timezone-less createdAt as local time', () => {
    const now = new Date(2026, 9, 8, 12, 45, 0);
    expect(elapsedMinutes('2026-10-08T12:30:00', now)).toBe(15);
  });

  it('returns 0 for an unparsable createdAt', () => {
    expect(elapsedMinutes('nope', at('12:30:00'))).toBe(0);
  });
});

describe('urgencyOf', () => {
  it.each([
    [0, 'en-tiempo'],
    [14, 'en-tiempo'],
    [15, 'atencion'],
    [24, 'atencion'],
    [25, 'critico'],
    [90, 'critico'],
  ])('%d min -> %s', (minutes, expected) => {
    expect(urgencyOf(minutes)).toBe(expected);
  });
});

describe('sortByArrival', () => {
  it('orders oldest first and breaks ties by pedidoId ascending', () => {
    const a = aColaPedido({ pedidoId: 3, createdAt: '2026-10-08T12:40:00' });
    const b = aColaPedido({ pedidoId: 2, createdAt: '2026-10-08T12:30:00' });
    const c = aColaPedido({ pedidoId: 1, createdAt: '2026-10-08T12:40:00' });
    expect(sortByArrival([a, b, c]).map((p) => p.pedidoId)).toEqual([2, 1, 3]);
  });

  it('does not mutate its input', () => {
    const input = [
      aColaPedido({ pedidoId: 2, createdAt: '2026-10-08T12:40:00' }),
      aColaPedido({ pedidoId: 1 }),
    ];
    const copy = [...input];
    sortByArrival(input);
    expect(input).toEqual(copy);
  });
});

describe('tipoLabel', () => {
  it.each([
    [{ tipoPedido: 'MESA', mesaId: 7 }, 'Mesa 7'],
    [{ tipoPedido: 'MESA', mesaId: null }, 'Mesa'],
    [{ tipoPedido: 'DELIVERY', mesaId: null }, 'Delivery'],
    [{ tipoPedido: 'RECOJO', mesaId: null }, 'Recojo'],
  ] as const)('%j -> %s', (partial, expected) => {
    expect(tipoLabel(aColaPedido({ ...partial }))).toBe(expected);
  });
});

describe('formatOrderNumber', () => {
  it.each([
    [476, '#0476'],
    [5, '#0005'],
    [12345, '#12345'],
  ])('%d -> %s', (id, expected) => {
    expect(formatOrderNumber(id)).toBe(expected);
  });
});

describe('applyKitchenEvent', () => {
  const inCola = aColaPedido({ pedidoId: 1 });
  const otherCola = aColaPedido({ pedidoId: 2, items: [aColaItem({ nombreProducto: 'Causa' })] });
  const inListos = aColaPedido({ pedidoId: 3, estado: 'LISTO' });
  const board = (): Board => ({ cola: [inCola, otherCola], listos: [inListos] });
  const event = (
    pedidoId: number,
    estadoAnterior: CocinaEvent['estadoAnterior'],
    estadoNuevo: CocinaEvent['estadoNuevo'],
  ): CocinaEvent => ({
    pedidoId,
    estadoAnterior,
    estadoNuevo,
  });

  it('EN_PREPARACION asks for a cola refetch and leaves the board untouched', () => {
    const b = board();
    const result = applyKitchenEvent(b, event(9, 'PENDIENTE', 'EN_PREPARACION'));
    expect(result.refetch).toBe('cola');
    expect(result.board).toEqual(b);
  });

  it('LISTO moves a locally known order from cola to listos with estado LISTO, no refetch', () => {
    const result = applyKitchenEvent(board(), event(1, 'EN_PREPARACION', 'LISTO'));
    expect(result.refetch).toBeNull();
    expect(result.board.cola.map((p) => p.pedidoId)).toEqual([2]);
    expect(result.board.listos.map((p) => p.pedidoId)).toEqual([3, 1]);
    expect(result.board.listos[1].estado).toBe('LISTO');
    expect(result.board.listos[1].items).toEqual(inCola.items);
  });

  it('LISTO for an order not present locally asks for a listos refetch', () => {
    const b = board();
    const result = applyKitchenEvent(b, event(9, 'EN_PREPARACION', 'LISTO'));
    expect(result.refetch).toBe('listos');
    expect(result.board).toEqual(b);
  });

  it('LISTO for an order already in listos is a no-op (no duplicate)', () => {
    const result = applyKitchenEvent(board(), event(3, 'EN_PREPARACION', 'LISTO'));
    expect(result.refetch).toBeNull();
    expect(result.board.listos.map((p) => p.pedidoId)).toEqual([3]);
  });

  it.each(['EN_ENTREGA', 'ENTREGADO', 'CANCELADO'] as const)(
    '%s removes the order from the column of estadoAnterior (listos)',
    (nuevo) => {
      const result = applyKitchenEvent(board(), event(3, 'LISTO', nuevo));
      expect(result.refetch).toBeNull();
      expect(result.board.listos).toEqual([]);
      expect(result.board.cola).toHaveLength(2);
    },
  );

  it('CANCELADO from EN_PREPARACION removes the order from cola', () => {
    const result = applyKitchenEvent(board(), event(1, 'EN_PREPARACION', 'CANCELADO'));
    expect(result.board.cola.map((p) => p.pedidoId)).toEqual([2]);
    expect(result.board.listos).toHaveLength(1);
  });

  it('does not mutate the previous board', () => {
    const b = board();
    const snapshot = structuredClone(b);
    applyKitchenEvent(b, event(1, 'EN_PREPARACION', 'LISTO'));
    applyKitchenEvent(b, event(3, 'LISTO', 'ENTREGADO'));
    expect(b).toEqual(snapshot);
  });
});
