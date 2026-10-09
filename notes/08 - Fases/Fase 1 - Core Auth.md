---
title: Fase 1 - Core Auth
date: 2026-10-08
tags:
  - servidos
  - fases
  - auth
aliases:
  - Fase 1
---

# Fase 1 — Core Auth

Volver: [[00 - MOC]] · Anterior: [[Fase 0 - Infra]] · Siguiente: [[Fase 2 - Login y Shell]] · Ver [[Core]] · [[Seguridad]]

> [!abstract] Objetivo
> Sesión (token en memoria + refresh rotativo en cookie HttpOnly), permisos por rol/tenant y manejo del 402, antes de cualquier pantalla. Fuentes: `docs/progress/02`, `03` y `odd/tasks/servidos-frontend.md`.

## Tareas y commits
| Tarea | Commit | Qué |
|---|---|---|
| T1.0 | `d8e2e63` | fixes de la review de Fase 0 |
| T1.1 | `5943a2b` | `permissions.rules.ts` (`can`, `homeFor`, jerarquía de plataforma) |
| T1.2 | `fed17c2` | `auth.api.ts`, `session.store.ts` (single-flight) |
| T1.3 | `53aa6cb` | `auth.interceptor.ts` |
| T1.4 | `1e7592b` | `error.interceptor.ts` + guards |
| T1.5 | `c052171` | arranque `provideAppInitializer` |
| fix | `7a4245a` | `**` renderiza 404 (sin bucle) |
| T1.7 | `b01c389` | permisos alineados al flujo Recepción a Cocina |
| T1.6 | `65cc42e` | endurecimiento: login atómico, refresh tolerante, timeout 8 s, destino 402 único, tests positivos |
| fix | `3fd8d00` | el refresh abandonado ya no contamina refresh posteriores |

## Evidencia
- Cierre de Fase 1: 11 archivos, 247 tests en verde, `ng build` OK. RED observado por tarea.
- Revisiones nativas de riesgo alto (4 lentes): aprobadas (lineages registrados en `odd/tasks/servidos-frontend.md`).
- T1.7: RED por TS2322 (acción `catalogo.disponibilidad` desconocida), luego 227 tests; T1.6: RED por exports faltantes, luego 245 y 247.

## Decisiones
Tabla única de permisos; scope por `restauranteId`; RECEPCION con `pedidos.gestionar`/`pagos.reembolsar` tras T1.7; single-flight; `subscriptionGuard` falla abierto. Ver [[Decisiones (ADR)]].

## Cambio de matriz (T1.7)
| Acción | Antes | Ahora |
|---|---|---|
| `pedidos.gestionar` | ADMINISTRADOR | + RECEPCION |
| `pagos.reembolsar` | ADMINISTRADOR | + RECEPCION |
| `cocina.ver`, `cocina.listo` | ADMINISTRADOR, RECEPCION | + COCINERO |
| `catalogo.disponibilidad` | — | ADMINISTRADOR, COCINERO |

> [!note] Nota de documentación
> `docs/progress/02` (escrito antes de T1.7) dice "RECEPCION solo cocina.ver / cocina.listo"; el código actual y `docs/progress/03` reflejan la matriz ampliada. Vale la versión del código.

## Trade-offs
Con backend caído el usuario ve errores en vez de ir a login; 8 s de espera máxima al arrancar; complejidad del epoch.

## Pendientes menores
Fortalecer 2 asserts de `session.store.spec` (`vi.waitFor`, tipo exacto del rechazo). Ver [[Pendientes y Deuda Técnica]].
