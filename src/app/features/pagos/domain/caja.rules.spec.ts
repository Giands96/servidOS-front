import { PedidoListado } from '../../pedidos/pedidos.types';
import { Pago } from '../pagos.types';
import {
  CobroDraft,
  METODOS_PAGO,
  cobroFieldErrors,
  cobroHeading,
  emptyCobroDraft,
  metodoLabel,
  pagoRegistradoMessage,
  parseMonto,
  parsePedidoParam,
  pideReferencia,
  porCobrarCard,
  porCobrarHeading,
  quickAmounts,
  referenciaHint,
  submitLabel,
  toRegistrarPagoRequest,
  ultimoPagoLabel,
  validateCobro,
  vueltoPreview,
} from './caja.rules';

const draft = (overrides: Partial<CobroDraft> = {}): CobroDraft => ({
  metodo: 'EFECTIVO',
  montoEntregado: '100.00',
  referencia: '',
  ...overrides,
});

const pedido: PedidoListado = {
  pedidoId: 474,
  tipoPedido: 'MESA',
  mesaId: 1,
  estado: 'ENTREGADO',
  total: 72,
  observacion: null,
  createdAt: '2026-10-16T12:30:00',
  estadoPago: null,
};

const pago = (overrides: Partial<Pago> = {}): Pago => ({
  pagoId: 1,
  pedidoId: 474,
  monto: 72,
  vuelto: 28,
  metodoPago: 'EFECTIVO',
  estado: 'PAGADO',
  reembolsoMotivo: null,
  reembolsoUsuarioId: null,
  ...overrides,
});

describe('METODOS_PAGO / metodoLabel / pideReferencia', () => {
  it('lists the six methods in design order with labels and icons', () => {
    expect(METODOS_PAGO).toEqual([
      { metodo: 'EFECTIVO', label: 'Efectivo', icon: 'banknote' },
      { metodo: 'TARJETA_CREDITO', label: 'Tarjeta crédito', icon: 'creditCard' },
      { metodo: 'TARJETA_DEBITO', label: 'Tarjeta débito', icon: 'creditCard' },
      { metodo: 'YAPE', label: 'Yape', icon: 'smartphone' },
      { metodo: 'PLIN', label: 'Plin', icon: 'smartphone' },
      { metodo: 'OTROS', label: 'Otros', icon: 'wallet' },
    ]);
  });

  it('labels each method', () => {
    expect(metodoLabel('YAPE')).toBe('Yape');
    expect(metodoLabel('TARJETA_DEBITO')).toBe('Tarjeta débito');
  });

  it('asks for a reference on every non-cash method only', () => {
    expect(pideReferencia('EFECTIVO')).toBe(false);
    for (const m of ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'YAPE', 'PLIN', 'OTROS'] as const) {
      expect(pideReferencia(m)).toBe(true);
    }
  });

  it('exposes the reference hint', () => {
    expect(referenciaHint).toBe('Para tarjeta, Yape o Plin ingresa el N.º de voucher u operación (opcional).');
  });
});

describe('parseMonto', () => {
  it.each([
    ['100', 100],
    ['100.5', 100.5],
    ['100,50', 100.5],
    [' S/ 100.00 ', 100],
    ['s/100', 100],
    ['0', 0],
    ['0.05', 0.05],
  ])('accepts %j', (text, expected) => {
    expect(parseMonto(text)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '-5', '10.123', '1.', '.5', '1,2,3', 'S/', '1e3', '10 20'])('rejects %j', (text) => {
    expect(parseMonto(text)).toBeNull();
  });
});

describe('vueltoPreview', () => {
  it('is null without an amount or when it falls short', () => {
    expect(vueltoPreview(72, null)).toBeNull();
    expect(vueltoPreview(72, 71.99)).toBeNull();
  });

  it('is zero for an exact amount', () => {
    expect(vueltoPreview(72, 72)).toBe(0);
  });

  it('returns the change without float noise', () => {
    expect(vueltoPreview(72, 100)).toBe(28);
    expect(vueltoPreview(0.1, 0.3)).toBe(0.2);
    expect(vueltoPreview(57.5, 100)).toBe(42.5);
  });
});

describe('quickAmounts', () => {
  it('offers Exacto plus the round amounts above the total', () => {
    expect(quickAmounts(72)).toEqual([
      { label: 'Exacto', monto: 72 },
      { label: 'S/ 100', monto: 100 },
      { label: 'S/ 200', monto: 200 },
    ]);
  });

  it('caps the round amounts at three, ascending', () => {
    expect(quickAmounts(5)).toEqual([
      { label: 'Exacto', monto: 5 },
      { label: 'S/ 10', monto: 10 },
      { label: 'S/ 20', monto: 20 },
      { label: 'S/ 50', monto: 50 },
    ]);
  });

  it('requires amounts strictly greater than the total', () => {
    expect(quickAmounts(20)).toEqual([
      { label: 'Exacto', monto: 20 },
      { label: 'S/ 50', monto: 50 },
      { label: 'S/ 100', monto: 100 },
      { label: 'S/ 200', monto: 200 },
    ]);
  });

  it('uses the next multiples of 50 from 200 up', () => {
    expect(quickAmounts(200)).toEqual([
      { label: 'Exacto', monto: 200 },
      { label: 'S/ 250', monto: 250 },
      { label: 'S/ 300', monto: 300 },
      { label: 'S/ 350', monto: 350 },
    ]);
    expect(quickAmounts(230.5).map((q: { monto: number }) => q.monto)).toEqual([230.5, 250, 300, 350]);
  });
});

describe('emptyCobroDraft', () => {
  it('starts on cash with blank fields', () => {
    expect(emptyCobroDraft()).toEqual({ metodo: 'EFECTIVO', montoEntregado: '', referencia: '' });
  });
});

describe('validateCobro', () => {
  it('accepts a cash draft that covers the total', () => {
    expect(validateCobro(draft(), 72)).toEqual({});
    expect(validateCobro(draft({ montoEntregado: '72' }), 72)).toEqual({});
  });

  it('requires a method', () => {
    expect(validateCobro(draft({ metodo: null }), 72)).toEqual({ metodo: 'Elige un método de pago' });
  });

  it('checks the cash amount: required, valid, enough', () => {
    expect(validateCobro(draft({ montoEntregado: '  ' }), 72)).toEqual({
      montoEntregado: 'Ingresa el monto entregado',
    });
    expect(validateCobro(draft({ montoEntregado: 'abc' }), 72)).toEqual({
      montoEntregado: 'Ingresa un monto válido (ej. 100.00)',
    });
    expect(validateCobro(draft({ montoEntregado: '71.99' }), 72)).toEqual({
      montoEntregado: 'El monto no alcanza para el total',
    });
  });

  it('ignores the amount for non-cash methods', () => {
    expect(validateCobro(draft({ metodo: 'YAPE', montoEntregado: '' }), 72)).toEqual({});
  });

  it('limits the reference to 100 characters', () => {
    expect(validateCobro(draft({ metodo: 'YAPE', referencia: 'x'.repeat(100) }), 72)).toEqual({});
    expect(validateCobro(draft({ metodo: 'YAPE', referencia: 'x'.repeat(101) }), 72)).toEqual({
      referencia: 'Máximo 100 caracteres',
    });
  });
});

describe('toRegistrarPagoRequest', () => {
  it('sends the cash amount and no reference for EFECTIVO', () => {
    expect(toRegistrarPagoRequest(474, draft({ montoEntregado: ' 100,50 ', referencia: 'ignored' }), 72)).toEqual({
      pedidoId: 474,
      metodoPago: 'EFECTIVO',
      montoEntregado: 100.5,
    });
  });

  it('sends only a trimmed non-blank reference for other methods', () => {
    expect(toRegistrarPagoRequest(474, draft({ metodo: 'YAPE', referencia: '  OP-123 ' }), 72)).toEqual({
      pedidoId: 474,
      metodoPago: 'YAPE',
      referenciaExterna: 'OP-123',
    });
    expect(toRegistrarPagoRequest(474, draft({ metodo: 'PLIN', referencia: '   ', montoEntregado: '5' }), 72)).toEqual({
      pedidoId: 474,
      metodoPago: 'PLIN',
    });
  });

  it('throws for an invalid draft', () => {
    expect(() => toRegistrarPagoRequest(474, draft({ montoEntregado: '10' }), 72)).toThrow();
    expect(() => toRegistrarPagoRequest(474, draft({ metodo: null }), 72)).toThrow();
  });
});

describe('cobroFieldErrors', () => {
  it('puts a 400 about the amount under montoEntregado', () => {
    const message = 'Pedido inexistente, ya pagado o monto insuficiente';
    expect(cobroFieldErrors(400, message)).toEqual({ montoEntregado: message });
    expect(cobroFieldErrors(400, 'El MONTO no alcanza')).toEqual({ montoEntregado: 'El MONTO no alcanza' });
  });

  it('maps 422 field messages', () => {
    expect(
      cobroFieldErrors(
        422,
        'montoEntregado: debe ser mayor o igual a 0; referenciaExterna: tamaño máximo 100; metodoPago: obligatorio; otro: x',
      ),
    ).toEqual({
      montoEntregado: 'debe ser mayor o igual a 0',
      referencia: 'tamaño máximo 100',
      metodo: 'obligatorio',
    });
  });

  it('is empty for anything else', () => {
    expect(cobroFieldErrors(400, 'Pedido cancelado')).toEqual({});
    expect(cobroFieldErrors(403, 'monto')).toEqual({});
    expect(cobroFieldErrors(400, null)).toEqual({});
    expect(cobroFieldErrors(422, null)).toEqual({});
  });
});

describe('list and form copy', () => {
  it('builds the por-cobrar card view', () => {
    expect(porCobrarCard(pedido)).toEqual({
      pedidoId: 474,
      numero: '#0474',
      titulo: 'Mesa 1',
      icon: 'utensils',
      estado: 'Entregado',
      estadoVariant: 'neutral',
      total: 'S/ 72.00',
    });
  });

  it('builds the headings and submit label', () => {
    expect(porCobrarHeading(5)).toBe('POR COBRAR · 5');
    expect(cobroHeading(pedido)).toBe('Cobrar pedido #0474 · Mesa 1');
    expect(cobroHeading({ ...pedido, pedidoId: 480, tipoPedido: 'RECOJO', mesaId: null })).toBe(
      'Cobrar pedido #0480 · Recojo',
    );
    expect(submitLabel(72)).toBe('Registrar pago · S/ 72.00');
  });

  it('words the success message with the change for cash', () => {
    expect(pagoRegistradoMessage(pago(), pedido)).toBe('Pago registrado · #0474 · Vuelto S/ 28.00');
  });

  it('falls back to the method when there is no change', () => {
    expect(pagoRegistradoMessage(pago({ vuelto: 0 }), pedido)).toBe('Pago registrado · #0474 · Efectivo');
    expect(pagoRegistradoMessage(pago({ vuelto: null }), pedido)).toBe('Pago registrado · #0474 · Efectivo');
    expect(pagoRegistradoMessage(pago({ metodoPago: 'YAPE', vuelto: null }), pedido)).toBe(
      'Pago registrado · #0474 · Yape',
    );
  });

  it('words the last payment line', () => {
    expect(ultimoPagoLabel(pago({ pedidoId: 471, metodoPago: 'YAPE', monto: 54, vuelto: null }), { pedidoId: 471 })).toBe(
      'Último pago: #0471 · Yape · S/ 54.00',
    );
  });
});

describe('parsePedidoParam', () => {
  it.each([
    ['474', 474],
    [' 7 ', 7],
  ])('reads %j', (value, expected) => {
    expect(parsePedidoParam(value)).toBe(expected);
  });

  it.each([null, '', '0', '-3', '1.5', 'abc', '12abc', '99999999999999999999'])('rejects %j', (value) => {
    expect(parsePedidoParam(value)).toBeNull();
  });
});
