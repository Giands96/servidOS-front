import {
  aPlan,
  aRestaurante,
  aRestauranteDashboard,
  aSuscripcionPlataforma,
} from '../../../../testing/builders';
import { RestauranteDashboard } from '../plataforma.types';
import {
  actionSuccessMessage,
  cambiarPlanCopy,
  canConfirmAction,
  defaultRenovarPlanId,
  estadoCopy,
  formatPrecio,
  isVencida,
  limaToday,
  nextSort,
  pageNumbers,
  panelActions,
  planChoiceOptions,
  planLabel,
  planOptionLabel,
  rangeLabel,
  renovarCopy,
  renovarPlanIdToSend,
  renovarPlanRequired,
  restauranteEstadoLabel,
  restauranteEstadoVariant,
  sortLabel,
  suscripcionView,
  totalLabel,
} from './plataforma.rules';

const TODAY = '2026-10-15';

const withSuscripcion = (
  overrides: Partial<NonNullable<RestauranteDashboard['suscripcion']>> | null,
  restaurante: Partial<RestauranteDashboard> = {},
): RestauranteDashboard => {
  const base = aRestauranteDashboard().suscripcion;
  return aRestauranteDashboard({
    ...restaurante,
    suscripcion: overrides === null || base === null ? null : { ...base, ...overrides },
  });
};

describe('limaToday', () => {
  it('uses the Lima day, not the UTC day', () => {
    // 2026-10-16T02:30Z is still 2026-10-15 21:30 in Lima (UTC-5).
    expect(limaToday(new Date('2026-10-16T02:30:00Z'))).toBe('2026-10-15');
  });

  it('moves to the next day at 05:00 UTC', () => {
    expect(limaToday(new Date('2026-10-16T04:59:59Z'))).toBe('2026-10-15');
    expect(limaToday(new Date('2026-10-16T05:00:00Z'))).toBe('2026-10-16');
  });

  it('is zero-padded', () => {
    expect(limaToday(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });
});

describe('isVencida', () => {
  it.each([
    ['2026-10-14', true],
    ['2026-10-15', false],
    ['2026-10-16', false],
  ])('fechaFin %s against today -> %s (inclusive last day)', (fechaFin, expected) => {
    expect(isVencida(fechaFin, TODAY)).toBe(expected);
  });
});

describe('suscripcionView', () => {
  it('shows "Sin suscripción" without a subscription', () => {
    expect(suscripcionView(null, TODAY)).toEqual({
      label: 'Sin suscripción',
      variant: null,
      vence: '–',
    });
  });

  it('shows Activa/ok with the formatted end date', () => {
    const s = withSuscripcion({ estado: 'ACTIVA', fechaFin: '2026-10-31' }).suscripcion;
    expect(suscripcionView(s, TODAY)).toEqual({ label: 'Activa', variant: 'ok', vence: '31 oct 2026' });
  });

  it('keeps ACTIVA on its last day', () => {
    const s = withSuscripcion({ fechaFin: TODAY }).suscripcion;
    expect(suscripcionView(s, TODAY).label).toBe('Activa');
  });

  it('shows Vencida/warn when fechaFin is before today, whatever the estado', () => {
    const activa = withSuscripcion({ estado: 'ACTIVA', fechaFin: '2026-10-14' }).suscripcion;
    const cancelada = withSuscripcion({ estado: 'CANCELADA', fechaFin: '2026-10-14' }).suscripcion;
    expect(suscripcionView(activa, TODAY)).toMatchObject({ label: 'Vencida', variant: 'warn' });
    expect(suscripcionView(cancelada, TODAY)).toMatchObject({ label: 'Vencida', variant: 'warn' });
  });

  it('shows Cancelada/danger for a cancelled subscription that has not expired', () => {
    const s = withSuscripcion({ estado: 'CANCELADA', fechaFin: '2026-12-01' }).suscripcion;
    expect(suscripcionView(s, TODAY)).toMatchObject({ label: 'Cancelada', variant: 'danger' });
  });

  it('shows the raw estado with the neutral badge for an unknown estado', () => {
    const s = withSuscripcion({ estado: 'PAUSADA' as never, fechaFin: '2026-12-01' }).suscripcion;
    expect(suscripcionView(s, TODAY)).toMatchObject({ label: 'PAUSADA', variant: 'neutral' });
  });
});

describe('planLabel', () => {
  it('returns the plan name or an em dash', () => {
    expect(planLabel(withSuscripcion({ nombrePlan: 'Pro' }).suscripcion)).toBe('Pro');
    expect(planLabel(null)).toBe('—');
  });
});

describe('restaurante estado', () => {
  it.each([
    ['ACTIVO', 'Activo', 'ok'],
    ['INACTIVO', 'Suspendido', 'danger'],
    ['OTRO', 'OTRO', 'neutral'],
  ])('%s -> %s / %s', (estado, label, variant) => {
    expect(restauranteEstadoLabel(estado as never)).toBe(label);
    expect(restauranteEstadoVariant(estado as never)).toBe(variant);
  });
});

describe('totalLabel', () => {
  it.each([
    [0, '0 restaurantes en la plataforma'],
    [1, '1 restaurante en la plataforma'],
    [37, '37 restaurantes en la plataforma'],
  ])('%i -> %s', (total, expected) => {
    expect(totalLabel(total)).toBe(expected);
  });
});

describe('rangeLabel', () => {
  it('shows the visible range and the page counter', () => {
    expect(rangeLabel({ number: 0, size: 10, totalElements: 37, totalPages: 4 })).toBe(
      '1–10 de 37 · Página 1 de 4',
    );
    expect(rangeLabel({ number: 1, size: 10, totalElements: 37, totalPages: 4 })).toBe(
      '11–20 de 37 · Página 2 de 4',
    );
  });

  it('caps the last range at the total', () => {
    expect(rangeLabel({ number: 3, size: 10, totalElements: 37, totalPages: 4 })).toBe(
      '31–37 de 37 · Página 4 de 4',
    );
  });

  it('is "0 de 0" when empty', () => {
    expect(rangeLabel({ number: 0, size: 10, totalElements: 0, totalPages: 0 })).toBe('0 de 0');
  });
});

describe('pageNumbers', () => {
  it('is empty for zero or one page', () => {
    expect(pageNumbers(0, 0)).toEqual([]);
    expect(pageNumbers(0, 1)).toEqual([]);
  });

  it('shows every page up to seven', () => {
    expect(pageNumbers(0, 2)).toEqual([0, 1]);
    expect(pageNumbers(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it.each([
    [0, 10, [0, 1, null, 9]],
    [1, 10, [0, 1, 2, null, 9]],
    [2, 10, [0, 1, 2, 3, null, 9]],
    [5, 10, [0, null, 4, 5, 6, null, 9]],
    [7, 10, [0, null, 6, 7, 8, 9]],
    [9, 10, [0, null, 8, 9]],
  ])('current %i of %i -> first, last, current±1 and gaps', (current, total, expected) => {
    expect(pageNumbers(current, total)).toEqual(expected);
  });
});

describe('sort', () => {
  it('toggles asc and desc', () => {
    expect(nextSort('nombre,asc')).toBe('nombre,desc');
    expect(nextSort('nombre,desc')).toBe('nombre,asc');
    expect(nextSort(undefined)).toBe('nombre,asc');
  });

  it('labels the order, A-Z by default', () => {
    expect(sortLabel('nombre,asc')).toBe('Nombre A–Z');
    expect(sortLabel(undefined)).toBe('Nombre A–Z');
    expect(sortLabel('nombre,desc')).toBe('Nombre Z–A');
  });
});

describe('panelActions', () => {
  it('always offers renovar', () => {
    expect(panelActions(withSuscripcion(null), TODAY).renovar).toBe(true);
  });

  it('allows cambiarPlan for an ACTIVO restaurant with a valid ACTIVA subscription', () => {
    expect(panelActions(withSuscripcion({}), TODAY).cambiarPlan).toBe(true);
  });

  it.each([
    ['no subscription', withSuscripcion(null)],
    ['cancelled subscription', withSuscripcion({ estado: 'CANCELADA' })],
    ['expired subscription', withSuscripcion({ fechaFin: '2026-10-14' })],
    ['suspended restaurant', withSuscripcion({}, { estado: 'INACTIVO' })],
  ])('blocks cambiarPlan with %s', (_name, restaurante) => {
    expect(panelActions(restaurante, TODAY).cambiarPlan).toBe(false);
  });

  it('suspends an ACTIVO restaurant and reactivates an INACTIVO one', () => {
    expect(panelActions(withSuscripcion({}), TODAY).estado).toEqual({
      target: 'INACTIVO',
      label: 'Suspender',
    });
    expect(panelActions(withSuscripcion({}, { estado: 'INACTIVO' }), TODAY).estado).toEqual({
      target: 'ACTIVO',
      label: 'Reactivar',
    });
  });

  it('warns on reactivation only when INACTIVO and without a valid subscription', () => {
    expect(panelActions(withSuscripcion(null, { estado: 'INACTIVO' }), TODAY).reactivarSinVigencia).toBe(true);
    expect(
      panelActions(withSuscripcion({ fechaFin: '2026-10-14' }, { estado: 'INACTIVO' }), TODAY)
        .reactivarSinVigencia,
    ).toBe(true);
    expect(panelActions(withSuscripcion({}, { estado: 'INACTIVO' }), TODAY).reactivarSinVigencia).toBe(false);
    expect(panelActions(withSuscripcion(null), TODAY).reactivarSinVigencia).toBe(false);
  });
});

describe('renovar plan', () => {
  const planes = [aPlan({ planId: 1, nombre: 'Estándar' }), aPlan({ planId: 2, nombre: 'Pro' })];

  it('requires a plan only without a prior subscription', () => {
    expect(renovarPlanRequired(withSuscripcion(null))).toBe(true);
    expect(renovarPlanRequired(withSuscripcion({}))).toBe(false);
  });

  it('defaults to the current plan when it is still offered', () => {
    expect(defaultRenovarPlanId(withSuscripcion({ planId: 2 }), planes)).toBe(2);
  });

  it('falls back to the first plan when the current one is gone or there is none', () => {
    expect(defaultRenovarPlanId(withSuscripcion({ planId: 99 }), planes)).toBe(1);
    expect(defaultRenovarPlanId(withSuscripcion(null), planes)).toBe(1);
  });

  it('is null when there are no plans', () => {
    expect(defaultRenovarPlanId(withSuscripcion({ planId: 1 }), [])).toBeNull();
  });
});

describe('confirmation copy', () => {
  const r = withSuscripcion({}, { nombre: 'La Cevichería' });

  it('renovar', () => {
    expect(renovarCopy(r)).toEqual({
      heading: 'Renovar suscripción',
      body: 'Registra un mes pagado para La Cevichería. Si la suscripción sigue vigente, el nuevo periodo empieza al día siguiente de su vencimiento.',
      confirm: 'Renovar',
    });
  });

  it('suspender', () => {
    expect(estadoCopy(r, TODAY)).toEqual({
      heading: 'Suspender restaurante',
      body: 'La Cevichería quedará en solo lectura: no podrá registrar pedidos ni cambios hasta que lo reactives.',
      confirm: 'Suspender',
    });
  });

  it('reactivar with a valid subscription', () => {
    const inactivo = withSuscripcion({}, { nombre: 'La Cevichería', estado: 'INACTIVO' });
    expect(estadoCopy(inactivo, TODAY)).toEqual({
      heading: 'Reactivar restaurante',
      body: 'La Cevichería volverá a operar.',
      confirm: 'Reactivar',
    });
  });

  it('reactivar without a valid subscription adds the warning', () => {
    const inactivo = withSuscripcion(null, { nombre: 'La Cevichería', estado: 'INACTIVO' });
    expect(estadoCopy(inactivo, TODAY).body).toBe(
      'La Cevichería volverá a operar. Su suscripción no está vigente: seguirá bloqueado hasta que renueves.',
    );
  });

  it('cambiar plan', () => {
    expect(cambiarPlanCopy(r)).toEqual({
      heading: 'Cambiar plan',
      body: 'Cancela la suscripción actual de La Cevichería y abre una nueva de un mes desde hoy con el plan elegido.',
      confirm: 'Cambiar plan',
    });
  });
});

describe('actionSuccessMessage', () => {
  const r = withSuscripcion({}, { nombre: 'La Cevichería' });

  it('renovar names the new end date', () => {
    const result = aSuscripcionPlataforma({ fechaFin: '2026-11-30' });
    expect(actionSuccessMessage('renovar', r, result)).toBe('Suscripción renovada hasta 30 nov 2026');
  });

  it('renovar and plan degrade gracefully without a result', () => {
    expect(actionSuccessMessage('renovar', r)).toBe('Suscripción renovada');
    expect(actionSuccessMessage('plan', r)).toBe('Plan cambiado');
  });

  it('plan names the new plan', () => {
    const result = aSuscripcionPlataforma({ nombrePlan: 'Pro' });
    expect(actionSuccessMessage('plan', r, result)).toBe('Plan cambiado a Pro');
  });

  it('estado follows the change applied to the row as it was before the action', () => {
    expect(actionSuccessMessage('estado', withSuscripcion({}, { estado: 'ACTIVO' }))).toBe(
      'Restaurante suspendido',
    );
    expect(actionSuccessMessage('estado', withSuscripcion({}, { estado: 'INACTIVO' }))).toBe(
      'Restaurante reactivado',
    );
  });

  it('estado prefers the estado the backend answered', () => {
    expect(
      actionSuccessMessage('estado', withSuscripcion({}, { estado: 'ACTIVO' }), aRestaurante({ estado: 'ACTIVO' })),
    ).toBe('Restaurante reactivado');
  });
});

describe('price formatting', () => {
  it('formats soles with the S/ symbol', () => {
    expect(formatPrecio(34.9, 'PEN')).toBe('S/ 34.90');
    expect(formatPrecio(0, 'PEN')).toBe('S/ 0.00');
  });

  it('prefixes another currency with its code', () => {
    expect(formatPrecio(34.9, 'USD')).toBe('USD 34.90');
  });

  it('shows an em dash for a non-finite amount', () => {
    expect(formatPrecio(Number.NaN, 'PEN')).toBe('—');
  });

  it('builds the plan option label', () => {
    expect(planOptionLabel(aPlan({ nombre: 'Estándar', precio: 34.9, moneda: 'PEN' }))).toBe(
      'Estándar · S/ 34.90',
    );
  });
});

describe('plan choice', () => {
  const planes = [
    aPlan({ planId: 1, nombre: 'Estándar' }),
    aPlan({ planId: 2, nombre: 'Pro' }),
    aPlan({ planId: 3, nombre: 'Max' }),
  ];

  describe('planChoiceOptions', () => {
    it('offers every plan to renovar', () => {
      expect(planChoiceOptions('renovar', withSuscripcion({ planId: 2 }), planes)).toEqual(planes);
    });

    it('excludes the current plan from cambiar plan', () => {
      expect(planChoiceOptions('plan', withSuscripcion({ planId: 2 }), planes).map((p) => p.planId)).toEqual([1, 3]);
    });

    it('keeps every plan for cambiar plan when there is no subscription', () => {
      expect(planChoiceOptions('plan', withSuscripcion(null), planes)).toEqual(planes);
    });
  });

  describe('renovarPlanIdToSend', () => {
    it('sends the chosen plan when the restaurant has no subscription', () => {
      expect(renovarPlanIdToSend(withSuscripcion(null), 3)).toBe(3);
    });

    it('sends nothing for the current plan, so the backend renews it', () => {
      expect(renovarPlanIdToSend(withSuscripcion({ planId: 2 }), 2)).toBeUndefined();
    });

    it('sends the chosen plan when it differs from the current one', () => {
      expect(renovarPlanIdToSend(withSuscripcion({ planId: 2 }), 3)).toBe(3);
    });

    it('sends nothing when no plan is chosen (plans not loaded) and the current one is renewed', () => {
      expect(renovarPlanIdToSend(withSuscripcion({ planId: 2 }), null)).toBeUndefined();
    });

    it('sends nothing without a choice even when the plan is required (confirm is disabled then)', () => {
      expect(renovarPlanIdToSend(withSuscripcion(null), null)).toBeUndefined();
    });
  });

  describe('canConfirmAction', () => {
    it('renovar needs a chosen plan only when one is required', () => {
      expect(canConfirmAction('renovar', withSuscripcion(null), null)).toBe(false);
      expect(canConfirmAction('renovar', withSuscripcion(null), 1)).toBe(true);
      expect(canConfirmAction('renovar', withSuscripcion({ planId: 2 }), null)).toBe(true);
      expect(canConfirmAction('renovar', withSuscripcion({ planId: 2 }), 2)).toBe(true);
    });

    it('cambiar plan needs a plan different from the current one', () => {
      const r = withSuscripcion({ planId: 2 });
      expect(canConfirmAction('plan', r, null)).toBe(false);
      expect(canConfirmAction('plan', r, 2)).toBe(false);
      expect(canConfirmAction('plan', r, 3)).toBe(true);
    });

    it('estado is always confirmable', () => {
      expect(canConfirmAction('estado', withSuscripcion({}), null)).toBe(true);
    });
  });
});
