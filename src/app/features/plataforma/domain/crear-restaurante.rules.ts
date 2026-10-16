import { CrearRestauranteRequest } from '../plataforma.types';

/** Form state of the create-restaurant screen; `demoDias` is the raw text of the input. */
export interface CrearRestauranteDraft {
  nombre: string;
  slug: string;
  direccion: string;
  planId: number | null;
  demo: boolean;
  demoDias: string;
}

export type CrearRestauranteField = 'nombre' | 'slug' | 'direccion' | 'planId' | 'demoDias';

export type CrearRestauranteErrors = Partial<Record<CrearRestauranteField, string>>;

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DEMO_DIAS_PATTERN = /^\d+$/;

const NOMBRE_MAX = 150;
const SLUG_MIN = 3;
const SLUG_MAX = 100;
const DIRECCION_MAX = 255;
const DEMO_DIAS_MIN = 1;
const DEMO_DIAS_MAX = 30;

/** A blank form; 14 days is the demo length the design shows. */
export function emptyCrearDraft(planId: number | null): CrearRestauranteDraft {
  return { nombre: '', slug: '', direccion: '', planId, demo: false, demoDias: '14' };
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
  return errors;
}

export function isValidCrearDraft(d: CrearRestauranteDraft): boolean {
  return Object.keys(validateCrearDraft(d)).length === 0;
}

/**
 * Builds the POST /restaurantes body: trimmed text, no empty `direccion`, and the demo fields only when
 * demo is on. Throws for an invalid draft; the page calls `validateCrearDraft` first, so reaching the
 * throw is a programming error.
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
  };
}

/**
 * The message to show under the Slug field for a rejected create (as the design does), or null when the
 * rejection is not about the slug and the page shows a toast instead. A 400 qualifies when its message names
 * the slug (duplicate); a 422 when it is the validation message of the `slug` field ("slug: ...").
 */
export function slugError(status: number, message: string | null): string | null {
  if (message === null) {
    return null;
  }
  if (status === 400 && /slug/i.test(message)) {
    return message;
  }
  return status === 422 && /^slug\s*:/i.test(message) ? message : null;
}

/** Success toast shared by the list modal and the standalone page. */
export function restauranteCreadoMessage(nombre: string): string {
  return `Restaurante "${nombre}" creado`;
}
