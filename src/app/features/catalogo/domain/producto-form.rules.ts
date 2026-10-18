import {
  Categoria,
  CrearCategoriaRequest,
  EstadoProducto,
  GuardarProductoRequest,
  Producto,
} from '../catalogo.types';

/** Form state of the product modal; the numeric inputs keep their raw text. */
export interface ProductoDraft {
  nombre: string;
  precio: string;
  categoriaId: number | null;
  descripcion: string;
  tiempoPreparacion: string;
  imagenUrl: string;
}

export type ProductoField = keyof ProductoDraft;

export type ProductoErrors = Partial<Record<ProductoField, string>>;

export interface CategoriaDraft {
  nombre: string;
}

export type CategoriaErrors = Partial<Record<keyof CategoriaDraft, string>>;

const PRECIO_PATTERN = /^\d+(\.\d{1,2})?$/;
const MINUTOS_PATTERN = /^\d+$/;

const NOMBRE_MAX = 150;
const DESCRIPCION_MAX = 500;
const TIEMPO_MAX = 600;
const IMAGEN_URL_MAX = 500;
const CATEGORIA_NOMBRE_MAX = 100;

export function emptyProductoDraft(): ProductoDraft {
  return { nombre: '', precio: '', categoriaId: null, descripcion: '', tiempoPreparacion: '', imagenUrl: '' };
}

export function draftFromProducto(p: Producto): ProductoDraft {
  return {
    nombre: p.nombre,
    precio: Number.isFinite(p.precio) ? p.precio.toFixed(2) : '',
    categoriaId: p.categoriaId,
    descripcion: p.descripcion ?? '',
    tiempoPreparacion: p.tiempoPreparacion === null ? '' : String(p.tiempoPreparacion),
    imagenUrl: p.imagenUrl ?? '',
  };
}

/** Trimmed price text with a comma accepted as the decimal separator. */
function normalizePrecio(raw: string): string {
  return raw.trim().replace(',', '.');
}

function isHttpUrl(text: string): boolean {
  if (!/^https?:\/\//i.test(text)) {
    return false;
  }
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

/** Field errors in Spanish; an empty object means the draft can be sent. */
export function validateProductoDraft(d: ProductoDraft): ProductoErrors {
  const errors: ProductoErrors = {};
  const nombre = d.nombre.trim();
  if (nombre === '') {
    errors.nombre = 'El nombre es obligatorio';
  } else if (nombre.length > NOMBRE_MAX) {
    errors.nombre = `Máximo ${NOMBRE_MAX} caracteres`;
  }
  const precio = normalizePrecio(d.precio);
  if (precio === '') {
    errors.precio = 'El precio es obligatorio';
  } else if (!PRECIO_PATTERN.test(precio)) {
    errors.precio = 'Ingresa un precio válido (ej. 32.50)';
  }
  const tiempo = d.tiempoPreparacion.trim();
  if (tiempo !== '') {
    if (!MINUTOS_PATTERN.test(tiempo)) {
      errors.tiempoPreparacion = 'Ingresa minutos enteros';
    } else if (Number(tiempo) > TIEMPO_MAX) {
      errors.tiempoPreparacion = `Máximo ${TIEMPO_MAX} minutos`;
    }
  }
  if (d.descripcion.trim().length > DESCRIPCION_MAX) {
    errors.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres`;
  }
  const imagenUrl = d.imagenUrl.trim();
  if (imagenUrl !== '') {
    if (!isHttpUrl(imagenUrl)) {
      errors.imagenUrl = 'Ingresa una URL válida (http o https)';
    } else if (imagenUrl.length > IMAGEN_URL_MAX) {
      errors.imagenUrl = `Máximo ${IMAGEN_URL_MAX} caracteres`;
    }
  }
  return errors;
}

/**
 * Builds the POST/PUT /productos body: trimmed text, numbers parsed and empty optionals as null. The PUT is a
 * full replace, so the caller passes the `estado` to keep (a create uses 'DISPONIBLE'; an edit the product's
 * own, null counting as 'DISPONIBLE'). Throws for an invalid draft: the page validates first.
 */
export function toGuardarProductoRequest(d: ProductoDraft, estado: EstadoProducto): GuardarProductoRequest {
  if (Object.keys(validateProductoDraft(d)).length > 0) {
    throw new Error('Borrador de producto inválido: llama a validateProductoDraft antes de toGuardarProductoRequest');
  }
  const descripcion = d.descripcion.trim();
  const tiempo = d.tiempoPreparacion.trim();
  const imagenUrl = d.imagenUrl.trim();
  return {
    nombre: d.nombre.trim(),
    precio: Number(normalizePrecio(d.precio)),
    descripcion: descripcion === '' ? null : descripcion,
    categoriaId: d.categoriaId,
    tiempoPreparacion: tiempo === '' ? null : Number(tiempo),
    estado,
    imagenUrl: imagenUrl === '' ? null : imagenUrl,
  };
}

export function validateCategoriaDraft(d: CategoriaDraft): CategoriaErrors {
  const nombre = d.nombre.trim();
  if (nombre === '') {
    return { nombre: 'El nombre es obligatorio' };
  }
  return nombre.length > CATEGORIA_NOMBRE_MAX ? { nombre: `Máximo ${CATEGORIA_NOMBRE_MAX} caracteres` } : {};
}

/** POST /categorias body: a new category starts HABILITADO. Throws for an invalid draft. */
export function toCrearCategoriaRequest(d: CategoriaDraft): CrearCategoriaRequest {
  if (Object.keys(validateCategoriaDraft(d)).length > 0) {
    throw new Error('Borrador de categoría inválido: llama a validateCategoriaDraft antes de toCrearCategoriaRequest');
  }
  return { nombre: d.nombre.trim(), estado: 'HABILITADO' };
}

/** Backend validation field names (422) to the draft keys they belong under. */
const SERVER_FIELDS: ReadonlyMap<string, ProductoField> = new Map<string, ProductoField>([
  ['nombre', 'nombre'],
  ['precio', 'precio'],
  ['descripcion', 'descripcion'],
  ['categoriaId', 'categoriaId'],
  ['tiempoPreparacion', 'tiempoPreparacion'],
  ['imagenUrl', 'imagenUrl'],
]);

/**
 * Errors to show under the product fields for a rejected save. A 422 carries "campo: mensaje; campo: mensaje",
 * mapped per field (unknown fields are dropped); a 400 whose message names the nombre (duplicate) or the
 * categoría (foreign or missing) goes under that field. Anything else is `{}` and the page shows a toast.
 */
export function productoFieldErrors(status: number, message: string | null): ProductoErrors {
  if (message === null) {
    return {};
  }
  if (status === 422) {
    const errors: ProductoErrors = {};
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
    if (/nombre/i.test(message)) {
      return { nombre: message };
    }
    if (/categor/i.test(message)) {
      return { categoriaId: message };
    }
  }
  return {};
}

/** A 400 (duplicate name) or 422 that mentions the nombre goes under the field; anything else is a toast. */
export function categoriaFieldErrors(status: number, message: string | null): CategoriaErrors {
  return (status === 400 || status === 422) && message !== null && /nombre/i.test(message)
    ? { nombre: message }
    : {};
}

export interface CategoriaOption {
  categoriaId: number;
  label: string;
}

/**
 * Options of the product form's category select (after the fixed "Sin categoría"): the HABILITADO categories,
 * plus the product's current one when it is DESHABILITADO (marked), so an edit never silently drops it.
 */
export function categoriaOptions(categorias: readonly Categoria[], currentId: number | null): CategoriaOption[] {
  return categorias.flatMap((c): CategoriaOption[] => {
    if (c.estado === 'HABILITADO') {
      return [{ categoriaId: c.categoriaId, label: c.nombre }];
    }
    return c.categoriaId === currentId ? [{ categoriaId: c.categoriaId, label: `${c.nombre} (deshabilitada)` }] : [];
  });
}
export function productoGuardadoMessage(p: Pick<Producto, 'nombre'>, mode: 'crear' | 'editar'): string {
  return `Producto "${p.nombre}" ${mode === 'crear' ? 'creado' : 'actualizado'}`;
}

export function categoriaCreadaMessage(c: Pick<Categoria, 'nombre'>): string {
  return `Categoría "${c.nombre}" creada`;
}
