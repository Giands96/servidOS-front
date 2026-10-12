import { aProducto } from '../../../../testing/builders';
import { tipoLabel } from './pedidos.rules';
import {
  BorradorPedido,
  LineaPedido,
  TIPOS_PEDIDO,
  addProducto,
  canAdd,
  cantidadDe,
  decrement,
  increment,
  isValidDraft,
  parseMesaId,
  setLineaObservacion,
  toRequest,
  totalReferencial,
  validateDraft,
} from './nuevo-pedido.rules';

/** Freezes recursively: any in-place mutation throws (ES modules run in strict mode). */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const linea = (overrides: Partial<LineaPedido> = {}): LineaPedido => ({
  productoId: 1,
  nombre: 'Lomo saltado',
  precio: 25,
  cantidad: 1,
  observacion: '',
  ...overrides,
});

const draft = (overrides: Partial<BorradorPedido> = {}): BorradorPedido => ({
  tipoPedido: 'MESA',
  mesaId: '7',
  observacion: '',
  lineas: [linea()],
  ...overrides,
});

describe('TIPOS_PEDIDO', () => {
  it('lists MESA, DELIVERY, RECOJO in the order of the design toggle with Spanish labels', () => {
    expect(TIPOS_PEDIDO).toEqual([
      { tipoPedido: 'MESA', label: 'Mesa' },
      { tipoPedido: 'DELIVERY', label: 'Delivery' },
      { tipoPedido: 'RECOJO', label: 'Recojo' },
    ]);
  });

  it('shares its labels with the list (no duplicated wording)', () => {
    for (const { tipoPedido, label } of TIPOS_PEDIDO) {
      expect(tipoLabel({ tipoPedido, mesaId: null })).toBe(label);
    }
  });
});

describe('canAdd', () => {
  it('accepts only DISPONIBLE products', () => {
    expect(canAdd(aProducto({ estado: 'DISPONIBLE' }))).toBe(true);
    expect(canAdd(aProducto({ estado: 'AGOTADO' }))).toBe(false);
  });
});

describe('addProducto', () => {
  it('adds a new line with cantidad 1, an empty observation and the product snapshot', () => {
    const producto = aProducto({ productoId: 3, nombre: 'Ceviche', precio: 32.5 });
    expect(addProducto([], producto)).toEqual([
      { productoId: 3, nombre: 'Ceviche', precio: 32.5, cantidad: 1, observacion: '' },
    ]);
  });

  it('appends new products after the existing lines', () => {
    const lineas = [linea({ productoId: 1 })];
    const result = addProducto(lineas, aProducto({ productoId: 2, nombre: 'Chicha' }));
    expect(result.map((l) => l.productoId)).toEqual([1, 2]);
  });

  it('increments the existing line instead of duplicating the product', () => {
    const lineas = [linea({ productoId: 1, cantidad: 2 }), linea({ productoId: 2 })];
    const result = addProducto(lineas, aProducto({ productoId: 1 }));
    expect(result).toHaveLength(2);
    expect(result[0].cantidad).toBe(3);
    expect(result[1].cantidad).toBe(1);
  });

  it('keeps the observation of the existing line when it increments', () => {
    const lineas = [linea({ productoId: 1, observacion: 'Sin cebolla' })];
    expect(addProducto(lineas, aProducto({ productoId: 1 }))[0].observacion).toBe('Sin cebolla');
  });

  it('ignores an AGOTADO product (no-op), also when the line already exists', () => {
    const lineas = [linea({ productoId: 1 })];
    expect(addProducto(lineas, aProducto({ productoId: 9, estado: 'AGOTADO' }))).toEqual(lineas);
    expect(addProducto(lineas, aProducto({ productoId: 1, estado: 'AGOTADO' }))).toEqual(lineas);
    expect(addProducto([], aProducto({ estado: 'AGOTADO' }))).toEqual([]);
  });

  it('does not mutate its inputs', () => {
    const lineas = deepFreeze([linea({ productoId: 1 })]);
    const producto = deepFreeze(aProducto({ productoId: 1 }));
    expect(() => addProducto(lineas, producto)).not.toThrow();
    expect(() => addProducto(lineas, deepFreeze(aProducto({ productoId: 2 })))).not.toThrow();
    expect(lineas[0].cantidad).toBe(1);
  });
});

describe('increment', () => {
  it('adds one to the line of that product only', () => {
    const lineas = [linea({ productoId: 1, cantidad: 1 }), linea({ productoId: 2, cantidad: 4 })];
    const result = increment(lineas, 2);
    expect(result.map((l) => l.cantidad)).toEqual([1, 5]);
  });

  it('leaves the lines unchanged for an unknown product', () => {
    const lineas = [linea({ productoId: 1 })];
    expect(increment(lineas, 99)).toEqual(lineas);
  });

  it('does not mutate its input', () => {
    const lineas = deepFreeze([linea({ productoId: 1 })]);
    expect(() => increment(lineas, 1)).not.toThrow();
    expect(lineas[0].cantidad).toBe(1);
  });
});

describe('decrement', () => {
  it('subtracts one from the line of that product only', () => {
    const lineas = [linea({ productoId: 1, cantidad: 3 }), linea({ productoId: 2, cantidad: 2 })];
    expect(decrement(lineas, 1).map((l) => l.cantidad)).toEqual([2, 2]);
  });

  it('removes the line when it would reach 0, keeping the order of the others', () => {
    const lineas = [
      linea({ productoId: 1 }),
      linea({ productoId: 2, cantidad: 1 }),
      linea({ productoId: 3 }),
    ];
    expect(decrement(lineas, 2).map((l) => l.productoId)).toEqual([1, 3]);
  });

  it('leaves the lines unchanged for an unknown product', () => {
    const lineas = [linea({ productoId: 1 })];
    expect(decrement(lineas, 99)).toEqual(lineas);
  });

  it('does not mutate its input', () => {
    const lineas = deepFreeze([linea({ productoId: 1, cantidad: 2 }), linea({ productoId: 2 })]);
    expect(() => decrement(lineas, 1)).not.toThrow();
    expect(() => decrement(lineas, 2)).not.toThrow();
    expect(lineas).toHaveLength(2);
    expect(lineas[0].cantidad).toBe(2);
  });
});

describe('setLineaObservacion', () => {
  it('sets the observation of that line only, as typed (trimming happens in toRequest)', () => {
    const lineas = [linea({ productoId: 1 }), linea({ productoId: 2 })];
    const result = setLineaObservacion(lineas, 2, '  sin sal ');
    expect(result.map((l) => l.observacion)).toEqual(['', '  sin sal ']);
  });

  it('leaves the lines unchanged for an unknown product', () => {
    const lineas = [linea({ productoId: 1 })];
    expect(setLineaObservacion(lineas, 99, 'x')).toEqual(lineas);
  });

  it('does not mutate its input', () => {
    const lineas = deepFreeze([linea({ productoId: 1 })]);
    expect(() => setLineaObservacion(lineas, 1, 'x')).not.toThrow();
    expect(lineas[0].observacion).toBe('');
  });
});

describe('cantidadDe', () => {
  it('returns the quantity of the product, or 0 when it is not in the cart', () => {
    const lineas = [linea({ productoId: 1, cantidad: 3 })];
    expect(cantidadDe(lineas, 1)).toBe(3);
    expect(cantidadDe(lineas, 2)).toBe(0);
    expect(cantidadDe([], 1)).toBe(0);
  });
});

describe('totalReferencial', () => {
  it('is 0 for an empty cart', () => {
    expect(totalReferencial([])).toBe(0);
  });

  it('sums precio x cantidad', () => {
    const lineas = [
      linea({ productoId: 1, precio: 25, cantidad: 2 }),
      linea({ productoId: 2, precio: 12.5, cantidad: 3 }),
    ];
    expect(totalReferencial(lineas)).toBe(87.5);
  });

  it('adds in integer cents: 0.1 + 0.2 is exactly 0.3', () => {
    const lineas = [linea({ productoId: 1, precio: 0.1 }), linea({ productoId: 2, precio: 0.2 })];
    expect(0.1 + 0.2).not.toBe(0.3); // the drift this function avoids
    expect(totalReferencial(lineas)).toBe(0.3);
  });

  it('multiplies in cents: 0.1 x 3 is exactly 0.3 and 19.99 x 3 is 59.97', () => {
    expect(totalReferencial([linea({ precio: 0.1, cantidad: 3 })])).toBe(0.3);
    expect(totalReferencial([linea({ precio: 19.99, cantidad: 3 })])).toBe(59.97);
  });

  it('keeps long sums free of drift (ten items of 1.1)', () => {
    expect(totalReferencial([linea({ precio: 1.1, cantidad: 10 })])).toBe(11);
  });

  it('does not mutate its input', () => {
    const lineas = deepFreeze([linea()]);
    expect(() => totalReferencial(lineas)).not.toThrow();
  });
});

describe('parseMesaId', () => {
  it.each<[string, number]>([
    ['7', 7],
    ['  12  ', 12],
    ['007', 7],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
  ])('accepts %j as %i', (raw, expected) => {
    expect(parseMesaId(raw)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    '0',
    '000',
    '-3',
    '+3',
    '3.5',
    '3.0',
    '1e3',
    '1E3',
    '0x10',
    'abc',
    '7a',
    '1 2',
    '١٢',
    '9007199254740992',
    '99999999999999999999',
  ])('rejects %j', (raw) => {
    expect(parseMesaId(raw)).toBeNull();
  });
});

describe('validateDraft', () => {
  it('has no errors for a valid MESA draft', () => {
    expect(validateDraft(draft())).toEqual({});
    expect(isValidDraft(draft())).toBe(true);
  });

  it('asks for at least one product when the cart is empty', () => {
    const errors = validateDraft(draft({ lineas: [] }));
    expect(errors.items).toBe('Agrega al menos un producto al pedido');
    expect(errors.mesaId).toBeUndefined();
    expect(isValidDraft(draft({ lineas: [] }))).toBe(false);
  });

  it('asks for a valid mesa when the type is MESA and the input is blank or invalid', () => {
    for (const mesaId of ['', '  ', '0', '-1', '2.5', 'abc', '1e2']) {
      const errors = validateDraft(draft({ mesaId }));
      expect(errors.mesaId).toBe('La mesa es obligatoria: ingresa un número entero mayor a 0');
      expect(errors.items).toBeUndefined();
    }
  });

  it('reports both errors at once', () => {
    const errors = validateDraft(draft({ lineas: [], mesaId: '' }));
    expect(Object.keys(errors).sort()).toEqual(['items', 'mesaId']);
  });

  it.each(['DELIVERY', 'RECOJO'] as const)(
    'does not ask for a mesa when the type is %s',
    (tipoPedido) => {
      expect(validateDraft(draft({ tipoPedido, mesaId: '' }))).toEqual({});
      expect(validateDraft(draft({ tipoPedido, mesaId: 'garbage' }))).toEqual({});
    },
  );

  it('flags a line whose cantidad is not an integer >= 1', () => {
    for (const cantidad of [0, -1, 1.5, Number.NaN]) {
      const errors = validateDraft(draft({ lineas: [linea({ cantidad })] }));
      expect(errors.items).toBe('Revisa las cantidades: deben ser números enteros desde 1');
    }
  });

  it('does not mutate its input', () => {
    expect(() => validateDraft(deepFreeze(draft({ lineas: [] })))).not.toThrow();
  });
});

describe('toRequest', () => {
  it('builds the MESA request with the parsed mesaId and every line', () => {
    const result = toRequest(
      draft({
        mesaId: ' 7 ',
        lineas: [
          linea({ productoId: 1, cantidad: 2 }),
          linea({ productoId: 2, cantidad: 1, observacion: 'Sin ají' }),
        ],
      }),
    );
    expect(result).toEqual({
      tipoPedido: 'MESA',
      mesaId: 7,
      items: [
        { productoId: 1, cantidad: 2 },
        { productoId: 2, cantidad: 1, observacion: 'Sin ají' },
      ],
    });
  });

  it.each(['DELIVERY', 'RECOJO'] as const)(
    'never sends mesaId for %s, even when the user typed one',
    (tipoPedido) => {
      const result = toRequest(draft({ tipoPedido, mesaId: '7' }));
      expect(result.tipoPedido).toBe(tipoPedido);
      expect('mesaId' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('mesaId');
    },
  );

  it('trims the order observation and omits it when blank', () => {
    expect(toRequest(draft({ observacion: '  Cumpleaños  ' })).observacion).toBe('Cumpleaños');
    for (const observacion of ['', '   ', '\n\t ']) {
      expect('observacion' in toRequest(draft({ observacion }))).toBe(false);
    }
  });

  it('trims each line observation and omits it when blank', () => {
    const result = toRequest(
      draft({
        lineas: [
          linea({ productoId: 1, observacion: '  poco picante ' }),
          linea({ productoId: 2, observacion: '   ' }),
          linea({ productoId: 3, observacion: '' }),
        ],
      }),
    );
    expect(result.items).toEqual([
      { productoId: 1, cantidad: 1, observacion: 'poco picante' },
      { productoId: 2, cantidad: 1 },
      { productoId: 3, cantidad: 1 },
    ]);
    expect('observacion' in result.items[1]).toBe(false);
  });

  it('sends integer cantidades >= 1', () => {
    const result = toRequest(draft({ lineas: [linea({ cantidad: 3 })] }));
    expect(result.items.every((i) => Number.isInteger(i.cantidad) && i.cantidad >= 1)).toBe(true);
  });

  it('carries no price, total, name or amount keys anywhere', () => {
    const result = toRequest(
      draft({
        observacion: 'x',
        lineas: [linea({ nombre: 'Lomo saltado', precio: 25, cantidad: 2, observacion: 'y' })],
      }),
    );
    const keys = new Set<string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collect);
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, inner] of Object.entries(value)) {
          keys.add(key);
          collect(inner);
        }
      }
    };
    collect(result);
    expect([...keys].sort()).toEqual([
      'cantidad',
      'items',
      'mesaId',
      'observacion',
      'productoId',
      'tipoPedido',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/precio|total|monto|nombre|repartidor/i);
  });

  it('throws for an invalid draft instead of building a request the backend would reject', () => {
    expect(() => toRequest(draft({ lineas: [] }))).toThrow(/inválido/);
    expect(() => toRequest(draft({ mesaId: '' }))).toThrow(/inválido/);
    expect(() => toRequest(draft({ lineas: [linea({ cantidad: 0 })] }))).toThrow(/inválido/);
  });

  it('builds a DELIVERY request even when the typed mesa would have been invalid', () => {
    expect(() => toRequest(draft({ tipoPedido: 'DELIVERY', mesaId: 'abc' }))).not.toThrow();
  });

  it('does not mutate its input and does not alias its lines', () => {
    const input = deepFreeze(
      draft({ observacion: ' a ', lineas: [linea({ observacion: ' b ' })] }),
    );
    const result = toRequest(input);
    expect(result.items).not.toBe(input.lineas);
    expect(input.observacion).toBe(' a ');
    expect(input.lineas[0].observacion).toBe(' b ');
  });
});
