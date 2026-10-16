export type EstadoProducto = 'DISPONIBLE' | 'AGOTADO';

export type EstadoCategoria = 'HABILITADO' | 'DESHABILITADO';

/** `ProductoResponse` of GET /productos. */
export interface Producto {
  productoId: number;
  categoriaId: number | null;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  precio: number;
  /** Minutes, when the restaurant fills it in. */
  tiempoPreparacion: number | null;
  estado: EstadoProducto;
}

/** `CategoriaResponse` of GET /categorias. */
export interface Categoria {
  categoriaId: number;
  nombre: string;
  estado: EstadoCategoria;
}

/** Body of POST /productos and PUT /productos/{id}; the PUT is a full replace, so every field is always sent. */
export interface GuardarProductoRequest {
  nombre: string;
  precio: number;
  descripcion: string | null;
  categoriaId: number | null;
  /** Minutes. */
  tiempoPreparacion: number | null;
  estado: EstadoProducto;
  imagenUrl: string | null;
}

/** Body of POST /categorias. */
export interface CrearCategoriaRequest {
  nombre: string;
  estado: EstadoCategoria;
}

/** Query of GET /productos. Unset fields are not sent. */
export interface ProductosQuery {
  categoriaId?: number;
  /** Zero-based page. */
  page?: number;
  size?: number;
}

/** Query of GET /categorias. Unset fields are not sent. */
export interface CategoriasQuery {
  /** Zero-based page. */
  page?: number;
  size?: number;
}
