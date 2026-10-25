import { aPedidoListado } from '../../../../testing/builders';
import { Page } from '../../../core/http/api.types';
import { EstadoPago, EstadoPedido, PedidoListado, TipoPedido } from '../pedidos.types';
import {
  ESTADOS_PEDIDO,
  ESTADO_TABS,
  PedidoAction,
  cancelCopy,
  canCancel,
  cobrarLabel,
  emptyHeading,
  estadoLabel,
  estadoPagoLabel,
  estadoVariant,
  failedLoadView,
  fallbackPage,
  formatClock,
  formatCreatedAt,
  formatMoney,
  formatOrderNumber,
  isCobrable,
  isEstadoPedido,
  isRowBusy,
  nextEstados,
  observacionText,
  pagerView,
  primaryAction,
  shouldReloadAfterRejection,
  tipoIcon,
  tipoLabel,
  transitionMessage,
} from './pedidos.rules';

const TIPOS: TipoPedido[] = ['MESA', 'DELIVERY', 'RECOJO'];

describe('ESTADOS_PEDIDO', () => {
  it('lists every estado in flow order', () => {
    expect(ESTADOS_PEDIDO).toEqual([
      'PENDIENTE',
      'EN_PREPARACION',
      'LISTO',
      'EN_ENTREGA',
      'ENTREGADO',
      'CANCELADO',
    ]);
  });
});

describe('nextEstados', () => {
  it.each<[TipoPedido, EstadoPedido, EstadoPedido[]]>([
    ['MESA', 'PENDIENTE', ['EN_PREPARACION']],
    ['DELIVERY', 'PENDIENTE', ['EN_PREPARACION']],
    ['RECOJO', 'PENDIENTE', ['EN_PREPARACION']],
    ['MESA', 'EN_PREPARACION', ['LISTO']],
    ['DELIVERY', 'EN_PREPARACION', ['LISTO']],
    ['RECOJO', 'EN_PREPARACION', ['LISTO']],
    ['MESA', 'LISTO', ['ENTREGADO']],
    ['DELIVERY', 'LISTO', ['EN_ENTREGA']],
    ['RECOJO', 'LISTO', ['ENTREGADO']],
    ['MESA', 'EN_ENTREGA', ['ENTREGADO']],
    ['DELIVERY', 'EN_ENTREGA', ['ENTREGADO']],
    ['RECOJO', 'EN_ENTREGA', ['ENTREGADO']],
    ['MESA', 'ENTREGADO', []],
    ['DELIVERY', 'ENTREGADO', []],
    ['RECOJO', 'ENTREGADO', []],
    ['MESA', 'CANCELADO', []],
    ['DELIVERY', 'CANCELADO', []],
    ['RECOJO', 'CANCELADO', []],
  ])('%s %s -> %j', (tipo, estado, expected) => {
    expect(nextEstados(tipo, estado)).toEqual(expected);
  });

  it('never offers CANCELADO and covers every tipo x estado', () => {
    for (const tipo of TIPOS) {
      for (const estado of ESTADOS_PEDIDO) {
        expect(nextEstados(tipo, estado)).not.toContain('CANCELADO');
      }
    }
  });

  it('returns a copy, so callers cannot corrupt the table', () => {
    nextEstados('MESA', 'PENDIENTE').push('LISTO');
    expect(nextEstados('MESA', 'PENDIENTE')).toEqual(['EN_PREPARACION']);
  });
});

describe('canCancel', () => {
  const pagos: (EstadoPago | null)[] = [null, 'PAGADO', 'REEMBOLSADO'];

  it.each(
    TIPOS.flatMap((tipoPedido) =>
      ESTADOS_PEDIDO.flatMap((estado) =>
        pagos.map((estadoPago) => {
          const final = estado === 'ENTREGADO' || estado === 'CANCELADO';
          return [tipoPedido, estado, estadoPago, !final && estadoPago !== 'PAGADO'] as const;
        }),
      ),
    ),
  )('%s %s with estadoPago %s -> %s', (tipoPedido, estado, estadoPago, expected) => {
    expect(canCancel(aPedidoListado({ tipoPedido, estado, estadoPago }))).toBe(expected);
  });
});

describe('rows outside the unions (unvalidated API data)', () => {
  const unknownEstado = { estado: 'ARCHIVADO' } as unknown as Pick<PedidoListado, 'estado'>;
  const unknownTipo = { tipoPedido: 'BARRA' } as unknown as Pick<PedidoListado, 'tipoPedido'>;

  it('nextEstados returns no estados for an unknown estado or tipo', () => {
    expect(nextEstados('MESA', unknownEstado.estado)).toEqual([]);
    expect(nextEstados(unknownTipo.tipoPedido, 'PENDIENTE')).toEqual([]);
  });

  it('canCancel is false for an unknown estado or tipo', () => {
    expect(canCancel(aPedidoListado({ ...unknownEstado }))).toBe(false);
    expect(canCancel(aPedidoListado({ ...unknownTipo }))).toBe(false);
  });

  it('primaryAction is null for an unknown estado or tipo', () => {
    expect(primaryAction(aPedidoListado({ ...unknownEstado }))).toBeNull();
    expect(primaryAction(aPedidoListado({ ...unknownTipo }))).toBeNull();
  });

  it('does not read inherited object keys as estados (e.g. "constructor")', () => {
    const inherited = { estado: 'constructor' } as unknown as Pick<PedidoListado, 'estado'>;
    expect(nextEstados('MESA', inherited.estado)).toEqual([]);
    expect(canCancel(aPedidoListado({ ...inherited }))).toBe(false);
    expect(primaryAction(aPedidoListado({ ...inherited }))).toBeNull();
  });
});

describe('primaryAction', () => {
  const action = (
    tipoPedido: TipoPedido,
    estado: EstadoPedido,
  ): PedidoAction | null => primaryAction(aPedidoListado({ tipoPedido, estado }));

  it('PENDIENTE sends to the kitchen through confirmar', () => {
    for (const tipo of TIPOS) {
      expect(action(tipo, 'PENDIENTE')).toEqual({
        estado: 'EN_PREPARACION',
        label: 'Enviar a cocina',
        viaConfirmar: true,
      });
    }
  });

  it('EN_PREPARACION moves to LISTO through cambiarEstado', () => {
    for (const tipo of TIPOS) {
      expect(action(tipo, 'EN_PREPARACION')).toEqual({
        estado: 'LISTO',
        label: 'Pasar a Listo',
        viaConfirmar: false,
      });
    }
  });

  it('LISTO delivery goes to EN_ENTREGA', () => {
    expect(action('DELIVERY', 'LISTO')).toEqual({
      estado: 'EN_ENTREGA',
      label: 'Enviar a entrega',
      viaConfirmar: false,
    });
  });

  it.each<TipoPedido>(['MESA', 'RECOJO'])('LISTO %s is marked as delivered', (tipo) => {
    expect(action(tipo, 'LISTO')).toEqual({
      estado: 'ENTREGADO',
      label: 'Marcar entregado',
      viaConfirmar: false,
    });
  });

  it('EN_ENTREGA is marked as delivered', () => {
    expect(action('DELIVERY', 'EN_ENTREGA')).toEqual({
      estado: 'ENTREGADO',
      label: 'Marcar entregado',
      viaConfirmar: false,
    });
  });

  it('final estados have no action', () => {
    for (const tipo of TIPOS) {
      expect(action(tipo, 'ENTREGADO')).toBeNull();
      expect(action(tipo, 'CANCELADO')).toBeNull();
    }
  });

  it('viaConfirmar is true only for PENDIENTE', () => {
    for (const tipo of TIPOS) {
      for (const estado of ESTADOS_PEDIDO) {
        expect(action(tipo, estado)?.viaConfirmar ?? false).toBe(estado === 'PENDIENTE');
      }
    }
  });

  it('always agrees with the transition table', () => {
    for (const tipo of TIPOS) {
      for (const estado of ESTADOS_PEDIDO) {
        const next = nextEstados(tipo, estado);
        expect(action(tipo, estado)?.estado ?? null).toBe(next[0] ?? null);
      }
    }
  });
});

describe('estadoLabel', () => {
  it.each<[EstadoPedido, string]>([
    ['PENDIENTE', 'Pendiente'],
    ['EN_PREPARACION', 'En preparación'],
    ['LISTO', 'Listo'],
    ['EN_ENTREGA', 'En entrega'],
    ['ENTREGADO', 'Entregado'],
    ['CANCELADO', 'Cancelado'],
  ])('%s -> %s', (estado, expected) => {
    expect(estadoLabel(estado)).toBe(expected);
  });
});

describe('estadoVariant', () => {
  it.each<[EstadoPedido, string]>([
    ['PENDIENTE', 'warn'],
    ['EN_PREPARACION', 'info'],
    ['LISTO', 'ok'],
    ['EN_ENTREGA', 'flow'],
    ['ENTREGADO', 'neutral'],
    ['CANCELADO', 'danger'],
  ])('%s -> %s', (estado, expected) => {
    expect(estadoVariant(estado)).toBe(expected);
  });
});

describe('estadoPagoLabel', () => {
  it.each<[EstadoPago | null, string]>([
    ['PAGADO', 'Pagado'],
    ['REEMBOLSADO', 'Reembolsado'],
    [null, 'Sin cobrar'],
  ])('%s -> %s', (estadoPago, expected) => {
    expect(estadoPagoLabel(estadoPago)).toBe(expected);
  });
});

describe('display helpers on values outside the unions (unvalidated API data)', () => {
  const asEstado = (value: unknown) => value as EstadoPedido;
  const asEstadoPago = (value: unknown) => value as EstadoPago | null;
  const asTipo = (value: unknown) => value as TipoPedido;

  it.each([
    ['ARCHIVADO', 'ARCHIVADO'],
    ['constructor', 'constructor'],
    ['__proto__', '__proto__'],
    ['', '—'],
    ['   ', '—'],
    [null, '—'],
    [undefined, '—'],
    [7, '7'],
  ])('estadoLabel(%j) falls back to the raw text %j', (value, expected) => {
    expect(estadoLabel(asEstado(value))).toBe(expected);
  });

  it.each([['ARCHIVADO'], ['constructor'], ['toString'], [''], [null], [undefined]])(
    'estadoVariant(%j) is neutral',
    (value) => {
      expect(estadoVariant(asEstado(value))).toBe('neutral');
    },
  );

  it.each([
    ['PARCIAL', 'PARCIAL'],
    ['constructor', 'constructor'],
    ['', '—'],
    [undefined, '—'],
  ])('estadoPagoLabel(%j) falls back to the raw text %j', (value, expected) => {
    expect(estadoPagoLabel(asEstadoPago(value))).toBe(expected);
  });

  it.each([
    ['BARRA', 'BARRA'],
    ['constructor', 'constructor'],
    ['', '—'],
    [null, '—'],
    [undefined, '—'],
  ])('tipoLabel(%j) falls back to the raw text %j', (value, expected) => {
    expect(tipoLabel({ tipoPedido: asTipo(value), numeroMesa: null })).toBe(expected);
  });

  it('transitionMessage never throws and uses a generic text for an unknown estado', () => {
    expect(transitionMessage(482, asEstado('ARCHIVADO'))).toBe('#0482 actualizado');
    expect(transitionMessage(482, asEstado('constructor'))).toBe('#0482 actualizado');
    expect(transitionMessage(482, asEstado(undefined))).toBe('#0482 actualizado');
    expect(transitionMessage(482, asEstado(null))).toBe('#0482 actualizado');
  });
});

describe('isEstadoPedido', () => {
  it.each(ESTADOS_PEDIDO)('accepts %s', (estado) => {
    expect(isEstadoPedido(estado)).toBe(true);
  });

  it.each([['listo'], ['PAGADO'], [''], [null], [undefined], [3], [{}]])(
    'rejects %j',
    (value) => {
      expect(isEstadoPedido(value)).toBe(false);
    },
  );
});

describe('tipoLabel', () => {
  it.each([
    [{ tipoPedido: 'MESA', mesaId: 807, numeroMesa: 7 }, 'Mesa 7'],
    [{ tipoPedido: 'MESA', mesaId: 804, numeroMesa: null }, 'Mesa'],
    [{ tipoPedido: 'MESA', mesaId: null }, 'Mesa'],
    [{ tipoPedido: 'DELIVERY', mesaId: null }, 'Delivery'],
    [{ tipoPedido: 'RECOJO', mesaId: null }, 'Recojo'],
  ] as const)('%j -> %s', (partial, expected) => {
    expect(tipoLabel(aPedidoListado({ ...partial }))).toBe(expected);
  });

  it('never shows the database id while the backend does not send numeroMesa yet', () => {
    const { numeroMesa: _omitted, ...withoutNumero } = aPedidoListado({ tipoPedido: 'MESA', mesaId: 804 });
    expect(tipoLabel(withoutNumero)).toBe('Mesa');
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

describe('formatClock', () => {
  it('formats HH:mm:ss in local time with zero padding', () => {
    expect(formatClock(new Date(2026, 9, 8, 7, 5, 9))).toBe('07:05:09');
    expect(formatClock(new Date(2026, 9, 8, 23, 59, 0))).toBe('23:59:00');
  });
});

describe('formatCreatedAt', () => {
  // `createdAt` has no zone: it is Lima local time and must be read as local, never as UTC.
  const now = new Date(2026, 9, 8, 15, 0, 0);

  it('shows only HH:mm when the order was created today', () => {
    expect(formatCreatedAt('2026-10-08T12:30:00', now)).toBe('12:30');
    expect(formatCreatedAt('2026-10-08T07:05:59', now)).toBe('07:05');
  });

  it('adds dd/MM when the order was created on another day', () => {
    expect(formatCreatedAt('2026-10-07T23:10:00', now)).toBe('07/10 23:10');
    expect(formatCreatedAt('2025-12-31T09:00:00', now)).toBe('31/12 09:00');
  });

  it('does not shift the hour (no implicit UTC)', () => {
    expect(formatCreatedAt('2026-10-08T00:00:00', now)).toBe('00:00');
  });

  it.each([[''], ['not a date']])('falls back to an em dash for %j', (value) => {
    expect(formatCreatedAt(value, now)).toBe('—');
  });
});

describe('formatMoney', () => {
  it.each([
    [86, 'S/ 86.00'],
    [74.5, 'S/ 74.50'],
    [0, 'S/ 0.00'],
    [999.99, 'S/ 999.99'],
    [999.999, 'S/ 1,000.00'],
    [1234.567, 'S/ 1,234.57'],
    [18452.5, 'S/ 18,452.50'],
    [1234567.8, 'S/ 1,234,567.80'],
    [-5, 'S/ -5.00'],
    [-1234.5, 'S/ -1,234.50'],
  ])('%d -> %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });

  it.each([[NaN], [Infinity]])('falls back to an em dash for %d', (amount) => {
    expect(formatMoney(amount)).toBe('—');
  });
});

describe('observacionText', () => {
  it('returns the trimmed observation', () => {
    expect(observacionText('  Sin ají  ')).toBe('Sin ají');
  });

  it.each([[null], [''], ['   ']])('shows an em dash for %j', (value) => {
    expect(observacionText(value)).toBe('—');
  });
});

describe('ESTADO_TABS', () => {
  it('starts with "Todos" (no estado filter) and follows the flow order', () => {
    expect(ESTADO_TABS).toEqual([
      { estado: null, label: 'Todos' },
      { estado: 'PENDIENTE', label: 'Pendiente' },
      { estado: 'EN_PREPARACION', label: 'En preparación' },
      { estado: 'LISTO', label: 'Listo' },
      { estado: 'EN_ENTREGA', label: 'En entrega' },
      { estado: 'ENTREGADO', label: 'Entregado' },
      { estado: 'CANCELADO', label: 'Cancelado' },
    ]);
  });
});

describe('emptyHeading', () => {
  it('is generic without a filter', () => {
    expect(emptyHeading(null)).toBe('Todavía no hay pedidos');
  });

  it('names the estado when filtering', () => {
    expect(emptyHeading('EN_PREPARACION')).toBe('No hay pedidos en estado En preparación');
  });
});

describe('pagerView', () => {
  const view = (partial: Partial<Page<unknown>>) =>
    pagerView({ number: 0, totalPages: 1, first: true, last: true, ...partial });

  it('is hidden when there is a single page or none', () => {
    expect(view({ totalPages: 1 }).visible).toBe(false);
    expect(view({ totalPages: 0 }).visible).toBe(false);
  });

  it('shows a one-based "Página X de Y" and the flags of the first page', () => {
    expect(view({ number: 0, totalPages: 3, first: true, last: false })).toEqual({
      visible: true,
      text: 'Página 1 de 3',
      canPrev: false,
      canNext: true,
    });
  });

  it('enables both directions in the middle', () => {
    expect(view({ number: 1, totalPages: 3, first: false, last: false })).toEqual({
      visible: true,
      text: 'Página 2 de 3',
      canPrev: true,
      canNext: true,
    });
  });

  it('disables "next" on the last page', () => {
    expect(view({ number: 2, totalPages: 3, first: false, last: true })).toEqual({
      visible: true,
      text: 'Página 3 de 3',
      canPrev: true,
      canNext: false,
    });
  });
});

describe('fallbackPage', () => {
  it('is null while the requested page exists', () => {
    expect(fallbackPage({ number: 0, totalPages: 0 })).toBeNull();
    expect(fallbackPage({ number: 1, totalPages: 3 })).toBeNull();
  });

  it('points to the new last page when the current one no longer exists', () => {
    expect(fallbackPage({ number: 2, totalPages: 2 })).toBe(1);
    expect(fallbackPage({ number: 5, totalPages: 3 })).toBe(2);
  });

  it('falls back to the first page when nothing is left', () => {
    expect(fallbackPage({ number: 1, totalPages: 0 })).toBe(0);
  });

  it('never loops: the fallback is always a smaller page index', () => {
    for (let number = 1; number <= 6; number++) {
      for (let totalPages = 0; totalPages <= number; totalPages++) {
        const next = fallbackPage({ number, totalPages });
        expect(next).not.toBeNull();
        expect(next!).toBeLessThan(number);
      }
    }
  });
});

describe('transitionMessage', () => {
  it.each<[EstadoPedido, string]>([
    ['EN_PREPARACION', '#0482 ahora está en preparación'],
    ['ENTREGADO', '#0482 ahora está entregado'],
    ['CANCELADO', '#0482 ahora está cancelado'],
  ])('%s -> %s', (estado, expected) => {
    expect(transitionMessage(482, estado)).toBe(expected);
  });
});

describe('cancelCopy', () => {
  it('names the order and its tipo in the confirmation', () => {
    expect(cancelCopy(aPedidoListado({ pedidoId: 482, tipoPedido: 'MESA', mesaId: 804, numeroMesa: 4 }))).toEqual({
      heading: 'Cancelar pedido #0482',
      message: 'Se cancelará el pedido #0482 (Mesa 4). Esta acción no se puede deshacer.',
    });
    expect(
      cancelCopy(aPedidoListado({ pedidoId: 481, tipoPedido: 'DELIVERY', mesaId: null })).message,
    ).toBe('Se cancelará el pedido #0481 (Delivery). Esta acción no se puede deshacer.');
  });
});

describe('isRowBusy', () => {
  const none: ReadonlySet<number> = new Set();

  it('is busy while its transition request is in flight', () => {
    expect(isRowBusy(7, new Set([7]), none)).toBe(true);
  });

  it('stays busy after the transition was applied, until the list reload answers', () => {
    expect(isRowBusy(7, none, new Set([7]))).toBe(true);
  });

  it('is free when neither set holds the order', () => {
    expect(isRowBusy(7, none, none)).toBe(false);
    expect(isRowBusy(7, new Set([8]), new Set([9]))).toBe(false);
  });
});

describe('tipoIcon', () => {
  it.each<[TipoPedido, string]>([
    ['MESA', 'utensils'],
    ['DELIVERY', 'bike'],
    ['RECOJO', 'bag'],
  ])('%s -> %s', (tipo, expected) => {
    expect(tipoIcon(tipo)).toBe(expected);
  });

  it.each([['BARRA'], ['constructor'], ['toString'], [''], [null], [undefined]])(
    'has no icon for %j',
    (value) => {
      expect(tipoIcon(value as unknown as TipoPedido)).toBeNull();
    },
  );
});

describe('shouldReloadAfterRejection', () => {
  // A 4xx on a transition most likely means the row is stale (someone else advanced, cancelled or charged it).
  it.each([400, 401, 402, 403, 404, 409, 422, 499])('reloads after HTTP %d', (status) => {
    expect(shouldReloadAfterRejection(status)).toBe(true);
  });

  it.each([0, 200, 204, 399, 500, 502, 503, 504])('does not reload after status %d', (status) => {
    expect(shouldReloadAfterRejection(status)).toBe(false);
  });

  it('does not reload for a status that is not a number', () => {
    expect(shouldReloadAfterRejection(NaN)).toBe(false);
    expect(shouldReloadAfterRejection(undefined as unknown as number)).toBe(false);
  });
});

describe('failedLoadView', () => {
  it('keeps the rows when a reload of the same view fails and rows were already loaded', () => {
    expect(failedLoadView({ hadData: true, sameView: true })).toBe('keep-rows');
  });

  it('shows the error panel when there is no data to keep', () => {
    expect(failedLoadView({ hadData: false, sameView: true })).toBe('error-panel');
    expect(failedLoadView({ hadData: false, sameView: false })).toBe('error-panel');
  });

  it('shows the error panel when the view itself changed (tab or page), even if rows were loaded', () => {
    expect(failedLoadView({ hadData: true, sameView: false })).toBe('error-panel');
  });
});

describe('isCobrable', () => {
  const pagos: (EstadoPago | null)[] = [null, 'PAGADO', 'REEMBOLSADO'];

  it.each(
    ESTADOS_PEDIDO.flatMap((estado) =>
      pagos.map(
        (estadoPago) => [estado, estadoPago, estadoPago === null && estado !== 'CANCELADO'] as const,
      ),
    ),
  )('%s with estadoPago %s -> %s', (estado, estadoPago, expected) => {
    expect(isCobrable({ estado, estadoPago })).toBe(expected);
  });

  it('charges an unpaid delivered order (ENTREGADO without payment is valid)', () => {
    expect(isCobrable(aPedidoListado({ estado: 'ENTREGADO', estadoPago: null }))).toBe(true);
  });
});

describe('cobrarLabel', () => {
  it.each([
    [72, 'Cobrar S/ 72.00'],
    [57.5, 'Cobrar S/ 57.50'],
    [0, 'Cobrar S/ 0.00'],
  ])('%s -> %s', (total, expected) => {
    expect(cobrarLabel(total)).toBe(expected);
  });

  it('shows an em dash amount when the total is not a number', () => {
    expect(cobrarLabel(Number.NaN)).toBe('Cobrar —');
  });
});
