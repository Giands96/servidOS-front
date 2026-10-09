---
title: Catálogo
date: 2026-10-08
tags:
  - servidos
  - modulos
  - catalogo
  - pendiente
aliases:
  - Módulo Catálogo
---

# Catálogo

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Productos y categorías, y disponibilidad de platos. Estado: **placeholder** (`/catalogo`, acción `catalogo.ver`).

## Archivos
Solo la ruta en `src/app/app.routes.ts`.

## API (plan)
Lecturas autenticadas: `GET /productos`, `GET /productos/{id}`, `GET /categorias`. Escrituras: `POST/PUT /productos`, `POST /categorias` (ADMINISTRADOR); `PATCH /productos/{id}/estado` (ADMINISTRADOR, COCINERO).

## Reglas
`DISPONIBLE`/`AGOTADO` (sin sinónimos); `AGOTADO` bloquea pedidos en el backend; producto con estado nulo se trata como disponible (legado).

## Permisos
`catalogo.ver`: todos los roles de tenant (incluye MESERO/CAJERO/REPARTIDOR, cuyo home es `/sin-modulos`); `catalogo.editar`: ADMINISTRADOR; `catalogo.disponibilidad`: ADMINISTRADOR y COCINERO.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Permisos finos ya modelados | Sin pantallas todavía; `catalogo.editar` y `disponibilidad` sin ruta |
| `PATCH` de estado evita editar el producto completo | El menú muestra Catálogo a roles sin otros módulos |

## Cómo extenderlo
Paginación con `Page<T>`; reglas en `domain`; confirmar diseño (`hoW4s`, `i0YXQ`). La escritura lleva `subscriptionGuard` (por `guards`), pero la disponibilidad no necesariamente (confirmar con el backend).
