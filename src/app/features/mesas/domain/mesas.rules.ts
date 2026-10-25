import { GuardarMesaRequest, Mesa } from '../mesas.types';

/** Form state of the Nueva / Editar mesa modal; the inputs keep their raw text. */
export interface MesaDraft {
  numero: string;
  capacidad: string;
}

export type MesaField = keyof MesaDraft;

export type MesaErrors = Partial<Record<MesaField, string>>;

const ENTERO_POSITIVO = /^[1-9]\d*$/;

/** Copy of the design (Modal Nueva mesa · Errores de campo). */
const ENTERO_MAYOR_A_CERO = 'Debe ser un entero mayor a 0';
const CAPACIDAD_VACIA = 'Ingresá la cantidad de asientos';

export function emptyMesaDraft(): MesaDraft {
  return { numero: '', capacidad: '' };
}

export function draftFromMesa(m: Pick<Mesa, 'numero' | 'capacidad'>): MesaDraft {
  return { numero: String(m.numero), capacidad: String(m.capacidad) };
}

/** Field errors in Spanish; an empty object means the draft can be sent. */
export function validateMesaDraft(d: MesaDraft): MesaErrors {
  const errors: MesaErrors = {};
  if (!ENTERO_POSITIVO.test(d.numero.trim())) {
    errors.numero = ENTERO_MAYOR_A_CERO;
  }
  const capacidad = d.capacidad.trim();
  if (capacidad === '') {
    errors.capacidad = CAPACIDAD_VACIA;
  } else if (!ENTERO_POSITIVO.test(capacidad)) {
    errors.capacidad = ENTERO_MAYOR_A_CERO;
  }
  return errors;
}

/** POST /mesas and PUT /mesas/{id} body. Throws for an invalid draft: the page validates first. */
export function toGuardarMesaRequest(d: MesaDraft): GuardarMesaRequest {
  if (Object.keys(validateMesaDraft(d)).length > 0) {
    throw new Error('Borrador de mesa inválido: llama a validateMesaDraft antes de toGuardarMesaRequest');
  }
  return { numero: Number(d.numero.trim()), capacidad: Number(d.capacidad.trim()) };
}

/** Backend validation field names (422) to the draft keys they belong under. */
const SERVER_FIELDS: ReadonlyMap<string, MesaField> = new Map<string, MesaField>([
  ['numero', 'numero'],
  ['capacidad', 'capacidad'],
]);

/**
 * Errors to show under the table fields for a rejected save. A 422 carries "campo: mensaje; campo: mensaje",
 * mapped per field (unknown fields are dropped). A 400 for a duplicate number ("La mesa 4 ya existe para este
 * restaurante") goes under numero; one about the capacity (below the seated guests) under capacidad.
 * Anything else is `{}` and the page shows a toast.
 */
export function mesaFieldErrors(status: number, message: string | null): MesaErrors {
  if (message === null) {
    return {};
  }
  if (status === 422) {
    const errors: MesaErrors = {};
    for (const part of message.split('; ')) {
      const colon = part.indexOf(':');
      const field = colon < 0 ? undefined : SERVER_FIELDS.get(part.slice(0, colon).trim());
      if (field !== undefined) {
        errors[field] = part.slice(colon + 1).trim();
      }
    }
    return errors;
  }
  if (status === 400) {
    if (/ya existe/i.test(message)) {
      return { numero: message };
    }
    if (/capacidad/i.test(message)) {
      return { capacidad: message };
    }
  }
  return {};
}

/** "3/4 comensales"; an en dash while the guests are unknown (free table, or occupied by an order). */
export function ocupacionLabel(m: Pick<Mesa, 'comensales' | 'capacidad'>): string {
  return `${m.comensales ?? '–'}/${m.capacidad} comensales`;
}

/** What the session may do; the page derives it from `can()` and the backend (403) stays authoritative. */
export interface PermisosMesa {
  operar: boolean;
  gestionar: boolean;
}

export interface AccionesMesa {
  ocupar: boolean;
  liberar: boolean;
  editar: boolean;
  darDeBaja: { visible: boolean; habilitada: boolean; motivo: string | null };
}

/**
 * Card actions per table state and role: operators occupy a free table or free an occupied one; managers also
 * edit and deactivate, but an occupied table cannot be deactivated (the backend's reason is the tooltip).
 */
export function accionesMesa(m: Pick<Mesa, 'estado'>, permisos: PermisosMesa): AccionesMesa {
  const ocupada = m.estado === 'OCUPADA';
  return {
    ocupar: permisos.operar && !ocupada,
    liberar: permisos.operar && ocupada,
    editar: permisos.gestionar,
    darDeBaja: {
      visible: permisos.gestionar,
      habilitada: permisos.gestionar && !ocupada,
      motivo: permisos.gestionar && ocupada ? 'No se puede dar de baja una mesa ocupada' : null,
    },
  };
}

/** Chips of the Ocupar modal: 1..capacidad, at least one. */
export function opcionesComensales(capacidad: number): number[] {
  return Array.from({ length: Math.max(1, Math.floor(capacidad)) }, (_, i) => i + 1);
}

/** "La mesa quedará OCUPADA con 4/8 comensales" (design copy). */
export function previewOcupar(m: Pick<Mesa, 'capacidad'>, comensales: number): string {
  return `La mesa quedará OCUPADA con ${comensales}/${m.capacidad} comensales`;
}

/** "Mesa 8 ocupada · 2 comensales sentados" (design toast), singular for one guest. */
export function mesaOcupadaMessage(m: Pick<Mesa, 'numero'>, comensales: number): string {
  return comensales === 1
    ? `Mesa ${m.numero} ocupada · 1 comensal sentado`
    : `Mesa ${m.numero} ocupada · ${comensales} comensales sentados`;
}

/** "Actualizado hace 35 s", then whole minutes; never negative. */
export function actualizadoHace(desde: Date, now: Date): string {
  const segundos = Math.max(0, Math.floor((now.getTime() - desde.getTime()) / 1000));
  return segundos < 60 ? `Actualizado hace ${segundos} s` : `Actualizado hace ${Math.floor(segundos / 60)} min`;
}

export type FiltroEstadoMesa = 'TODAS' | 'LIBRES' | 'OCUPADAS';

/** Counts of the segmented control "Todas / Libres / Ocupadas". */
export function conteoMesas(mesas: readonly Pick<Mesa, 'estado'>[]): Record<FiltroEstadoMesa, number> {
  const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;
  return { TODAS: mesas.length, LIBRES: mesas.length - ocupadas, OCUPADAS: ocupadas };
}

export function filtrarPorEstado<T extends Pick<Mesa, 'estado'>>(mesas: readonly T[], filtro: FiltroEstadoMesa): T[] {
  if (filtro === 'TODAS') {
    return [...mesas];
  }
  const estado = filtro === 'LIBRES' ? 'LIBRE' : 'OCUPADA';
  return mesas.filter((m) => m.estado === estado);
}
