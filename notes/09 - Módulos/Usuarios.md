---
title: Usuarios
date: 2026-10-08
tags:
  - servidos
  - modulos
  - usuarios
  - pendiente
aliases:
  - Módulo Usuarios
---

# Usuarios

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[Seguridad]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Alta de usuarios del restaurante, cambio de rol y baja. Estado: **placeholder** (`/usuarios`, acción `usuarios.gestionar`, solo ADMINISTRADOR).

## Archivos
Solo la ruta. Reglas de rol ya existen en `core/auth/domain/permissions.rules.ts`: `grantableRestauranteRoles()` (todos menos ADMINISTRADOR) y `canGrantPlatformRol`.

## API (plan)
`POST /usuarios` (`nombre, apellido, email, password` mínimo 8, `rolRestauranteId` numérico), `PATCH /usuarios/{id}/rol` (`{nuevoRolId}`, 204), `DELETE /usuarios/{id}` (204, soft-delete). **No existe `GET /usuarios`**.

## Reglas
Nunca se otorga ADMINISTRADOR; no auto-eliminarse ni eliminar al último ADMINISTRADOR (409/403). Anunciado sin verificar: cross-tenant en DELETE/PATCH ahora devuelve 400.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas de roles otorgables ya probadas | Sin listado no hay pantalla útil |
| El backend impone jerarquía | El front debe mapear nombres de rol a ids numéricos (fuente del mapeo: pendiente de definir) |

## Cómo extenderlo
Usar `grantableRestauranteRoles()`; mostrar `message` en 409; confirmar diseño (`VHQeZ`). No permitir roles fuera del vocabulario cerrado.
