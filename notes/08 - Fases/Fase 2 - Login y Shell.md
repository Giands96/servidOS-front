---
title: Fase 2 - Login y Shell
date: 2026-10-08
tags:
  - servidos
  - fases
  - ui
aliases:
  - Fase 2
---

# Fase 2 — Login y Shell

Volver: [[00 - MOC]] · Anterior: [[Fase 1 - Core Auth]] · Siguiente: [[Fase 3 - Cocina]] · Ver [[Styles y Diseño]] · [[Shared]] · [[Auth]]

> [!abstract] Objetivo
> Sistema visual, login completo, layout autenticado con menú por rol y páginas de estado. Fuente: `docs/progress/04-fase-2-login-shell.md`.

## Tareas y commits
| Tarea | Commit | Qué |
|---|---|---|
| T2.1 | `4d8b1c0` | tokens Tailwind 4 y primitivas UI |
| T2.2 | `297a00b` | login (401 genérico, 422, 429 con cuenta regresiva, sesión expirada) |
| T2.3 | `6837891` | shell, `navFor`, rutas con placeholders |
| T2.4 | `bcc8302` | 403, 404, sin-módulos, suspendido, paywall, `restaurante.api` |
| T2.6 | `3a41996` | Bricolage Grotesque + Geist |
| T2.7 | `1dcd8a8` (+ test `f5312ca`) | "Restaurante y plan" solo ADMINISTRADOR |
| T2.8 | `02bca02` (+ fix `484abaa`) | menú derivado de las rutas; `moduleRoute` con guards extra |
| T2.5 | sin commit | nota `docs/progress/04` |

## Evidencia
- T2.2 RED (no resolvía `./login.rules`) a 16 tests; T2.3 RED a 31; T2.4 RED a 7. Total 14 archivos, 309 tests; luego 311, 312, 337 y **340 tests** al cierre (`484abaa`). `ng build` OK (initial 283.80 kB raw).
- Revisión nativa de riesgo alto: aprobada, con hallazgos no bloqueantes.

## Decisiones
Placeholders para módulos pendientes; sin badges de conteo (no hay endpoints de listado); textos faltantes redactados en español neutro; "Restaurante y plan" solo ADMINISTRADOR; menú derivado de rutas. Ver [[Decisiones (ADR)]].

## Trade-offs
Panel izquierdo del login con degradado (sin foto aprobada); un solo mensaje en 422 (se marcan ambos campos); `SuscripcionApi` y `RestauranteApi.suscripcion()` duplican un GET; el paywall muestra "Plan {id}" porque no hay endpoint con nombre del plan; el chip "402 · mensaje" del diseño no se muestra.

## Pendientes (de las reviews)
- Foto del panel de login; confirmar el campo `nombre` de `GET /restaurantes/actual` (asumido).
- Tests de página del login y del flujo renovar del paywall.
- Icono y código "200" inventados en el toast de éxito; `roleLabel` copiado en 3 sitios (a la fecha de la review; hoy hay una sola definición en `navigation.rules.ts`, usada por shell y páginas); `formatDate` acepta 31/02.
- `navEntriesFrom` no ve `loadChildren`; el shell lee rutas una vez.
- `subscriptionGuard` en rutas de escritura al construir cada módulo.
Ver [[Pendientes y Deuda Técnica]].
