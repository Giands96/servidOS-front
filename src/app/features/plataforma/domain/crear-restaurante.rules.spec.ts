import { aRestauranteCreado } from '../../../../testing/builders';
import {
  CrearRestauranteDraft,
  CrearRestauranteField,
  canAdvance,
  emptyCrearDraft,
  fieldErrorsFromResponse,
  firstStepWithErrors,
  isValidCrearDraft,
  restauranteCreadoMessage,
  stepErrors,
  stepOfField,
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
  adminNombre: 'Rosa',
  adminApellido: 'Quispe',
  adminEmail: 'rosa@cevicheria.test',
  adminPassword: 'secreto123',
  adminPasswordConfirm: 'secreto123',
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
      adminNombre: '',
      adminApellido: '',
      adminEmail: '',
      adminPassword: '',
      adminPasswordConfirm: '',
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

  it('requires a trimmed owner nombre of 2-100 characters', () => {
    expect(validateCrearDraft(draft({ adminNombre: '   ' })).adminNombre).toBe('El nombre es obligatorio');
    expect(validateCrearDraft(draft({ adminNombre: ' a ' })).adminNombre).toBe('Entre 2 y 100 caracteres');
    expect(validateCrearDraft(draft({ adminNombre: 'ab' })).adminNombre).toBeUndefined();
    expect(validateCrearDraft(draft({ adminNombre: 'a'.repeat(100) })).adminNombre).toBeUndefined();
    expect(validateCrearDraft(draft({ adminNombre: 'a'.repeat(101) })).adminNombre).toBe(
      'Entre 2 y 100 caracteres',
    );
  });

  it('requires a trimmed owner apellido of at most 100 characters', () => {
    expect(validateCrearDraft(draft({ adminApellido: '  ' })).adminApellido).toBe('El apellido es obligatorio');
    expect(validateCrearDraft(draft({ adminApellido: 'a'.repeat(100) })).adminApellido).toBeUndefined();
    expect(validateCrearDraft(draft({ adminApellido: 'a'.repeat(101) })).adminApellido).toBe(
      'Máximo 100 caracteres',
    );
  });

  it('requires a trimmed owner email of valid format and at most 150 characters', () => {
    expect(validateCrearDraft(draft({ adminEmail: '  ' })).adminEmail).toBe('El email es obligatorio');
    expect(validateCrearDraft(draft({ adminEmail: ' rosa@cevicheria.test ' })).adminEmail).toBeUndefined();
    const local = 'a'.repeat(150 - '@b.co'.length);
    expect(validateCrearDraft(draft({ adminEmail: `${local}@b.co` })).adminEmail).toBeUndefined();
    expect(validateCrearDraft(draft({ adminEmail: `${local}a@b.co` })).adminEmail).toBe('Máximo 150 caracteres');
  });

  it.each(['rosa', 'rosa@', '@cevicheria.test', 'rosa@cevicheria', 'ro sa@cevicheria.test', 'a@b@c.pe'])(
    'rejects owner email "%s" for its format',
    (adminEmail) => {
      expect(validateCrearDraft(draft({ adminEmail })).adminEmail).toBe('Ingresa un email válido');
    },
  );

  it('requires an owner password of 8-72 characters, not trimmed', () => {
    expect(validateCrearDraft(draft({ adminPassword: '' })).adminPassword).toBe('La contraseña es obligatoria');
    expect(validateCrearDraft(draft({ adminPassword: 'a'.repeat(7) })).adminPassword).toBe(
      'Entre 8 y 72 caracteres',
    );
    expect(validateCrearDraft(draft({ adminPassword: 'a'.repeat(8) })).adminPassword).toBeUndefined();
    expect(validateCrearDraft(draft({ adminPassword: 'a'.repeat(72) })).adminPassword).toBeUndefined();
    expect(validateCrearDraft(draft({ adminPassword: 'a'.repeat(73) })).adminPassword).toBe(
      'Entre 8 y 72 caracteres',
    );
    // Spaces count: eight spaces are a valid length, so the password is not trimmed before checking.
    expect(validateCrearDraft(draft({ adminPassword: ' '.repeat(8) })).adminPassword).toBeUndefined();
  });

  it('requires the password confirmation to match', () => {
    expect(validateCrearDraft(draft({ adminPasswordConfirm: 'secreto124' })).adminPasswordConfirm).toBe(
      'Las contraseñas no coinciden',
    );
    expect(validateCrearDraft(draft({ adminPasswordConfirm: '' })).adminPasswordConfirm).toBe(
      'Las contraseñas no coinciden',
    );
    expect(validateCrearDraft(draft()).adminPasswordConfirm).toBeUndefined();
  });

  it('reports every failing field at once', () => {
    const errors = validateCrearDraft(
      draft({
        nombre: '',
        slug: '',
        planId: null,
        demo: true,
        demoDias: '',
        adminNombre: '',
        adminApellido: '',
        adminEmail: '',
        adminPassword: '',
        adminPasswordConfirm: 'x',
      }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      'adminApellido',
      'adminEmail',
      'adminNombre',
      'adminPassword',
      'adminPasswordConfirm',
      'demoDias',
      'nombre',
      'planId',
      'slug',
    ]);
    expect(isValidCrearDraft(draft({ nombre: '' }))).toBe(false);
  });
});

describe('toCrearRequest', () => {
  it('trims text, omits the demo fields when demo is off and includes the owner', () => {
    expect(
      toCrearRequest(draft({ nombre: '  La Cevichería ', slug: ' la-cevicheria ', direccion: ' Av. 1 ' })),
    ).toEqual({
      nombre: 'La Cevichería',
      slug: 'la-cevicheria',
      direccion: 'Av. 1',
      planId: 1,
      demo: false,
      administrador: {
        nombre: 'Rosa',
        apellido: 'Quispe',
        email: 'rosa@cevicheria.test',
        password: 'secreto123',
      },
    });
  });

  it('trims the owner text fields, keeps the password as typed and never sends the confirmation', () => {
    const request = toCrearRequest(
      draft({
        adminNombre: '  Rosa ',
        adminApellido: ' Quispe  ',
        adminEmail: ' rosa@cevicheria.test ',
        adminPassword: ' secreto 123 ',
        adminPasswordConfirm: ' secreto 123 ',
      }),
    );
    expect(request.administrador).toEqual({
      nombre: 'Rosa',
      apellido: 'Quispe',
      email: 'rosa@cevicheria.test',
      password: ' secreto 123 ',
    });
    expect(JSON.stringify(request)).not.toContain('Confirm');
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
    expect(() => toCrearRequest(draft({ adminPasswordConfirm: 'otra-cosa' }))).toThrow(Error);
  });
});

describe('fieldErrorsFromResponse', () => {
  const realMessage =
    'administrador.nombre: el tamaño debe estar entre 2 y 100; administrador.apellido: no debe estar vacío; ' +
    'administrador.email: debe ser una dirección de correo electrónico con formato correcto; ' +
    'administrador.password: el tamaño debe estar entre 8 y 72';

  it('puts a 409 message under the owner email field as is', () => {
    expect(fieldErrorsFromResponse(409, 'Email ya registrado')).toEqual({ adminEmail: 'Email ya registrado' });
  });

  it('puts a 400 message that mentions the slug under the slug field', () => {
    expect(fieldErrorsFromResponse(400, 'El slug ya está en uso')).toEqual({ slug: 'El slug ya está en uso' });
    expect(fieldErrorsFromResponse(400, 'Slug duplicado')).toEqual({ slug: 'Slug duplicado' });
  });

  it('maps every owner field of a real 422 message, keeping the text after the first ": "', () => {
    expect(fieldErrorsFromResponse(422, realMessage)).toEqual({
      adminNombre: 'el tamaño debe estar entre 2 y 100',
      adminApellido: 'no debe estar vacío',
      adminEmail: 'debe ser una dirección de correo electrónico con formato correcto',
      adminPassword: 'el tamaño debe estar entre 8 y 72',
    });
  });

  it('maps the restaurant fields of a 422 message', () => {
    expect(
      fieldErrorsFromResponse(
        422,
        'slug: solo minúsculas; nombre: no debe estar vacío; direccion: demasiado larga; planId: no debe ser nulo; demoDias: debe ser menor o igual a 30',
      ),
    ).toEqual({
      slug: 'solo minúsculas',
      nombre: 'no debe estar vacío',
      direccion: 'demasiado larga',
      planId: 'no debe ser nulo',
      demoDias: 'debe ser menor o igual a 30',
    });
  });

  it('keeps colons inside the field message', () => {
    expect(fieldErrorsFromResponse(422, 'nombre: valor: inválido')).toEqual({ nombre: 'valor: inválido' });
  });

  it('ignores unknown prefixes, including the missing owner object, so the page can toast the message', () => {
    expect(fieldErrorsFromResponse(422, 'administrador: no debe ser nulo')).toEqual({});
    expect(fieldErrorsFromResponse(422, 'otro: algo')).toEqual({});
    expect(fieldErrorsFromResponse(422, 'sin separador')).toEqual({});
    expect(fieldErrorsFromResponse(422, 'nombre: ok; otro: algo')).toEqual({ nombre: 'ok' });
  });

  it('is empty for a 400 without the slug, other statuses or a missing message', () => {
    expect(fieldErrorsFromResponse(400, 'Plan no encontrado')).toEqual({});
    expect(fieldErrorsFromResponse(500, 'slug')).toEqual({});
    expect(fieldErrorsFromResponse(400, null)).toEqual({});
    expect(fieldErrorsFromResponse(409, null)).toEqual({});
    expect(fieldErrorsFromResponse(422, null)).toEqual({});
  });
});

describe('stepOfField', () => {
  it.each(['slug', 'nombre', 'direccion', 'planId', 'demoDias'] as const)('puts "%s" in the restaurant step', (field) => {
    expect(stepOfField(field)).toBe('restaurante');
  });

  it.each(['adminNombre', 'adminApellido', 'adminEmail', 'adminPassword', 'adminPasswordConfirm'] as const)(
    'puts "%s" in the administrator step',
    (field) => {
      expect(stepOfField(field)).toBe('administrador');
    },
  );
});

describe('stepErrors', () => {
  const errors = { nombre: 'a', slug: 'b', adminEmail: 'c', adminPassword: 'd' };

  it('keeps only the errors of the given step', () => {
    expect(stepErrors(errors, 'restaurante')).toEqual({ nombre: 'a', slug: 'b' });
    expect(stepErrors(errors, 'administrador')).toEqual({ adminEmail: 'c', adminPassword: 'd' });
  });

  it('is empty when the step has no errors', () => {
    expect(stepErrors({}, 'restaurante')).toEqual({});
    expect(stepErrors({ adminEmail: 'c' }, 'restaurante')).toEqual({});
  });
});

describe('canAdvance', () => {
  it('is true when the restaurant step is valid, even with an empty owner', () => {
    expect(canAdvance(draft())).toBe(true);
    expect(
      canAdvance(
        draft({ adminNombre: '', adminApellido: '', adminEmail: '', adminPassword: '', adminPasswordConfirm: '' }),
      ),
    ).toBe(true);
  });

  it('is false when any restaurant field fails', () => {
    expect(canAdvance(draft({ nombre: '' }))).toBe(false);
    expect(canAdvance(draft({ slug: 'Mal Slug' }))).toBe(false);
    expect(canAdvance(draft({ planId: null }))).toBe(false);
    expect(canAdvance(draft({ demo: true, demoDias: '99' }))).toBe(false);
  });
});

describe('firstStepWithErrors', () => {
  it('is null without errors', () => {
    expect(firstStepWithErrors({})).toBeNull();
  });

  it('prefers the restaurant step when it has any error', () => {
    expect(firstStepWithErrors({ slug: 'x', adminEmail: 'y' })).toBe('restaurante');
    const every: CrearRestauranteField = 'demoDias';
    expect(firstStepWithErrors({ [every]: 'x' })).toBe('restaurante');
  });

  it('falls back to the administrator step', () => {
    expect(firstStepWithErrors({ adminEmail: 'y' })).toBe('administrador');
  });
});

describe('restauranteCreadoMessage', () => {
  it('quotes the restaurant name and tells which email the owner logs in with', () => {
    const creado = aRestauranteCreado({
      nombre: 'Chifa Wa Lok',
      administrador: { usuarioId: 7, email: 'dueno@wa-lok.test', nombre: 'Wa' },
    });
    expect(restauranteCreadoMessage(creado)).toBe(
      'Restaurante "Chifa Wa Lok" creado. El dueño inicia sesión con dueno@wa-lok.test',
    );
  });
});
