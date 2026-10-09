---
title: Core
date: 2026-10-08
tags:
  - servidos
  - modulos
  - core
aliases:
  - Módulo Core
---

# Core

Volver: [[00 - MOC]] · Ver [[Seguridad]] · [[Arquitectura]] · [[Auth]] · [[Shared]]

> [!abstract] Responsabilidad
> Singletons transversales: sesión, permisos, navegación, guards, capa HTTP y layout autenticado. Estado: **implementado**.

## Archivos
| Área | Ruta | Contenido |
|---|---|---|
| Tipos de auth | `src/app/core/auth/auth.types.ts` | `Rol`, `MeResponse`, `LoginRequest`, `TokenResponse` |
| API | `core/auth/data/auth.api.ts`, `suscripcion.api.ts` | login/refresh/logout/me; GET de suscripción |
| Sesión | `core/auth/session.store.ts` | token en memoria, usuario, single-flight, hydrate, epoch |
| Permisos | `core/auth/domain/permissions.rules.ts` | `can`, `homeFor`, `scopeOf`, `grantableRestauranteRoles`, `canGrantPlatformRol`, `subscriptionLapsedRoute` |
| Navegación | `core/auth/domain/navigation.rules.ts` | `routeAccess`, `navEntriesFrom`, `navFor`, `homeLabel`, `roleLabel`, `initialsOf` |
| Guards | `core/auth/guards/` | `auth`, `guest`, `home-redirect`, `role`, `route-action`, `subscription` |
| HTTP | `core/http/` | `api.config.ts`, `api.types.ts`, `auth.interceptor.ts`, `error.interceptor.ts`, `domain/api-error.rules.ts` |
| Layout | `core/layout/shell.layout.ts` | sidebar por rol, chip de usuario, logout, `<router-outlet>` |

## API usada
`/auth/login|refresh|logout|me`, `GET /restaurantes/actual/suscripcion`, y desde el shell `GET /restaurantes/actual`. Ver [[API]].

## Reglas de dominio
Matriz de permisos ([[Modelo de Negocio]]); homes por rol; jerarquía de plataforma; roles otorgables (nunca `ADMINISTRADOR`); destino único del 402; mapa estado a acción de UI y parseo de `Retry-After`.

## Permisos
`can()` consulta la tabla; el scope sale de `restauranteId`.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Un solo punto de verdad de permisos, bien testeado | Core importa `features/restaurante` (shell) |
| Interceptores y store cubiertos por tests de concurrencia | Complejidad de epoch/abandono |
| Reglas puras separadas de DI | `SuscripcionApi` duplica un GET de `RestauranteApi` |

## Cómo extenderlo sin romperlo
- Nuevo permiso: añade la `Action`, la fila en la tabla y su test; no cambies guards.
- Nuevo guard de ruta: pásalo en `moduleRoute(..., guards)`.
- No agregues lógica de pantalla a `shell.layout.ts` más allá de layout.
- Si cambia el criterio de suscripción (anunciado), toca `subscription.guard.ts` y `subscriptionLapsedRoute` juntos. Ver [[Pendientes y Deuda Técnica]].
