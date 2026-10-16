import { MeResponse } from '../../../core/auth/auth.types';
import { can, isTenantWriteBlocked } from '../../../core/auth/domain/permissions.rules';
import { BadgeVariant } from '../../../shared/ui/badge/badge.component';
import { formatMoney } from '../../pedidos/domain/pedidos.rules';
import { Categoria, EstadoProducto, Producto } from '../catalogo.types';

export { pageNumbers } from '../../plataforma/domain/plataforma.rules';

const SIN_CATEGORIA = 'Sin categoría';

/** Rows per page of the products table; the whole menu is loaded once and paged on the client. */
export const CATALOGO_TABLE_PAGE_SIZE = 10;

/** What the left column filters by: everything, one category, or the products without a (known) category. */
export type CategoriaSelection = number | 'todas' | 'sin-categoria';

export interface CategoriaEntry {
  id: CategoriaSelection;
  nombre: string;
  count: number;
  deshabilitada: boolean;
}

function hasKnownCategoria(p: Producto, categorias: readonly Categoria[]): boolean {
  return p.categoriaId !== null && categorias.some((c) => c.categoriaId === p.categoriaId);
}

/**
 * Left column: "Todas", every category in the given order with its product count (DESHABILITADO flagged),
 * and "Sin categoría" last only when some product has no category or points to an unknown one.
 */
export function categoryEntries(
  categorias: readonly Categoria[],
  productos: readonly Producto[],
): CategoriaEntry[] {
  const entries: CategoriaEntry[] = [
    { id: 'todas', nombre: 'Todas', count: productos.length, deshabilitada: false },
    ...categorias.map((c) => ({
      id: c.categoriaId,
      nombre: c.nombre,
      count: productos.filter((p) => p.categoriaId === c.categoriaId).length,
      deshabilitada: c.estado === 'DESHABILITADO',
    })),
  ];
  const sinCategoria = productos.filter((p) => !hasKnownCategoria(p, categorias)).length;
  if (sinCategoria > 0) {
    entries.push({ id: 'sin-categoria', nombre: SIN_CATEGORIA, count: sinCategoria, deshabilitada: false });
  }
  return entries;
}

/** Products of the selection, in input order. */
export function productosDe(
  productos: readonly Producto[],
  selected: CategoriaSelection,
  categorias: readonly Categoria[],
): Producto[] {
  if (selected === 'todas') {
    return [...productos];
  }
  if (selected === 'sin-categoria') {
    return productos.filter((p) => !hasKnownCategoria(p, categorias));
  }
  return productos.filter((p) => p.categoriaId === selected);
}

/** "48 productos en 6 categorías"; the categories counted are all of them. */
export function summaryLabel(productos: readonly Producto[], categorias: readonly Categoria[]): string {
  const p = productos.length;
  const c = categorias.length;
  return `${p} ${p === 1 ? 'producto' : 'productos'} en ${c} ${c === 1 ? 'categoría' : 'categorías'}`;
}

export function categoriaNombre(producto: Producto, categorias: readonly Categoria[]): string {
  return categorias.find((c) => c.categoriaId === producto.categoriaId)?.nombre ?? SIN_CATEGORIA;
}

/** Items of a zero-based page. */
export function pageSlice<T>(items: readonly T[], page: number, size: number): T[] {
  return items.slice(page * size, (page + 1) * size);
}

/** Page count, never below 1 so an empty list still has a first page. */
export function totalPages(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Footer of the table: "Mostrando 1–10 de 23". `page` is zero-based. */
export function rangeText(total: number, page: number, size: number): string {
  if (total === 0) {
    return 'Mostrando 0 de 0';
  }
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, total);
  return `Mostrando ${from}–${to} de ${total}`;
}

/** The backend may send no estado; a product without one is shown (and toggled) as DISPONIBLE. */
type EstadoInput = EstadoProducto | null;

export function estadoProductoLabel(estado: EstadoInput): string {
  switch (estado) {
    case null:
    case 'DISPONIBLE':
      return 'Disponible';
    case 'AGOTADO':
      return 'Agotado';
    default:
      return String(estado);
  }
}

export function estadoProductoVariant(estado: EstadoInput): BadgeVariant {
  switch (estado) {
    case null:
    case 'DISPONIBLE':
      return 'ok';
    case 'AGOTADO':
      return 'warn';
    default:
      return 'neutral';
  }
}

/** Target of the toggle: an AGOTADO product becomes DISPONIBLE, anything else becomes AGOTADO. */
export function toggledEstado(estado: EstadoInput): EstadoProducto {
  return estado === 'AGOTADO' ? 'DISPONIBLE' : 'AGOTADO';
}

export function estadoToggleLabel(estado: EstadoInput): string {
  return toggledEstado(estado) === 'AGOTADO' ? 'Marcar agotado' : 'Marcar disponible';
}

/** Toast after the toggle; `nuevo` is the estado the product now has. */
export function estadoChangedMessage(producto: Pick<Producto, 'nombre'>, nuevo: EstadoProducto): string {
  return nuevo === 'AGOTADO'
    ? `"${producto.nombre}" ahora está agotado`
    : `"${producto.nombre}" vuelve a estar disponible`;
}

export interface CatalogoWrites {
  /** Create/edit product and create category. */
  editar: boolean;
  /** DISPONIBLE/AGOTADO toggle. */
  disponibilidad: boolean;
  /** The user could write but the tenant is blocked: the page shows `blockedNotice` and disables the controls. */
  bloqueado: boolean;
}

type CatalogoActor = Pick<MeResponse, 'rol' | 'restauranteId' | 'restauranteEstado' | 'suscripcion'>;

export const blockedNotice =
  'La suscripción del restaurante no está vigente: el catálogo está en solo lectura.';

/** Write controls the session gets. UI shortcut only: the backend (403/402) stays authoritative. */
export function catalogoWrites(user: CatalogoActor | null): CatalogoWrites {
  const mayEdit = can(user, 'catalogo.editar');
  const mayToggle = can(user, 'catalogo.disponibilidad');
  const blocked = isTenantWriteBlocked(user);
  return {
    editar: mayEdit && !blocked,
    disponibilidad: mayToggle && !blocked,
    bloqueado: blocked && (mayEdit || mayToggle),
  };
}

/** "S/ 32.00". */
export function formatPrecio(precio: number): string {
  return formatMoney(precio);
}
