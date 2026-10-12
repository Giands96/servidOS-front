import { aPedidoListado } from '../../../../testing/builders';
import { EstadoPago, EstadoPedido, TipoPedido } from '../pedidos.types';
import {
  ESTADOS_PEDIDO,
  PedidoAction,
  canCancel,
  estadoLabel,
  estadoPagoLabel,
  estadoVariant,
  formatOrderNumber,
  isEstadoPedido,
  nextEstados,
  primaryAction,
  tipoLabel,
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
    ESTADOS_PEDIDO.flatMap((estado) =>
      pagos.map((estadoPago) => {
        const final = estado === 'ENTREGADO' || estado === 'CANCELADO';
        return [estado, estadoPago, !final && estadoPago !== 'PAGADO'] as const;
      }),
    ),
  )('%s with estadoPago %s -> %s', (estado, estadoPago, expected) => {
    expect(canCancel(aPedidoListado({ estado, estadoPago }))).toBe(expected);
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
    [{ tipoPedido: 'MESA', mesaId: 7 }, 'Mesa 7'],
    [{ tipoPedido: 'MESA', mesaId: null }, 'Mesa'],
    [{ tipoPedido: 'DELIVERY', mesaId: null }, 'Delivery'],
    [{ tipoPedido: 'RECOJO', mesaId: null }, 'Recojo'],
  ] as const)('%j -> %s', (partial, expected) => {
    expect(tipoLabel(aPedidoListado({ ...partial }))).toBe(expected);
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
