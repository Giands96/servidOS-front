import { Categoria, Producto } from '../../catalogo/catalogo.types';
import { CrearPedidoItem, CrearPedidoRequest, TipoPedido } from '../pedidos.types';
import { TIPO_LABEL, formatOrderNumber } from './pedidos.rules';

/**
 * Pure rules of the new-order screen. Every function returns new arrays/objects and never mutates
 * its arguments.
 */

/** One cart line: a snapshot of the product taken when it was added. `precio` is display-only. */
export interface LineaPedido {
  productoId: number;
  nombre: string;
  precio: number;
  /** Integer >= 1. */
  cantidad: number;
  /** As typed; `toRequest` trims it and drops it when blank. */
  observacion: string;
}

/**
 * The form state of the screen. `mesaId` is the table picked in the MESA step (null until then).
 * `paraLlevarDeMesa` marks a RECOJO taken from that table: billed with the table's account.
 */
export interface BorradorPedido {
  tipoPedido: TipoPedido;
  mesaId: number | null;
  paraLlevarDeMesa: boolean;
  observacion: string;
  lineas: readonly LineaPedido[];
}

export interface ErroresBorrador {
  items?: string;
  mesaId?: string;
}

export interface TipoPedidoOption {
  tipoPedido: TipoPedido;
  label: string;
}

/** Options of the tipo toggle, in the order the design shows them. */
export const TIPOS_PEDIDO: readonly TipoPedidoOption[] = (
  ['MESA', 'DELIVERY', 'RECOJO'] as const
).map((tipoPedido) => ({ tipoPedido, label: TIPO_LABEL[tipoPedido] }));

const ITEMS_REQUIRED = 'Agrega al menos un producto al pedido';
const ITEMS_INVALID_CANTIDAD = 'Revisa las cantidades: deben ser números enteros desde 1';
const MESA_REQUIRED = 'Elige una mesa para el pedido';

type ProductoAgregable = Pick<Producto, 'productoId' | 'nombre' | 'precio' | 'estado'>;

/** Only products the kitchen can make: the backend rejects AGOTADO with 400 "Producto no disponible". */
export function canAdd(producto: Pick<Producto, 'estado'>): boolean {
  return producto.estado === 'DISPONIBLE';
}

/** Adds the product with cantidad 1, or adds one to its existing line. A product that cannot be added is ignored. */
export function addProducto(
  lineas: readonly LineaPedido[],
  producto: ProductoAgregable,
): LineaPedido[] {
  if (!canAdd(producto)) {
    return [...lineas];
  }
  if (lineas.some((l) => l.productoId === producto.productoId)) {
    return increment(lineas, producto.productoId);
  }
  return [
    ...lineas,
    {
      productoId: producto.productoId,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      observacion: '',
    },
  ];
}

export function increment(lineas: readonly LineaPedido[], productoId: number): LineaPedido[] {
  return lineas.map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad + 1 } : l));
}

/** Subtracts one; the line disappears instead of reaching 0. */
export function decrement(lineas: readonly LineaPedido[], productoId: number): LineaPedido[] {
  return lineas.flatMap((l) => {
    if (l.productoId !== productoId) {
      return [l];
    }
    return l.cantidad > 1 ? [{ ...l, cantidad: l.cantidad - 1 }] : [];
  });
}

export function setLineaObservacion(
  lineas: readonly LineaPedido[],
  productoId: number,
  observacion: string,
): LineaPedido[] {
  return lineas.map((l) => (l.productoId === productoId ? { ...l, observacion } : l));
}

/** Quantity of the product in the cart (0 when absent), for the badge on the product card. */
export function cantidadDe(lineas: readonly LineaPedido[], productoId: number): number {
  return lineas.find((l) => l.productoId === productoId)?.cantidad ?? 0;
}

/**
 * Sum of precio x cantidad. Display-only: the backend computes the real total from its own prices.
 * Prices are rounded to integer cents and summed as integers, so 0.1 + 0.2 gives exactly 0.3.
 */
export function totalReferencial(lineas: readonly LineaPedido[]): number {
  const cents = lineas.reduce((sum, l) => sum + Math.round(l.precio * 100) * l.cantidad, 0);
  return cents / 100;
}

const hasValidCantidad = (l: LineaPedido): boolean =>
  Number.isInteger(l.cantidad) && l.cantidad >= 1;

/** Field errors in Spanish; an empty object means the draft can be sent. */
export function validateDraft(draft: BorradorPedido): ErroresBorrador {
  const errors: ErroresBorrador = {};
  if (draft.lineas.length === 0) {
    errors.items = ITEMS_REQUIRED;
  } else if (!draft.lineas.every(hasValidCantidad)) {
    errors.items = ITEMS_INVALID_CANTIDAD;
  }
  if ((draft.tipoPedido === 'MESA' || draft.paraLlevarDeMesa) && draft.mesaId === null) {
    errors.mesaId = MESA_REQUIRED;
  }
  return errors;
}

/** A takeaway of a table: RECOJO that carries the table's id (DELIVERY never does). */
function isParaLlevarDeMesa(draft: BorradorPedido): boolean {
  return draft.tipoPedido === 'RECOJO' && draft.paraLlevarDeMesa;
}

export function isValidDraft(draft: BorradorPedido): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

/**
 * Builds the POST /pedidos body. Only ids, quantities and observations travel: never a price, total or
 * name. `mesaId` is sent only for MESA and for a RECOJO taken from a table (the backend validates any
 * `mesaId` it receives), and blank observations are omitted.
 *
 * Throws for an invalid draft rather than building a body the backend would reject; the page calls
 * `validateDraft` first and shows its errors, so reaching the throw is a programming error.
 */
export function toRequest(draft: BorradorPedido): CrearPedidoRequest {
  if (!isValidDraft(draft)) {
    throw new Error('Borrador de pedido inválido: llama a validateDraft antes de toRequest');
  }
  const items: CrearPedidoItem[] = draft.lineas.map((l) => {
    const observacion = l.observacion.trim();
    return {
      productoId: l.productoId,
      cantidad: l.cantidad,
      ...(observacion !== '' && { observacion }),
    };
  });
  const observacion = draft.observacion.trim();
  const mesaId = draft.tipoPedido === 'MESA' || isParaLlevarDeMesa(draft) ? draft.mesaId : null;
  return {
    tipoPedido: draft.tipoPedido,
    ...(mesaId !== null && { mesaId }),
    ...(observacion !== '' && { observacion }),
    items,
  };
}

/** A blank form: MESA is the default of the design. Fresh objects on every call. */
export function emptyDraft(): BorradorPedido {
  return { tipoPedido: 'MESA', mesaId: null, paraLlevarDeMesa: false, observacion: '', lineas: [] };
}

/** True when the user has typed or added nothing worth a "discard" confirmation (the tipo alone does not count). */
export function isDraftEmpty(draft: BorradorPedido): boolean {
  return (
    draft.lineas.length === 0 &&
    draft.mesaId === null &&
    !draft.paraLlevarDeMesa &&
    draft.observacion.trim() === ''
  );
}

export interface CategoriaTab {
  /** `null` is "Todos": no category filter. */
  categoriaId: number | null;
  label: string;
}

/**
 * Tabs above the product grid: "Todos" plus every HABILITADO category in API order. Products of a
 * DESHABILITADO category have no tab of their own; they are still reachable under "Todos".
 */
export function categoryTabs(categorias: readonly Categoria[]): CategoriaTab[] {
  return [
    { categoriaId: null, label: 'Todos' },
    ...categorias
      .filter((c) => c.estado === 'HABILITADO')
      .map((c) => ({ categoriaId: c.categoriaId, label: c.nombre })),
  ];
}

/** Client-side filter of the loaded menu: `null` (Todos) keeps everything, including products without category. */
export function productosDeCategoria(
  productos: readonly Producto[],
  categoriaId: number | null,
): Producto[] {
  return categoriaId === null
    ? [...productos]
    : productos.filter((p) => p.categoriaId === categoriaId);
}

/** precio x cantidad of one line, in integer cents like `totalReferencial`. Display-only. */
export function subtotalLinea(linea: Pick<LineaPedido, 'precio' | 'cantidad'>): number {
  return (Math.round(linea.precio * 100) * linea.cantidad) / 100;
}

/** "2 productos · 3 u." header of the cart; empty for an empty cart. */
export function resumenItems(lineas: readonly LineaPedido[]): string {
  if (lineas.length === 0) {
    return '';
  }
  const unidades = lineas.reduce((sum, l) => sum + l.cantidad, 0);
  return `${lineas.length} ${lineas.length === 1 ? 'producto' : 'productos'} · ${unidades} u.`;
}

/**
 * The errors the form shows: none until the first submit attempt (the user is still filling it in), then
 * every `validateDraft` error, following the draft so a fixed field loses its message at once.
 */
export function visibleErrors(draft: BorradorPedido, submitAttempted: boolean): ErroresBorrador {
  return submitAttempted ? validateDraft(draft) : {};
}

/** Success toast after a 201. */
export function pedidoCreadoMessage(pedidoId: number): string {
  return `Pedido ${formatOrderNumber(pedidoId)} creado`;
}
