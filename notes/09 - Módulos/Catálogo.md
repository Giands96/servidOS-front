---
title: Catálogo
date: 2026-10-14
tags:
  - servidos
  - modulos
  - catalogo
  - parcial
aliases:
  - Módulo Catálogo
---

# Catálogo

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Productos y categorías, y disponibilidad de platos. Estado: **parcial**. Existe la **API de lectura** (commit `9b43b5d`, rama `feat/pedidos-03-alta-datos`, pendiente de merge) que usa el nuevo pedido de [[Pedidos]]; la pantalla `/catalogo` (acción `catalogo.ver`) sigue siendo **placeholder** y la edición está pendiente.

## Archivos
| Ruta | Contenido |
|---|---|
| `src/app/features/catalogo/catalogo.types.ts` | tipos de producto y categoría |
| `features/catalogo/data/catalogo.api.ts` | `productos`, `categorias`, `todosLosProductos`, `todasLasCategorias` (solo lectura) |
| `src/testing/builders.ts` | `aProducto`, `aCategoria` |
| `src/app/app.routes.ts` | ruta placeholder `/catalogo` |

`todosLosProductos` y `todasLasCategorias` recorren las páginas de 50 en 50 con un tope de 20 páginas; si se supera el tope o falla una página devuelven error en lugar de un menú parcial. Confía en la forma de la página (`content`, `last`): advertencia abierta de la review.

## API
Implementado (solo lectura): `GET /productos`, `GET /categorias`. Pendiente de cliente: `GET /productos/{id}`. Escrituras (pendientes): `POST/PUT /productos`, `POST /categorias` (ADMINISTRADOR); `PATCH /productos/{id}/estado` (ADMINISTRADOR, COCINERO).

## Reglas
`DISPONIBLE`/`AGOTADO` (sin sinónimos); `AGOTADO` bloquea pedidos en el backend; producto con estado nulo se trata como disponible (legado).

## Permisos
`catalogo.ver`: todos los roles de tenant (incluye MESERO/CAJERO/REPARTIDOR, cuyo home es `/sin-modulos`); `catalogo.editar`: ADMINISTRADOR; `catalogo.disponibilidad`: ADMINISTRADOR y COCINERO.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Permisos finos ya modelados | Sin pantalla de catálogo todavía; `catalogo.editar` y `disponibilidad` sin ruta |
| Lectura del menú ya disponible y testeada (20 tests) | El cargador completo asume la forma de la página; sin escritura |
| `PATCH` de estado evita editar el producto completo | El menú muestra Catálogo a roles sin otros módulos |

## Cómo extenderlo
Reutilizar `catalogo.api.ts` (paginación con `Page<T>`) y agregar la escritura en el mismo archivo; reglas en `domain`; confirmar diseño (`hoW4s`, `i0YXQ`). La escritura lleva `subscriptionGuard` (por `guards`), pero la disponibilidad no necesariamente (confirmar con el backend).
