import { MeResponse } from '../../../core/auth/auth.types';
import { Categoria, Producto } from '../catalogo.types';
import {
  CATALOGO_TABLE_PAGE_SIZE,
  blockedNotice,
  catalogoWrites,
  categoriaNombre,
  categoryEntries,
  estadoChangedMessage,
  estadoProductoLabel,
  estadoProductoVariant,
  estadoToggleLabel,
  formatPrecio,
  pageNumbers,
  pageSlice,
  productosDe,
  rangeText,
  summaryLabel,
  toggledEstado,
  totalPages,
} from './catalogo.rules';

const categoria = (categoriaId: number, nombre: string, estado: Categoria['estado'] = 'HABILITADO'): Categoria => ({
  categoriaId,
  nombre,
  estado,
});

const producto = (productoId: number, categoriaId: number | null, overrides: Partial<Producto> = {}): Producto => ({
  productoId,
  categoriaId,
  nombre: `Plato ${productoId}`,
  descripcion: null,
  imagenUrl: null,
  precio: 10,
  tiempoPreparacion: null,
  estado: 'DISPONIBLE',
  ...overrides,
});

const categorias = [categoria(1, 'Entradas'), categoria(2, 'Fondos'), categoria(3, 'Postres', 'DESHABILITADO')];

describe('categoryEntries', () => {
  it('starts with Todas, lists each category in order with its count and flags the disabled ones', () => {
    const productos = [producto(1, 1), producto(2, 1), producto(3, 2)];
    expect(categoryEntries(categorias, productos)).toEqual([
      { id: 'todas', nombre: 'Todas', count: 3, deshabilitada: false },
      { id: 1, nombre: 'Entradas', count: 2, deshabilitada: false },
      { id: 2, nombre: 'Fondos', count: 1, deshabilitada: false },
      { id: 3, nombre: 'Postres', count: 0, deshabilitada: true },
    ]);
  });

  it('adds Sin categoría last only when a product has no category', () => {
    const entries = categoryEntries(categorias, [producto(1, null), producto(2, 1)]);
    expect(entries.at(-1)).toEqual({ id: 'sin-categoria', nombre: 'Sin categoría', count: 1, deshabilitada: false });
    expect(entries[0].count).toBe(2);
  });

  it('counts a product pointing to an unknown category as Sin categoría', () => {
    const entries = categoryEntries(categorias, [producto(1, 99)]);
    expect(entries.at(-1)).toMatchObject({ id: 'sin-categoria', count: 1 });
    expect(entries.find((e) => e.id === 1)?.count).toBe(0);
  });

  it('has only Todas for an empty menu', () => {
    expect(categoryEntries([], [])).toEqual([{ id: 'todas', nombre: 'Todas', count: 0, deshabilitada: false }]);
  });
});

describe('productosDe', () => {
  const productos = [producto(1, 2), producto(2, 1), producto(3, null), producto(4, 99), producto(5, 1)];

  it('returns everything for todas, in input order', () => {
    expect(productosDe(productos, 'todas', categorias).map((p) => p.productoId)).toEqual([1, 2, 3, 4, 5]);
  });

  it('filters by category id keeping input order', () => {
    expect(productosDe(productos, 1, categorias).map((p) => p.productoId)).toEqual([2, 5]);
  });

  it('sin-categoria matches a null or unknown categoriaId', () => {
    expect(productosDe(productos, 'sin-categoria', categorias).map((p) => p.productoId)).toEqual([3, 4]);
  });

  it('is empty for a category without products', () => {
    expect(productosDe(productos, 3, categorias)).toEqual([]);
  });
});

describe('summaryLabel', () => {
  it('pluralizes products and categories', () => {
    const productos = Array.from({ length: 48 }, (_, i) => producto(i, 1));
    const six = Array.from({ length: 6 }, (_, i) => categoria(i + 1, `C${i}`));
    expect(summaryLabel(productos, six)).toBe('48 productos en 6 categorías');
  });

  it('uses singular forms', () => {
    expect(summaryLabel([producto(1, 1)], [categoria(1, 'A')])).toBe('1 producto en 1 categoría');
  });

  it('uses plural for zero', () => {
    expect(summaryLabel([], [])).toBe('0 productos en 0 categorías');
  });
});

describe('categoriaNombre', () => {
  it('returns the category name or Sin categoría', () => {
    expect(categoriaNombre(producto(1, 2), categorias)).toBe('Fondos');
    expect(categoriaNombre(producto(1, null), categorias)).toBe('Sin categoría');
    expect(categoriaNombre(producto(1, 99), categorias)).toBe('Sin categoría');
  });
});

describe('client paging', () => {
  it('uses 10 rows per page', () => {
    expect(CATALOGO_TABLE_PAGE_SIZE).toBe(10);
  });

  const items = Array.from({ length: 23 }, (_, i) => i);

  it('slices a zero-based page', () => {
    expect(pageSlice(items, 0, 10)).toEqual(items.slice(0, 10));
    expect(pageSlice(items, 2, 10)).toEqual([20, 21, 22]);
    expect(pageSlice(items, 5, 10)).toEqual([]);
  });

  it('computes the page count, at least 1', () => {
    expect(totalPages(23, 10)).toBe(3);
    expect(totalPages(20, 10)).toBe(2);
    expect(totalPages(0, 10)).toBe(1);
  });

  it('describes the visible range', () => {
    expect(rangeText(9, 0, 10)).toBe('Mostrando 1–9 de 9');
    expect(rangeText(23, 1, 10)).toBe('Mostrando 11–20 de 23');
    expect(rangeText(23, 2, 10)).toBe('Mostrando 21–23 de 23');
    expect(rangeText(0, 0, 10)).toBe('Mostrando 0 de 0');
  });

  it('reuses the numbered pager', () => {
    expect(pageNumbers(0, 1)).toEqual([]);
    expect(pageNumbers(1, 3)).toEqual([0, 1, 2]);
  });
});

describe('estado', () => {
  it('labels DISPONIBLE and null as Disponible, AGOTADO as Agotado, other as raw', () => {
    expect(estadoProductoLabel('DISPONIBLE')).toBe('Disponible');
    expect(estadoProductoLabel(null)).toBe('Disponible');
    expect(estadoProductoLabel('AGOTADO')).toBe('Agotado');
    expect(estadoProductoLabel('OTRO' as never)).toBe('OTRO');
  });

  it('maps the badge variant', () => {
    expect(estadoProductoVariant('DISPONIBLE')).toBe('ok');
    expect(estadoProductoVariant(null)).toBe('ok');
    expect(estadoProductoVariant('AGOTADO')).toBe('warn');
    expect(estadoProductoVariant('OTRO' as never)).toBe('neutral');
  });

  it('toggles to the opposite estado', () => {
    expect(toggledEstado('DISPONIBLE')).toBe('AGOTADO');
    expect(toggledEstado(null)).toBe('AGOTADO');
    expect(toggledEstado('AGOTADO')).toBe('DISPONIBLE');
  });

  it('labels the toggle action', () => {
    expect(estadoToggleLabel('DISPONIBLE')).toBe('Marcar agotado');
    expect(estadoToggleLabel(null)).toBe('Marcar agotado');
    expect(estadoToggleLabel('AGOTADO')).toBe('Marcar disponible');
  });

  it('builds the toast for the new estado', () => {
    const p = producto(1, 1, { nombre: 'Lomo saltado' });
    expect(estadoChangedMessage(p, 'AGOTADO')).toBe('"Lomo saltado" ahora está agotado');
    expect(estadoChangedMessage(p, 'DISPONIBLE')).toBe('"Lomo saltado" vuelve a estar disponible');
  });
});

describe('catalogoWrites', () => {
  const user = (
    rol: MeResponse['rol'],
    overrides: Partial<Pick<MeResponse, 'restauranteId' | 'restauranteEstado' | 'suscripcion'>> = {},
  ): MeResponse => ({
    usuarioId: 1,
    email: 'a@b.com',
    nombre: 'A',
    restauranteId: 7,
    rol,
    restauranteEstado: 'ACTIVO',
    suscripcion: {
      planId: 1,
      nombrePlan: 'Estándar',
      monto: 34.9,
      moneda: 'PEN',
      estado: 'ACTIVA',
      fechaFin: '2099-01-01',
      diasRestantes: 100,
      vencida: false,
    },
    ...overrides,
  });
  const vencida = { suscripcion: { ...user('ADMINISTRADOR').suscripcion!, vencida: true } };

  it('lets ADMINISTRADOR edit and toggle', () => {
    expect(catalogoWrites(user('ADMINISTRADOR'))).toEqual({ editar: true, disponibilidad: true, bloqueado: false });
  });

  it('lets COCINERO only toggle', () => {
    expect(catalogoWrites(user('COCINERO'))).toEqual({ editar: false, disponibilidad: true, bloqueado: false });
  });

  it('gives other tenant roles nothing and never flags them blocked', () => {
    expect(catalogoWrites(user('MESERO', vencida))).toEqual({ editar: false, disponibilidad: false, bloqueado: false });
    expect(catalogoWrites(user('RECEPCION'))).toEqual({ editar: false, disponibilidad: false, bloqueado: false });
  });

  it('disables writes for a blocked tenant that could otherwise write', () => {
    expect(catalogoWrites(user('ADMINISTRADOR', vencida))).toEqual({ editar: false, disponibilidad: false, bloqueado: true });
    expect(catalogoWrites(user('COCINERO', { restauranteEstado: 'INACTIVO' }))).toEqual({
      editar: false,
      disponibilidad: false,
      bloqueado: true,
    });
    expect(catalogoWrites(user('ADMINISTRADOR', { suscripcion: null })).bloqueado).toBe(true);
  });

  it('gives nothing to a null user', () => {
    expect(catalogoWrites(null)).toEqual({ editar: false, disponibilidad: false, bloqueado: false });
  });

  it('has the read-only notice', () => {
    expect(blockedNotice).toBe('La suscripción del restaurante no está vigente: el catálogo está en solo lectura.');
  });
});

describe('formatPrecio', () => {
  it('formats as soles with two decimals', () => {
    expect(formatPrecio(32)).toBe('S/ 32.00');
    expect(formatPrecio(5.5)).toBe('S/ 5.50');
  });
});
