---
title: Usuarios
date: 2026-10-16
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
Nunca se otorga ADMINISTRADOR; no auto-eliminarse ni eliminar al último ADMINISTRADOR (409/403). Verificado contra el backend: un usuario de otro restaurante en DELETE/PATCH devuelve 400 "no pertenece a este restaurante".

El dueño (ADMINISTRADOR) de un restaurante nuevo lo crea la plataforma en el alta (`POST /restaurantes` con `administrador`, ver [[Plataforma]]), no este módulo. Los usuarios de plataforma (ADMIN, MODERADOR) se crean con `POST /usuarios/plataforma`, también desde [[Plataforma]].

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas de roles otorgables ya probadas | Sin listado no hay pantalla útil |
| El backend impone jerarquía | El front debe mapear nombres de rol a ids numéricos (fuente del mapeo: pendiente de definir) |

## Cómo extenderlo
Usar `grantableRestauranteRoles()`; mostrar `message` en 409; confirmar diseño (`VHQeZ`). No permitir roles fuera del vocabulario cerrado.
