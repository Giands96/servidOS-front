import { CrearRestauranteRequest, RestauranteCreado } from '../plataforma.types';

/**
 * Form state of the create-restaurant screen; `demoDias` is the raw text of the input. The `admin*` fields are the
 * owner account created with the restaurant; the password fields are never trimmed.
 */
export interface CrearRestauranteDraft {
  nombre: string;
  slug: string;
  direccion: string;
  planId: number | null;
  demo: boolean;
  demoDias: string;
  adminNombre: string;
  adminApellido: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
}

export type CrearRestauranteField =
  | 'nombre'
  | 'slug'
  | 'direccion'
  | 'planId'
  | 'demoDias'
  | 'adminNombre'
  | 'adminApellido'
  | 'adminEmail'
  | 'adminPassword'
  | 'adminPasswordConfirm';

export type CrearRestauranteErrors = Partial<Record<CrearRestauranteField, string>>;

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DEMO_DIAS_PATTERN = /^\d+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NOMBRE_MAX = 150;
const SLUG_MIN = 3;
const SLUG_MAX = 100;
const DIRECCION_MAX = 255;
const DEMO_DIAS_MIN = 1;
const DEMO_DIAS_MAX = 30;
const ADMIN_NOMBRE_MIN = 2;
const ADMIN_NOMBRE_MAX = 100;
const ADMIN_APELLIDO_MAX = 100;
const ADMIN_EMAIL_MAX = 150;
const ADMIN_PASSWORD_MIN = 8;
const ADMIN_PASSWORD_MAX = 72;

/** A blank form; 14 days is the demo length the design shows. */
export function emptyCrearDraft(planId: number | null): CrearRestauranteDraft {
  return {
    nombre: '',
    slug: '',
    direccion: '',
    planId,
    demo: false,
    demoDias: '14',
    adminNombre: '',
    adminApellido: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  };
}

/** Integer 1-30 from the trimmed text; decimals, signs, exponents and blanks give null. */
function parseDemoDias(raw: string): number | null {
  const text = raw.trim();
  if (!DEMO_DIAS_PATTERN.test(text)) {
    return null;
  }
  const value = Number(text);
  return value >= DEMO_DIAS_MIN && value <= DEMO_DIAS_MAX ? value : null;
}

/** Field errors in Spanish; an empty object means the draft can be sent. */
export function validateCrearDraft(d: CrearRestauranteDraft): CrearRestauranteErrors {
  const errors: CrearRestauranteErrors = {};
  const nombre = d.nombre.trim();
  if (nombre === '') {
    errors.nombre = 'El nombre es obligatorio';
  } else if (nombre.length > NOMBRE_MAX) {
    errors.nombre = `Máximo ${NOMBRE_MAX} caracteres`;
  }
  const slug = d.slug.trim();
  if (slug === '') {
    errors.slug = 'El slug es obligatorio';
  } else if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    errors.slug = `Entre ${SLUG_MIN} y ${SLUG_MAX} caracteres`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'Solo minúsculas, números y guiones';
  }
  if (d.direccion.trim().length > DIRECCION_MAX) {
    errors.direccion = `Máximo ${DIRECCION_MAX} caracteres`;
  }
  if (d.planId === null) {
    errors.planId = 'Elige un plan';
  }
  if (d.demo && parseDemoDias(d.demoDias) === null) {
    errors.demoDias = `Entre ${DEMO_DIAS_MIN} y ${DEMO_DIAS_MAX} días`;
  }

  const adminNombre = d.adminNombre.trim();
  if (adminNombre === '') {
    errors.adminNombre = 'El nombre es obligatorio';
  } else if (adminNombre.length < ADMIN_NOMBRE_MIN || adminNombre.length > ADMIN_NOMBRE_MAX) {
    errors.adminNombre = `Entre ${ADMIN_NOMBRE_MIN} y ${ADMIN_NOMBRE_MAX} caracteres`;
  }
  const adminApellido = d.adminApellido.trim();
  if (adminApellido === '') {
    errors.adminApellido = 'El apellido es obligatorio';
  } else if (adminApellido.length > ADMIN_APELLIDO_MAX) {
    errors.adminApellido = `Máximo ${ADMIN_APELLIDO_MAX} caracteres`;
  }
  const adminEmail = d.adminEmail.trim();
  if (adminEmail === '') {
    errors.adminEmail = 'El email es obligatorio';
  } else if (!EMAIL_PATTERN.test(adminEmail)) {
    errors.adminEmail = 'Ingresa un email válido';
  } else if (adminEmail.length > ADMIN_EMAIL_MAX) {
    errors.adminEmail = `Máximo ${ADMIN_EMAIL_MAX} caracteres`;
  }
  if (d.adminPassword === '') {
    errors.adminPassword = 'La contraseña es obligatoria';
  } else if (d.adminPassword.length < ADMIN_PASSWORD_MIN || d.adminPassword.length > ADMIN_PASSWORD_MAX) {
    errors.adminPassword = `Entre ${ADMIN_PASSWORD_MIN} y ${ADMIN_PASSWORD_MAX} caracteres`;
  }
  if (d.adminPasswordConfirm !== d.adminPassword) {
    errors.adminPasswordConfirm = 'Las contraseñas no coinciden';
  }
  return errors;
}

export function isValidCrearDraft(d: CrearRestauranteDraft): boolean {
  return Object.keys(validateCrearDraft(d)).length === 0;
}

/**
 * Builds the POST /restaurantes body: trimmed text, no empty `direccion`, the demo fields only when demo is on,
 * and the owner (password as typed, confirmation never sent). Throws for an invalid draft; the page calls
 * `validateCrearDraft` first, so reaching the throw is a programming error.
 */
export function toCrearRequest(d: CrearRestauranteDraft): CrearRestauranteRequest {
  const demoDias = parseDemoDias(d.demoDias);
  if (!isValidCrearDraft(d) || d.planId === null) {
    throw new Error('Borrador de restaurante inválido: llama a validateCrearDraft antes de toCrearRequest');
  }
  const direccion = d.direccion.trim();
  return {
    slug: d.slug.trim(),
    nombre: d.nombre.trim(),
    ...(direccion !== '' && { direccion }),
    planId: d.planId,
    ...(d.demo && demoDias !== null ? { demo: true, demoDias } : { demo: false }),
    administrador: {
      nombre: d.adminNombre.trim(),
      apellido: d.adminApellido.trim(),
      email: d.adminEmail.trim(),
      password: d.adminPassword,
    },
  };
}

/** The two wizard steps: define the restaurant, then its owner account. One request is sent at the end. */
export type CrearStep = 'restaurante' | 'administrador';

export function stepOfField(field: CrearRestauranteField): CrearStep {
  return field.startsWith('admin') ? 'administrador' : 'restaurante';
}

/** Only the errors of the given step. */
export function stepErrors(errors: CrearRestauranteErrors, step: CrearStep): CrearRestauranteErrors {
  const result: CrearRestauranteErrors = {};
  for (const [field, message] of Object.entries(errors) as [CrearRestauranteField, string][]) {
    if (stepOfField(field) === step) {
      result[field] = message;
    }
  }
  return result;
}

/** True when the restaurant step has no errors, so the user can move on to the owner step. */
export function canAdvance(d: CrearRestauranteDraft): boolean {
  return Object.keys(stepErrors(validateCrearDraft(d), 'restaurante')).length === 0;
}

/** The step to show so the user sees an error: the restaurant step first, then the owner step, or null. */
export function firstStepWithErrors(errors: CrearRestauranteErrors): CrearStep | null {
  for (const step of ['restaurante', 'administrador'] as const) {
    if (Object.keys(stepErrors(errors, step)).length > 0) {
      return step;
    }
  }
  return null;
}

/** Backend validation prefixes (422 items are "<prefix>: <message>") and the form field each one belongs to. */
const FIELD_BY_PREFIX: ReadonlyMap<string, CrearRestauranteField> = new Map<string, CrearRestauranteField>([
  ['slug', 'slug'],
  ['nombre', 'nombre'],
  ['direccion', 'direccion'],
  ['planId', 'planId'],
  ['demoDias', 'demoDias'],
  ['administrador.nombre', 'adminNombre'],
  ['administrador.apellido', 'adminApellido'],
  ['administrador.email', 'adminEmail'],
  ['administrador.password', 'adminPassword'],
]);

const FIELD_SEPARATOR = ': ';
const ITEM_SEPARATOR = '; ';

/**
 * Backend rejection of a create, as messages to show under the matching fields (the backend text as is):
 * 409 = owner email already registered; 400 naming the slug = duplicate slug; 422 = "<field>: <msg>" items joined
 * by "; ". Anything else, or a 422 item with an unknown prefix, is left out: when the result is empty the page
 * shows the whole backend message in a toast.
 */
export function fieldErrorsFromResponse(status: number, message: string | null): CrearRestauranteErrors {
  if (message === null) {
    return {};
  }
  if (status === 409) {
    return { adminEmail: message };
  }
  if (status === 400) {
    return /slug/i.test(message) ? { slug: message } : {};
  }
  if (status !== 422) {
    return {};
  }
  const errors: CrearRestauranteErrors = {};
  for (const item of message.split(ITEM_SEPARATOR)) {
    const at = item.indexOf(FIELD_SEPARATOR);
    if (at < 0) {
      continue;
    }
    const field = FIELD_BY_PREFIX.get(item.slice(0, at));
    if (field !== undefined) {
      errors[field] = item.slice(at + FIELD_SEPARATOR.length);
    }
  }
  return errors;
}

/** Success toast shared by the list modal and the standalone page; names the email the owner logs in with. */
export function restauranteCreadoMessage(creado: RestauranteCreado): string {
  return `Restaurante "${creado.nombre}" creado. El dueño inicia sesión con ${creado.administrador.email}`;
}
