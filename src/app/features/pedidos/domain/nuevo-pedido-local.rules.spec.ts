import {
  aCuentaMesa,
  aMesa,
  aPage,
  aPedidoCuenta,
  aPedidoListado,
} from '../../../../testing/builders';
import {
  ALERTA_THRESHOLDS,
  MAX_PAGE_SIZE,
  alertaTiempo,
  clampComensales,
  conteoFiltros,
  filtrarMesas,
  mesaCards,
  PasoNuevoPedido,
  pasoAnterior,
  pasoAnteriorDisponible,
  pasoTrasMesa,
  pasoTrasTipo,
  pedidosAbiertosLabel,
  comensalesDetalleLabel,
  horaPedido,
  pasosDisponibles,
  pasosDe,
  paginasRestantes,
  ocupacionAlCrear,
  progresoLocal,
  resumenMesa,
  puedeRestarComensal,
  puedeSumarComensal,
  tipoPasoLabel,
  tipoPasoResumen,
  OPCIONES_TIPO,
  seccionesCuenta,
} from './nuevo-pedido-local.rules';
import type { MesaCard } from './nuevo-pedido-local.rules';

/** Freezes recursively: any in-place mutation throws (ES modules run in strict mode). */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const NOW = new Date('2026-10-08T13:00:00');
/** Zone-less local date-time that is `minutes` before NOW (the backend format). */
const ago = (minutes: number): string => {
  const d = new Date(NOW.getTime() - minutes * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

describe('pasosDe / pasoAnterior', () => {
  it('MESA walks TIPO, MESA, COMENSALES, PRODUCTOS', () => {
    expect(pasosDe('MESA')).toEqual(['TIPO', 'MESA', 'COMENSALES', 'PRODUCTOS']);
  });

  it('DELIVERY and RECOJO skip straight to PRODUCTOS', () => {
    expect(pasosDe('DELIVERY')).toEqual(['TIPO', 'PRODUCTOS']);
    expect(pasosDe('RECOJO')).toEqual(['TIPO', 'PRODUCTOS']);
  });

  it('no tipo yet only has TIPO', () => {
    expect(pasosDe(null)).toEqual(['TIPO']);
  });

  it('goes back one step within the flow of the tipo', () => {
    expect(pasoAnterior('PRODUCTOS', 'MESA')).toBe('COMENSALES');
    expect(pasoAnterior('COMENSALES', 'MESA')).toBe('MESA');
    expect(pasoAnterior('MESA', 'MESA')).toBe('TIPO');
    expect(pasoAnterior('PRODUCTOS', 'DELIVERY')).toBe('TIPO');
  });

  it('has nothing before TIPO', () => {
    expect(pasoAnterior('TIPO', 'MESA')).toBeNull();
    expect(pasoAnterior('TIPO', null)).toBeNull();
  });

  it('a step outside the flow of the tipo has no previous step', () => {
    expect(pasoAnterior('COMENSALES', 'DELIVERY')).toBeNull();
  });
});

describe('pasoTrasTipo', () => {
  it('Local asks for the table first', () => {
    expect(pasoTrasTipo('MESA')).toBe('MESA');
  });

  it('Delivery and Recojo go straight to the products', () => {
    expect(pasoTrasTipo('DELIVERY')).toBe('PRODUCTOS');
    expect(pasoTrasTipo('RECOJO')).toBe('PRODUCTOS');
  });
});

describe('pasoTrasMesa', () => {
  it('a free table asks the guests', () => {
    expect(pasoTrasMesa({ estado: 'LIBRE' })).toBe('COMENSALES');
  });

  it('an occupied table changes no step: its bill detail opens over the picker', () => {
    expect(pasoTrasMesa({ estado: 'OCUPADA' })).toBeNull();
  });
});

describe('pedidosAbiertosLabel', () => {
  it('uses the singular for one order', () => {
    expect(pedidosAbiertosLabel(1)).toBe('1 pedido');
  });

  it('uses the plural otherwise', () => {
    expect(pedidosAbiertosLabel(3)).toBe('3 pedidos');
    expect(pedidosAbiertosLabel(0)).toBe('0 pedidos');
  });
});

describe('comensalesDetalleLabel', () => {
  it('reads the occupation of the table', () => {
    expect(comensalesDetalleLabel({ comensales: 3, ocupacion: '3/4' })).toBe('3/4 comensales');
  });

  it('is null when the guests are unknown', () => {
    expect(comensalesDetalleLabel({ comensales: null, ocupacion: '–/4' })).toBeNull();
    expect(comensalesDetalleLabel({ comensales: null, ocupacion: null })).toBeNull();
  });
});

describe('horaPedido', () => {
  it('shows HH:mm of the zoneless Lima time as written', () => {
    expect(horaPedido('2026-10-24T09:05:33')).toBe('09:05');
    expect(horaPedido('2026-10-24T21:40:00.123')).toBe('21:40');
  });

  it('shows an em dash for an unreadable value', () => {
    expect(horaPedido('no es fecha')).toBe('—');
  });
});

describe('pasoAnteriorDisponible', () => {
  const sinComensales: readonly PasoNuevoPedido[] = ['TIPO', 'MESA', 'PRODUCTOS'];

  it('skips a step the page cannot render yet', () => {
    expect(pasoAnteriorDisponible('PRODUCTOS', 'MESA', sinComensales)).toBe('MESA');
  });

  it('behaves like pasoAnterior when every step is available', () => {
    const todos = pasosDe('MESA');
    expect(pasoAnteriorDisponible('PRODUCTOS', 'MESA', todos)).toBe('COMENSALES');
    expect(pasoAnteriorDisponible('MESA', 'MESA', todos)).toBe('TIPO');
  });

  it('goes back to TIPO for Delivery and Recojo', () => {
    expect(pasoAnteriorDisponible('PRODUCTOS', 'DELIVERY', sinComensales)).toBe('TIPO');
  });

  it('has nothing before TIPO or outside the flow', () => {
    expect(pasoAnteriorDisponible('TIPO', 'MESA', sinComensales)).toBeNull();
    expect(pasoAnteriorDisponible('COMENSALES', 'DELIVERY', sinComensales)).toBeNull();
  });

  it('returns null when no earlier step is available', () => {
    expect(pasoAnteriorDisponible('PRODUCTOS', 'MESA', ['PRODUCTOS'])).toBeNull();
  });
});

describe('pasosDisponibles', () => {
  it('a free table (or none yet) keeps the guests step', () => {
    expect(pasosDisponibles({ estado: 'LIBRE' })).toEqual(['TIPO', 'MESA', 'COMENSALES', 'PRODUCTOS']);
    expect(pasosDisponibles(null)).toEqual(['TIPO', 'MESA', 'COMENSALES', 'PRODUCTOS']);
  });

  it('an occupied table has no guests step, so Atrás from PRODUCTOS lands on MESA', () => {
    const pasos = pasosDisponibles({ estado: 'OCUPADA' });
    expect(pasos).toEqual(['TIPO', 'MESA', 'PRODUCTOS']);
    expect(pasoAnteriorDisponible('PRODUCTOS', 'MESA', pasos)).toBe('MESA');
  });

  it('a free table goes back from PRODUCTOS to COMENSALES and from COMENSALES to MESA', () => {
    const pasos = pasosDisponibles({ estado: 'LIBRE' });
    expect(pasoAnteriorDisponible('PRODUCTOS', 'MESA', pasos)).toBe('COMENSALES');
    expect(pasoAnteriorDisponible('COMENSALES', 'MESA', pasos)).toBe('MESA');
  });
});

describe('ocupacionAlCrear', () => {
  const card = (overrides: Partial<MesaCard> = {}): MesaCard => ({
    mesaId: 805,
    numero: 5,
    estado: 'LIBRE',
    capacidad: 4,
    comensales: null,
    ocupacion: null,
    consumido: null,
    minutosAbierta: null,
    alerta: null,
    ...overrides,
  });

  it('a local order on a free table occupies it with the chosen guests', () => {
    expect(ocupacionAlCrear('MESA', card(), 3)).toEqual({ mesaId: 805, comensales: 3 });
  });

  it('clamps the guests to the table capacity', () => {
    expect(ocupacionAlCrear('MESA', card(), 9)).toEqual({ mesaId: 805, comensales: 4 });
    expect(ocupacionAlCrear('MESA', card(), 0)).toEqual({ mesaId: 805, comensales: 1 });
  });

  it('an occupied table is not occupied again (another round)', () => {
    const ocupada = card({ estado: 'OCUPADA', comensales: 3, ocupacion: '3/4' });
    expect(ocupacionAlCrear('MESA', ocupada, 2)).toBeNull();
  });

  it('delivery, pickup and a missing table never occupy', () => {
    expect(ocupacionAlCrear('DELIVERY', card(), 2)).toBeNull();
    expect(ocupacionAlCrear('RECOJO', card(), 2)).toBeNull();
    expect(ocupacionAlCrear('MESA', null, 2)).toBeNull();
  });
});

describe('resumenMesa', () => {
  const card = (overrides: Partial<MesaCard> = {}): MesaCard => ({
    mesaId: 805,
    numero: 5,
    estado: 'LIBRE',
    capacidad: 4,
    comensales: null,
    ocupacion: null,
    consumido: null,
    minutosAbierta: null,
    alerta: null,
    ...overrides,
  });

  it('a free table shows the chosen guests, singular for one', () => {
    expect(resumenMesa(card(), 2)).toBe('Mesa 5 · 2 comensales');
    expect(resumenMesa(card(), 1)).toBe('Mesa 5 · 1 comensal');
  });

  it('an occupied table shows its current occupation and ignores the guests of the step', () => {
    const ocupada = card({ estado: 'OCUPADA', comensales: 3, ocupacion: '3/4' });
    expect(resumenMesa(ocupada, 1)).toBe('Mesa 5 · 3/4 comensales');
  });

  it('an occupied table without known guests shows only the number', () => {
    const ocupada = card({ estado: 'OCUPADA', comensales: null, ocupacion: '–/4' });
    expect(resumenMesa(ocupada, 1)).toBe('Mesa 5');
  });
});

describe('progresoLocal', () => {
  const states = (paso: Parameters<typeof progresoLocal>[0]) =>
    progresoLocal(paso).map((i) => i.state);

  it('lists Mesa, Comensales and Productos in order', () => {
    expect(progresoLocal('TIPO').map((i) => i.label)).toEqual(['Mesa', 'Comensales', 'Productos']);
  });

  it('TIPO leaves everything todo', () => {
    expect(states('TIPO')).toEqual(['todo', 'todo', 'todo']);
  });

  it('marks earlier items done and the active one current', () => {
    expect(states('MESA')).toEqual(['current', 'todo', 'todo']);
    expect(states('COMENSALES')).toEqual(['done', 'current', 'todo']);
    expect(states('PRODUCTOS')).toEqual(['done', 'done', 'current']);
  });
});

describe('clampComensales', () => {
  it('keeps a value inside 1..capacidad', () => {
    expect(clampComensales(3, 4)).toBe(3);
    expect(clampComensales(1, 4)).toBe(1);
    expect(clampComensales(4, 4)).toBe(4);
  });

  it('raises anything below 1 or NaN to 1', () => {
    expect(clampComensales(0, 4)).toBe(1);
    expect(clampComensales(-5, 4)).toBe(1);
    expect(clampComensales(Number.NaN, 4)).toBe(1);
  });

  it('caps at the capacity', () => {
    expect(clampComensales(5, 4)).toBe(4);
    expect(clampComensales(Number.POSITIVE_INFINITY, 4)).toBe(4);
  });

  it('floors decimals', () => {
    expect(clampComensales(2.9, 4)).toBe(2);
    expect(clampComensales(0.9, 4)).toBe(1);
  });

  it('a capacity below 1 still yields 1', () => {
    expect(clampComensales(3, 0)).toBe(1);
  });
});

describe('puedeSumarComensal / puedeRestarComensal', () => {
  it('can add until the capacity', () => {
    expect(puedeSumarComensal(3, 4)).toBe(true);
    expect(puedeSumarComensal(4, 4)).toBe(false);
  });

  it('can subtract until 1', () => {
    expect(puedeRestarComensal(2)).toBe(true);
    expect(puedeRestarComensal(1)).toBe(false);
  });
});

describe('alertaTiempo', () => {
  it('exposes the thresholds of the design legend', () => {
    expect(ALERTA_THRESHOLDS).toEqual({ atencionMin: 30, criticaMax: 60 });
  });

  it.each([
    [0, 'normal'],
    [29, 'normal'],
    [30, 'atencion'],
    [45, 'atencion'],
    [60, 'atencion'],
    [61, 'critica'],
    [300, 'critica'],
  ] as const)('%i minutes is %s', (minutos, expected) => {
    expect(alertaTiempo(minutos)).toBe(expected);
  });
});

describe('mesaCards', () => {
  it('a free table has no guests, occupancy, consumption or timer', () => {
    const [card] = mesaCards([aMesa({ mesaId: 1, numero: 1, capacidad: 4 })], [], NOW);
    expect(card).toEqual({
      mesaId: 1,
      numero: 1,
      estado: 'LIBRE',
      capacidad: 4,
      comensales: null,
      ocupacion: null,
      consumido: null,
      minutosAbierta: null,
      alerta: null,
    });
  });

  it('an occupied table sums its pending orders and times the oldest one', () => {
    const mesa = aMesa({ mesaId: 7, numero: 7, capacidad: 4, estado: 'OCUPADA', comensales: 3 });
    const pendientes = [
      aPedidoListado({ pedidoId: 1, mesaId: 7, total: 40, createdAt: ago(10) }),
      aPedidoListado({ pedidoId: 2, mesaId: 7, total: 22.5, createdAt: ago(45) }),
      aPedidoListado({ pedidoId: 3, mesaId: 8, total: 99, createdAt: ago(90) }),
    ];
    const [card] = mesaCards([mesa], pendientes, NOW);
    expect(card.comensales).toBe(3);
    expect(card.ocupacion).toBe('3/4');
    expect(card.consumido).toBe(62.5);
    expect(card.minutosAbierta).toBe(45);
    expect(card.alerta).toBe('atencion');
  });

  it('counts takeaways linked to the table too', () => {
    const mesa = aMesa({ mesaId: 4, estado: 'OCUPADA', comensales: 2 });
    const [card] = mesaCards(
      [mesa],
      [
        aPedidoListado({ mesaId: 4, tipoPedido: 'MESA', total: 30, createdAt: ago(5) }),
        aPedidoListado({ mesaId: 4, tipoPedido: 'RECOJO', total: 12, createdAt: ago(2) }),
      ],
      NOW,
    );
    expect(card.consumido).toBe(42);
  });

  it('an occupied table with no pending orders has 0 consumed and no timer', () => {
    const mesa = aMesa({ estado: 'OCUPADA', comensales: 1 });
    const [card] = mesaCards([mesa], [], NOW);
    expect(card.consumido).toBe(0);
    expect(card.minutosAbierta).toBeNull();
    expect(card.alerta).toBeNull();
  });

  it('null guests on an occupied table show an en dash', () => {
    const mesa = aMesa({ capacidad: 4, estado: 'OCUPADA', comensales: null });
    const [card] = mesaCards([mesa], [], NOW);
    expect(card.comensales).toBeNull();
    expect(card.ocupacion).toBe('–/4');
  });

  it('ignores pending orders without a table or for an unknown table', () => {
    const mesa = aMesa({ mesaId: 1, estado: 'OCUPADA', comensales: 2 });
    const [card] = mesaCards(
      [mesa],
      [
        aPedidoListado({ mesaId: null, tipoPedido: 'DELIVERY', total: 80 }),
        aPedidoListado({ mesaId: 999, total: 60 }),
      ],
      NOW,
    );
    expect(card.consumido).toBe(0);
    expect(card.minutosAbierta).toBeNull();
  });

  it('ignores pending orders of a free table', () => {
    const [card] = mesaCards(
      [aMesa({ mesaId: 1, estado: 'LIBRE' })],
      [aPedidoListado({ mesaId: 1, total: 60 })],
      NOW,
    );
    expect(card.consumido).toBeNull();
    expect(card.alerta).toBeNull();
  });

  it('sums money in cents so 0.1 + 0.2 is exactly 0.3', () => {
    const mesa = aMesa({ mesaId: 1, estado: 'OCUPADA', comensales: 1 });
    const [card] = mesaCards(
      [mesa],
      [aPedidoListado({ mesaId: 1, total: 0.1 }), aPedidoListado({ mesaId: 1, total: 0.2 })],
      NOW,
    );
    expect(card.consumido).toBe(0.3);
  });

  it('orders the cards by numero ascending', () => {
    const cards = mesaCards(
      [
        aMesa({ mesaId: 3, numero: 12 }),
        aMesa({ mesaId: 1, numero: 2 }),
        aMesa({ mesaId: 2, numero: 7 }),
      ],
      [],
      NOW,
    );
    expect(cards.map((c) => c.numero)).toEqual([2, 7, 12]);
  });

  it('handles empty lists and does not mutate its inputs', () => {
    expect(mesaCards([], [], NOW)).toEqual([]);
    const mesas = deepFreeze([
      aMesa({ mesaId: 2, numero: 2 }),
      aMesa({ mesaId: 1, numero: 1, estado: 'OCUPADA', comensales: 2 }),
    ]);
    const pendientes = deepFreeze([aPedidoListado({ mesaId: 1 })]);
    expect(() => mesaCards(mesas, pendientes, NOW)).not.toThrow();
  });
});

describe('conteoFiltros / filtrarMesas', () => {
  const cards = mesaCards(
    [
      aMesa({ mesaId: 1, numero: 1 }),
      aMesa({ mesaId: 2, numero: 2, estado: 'OCUPADA', comensales: 2 }),
      aMesa({ mesaId: 3, numero: 3 }),
    ],
    [],
    NOW,
  );

  it('counts Todas, Libres and Ocupadas', () => {
    expect(conteoFiltros(cards)).toEqual({ TODAS: 3, LIBRES: 2, OCUPADAS: 1 });
  });

  it('counts zeros for an empty list', () => {
    expect(conteoFiltros([])).toEqual({ TODAS: 0, LIBRES: 0, OCUPADAS: 0 });
  });

  it('filters by estado and keeps the order', () => {
    expect(filtrarMesas(cards, 'TODAS').map((c) => c.numero)).toEqual([1, 2, 3]);
    expect(filtrarMesas(cards, 'LIBRES').map((c) => c.numero)).toEqual([1, 3]);
    expect(filtrarMesas(cards, 'OCUPADAS').map((c) => c.numero)).toEqual([2]);
  });

  it('TODAS returns a new array', () => {
    expect(filtrarMesas(cards, 'TODAS')).not.toBe(cards);
  });
});

describe('paginasRestantes', () => {
  it('caps the page size at what the backend accepts', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it('is empty for 0 or 1 pages', () => {
    expect(paginasRestantes(aPage([], { totalPages: 0 }))).toEqual([]);
    expect(paginasRestantes(aPage([1], { totalPages: 1 }))).toEqual([]);
  });

  it('lists the indexes after page 0', () => {
    expect(paginasRestantes(aPage([1], { totalPages: 2 }))).toEqual([1]);
    expect(paginasRestantes(aPage([1], { totalPages: 4 }))).toEqual([1, 2, 3]);
  });
});

describe('seccionesCuenta', () => {
  it('numbers MESA orders as rounds by createdAt ascending', () => {
    const cuenta = aCuentaMesa({
      pedidos: [
        aPedidoCuenta({ pedidoId: 3, createdAt: '2026-10-08T13:10:00' }),
        aPedidoCuenta({ pedidoId: 1, createdAt: '2026-10-08T12:00:00' }),
        aPedidoCuenta({ pedidoId: 2, createdAt: '2026-10-08T12:30:00' }),
      ],
    });
    const { rondas, paraLlevar } = seccionesCuenta(cuenta);
    expect(rondas.map((r) => [r.numero, r.pedido.pedidoId])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(paraLlevar).toEqual([]);
  });

  it('puts RECOJO and DELIVERY in the takeaway section, never numbered', () => {
    const cuenta = aCuentaMesa({
      pedidos: [
        aPedidoCuenta({ pedidoId: 1, tipoPedido: 'MESA', createdAt: '2026-10-08T12:00:00' }),
        aPedidoCuenta({ pedidoId: 3, tipoPedido: 'DELIVERY', createdAt: '2026-10-08T12:40:00' }),
        aPedidoCuenta({ pedidoId: 2, tipoPedido: 'RECOJO', createdAt: '2026-10-08T12:20:00' }),
      ],
    });
    const { rondas, paraLlevar } = seccionesCuenta(cuenta);
    expect(rondas).toHaveLength(1);
    expect(paraLlevar.map((p) => p.pedidoId)).toEqual([2, 3]);
  });

  it('an empty bill has no sections', () => {
    expect(seccionesCuenta(aCuentaMesa())).toEqual({ rondas: [], paraLlevar: [] });
  });

  it('breaks createdAt ties by pedidoId and does not mutate the bill', () => {
    const cuenta = deepFreeze(
      aCuentaMesa({
        pedidos: [
          aPedidoCuenta({ pedidoId: 9, createdAt: '2026-10-08T12:00:00' }),
          aPedidoCuenta({ pedidoId: 8, createdAt: '2026-10-08T12:00:00' }),
        ],
      }),
    );
    expect(seccionesCuenta(cuenta).rondas.map((r) => r.pedido.pedidoId)).toEqual([8, 9]);
  });
});

describe('tipo de pedido options', () => {
  it('offers Local (MESA), Delivery and Recojo in that order', () => {
    expect(OPCIONES_TIPO.map((o) => o.tipoPedido)).toEqual(['MESA', 'DELIVERY', 'RECOJO']);
    expect(OPCIONES_TIPO.map((o) => o.label)).toEqual(['Local', 'Delivery', 'Recojo']);
  });

  it('describes each option and where it leads', () => {
    expect(OPCIONES_TIPO.map((o) => o.descripcion)).toEqual([
      'Pedido para una mesa del salón',
      'Envío a domicilio',
      'El cliente recoge en el local',
    ]);
    expect(OPCIONES_TIPO.map((o) => o.pie)).toEqual([
      'Mesa · Comensales · Productos',
      'Directo a productos',
      'Directo a productos',
    ]);
  });

  it('labels MESA as "Local" for the step and summaries', () => {
    expect(tipoPasoLabel('MESA')).toBe('Local');
    expect(tipoPasoLabel('DELIVERY')).toBe('Delivery');
    expect(tipoPasoLabel('RECOJO')).toBe('Recojo');
  });

  it('summarizes Delivery and Recojo; Local has no fixed line', () => {
    expect(tipoPasoResumen('DELIVERY')).toBe('Envío a domicilio');
    expect(tipoPasoResumen('RECOJO')).toBe('El cliente recoge en el local');
    expect(tipoPasoResumen('MESA')).toBeNull();
  });
});
