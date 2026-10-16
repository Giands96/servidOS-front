import { Categoria, Producto } from '../catalogo.types';
import {
  ProductoDraft,
  categoriaCreadaMessage,
  categoriaFieldErrors,
  draftFromProducto,
  emptyProductoDraft,
  productoFieldErrors,
  productoGuardadoMessage,
  toCrearCategoriaRequest,
  toGuardarProductoRequest,
  validateCategoriaDraft,
  validateProductoDraft,
} from './producto-form.rules';

const draft = (overrides: Partial<ProductoDraft> = {}): ProductoDraft => ({
  nombre: 'Lomo saltado',
  precio: '32.50',
  categoriaId: 2,
  descripcion: 'Con papas',
  tiempoPreparacion: '15',
  imagenUrl: 'https://cdn.example.com/lomo.jpg',
  ...overrides,
});

const producto: Producto = {
  productoId: 9,
  categoriaId: 2,
  nombre: 'Lomo saltado',
  descripcion: 'Con papas',
  imagenUrl: 'https://cdn.example.com/lomo.jpg',
  precio: 32,
  tiempoPreparacion: 15,
  estado: 'AGOTADO',
};

describe('emptyProductoDraft / draftFromProducto', () => {
  it('starts blank', () => {
    expect(emptyProductoDraft()).toEqual({
      nombre: '',
      precio: '',
      categoriaId: null,
      descripcion: '',
      tiempoPreparacion: '',
      imagenUrl: '',
    });
  });

  it('loads a product with the price at two decimals', () => {
    expect(draftFromProducto(producto)).toEqual({
      nombre: 'Lomo saltado',
      precio: '32.00',
      categoriaId: 2,
      descripcion: 'Con papas',
      tiempoPreparacion: '15',
      imagenUrl: 'https://cdn.example.com/lomo.jpg',
    });
  });

  it('turns null optionals into empty text', () => {
    expect(
      draftFromProducto({ ...producto, categoriaId: null, descripcion: null, tiempoPreparacion: null, imagenUrl: null }),
    ).toMatchObject({ categoriaId: null, descripcion: '', tiempoPreparacion: '', imagenUrl: '' });
  });
});

describe('validateProductoDraft', () => {
  it('accepts a complete draft and a minimal one', () => {
    expect(validateProductoDraft(draft())).toEqual({});
    expect(
      validateProductoDraft(draft({ categoriaId: null, descripcion: '', tiempoPreparacion: '', imagenUrl: '' })),
    ).toEqual({});
  });

  it('requires a trimmed nombre of at most 150 characters', () => {
    expect(validateProductoDraft(draft({ nombre: '  ' })).nombre).toBe('El nombre es obligatorio');
    expect(validateProductoDraft(draft({ nombre: 'a'.repeat(150) })).nombre).toBeUndefined();
    expect(validateProductoDraft(draft({ nombre: 'a'.repeat(151) })).nombre).toBe('Máximo 150 caracteres');
  });

  it('requires a precio', () => {
    expect(validateProductoDraft(draft({ precio: '' })).precio).toBe('El precio es obligatorio');
    expect(validateProductoDraft(draft({ precio: '  ' })).precio).toBe('El precio es obligatorio');
  });

  it.each(['32', '32.5', '32.50', '0', '0.99', '32,50', ' 32.50 '])('accepts precio "%s"', (precio) => {
    expect(validateProductoDraft(draft({ precio })).precio).toBeUndefined();
  });

  it.each(['abc', '-3', '3.555', '.5', '5.', '1e3', '1,2,3', 'S/ 3'])('rejects precio "%s"', (precio) => {
    expect(validateProductoDraft(draft({ precio })).precio).toBe('Ingresa un precio válido (ej. 32.50)');
  });

  it('validates tiempoPreparacion as optional whole minutes up to 600', () => {
    expect(validateProductoDraft(draft({ tiempoPreparacion: '' })).tiempoPreparacion).toBeUndefined();
    expect(validateProductoDraft(draft({ tiempoPreparacion: '600' })).tiempoPreparacion).toBeUndefined();
    expect(validateProductoDraft(draft({ tiempoPreparacion: '601' })).tiempoPreparacion).toBe('Máximo 600 minutos');
    for (const tiempoPreparacion of ['1.5', '-1', 'abc', '1e1']) {
      expect(validateProductoDraft(draft({ tiempoPreparacion })).tiempoPreparacion).toBe('Ingresa minutos enteros');
    }
  });

  it('limits descripcion to 500 characters', () => {
    expect(validateProductoDraft(draft({ descripcion: 'a'.repeat(500) })).descripcion).toBeUndefined();
    expect(validateProductoDraft(draft({ descripcion: 'a'.repeat(501) })).descripcion).toBe('Máximo 500 caracteres');
  });

  it('accepts an empty or http/https imagenUrl only', () => {
    expect(validateProductoDraft(draft({ imagenUrl: '' })).imagenUrl).toBeUndefined();
    expect(validateProductoDraft(draft({ imagenUrl: 'http://a.com/x.png' })).imagenUrl).toBeUndefined();
    for (const imagenUrl of ['ftp://a.com/x.png', 'a.com/x.png', 'https://', 'javascript:alert(1)', 'http://']) {
      expect(validateProductoDraft(draft({ imagenUrl })).imagenUrl).toBe('Ingresa una URL válida (http o https)');
    }
    expect(validateProductoDraft(draft({ imagenUrl: `https://a.com/${'a'.repeat(500)}` })).imagenUrl).toBe(
      'Máximo 500 caracteres',
    );
  });

  it('reports every failing field at once', () => {
    const errors = validateProductoDraft(draft({ nombre: '', precio: 'x', tiempoPreparacion: 'x' }));
    expect(Object.keys(errors).sort()).toEqual(['nombre', 'precio', 'tiempoPreparacion']);
  });
});

describe('toGuardarProductoRequest', () => {
  it('trims text, converts numbers and carries the estado', () => {
    expect(
      toGuardarProductoRequest(draft({ nombre: ' Lomo ', precio: '32,5', descripcion: ' Con papas ' }), 'AGOTADO'),
    ).toEqual({
      nombre: 'Lomo',
      precio: 32.5,
      descripcion: 'Con papas',
      categoriaId: 2,
      tiempoPreparacion: 15,
      estado: 'AGOTADO',
      imagenUrl: 'https://cdn.example.com/lomo.jpg',
    });
  });

  it('sends null for empty optionals', () => {
    expect(
      toGuardarProductoRequest(
        draft({ categoriaId: null, descripcion: '  ', tiempoPreparacion: '', imagenUrl: ' ' }),
        'DISPONIBLE',
      ),
    ).toMatchObject({
      categoriaId: null,
      descripcion: null,
      tiempoPreparacion: null,
      imagenUrl: null,
      estado: 'DISPONIBLE',
    });
  });

  it('throws for an invalid draft', () => {
    expect(() => toGuardarProductoRequest(draft({ nombre: '' }), 'DISPONIBLE')).toThrow(Error);
    expect(() => toGuardarProductoRequest(draft({ precio: 'x' }), 'DISPONIBLE')).toThrow(Error);
  });
});

describe('categoria form', () => {
  it('requires a trimmed nombre of at most 100 characters', () => {
    expect(validateCategoriaDraft({ nombre: 'Entradas' })).toEqual({});
    expect(validateCategoriaDraft({ nombre: '  ' }).nombre).toBe('El nombre es obligatorio');
    expect(validateCategoriaDraft({ nombre: 'a'.repeat(100) })).toEqual({});
    expect(validateCategoriaDraft({ nombre: 'a'.repeat(101) }).nombre).toBe('Máximo 100 caracteres');
  });

  it('builds the request enabled and trimmed', () => {
    expect(toCrearCategoriaRequest({ nombre: ' Entradas ' })).toEqual({ nombre: 'Entradas', estado: 'HABILITADO' });
  });

  it('throws for an invalid draft', () => {
    expect(() => toCrearCategoriaRequest({ nombre: '' })).toThrow(Error);
  });
});

describe('productoFieldErrors', () => {
  it('maps each "campo: mensaje" part of a 422 to its draft key', () => {
    expect(
      productoFieldErrors(
        422,
        'nombre: no debe estar vacío; precio: debe ser mayor o igual a 0; categoriaId: inválido; tiempoPreparacion: debe ser positivo; descripcion: muy larga; imagenUrl: inválida',
      ),
    ).toEqual({
      nombre: 'no debe estar vacío',
      precio: 'debe ser mayor o igual a 0',
      categoriaId: 'inválido',
      tiempoPreparacion: 'debe ser positivo',
      descripcion: 'muy larga',
      imagenUrl: 'inválida',
    });
  });

  it('ignores unknown fields and parts without a prefix', () => {
    expect(productoFieldErrors(422, 'estado: inválido; algo raro')).toEqual({});
  });

  it('shows a 400 about the nombre under the nombre field', () => {
    expect(productoFieldErrors(400, 'Ya existe un producto con ese nombre')).toEqual({
      nombre: 'Ya existe un producto con ese nombre',
    });
  });

  it('shows a 400 about the categoría under the category field', () => {
    expect(productoFieldErrors(400, 'La categoría no existe')).toEqual({ categoriaId: 'La categoría no existe' });
  });

  it('leaves everything else to the toast', () => {
    expect(productoFieldErrors(400, 'Datos inválidos')).toEqual({});
    expect(productoFieldErrors(403, 'nombre')).toEqual({});
    expect(productoFieldErrors(400, null)).toEqual({});
    expect(productoFieldErrors(422, null)).toEqual({});
  });
});

describe('categoriaFieldErrors', () => {
  it('maps a 400 or 422 about the nombre to the field', () => {
    expect(categoriaFieldErrors(400, 'Ya existe una categoría con ese nombre')).toEqual({
      nombre: 'Ya existe una categoría con ese nombre',
    });
    expect(categoriaFieldErrors(422, 'nombre: no debe estar vacío')).toEqual({ nombre: 'nombre: no debe estar vacío' });
  });

  it('is empty otherwise', () => {
    expect(categoriaFieldErrors(400, 'Datos inválidos')).toEqual({});
    expect(categoriaFieldErrors(500, 'nombre')).toEqual({});
    expect(categoriaFieldErrors(400, null)).toEqual({});
  });
});

describe('success messages', () => {
  it('names the saved product and the created category', () => {
    expect(productoGuardadoMessage(producto, 'crear')).toBe('Producto "Lomo saltado" creado');
    expect(productoGuardadoMessage(producto, 'editar')).toBe('Producto "Lomo saltado" actualizado');
    const c: Categoria = { categoriaId: 1, nombre: 'Entradas', estado: 'HABILITADO' };
    expect(categoriaCreadaMessage(c)).toBe('Categoría "Entradas" creada');
  });
});
