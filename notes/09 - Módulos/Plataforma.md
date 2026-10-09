---
title: Plataforma
date: 2026-10-08
tags:
  - servidos
  - modulos
  - plataforma
  - pendiente
aliases:
  - Módulo Plataforma
  - Restaurantes (plataforma)
---

# Plataforma

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Nivel plataforma: listar y crear restaurantes y ver suscripciones. Estado: **placeholder** (`/plataforma/restaurantes` y `/plataforma/restaurantes/nuevo`).

## Archivos
Solo las rutas en `src/app/app.routes.ts`.

## API (plan)
`GET /restaurantes?page=&size=` (SUPERADMIN), `POST /restaurantes` (SUPERADMIN, ADMIN; `demo=true` exige `demoDias` 1–30; `demo=false` crea suscripción de 30 días), `GET /restaurantes/{id}` y `/{id}/suscripcion` (SUPERADMIN).

## Permisos
`plataforma.restaurantes.ver`: SUPERADMIN; `plataforma.restaurantes.crear`: SUPERADMIN y ADMIN. `navFor` oculta "Crear restaurante" si el rol ya ve la lista (SUPERADMIN la alcanza desde esa pantalla). Existe prueba de que SUPERADMIN y ADMIN abren la ruta de crear.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Permisos y homes ya cubiertos por tests | Sin pantallas |
| Aislamiento por scope evita mezclar plataforma y tenant | Sin filtros ni búsqueda en el dashboard (el backend no los ofrece) |

## Cómo extenderlo
Usar `Page<T>` de `core/http/api.types.ts`; no mezclar acciones de tenant; confirmar diseño (`x9DxqV`, `z8ZbK`). Posible rol MODERADOR sin módulos (home `/sin-modulos`) hasta que haya permisos.
