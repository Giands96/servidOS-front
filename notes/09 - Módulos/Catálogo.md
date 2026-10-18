---
title: Catálogo
date: 2026-10-16
tags:
  - servidos
  - modulos
  - catalogo
  - en-main
aliases:
  - Módulo Catálogo
---

# Catálogo

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fase 6 - Catálogo]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Productos y categorías, y disponibilidad de platos. Estado: **en `main`** (PRs #11, #16, #17 y #18; `527e1e6`, 2026-10-17). La API de lectura (commit `9b43b5d`, PR #11) la usa el nuevo pedido de [[Pedidos]]; la pantalla `/catalogo`, los modales y las escrituras llegaron con las ramas `feat/catalogo-01-datos` a `-03-formularios`. Pendiente: probar en navegador (nunca se probó). Detalle en [[Fase 6 - Catálogo]].

## Pantalla `/catalogo` (diseño `hoW4s`)
- Columna "CATEGORÍAS" con conteos (Todas y cada categoría); las `DESHABILITADO` se listan atenuadas; los productos sin categoría salen como "Sin categoría".
- Tabla PRODUCTO (nombre y descripción atenuada) / CATEGORÍA / PRECIO / ESTADO con el lápiz de edición y paginador de 10 en 10. La columna **ESTADO se agregó** (no está en el diseño) para alojar el interruptor Disponible/Agotado.
- Modal de producto (crear y editar): nombre, precio, categoría, descripción, tiempo de preparación (min) y URL de la imagen (opcional, http/https). Modal de categoría: solo nombre, se crea `HABILITADO`.
- El menú completo se carga una vez (`todosLosProductos`, `todasLasCategorias`); filtro, conteos y paginado son del cliente.
- Esqueleto de carga y panel de error con "Reintentar".

## Roles
| Acción | Rol | Permiso |
|---|---|---|
| Ver el menú | todos los roles de tenant | `catalogo.ver` |
| Nuevo producto, editar, nueva categoría | ADMINISTRADOR | `catalogo.editar` |
| Interruptor Disponible/Agotado | ADMINISTRADOR y COCINERO | `catalogo.disponibilidad` |

Los demás roles (p. ej. RECEPCION) solo leen y no ven controles de escritura. Es un atajo de UI: el backend (403/402) sigue siendo la autoridad.

## Archivos
| Ruta | Contenido |
|---|---|
| `src/app/features/catalogo/catalogo.types.ts` | tipos de producto y categoría y de las peticiones de escritura |
| `features/catalogo/data/catalogo.api.ts` | lectura (`productos`, `categorias`, `todosLosProductos`, `todasLasCategorias`) y escritura (`producto`, `crearProducto`, `actualizarProducto`, `cambiarEstadoProducto`, `crearCategoria`) |
| `features/catalogo/domain/catalogo.rules.ts` | vista del menú (conteos, filtro, paginado), etiqueta/variante/destino del interruptor, `catalogoWrites` (rol y bloqueo) |
| `features/catalogo/domain/producto-form.rules.ts` | borradores y validación de producto y categoría, armado de la petición, mapeo de errores del servidor, `categoriaOptions` |
| `features/catalogo/catalogo.page.ts` | página `/catalogo` (solo orquesta) |
| `features/catalogo/producto-form.component.ts`, `categoria-form.component.ts` | modales de formulario |
| `src/testing/builders.ts` | `aProducto`, `aCategoria` |
| `src/app/app.routes.ts` | ruta `/catalogo` sin `subscriptionGuard` |

`todosLosProductos` y `todasLasCategorias` recorren las páginas de 50 en 50 con un tope de 20 páginas; si se supera el tope o falla una página devuelven error en lugar de un menú parcial. Confía en la forma de la página (`content`, `last`): advertencia abierta de la review.

## API
Lectura: `GET /productos`, `GET /categorias`. Escritura: `GET /productos/{id}`, `POST /productos`, `PUT /productos/{id}`, `PATCH /productos/{id}/estado` y `POST /categorias`. Contrato y roles en [[API]].

## Reglas y decisiones
- `DISPONIBLE`/`AGOTADO` (sin sinónimos); `AGOTADO` bloquea pedidos en el backend; producto con estado nulo se trata como disponible solo para mostrar (legado).
- **Editar conserva `estado`**: el `PUT` es un reemplazo completo y omitir el estado reactivaría un plato agotado.
- Las categorías `DESHABILITADO` no se ofrecen en el selector del formulario de producto.
- Sin `subscriptionGuard`: la lectura funciona con el tenant bloqueado; las escrituras dan 402 y la página deshabilita sus controles con un aviso (contrato §5).
- Errores del servidor (400/422) bajo cada campo; los mensajes del backend se muestran tal cual.
- `nuevo-pedido` consume `CatalogoApi` y los tipos del catálogo: se mantienen compatibles hacia atrás.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Menú gestionable desde la web; reglas puras con tests (catalogo 97) | Sin prueba en navegador; sin specs de página ni de modales (AGENTS §6) |
| Permisos finos reflejados en los controles | Menú completo en el cliente: correcto para decenas de ítems, no para miles |
| Editar conserva el estado del plato | Columna ESTADO no está en el diseño |
| `PATCH` de estado evita editar el producto completo | El menú muestra Catálogo a roles sin otros módulos |

## Brechas
- **Sin endpoint en el backend**: eliminar producto o categoría, renombrar o habilitar/deshabilitar categoría, subir imágenes (la imagen es una URL de texto) y búsqueda.
- Cerrar el modal con la X durante un guardado en curso desmonta la petición: el producto puede existir en el servidor y la lista lo muestra tras recargar (el nombre único evita duplicados).
- Los modales no se cierran con Escape; falta la prueba en navegador.

## Cómo extenderlo
Cuando el backend agregue edición o baja de categorías, reutilizar `catalogo.api.ts` y las reglas de `domain`; el modal de categoría ya está separado. Si el menú crece, pasar el filtro, los conteos y el paginado al servidor (hoy la API no devuelve conteos). Diseños: `hoW4s` (menú) e `i0YXQ` (solo muestra la superposición de sesión expirada).
