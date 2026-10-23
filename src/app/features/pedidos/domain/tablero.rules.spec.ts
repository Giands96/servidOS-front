import { aPedidoListado } from '../../../../testing/builders';
import { EstadoPedido, PedidoListado, TipoPedido } from '../pedidos.types';
import {
  BOARD_COLUMNS,
  CLOSED_COLUMNS,
  canDrop,
  cardView,
  closedColumnHint,
  closedCountQuery,
  columnDropState,
  columnHeader,
  columnQuery,
  dropTargets,
  elapsedLabel,
  elapsedMinutes,
  filterByTipo,
  groupByColumn,
  moveMenu,
  moveRequest,
  menuPlacement,
  moveSuccessMessage,
  nextEnabledIndex,
  parseVista,
  shouldCloseOnResize,
  tipoFilterChips,
  todayLima,
} from './tablero.rules';

const order = (overrides: Partial<PedidoListado> = {}): PedidoListado => aPedidoListado(overrides);

describe('columns', () => {
  it('lists the four board columns and the two closed ones in flow order', () => {
    expect(BOARD_COLUMNS).toEqual(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'EN_ENTREGA']);
    expect(CLOSED_COLUMNS).toEqual(['ENTREGADO', 'CANCELADO']);
  });
});

describe('tipoFilterChips / filterByTipo', () => {
  const pedidos = [
    order({ pedidoId: 1, tipoPedido: 'MESA' }),
    order({ pedidoId: 2, tipoPedido: 'MESA' }),
    order({ pedidoId: 3, tipoPedido: 'DELIVERY', mesaId: null }),
    order({ pedidoId: 4, tipoPedido: 'RECOJO', mesaId: null }),
  ];

  it('counts the active orders per tipo, "Todos" first', () => {
    expect(tipoFilterChips(pedidos)).toEqual([
      { filtro: 'TODOS', label: 'Todos', count: 4 },
      { filtro: 'MESA', label: 'Mesa', count: 2 },
      { filtro: 'DELIVERY', label: 'Delivery', count: 1 },
      { filtro: 'RECOJO', label: 'Recojo', count: 1 },
    ]);
  });

  it('shows zero counts for an empty board', () => {
    expect(tipoFilterChips([]).map((chip) => chip.count)).toEqual([0, 0, 0, 0]);
  });

  it('filters by tipo keeping the input order; TODOS keeps everything', () => {
    expect(filterByTipo(pedidos, 'MESA').map((p) => p.pedidoId)).toEqual([1, 2]);
    expect(filterByTipo(pedidos, 'DELIVERY').map((p) => p.pedidoId)).toEqual([3]);
    expect(filterByTipo(pedidos, 'TODOS')).toEqual(pedidos);
  });
});

describe('groupByColumn', () => {
  it('groups by estado keeping the input order and ignoring non-board estados', () => {
    const pedidos = [
      order({ pedidoId: 1, estado: 'LISTO' }),
      order({ pedidoId: 2, estado: 'PENDIENTE' }),
      order({ pedidoId: 3, estado: 'LISTO' }),
      order({ pedidoId: 4, estado: 'ENTREGADO' }),
      order({ pedidoId: 5, estado: 'CANCELADO' }),
    ];
    const groups = groupByColumn(pedidos);
    expect(groups.PENDIENTE.map((p) => p.pedidoId)).toEqual([2]);
    expect(groups.EN_PREPARACION).toEqual([]);
    expect(groups.LISTO.map((p) => p.pedidoId)).toEqual([1, 3]);
    expect(groups.EN_ENTREGA).toEqual([]);
    expect(Object.keys(groups)).toEqual([...BOARD_COLUMNS]);
  });

  it('ignores an estado outside the union (including inherited keys)', () => {
    const groups = groupByColumn([
      order({ estado: 'constructor' as EstadoPedido }),
      order({ estado: 'XYZ' as EstadoPedido }),
    ]);
    expect(Object.values(groups).flat()).toEqual([]);
  });
});

describe('canDrop', () => {
  it.each<[TipoPedido, EstadoPedido, EstadoPedido, boolean]>([
    ['MESA', 'PENDIENTE', 'EN_PREPARACION', true],
    ['MESA', 'PENDIENTE', 'LISTO', false],
    ['MESA', 'PENDIENTE', 'PENDIENTE', false],
    ['MESA', 'PENDIENTE', 'CANCELADO', true],
    ['MESA', 'EN_PREPARACION', 'PENDIENTE', false],
    ['MESA', 'EN_PREPARACION', 'LISTO', true],
    ['MESA', 'LISTO', 'ENTREGADO', true],
    ['MESA', 'LISTO', 'EN_ENTREGA', false],
    ['RECOJO', 'LISTO', 'ENTREGADO', true],
    ['RECOJO', 'LISTO', 'EN_ENTREGA', false],
    ['DELIVERY', 'LISTO', 'EN_ENTREGA', true],
    ['DELIVERY', 'LISTO', 'ENTREGADO', false],
    ['DELIVERY', 'EN_ENTREGA', 'ENTREGADO', true],
    ['DELIVERY', 'EN_ENTREGA', 'LISTO', false],
    ['DELIVERY', 'EN_ENTREGA', 'EN_ENTREGA', false],
    ['MESA', 'ENTREGADO', 'CANCELADO', false],
  ])('%s %s -> %s: %s', (tipoPedido, estado, target, expected) => {
    expect(canDrop(order({ tipoPedido, estado }), target)).toBe(expected);
  });

  it('refuses CANCELADO for a paid order but accepts it for a refunded one', () => {
    expect(canDrop(order({ estado: 'LISTO', estadoPago: 'PAGADO' }), 'CANCELADO')).toBe(false);
    expect(canDrop(order({ estado: 'LISTO', estadoPago: 'REEMBOLSADO' }), 'CANCELADO')).toBe(true);
  });
});

describe('dropTargets', () => {
  it('lists every column with its verdict and reason', () => {
    const pedido = order({ tipoPedido: 'MESA', estado: 'EN_PREPARACION' });
    expect(dropTargets(pedido)).toEqual([
      { estado: 'PENDIENTE', allowed: false, reason: 'No disponible desde En preparación' },
      { estado: 'EN_PREPARACION', allowed: false, reason: null },
      { estado: 'LISTO', allowed: true, reason: null },
      { estado: 'EN_ENTREGA', allowed: false, reason: 'Solo pedidos delivery' },
      { estado: 'ENTREGADO', allowed: false, reason: 'No disponible desde En preparación' },
      { estado: 'CANCELADO', allowed: true, reason: null },
    ]);
  });

  it('explains why a paid order cannot be cancelled', () => {
    const cancel = dropTargets(order({ estado: 'LISTO', estadoPago: 'PAGADO' })).find(
      (t) => t.estado === 'CANCELADO',
    );
    expect(cancel).toEqual({
      estado: 'CANCELADO',
      allowed: false,
      reason: 'Un pedido pagado no se puede cancelar',
    });
  });

  it('allows EN_ENTREGA for a delivery in LISTO', () => {
    const target = dropTargets(order({ tipoPedido: 'DELIVERY', mesaId: null, estado: 'LISTO' })).find(
      (t) => t.estado === 'EN_ENTREGA',
    );
    expect(target).toEqual({ estado: 'EN_ENTREGA', allowed: true, reason: null });
  });

  it('agrees with canDrop for every tipo x estado x target', () => {
    const tipos: TipoPedido[] = ['MESA', 'DELIVERY', 'RECOJO'];
    for (const tipoPedido of tipos) {
      for (const estado of [...BOARD_COLUMNS, ...CLOSED_COLUMNS]) {
        const pedido = order({ tipoPedido, estado });
        for (const target of dropTargets(pedido)) {
          expect(target.allowed).toBe(canDrop(pedido, target.estado));
        }
      }
    }
  });
});

describe('moveMenu', () => {
  it('puts the primary first, then the disabled ones, Cancelar last', () => {
    const menu = moveMenu(order({ tipoPedido: 'MESA', mesaId: 9, estado: 'EN_PREPARACION' }));
    expect(menu.heading).toBe('Mover Mesa 9 a…');
    expect(menu.items).toEqual([
      { estado: 'LISTO', label: 'Listo', allowed: true, reason: null, sublabel: null, next: true, direction: 'forward' },
      {
        estado: 'PENDIENTE',
        label: 'Pendiente',
        allowed: false,
        reason: 'No disponible desde En preparación',
        sublabel: 'No disponible desde En preparación',
        next: false,
        direction: 'back',
      },
      {
        estado: 'EN_ENTREGA',
        label: 'En entrega',
        allowed: false,
        reason: 'Solo pedidos delivery',
        sublabel: 'Solo pedidos delivery',
        next: false,
        direction: 'forward',
      },
      {
        estado: 'ENTREGADO',
        label: 'Entregado',
        allowed: false,
        reason: 'No disponible desde En preparación',
        sublabel: 'No disponible desde En preparación',
        next: false,
        direction: 'done',
      },
      {
        estado: 'CANCELADO',
        label: 'Cancelar pedido',
        allowed: true,
        reason: null,
        sublabel: 'Sin cobro registrado',
        next: false,
        direction: 'cancel',
      },
    ]);
  });

  it('never lists the current column', () => {
    const menu = moveMenu(order({ estado: 'LISTO' }));
    expect(menu.items.map((i) => i.estado)).not.toContain('LISTO');
  });

  it('marks the primary target of a ready delivery and names it "Delivery"', () => {
    const menu = moveMenu(order({ tipoPedido: 'DELIVERY', mesaId: null, estado: 'LISTO' }));
    expect(menu.heading).toBe('Mover Delivery a…');
    expect(menu.items[0]).toMatchObject({ estado: 'EN_ENTREGA', allowed: true, next: true });
    expect(menu.items.filter((i) => i.next)).toHaveLength(1);
  });

  it('marks ENTREGADO as the done direction when it is the primary', () => {
    const menu = moveMenu(order({ tipoPedido: 'RECOJO', mesaId: null, estado: 'LISTO' }));
    expect(menu.heading).toBe('Mover Recojo a…');
    expect(menu.items[0]).toMatchObject({ estado: 'ENTREGADO', next: true, direction: 'done' });
  });

  it('shows the paid reason on a disabled Cancelar', () => {
    const menu = moveMenu(order({ estado: 'LISTO', estadoPago: 'PAGADO' }));
    const last = menu.items[menu.items.length - 1];
    expect(last).toMatchObject({
      estado: 'CANCELADO',
      allowed: false,
      reason: 'Un pedido pagado no se puede cancelar',
      sublabel: 'Un pedido pagado no se puede cancelar',
    });
  });

  it('has no allowed item and no primary for a closed order', () => {
    const menu = moveMenu(order({ estado: 'ENTREGADO' }));
    expect(menu.items.every((i) => !i.allowed && !i.next)).toBe(true);
  });

  it('keeps allowed items before disabled ones', () => {
    const items = moveMenu(order({ estado: 'PENDIENTE' })).items;
    const flags = items.slice(0, -1).map((i) => i.allowed);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });
});

describe('moveRequest', () => {
  it('uses confirmar for PENDIENTE -> EN_PREPARACION', () => {
    expect(moveRequest(order({ estado: 'PENDIENTE' }), 'EN_PREPARACION')).toEqual({ kind: 'confirmar' });
  });

  it('uses PATCH estado for every other allowed move', () => {
    expect(moveRequest(order({ estado: 'EN_PREPARACION' }), 'LISTO')).toEqual({
      kind: 'estado',
      estado: 'LISTO',
    });
    expect(moveRequest(order({ estado: 'PENDIENTE' }), 'CANCELADO')).toEqual({
      kind: 'estado',
      estado: 'CANCELADO',
    });
  });

  it('throws when the move is not allowed', () => {
    expect(() => moveRequest(order({ estado: 'PENDIENTE' }), 'LISTO')).toThrow();
    expect(() => moveRequest(order({ estado: 'LISTO', estadoPago: 'PAGADO' }), 'CANCELADO')).toThrow();
    expect(() => moveRequest(order({ estado: 'LISTO' }), 'LISTO')).toThrow();
  });
});

describe('elapsedMinutes', () => {
  // 2026-10-16T12:30:00 Lima is 17:30:00Z (UTC-5, no DST).
  const created = '2026-10-16T12:30:00';

  it('reads createdAt as Lima time, whatever the browser zone', () => {
    expect(elapsedMinutes(created, new Date('2026-10-16T17:42:00Z'))).toBe(12);
  });

  it('floors partial minutes', () => {
    expect(elapsedMinutes(created, new Date('2026-10-16T17:42:59Z'))).toBe(12);
  });

  it('is never negative (clock skew)', () => {
    expect(elapsedMinutes(created, new Date('2026-10-16T17:29:00Z'))).toBe(0);
  });

  it('accepts fractional seconds', () => {
    expect(elapsedMinutes('2026-10-16T12:30:00.123456', new Date('2026-10-16T17:35:00Z'))).toBe(4);
  });

  it('does not re-interpret a value that already carries a zone', () => {
    expect(elapsedMinutes('2026-10-16T17:30:00Z', new Date('2026-10-16T17:40:00Z'))).toBe(10);
  });

  it('is 0 for an unreadable value', () => {
    expect(elapsedMinutes('not a date', new Date('2026-10-16T17:40:00Z'))).toBe(0);
  });
});

describe('elapsedLabel', () => {
  it.each<[number, string]>([
    [0, '0 min'],
    [7, '7 min'],
    [59, '59 min'],
    [60, '1 h 00 min'],
    [65, '1 h 05 min'],
    [125, '2 h 05 min'],
  ])('%i -> %s', (minutes, expected) => {
    expect(elapsedLabel(minutes)).toBe(expected);
  });
});

describe('cardView', () => {
  const now = new Date('2026-10-16T17:42:00Z');

  it('builds the card of an unpaid table order', () => {
    const pedido = order({
      pedidoId: 479,
      tipoPedido: 'MESA',
      mesaId: 9,
      estado: 'EN_PREPARACION',
      total: 118,
      observacion: '  sin ají  ',
      createdAt: '2026-10-16T12:24:00',
      estadoPago: null,
    });
    expect(cardView(pedido, now)).toEqual({
      titulo: 'Mesa 9',
      numero: '#0479',
      minutos: '18 min',
      pago: 'Sin cobrar',
      pagado: false,
      total: 'S/ 118.00',
      observacion: 'sin ají',
      primary: { estado: 'LISTO', label: 'Pasar a Listo', viaConfirmar: false },
    });
  });

  it('flags a paid order, nulls an empty observation and a final estado has no primary', () => {
    const view = cardView(
      order({ tipoPedido: 'DELIVERY', mesaId: null, estado: 'ENTREGADO', estadoPago: 'PAGADO', observacion: '   ' }),
      now,
    );
    expect(view).toMatchObject({ titulo: 'Delivery', pago: 'Pagado', pagado: true, observacion: null, primary: null });
  });

  it('does not flag a refunded order as paid', () => {
    expect(cardView(order({ estadoPago: 'REEMBOLSADO' }), now)).toMatchObject({
      pago: 'Reembolsado',
      pagado: false,
    });
  });
});

describe('columnHeader', () => {
  it.each<[EstadoPedido, string, string]>([
    ['PENDIENTE', 'Pendiente', 'warn'],
    ['EN_PREPARACION', 'En preparación', 'info'],
    ['LISTO', 'Listo', 'ok'],
    ['EN_ENTREGA', 'En entrega', 'flow'],
  ])('%s', (estado, label, dot) => {
    expect(columnHeader(estado, 3)).toEqual({ label, count: 3, dot });
  });
});

describe('todayLima', () => {
  it('is the Lima day, not the UTC one', () => {
    expect(todayLima(new Date('2026-10-16T02:30:00Z'))).toBe('2026-10-15');
    expect(todayLima(new Date('2026-10-16T05:00:00Z'))).toBe('2026-10-16');
  });
});

describe('moveSuccessMessage', () => {
  it('reuses the transition toast text', () => {
    expect(moveSuccessMessage(order({ pedidoId: 479 }), 'LISTO')).toBe('#0479 ahora está listo');
  });
});

describe('parseVista', () => {
  it('reads "lista" from the URL and falls back to the board for anything else', () => {
    expect(parseVista('lista')).toBe('lista');
    expect(parseVista('tablero')).toBe('tablero');
    expect(parseVista(null)).toBe('tablero');
    expect(parseVista('LISTA')).toBe('tablero');
    expect(parseVista(undefined)).toBe('tablero');
  });
});

describe('board queries', () => {
  it('asks for the first 100 orders of a board column', () => {
    expect(columnQuery('EN_PREPARACION')).toEqual({ estado: 'EN_PREPARACION', page: 0, size: 100 });
  });

  it("asks for a single row of a closed column filtered by Lima's today (only the total is read)", () => {
    expect(closedCountQuery('ENTREGADO', new Date('2026-10-16T02:30:00Z'))).toEqual({
      estado: 'ENTREGADO',
      fecha: '2026-10-15',
      page: 0,
      size: 1,
    });
  });
});

describe('columnDropState', () => {
  const mesa = order({ tipoPedido: 'MESA', estado: 'EN_PREPARACION' });

  it('is idle for every column when nothing is being dragged', () => {
    expect(columnDropState(null, 'LISTO')).toEqual({ kind: 'idle', reason: null });
  });

  it('marks the order own column as origin, the allowed ones and the locked ones with their reason', () => {
    expect(columnDropState(mesa, 'EN_PREPARACION')).toEqual({ kind: 'origin', reason: null });
    expect(columnDropState(mesa, 'LISTO')).toEqual({ kind: 'allowed', reason: null });
    expect(columnDropState(mesa, 'EN_ENTREGA')).toEqual({ kind: 'locked', reason: 'Solo pedidos delivery' });
    expect(columnDropState(mesa, 'PENDIENTE')).toEqual({
      kind: 'locked',
      reason: 'No disponible desde En preparación',
    });
  });

  it('locks Cancelado for a paid order with its reason', () => {
    const paid = order({ estado: 'LISTO', estadoPago: 'PAGADO' });
    expect(columnDropState(paid, 'CANCELADO')).toEqual({
      kind: 'locked',
      reason: 'Un pedido pagado no se puede cancelar',
    });
  });
});

describe('closedColumnHint', () => {
  it('is "Hoy" while idle (the counts are those of today)', () => {
    expect(closedColumnHint('ENTREGADO', { kind: 'idle', reason: null })).toBe('Hoy');
    expect(closedColumnHint('CANCELADO', { kind: 'origin', reason: null })).toBe('Hoy');
  });

  it('invites to drop when the dragged order is accepted', () => {
    expect(closedColumnHint('ENTREGADO', { kind: 'allowed', reason: null })).toBe('Soltar para marcar entregado');
    expect(closedColumnHint('CANCELADO', { kind: 'allowed', reason: null })).toBe('Soltar para cancelar');
  });

  it('explains the refusal when locked', () => {
    expect(closedColumnHint('CANCELADO', { kind: 'locked', reason: 'Un pedido pagado no se puede cancelar' })).toBe(
      'Un pedido pagado no se puede cancelar',
    );
    expect(closedColumnHint('ENTREGADO', { kind: 'locked', reason: null })).toBe('No disponible');
  });
});

describe('menuPlacement', () => {
  const viewport = { width: 1000, height: 800 };
  const menu = { width: 288, height: 300 };

  it('opens below the button, right-aligned to it', () => {
    const anchor = { top: 100, bottom: 140, left: 500, right: 540 };
    expect(menuPlacement(anchor, menu, viewport)).toEqual({ top: 144, left: 252 });
  });

  it('flips above the button when there is no room below but there is above', () => {
    const anchor = { top: 600, bottom: 640, left: 500, right: 540 };
    expect(menuPlacement(anchor, menu, viewport)).toEqual({ top: 296, left: 252 });
  });

  it('stays below, clamped into the viewport, when it fits neither below nor above', () => {
    const anchor = { top: 150, bottom: 190, left: 500, right: 540 };
    expect(menuPlacement(anchor, menu, { width: 1000, height: 400 })).toEqual({ top: 92, left: 252 });
  });

  it('keeps the menu inside the horizontal edges of the viewport', () => {
    expect(menuPlacement({ top: 10, bottom: 50, left: 0, right: 40 }, menu, viewport).left).toBe(8);
    expect(menuPlacement({ top: 10, bottom: 50, left: 960, right: 1000 }, menu, viewport).left).toBe(704);
  });
});

describe('menuPlacement on a phone', () => {
  const menu = { width: 288, height: 300 };

  it('keeps the 288px menu 8px inside a 375px viewport, whichever edge the button is on', () => {
    const viewport = { width: 375, height: 700 };
    const nearLeft = menuPlacement({ top: 100, bottom: 140, left: 0, right: 40 }, menu, viewport);
    const nearRight = menuPlacement({ top: 100, bottom: 140, left: 335, right: 375 }, menu, viewport);
    expect(nearLeft.left).toBe(8);
    expect(nearRight.left).toBe(79);
    expect(nearRight.left + menu.width).toBe(367);
  });
});

describe('shouldCloseOnResize', () => {
  it('closes the menu when the viewport width changed (rotation, split screen)', () => {
    expect(shouldCloseOnResize(375, 812)).toBe(true);
    expect(shouldCloseOnResize(1024, 900)).toBe(true);
  });

  it('keeps it open when only the height changed (mobile URL bar showing or hiding)', () => {
    expect(shouldCloseOnResize(375, 375)).toBe(false);
  });
});

describe('nextEnabledIndex', () => {
  const items = [{ allowed: true }, { allowed: false }, { allowed: true }, { allowed: false }];

  it('moves to the next enabled entry, skipping disabled ones and wrapping around', () => {
    expect(nextEnabledIndex(items, 0, 1)).toBe(2);
    expect(nextEnabledIndex(items, 2, 1)).toBe(0);
    expect(nextEnabledIndex(items, 2, -1)).toBe(0);
    expect(nextEnabledIndex(items, 0, -1)).toBe(2);
  });

  it('starts at the first (down) or the last (up) enabled entry when nothing is focused', () => {
    expect(nextEnabledIndex(items, -1, 1)).toBe(0);
    expect(nextEnabledIndex(items, -1, -1)).toBe(2);
  });

  it('answers -1 when no entry is enabled', () => {
    expect(nextEnabledIndex([{ allowed: false }], -1, 1)).toBe(-1);
    expect(nextEnabledIndex([], -1, 1)).toBe(-1);
  });
});
