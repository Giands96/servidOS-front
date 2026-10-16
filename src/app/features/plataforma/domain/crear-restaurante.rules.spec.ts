import {
  CrearRestauranteDraft,
  emptyCrearDraft,
  isValidCrearDraft,
  restauranteCreadoMessage,
  slugError,
  toCrearRequest,
  validateCrearDraft,
} from './crear-restaurante.rules';

const draft = (overrides: Partial<CrearRestauranteDraft> = {}): CrearRestauranteDraft => ({
  nombre: 'La Cevichería',
  slug: 'la-cevicheria',
  direccion: 'Av. Brasil 123',
  planId: 1,
  demo: false,
  demoDias: '14',
  ...overrides,
});

describe('emptyCrearDraft', () => {
  it('starts blank with the given plan and the design demo days', () => {
    expect(emptyCrearDraft(3)).toEqual({
      nombre: '',
      slug: '',
      direccion: '',
      planId: 3,
      demo: false,
      demoDias: '14',
    });
    expect(emptyCrearDraft(null).planId).toBeNull();
  });
});

describe('validateCrearDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateCrearDraft(draft())).toEqual({});
    expect(isValidCrearDraft(draft())).toBe(true);
  });

  it('requires a trimmed nombre of at most 150 characters', () => {
    expect(validateCrearDraft(draft({ nombre: '   ' })).nombre).toBe('El nombre es obligatorio');
    expect(validateCrearDraft(draft({ nombre: 'a'.repeat(150) })).nombre).toBeUndefined();
    expect(validateCrearDraft(draft({ nombre: 'a'.repeat(151) })).nombre).toBe('Máximo 150 caracteres');
  });

  it('requires a slug of 3-100 lowercase letters, digits and hyphens', () => {
    expect(validateCrearDraft(draft({ slug: '' })).slug).toBe('El slug es obligatorio');
    expect(validateCrearDraft(draft({ slug: '  ' })).slug).toBe('El slug es obligatorio');
    expect(validateCrearDraft(draft({ slug: 'ab' })).slug).toBe('Entre 3 y 100 caracteres');
    expect(validateCrearDraft(draft({ slug: 'a'.repeat(101) })).slug).toBe('Entre 3 y 100 caracteres');
    expect(validateCrearDraft(draft({ slug: 'abc' })).slug).toBeUndefined();
    expect(validateCrearDraft(draft({ slug: 'a'.repeat(100) })).slug).toBeUndefined();
  });

  it.each(['La-Cevicheria', 'la cevicheria', 'la_cevicheria', 'cevichería', 'a/b/c'])(
    'rejects slug "%s" for its characters',
    (slug) => {
      expect(validateCrearDraft(draft({ slug })).slug).toBe('Solo minúsculas, números y guiones');
    },
  );

  it('limits direccion to 255 characters and allows it empty', () => {
    expect(validateCrearDraft(draft({ direccion: '' })).direccion).toBeUndefined();
    expect(validateCrearDraft(draft({ direccion: 'a'.repeat(255) })).direccion).toBeUndefined();
    expect(validateCrearDraft(draft({ direccion: 'a'.repeat(256) })).direccion).toBe(
      'Máximo 255 caracteres',
    );
  });

  it('requires a plan', () => {
    expect(validateCrearDraft(draft({ planId: null })).planId).toBe('Elige un plan');
  });

  it('ignores demoDias unless demo is on', () => {
    expect(validateCrearDraft(draft({ demo: false, demoDias: 'abc' })).demoDias).toBeUndefined();
  });

  it.each(['1', '14', '30', ' 7 '])('accepts demoDias "%s"', (demoDias) => {
    expect(validateCrearDraft(draft({ demo: true, demoDias })).demoDias).toBeUndefined();
  });

  it.each(['', '  ', '0', '31', '1.5', '-3', '+5', '1e1', 'abc', '14 días'])(
    'rejects demoDias "%s" when demo is on',
    (demoDias) => {
      expect(validateCrearDraft(draft({ demo: true, demoDias })).demoDias).toBe('Entre 1 y 30 días');
    },
  );

  it('reports every failing field at once', () => {
    const errors = validateCrearDraft(
      draft({ nombre: '', slug: '', planId: null, demo: true, demoDias: '' }),
    );
    expect(Object.keys(errors).sort()).toEqual(['demoDias', 'nombre', 'planId', 'slug']);
    expect(isValidCrearDraft(draft({ nombre: '' }))).toBe(false);
  });
});

describe('toCrearRequest', () => {
  it('trims text and omits the demo fields when demo is off', () => {
    expect(
      toCrearRequest(draft({ nombre: '  La Cevichería ', slug: ' la-cevicheria ', direccion: ' Av. 1 ' })),
    ).toEqual({
      nombre: 'La Cevichería',
      slug: 'la-cevicheria',
      direccion: 'Av. 1',
      planId: 1,
      demo: false,
    });
  });

  it('omits an empty direccion', () => {
    const request = toCrearRequest(draft({ direccion: '   ' }));
    expect('direccion' in request).toBe(false);
  });

  it('sends demo and the integer demoDias when demo is on', () => {
    expect(toCrearRequest(draft({ demo: true, demoDias: ' 7 ' }))).toMatchObject({
      demo: true,
      demoDias: 7,
    });
  });

  it('does not send demoDias when demo is off, even if typed', () => {
    const request = toCrearRequest(draft({ demo: false, demoDias: '9' }));
    expect(request.demo).toBe(false);
    expect('demoDias' in request).toBe(false);
  });

  it('throws for an invalid draft', () => {
    expect(() => toCrearRequest(draft({ slug: 'Mal Slug' }))).toThrow(Error);
    expect(() => toCrearRequest(draft({ planId: null }))).toThrow(Error);
  });
});

describe('slugError', () => {
  it('returns a 400 message that mentions the slug, to show under the field', () => {
    expect(slugError(400, 'El slug ya está en uso')).toBe('El slug ya está en uso');
    expect(slugError(400, 'Slug duplicado')).toBe('Slug duplicado');
  });

  it('returns a 422 "slug: ..." message as is, as the design shows it under the field', () => {
    expect(slugError(422, 'slug: solo minúsculas, números y guiones')).toBe(
      'slug: solo minúsculas, números y guiones',
    );
  });

  it('is null for a 422 about another field or for a 400 without the slug', () => {
    expect(slugError(422, 'nombre: no debe estar vacío')).toBeNull();
    expect(slugError(422, 'planId: no debe ser nulo')).toBeNull();
  });

  it('is null for other messages, statuses or a missing message', () => {
    expect(slugError(400, 'Plan no encontrado')).toBeNull();
    expect(slugError(422, 'El slug ya está en uso')).toBeNull();
    expect(slugError(500, 'slug')).toBeNull();
    expect(slugError(400, null)).toBeNull();
  });
});

describe('restauranteCreadoMessage', () => {
  it('quotes the restaurant name in the success toast', () => {
    expect(restauranteCreadoMessage('Chifa Wa Lok')).toBe('Restaurante "Chifa Wa Lok" creado');
  });
});
