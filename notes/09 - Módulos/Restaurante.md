---
title: Restaurante
date: 2026-10-08
tags:
  - servidos
  - modulos
  - restaurante
  - suscripcion
aliases:
  - Módulo Restaurante
  - Paywall
---

# Restaurante

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[Seguridad]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Datos del restaurante actual y su suscripción: paywall hoy; plan, cancelación y detalle más adelante. Estado: **parcial** (paywall y API de lectura implementados; la ruta `/restaurante` es placeholder).

## Archivos
- `src/app/features/restaurante/data/restaurante.api.ts` — `actual()`, `suscripcion()`, `renovar()`.
- `features/restaurante/domain/subscription.rules.ts` (+ spec, 4 casos) — `formatDate`, `formatPeriod`, `estadoLabel`, `estadoVariant`.
- `features/restaurante/paywall.page.ts` — `/paywall`, solo ADMINISTRADOR.
- Relacionados en core: `core/auth/data/suscripcion.api.ts`, `core/auth/guards/subscription.guard.ts`.

## API usada
`GET /restaurantes/actual` (se asume `nombre`), `GET /restaurantes/actual/suscripcion`, `POST /restaurantes/actual/suscripcion/renovar`. Pendientes: `PATCH .../plan`, `POST .../cancelar`.

## Reglas de dominio
Formato de fechas ("14 sep 2026") y etiquetas/variantes de estado. `subscriptionLapsedRoute(user)` decide `/paywall` o `/suspendido`.

## Permisos
`restaurante.suscripcion.gestionar`: solo ADMINISTRADOR (ruta `/restaurante` y `/paywall`). `restaurante.ver` (todos los roles de tenant) para el nombre del sidebar.

> [!warning] Cambios anunciados (2026-10-08, sin verificar contra Swagger)
> Eliminar `renovar()` y el botón "Renovar suscripción" del paywall; copy que indique que la plataforma regulariza; `subscriptionGuard` por `fechaFin < hoy`; aviso "Tu suscripción termina el {fechaFin}"; cancelar exige contraseña; sin suscripción vigente el GET devuelve 400. Checklist en [[Pendientes y Deuda Técnica]].

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas de formato puras | Paywall muestra "Plan {id}" (sin nombre de plan) |
| Errores van a toast con `message` del backend | `formatDate` acepta fechas imposibles (31/02) |
| Solo ADMINISTRADOR ve la gestión | Paywall sin test del flujo renovar; su texto dice "cancelada" aun con estado ACTIVA |

## Cómo extenderlo
- Nuevas llamadas en `restaurante.api.ts` (solo `HttpClient`).
- Si agregas escrituras, pasa `subscriptionGuard` por el parámetro `guards` de `moduleRoute`.
- Evita agregar un segundo GET de suscripción: reutiliza el existente o unifica (deuda registrada).
