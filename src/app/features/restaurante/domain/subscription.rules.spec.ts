import { estadoLabel, estadoVariant, formatDate, formatPeriod } from './subscription.rules';

describe('formatDate', () => {
  it.each([
    ['2026-09-14', '14 sep 2026'],
    ['2026-01-05', '5 ene 2026'],
    ['2026-12-31T23:59:59', '31 dic 2026'],
    ['2026-08-14T00:00:00Z', '14 ago 2026'],
  ])('formats %s as %s', (iso, expected) => {
    expect(formatDate(iso)).toBe(expected);
  });

  it('returns the input unchanged when it is not an ISO date', () => {
    expect(formatDate('mañana')).toBe('mañana');
    expect(formatDate('2026-13-40')).toBe('2026-13-40');
  });
});

describe('formatPeriod', () => {
  it('joins start and end with an en dash', () => {
    expect(formatPeriod('2026-08-14', '2026-09-14')).toBe('14 ago 2026 – 14 sep 2026');
  });
});

describe('estado helpers', () => {
  it('maps ACTIVA to a green badge and CANCELADA to a red one', () => {
    expect(estadoLabel('ACTIVA')).toBe('Activa');
    expect(estadoLabel('CANCELADA')).toBe('Cancelada');
    expect(estadoVariant('ACTIVA')).toBe('ok');
    expect(estadoVariant('CANCELADA')).toBe('danger');
  });
});
