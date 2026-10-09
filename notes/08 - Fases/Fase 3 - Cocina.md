---
title: Fase 3 - Cocina
date: 2026-10-08
tags:
  - servidos
  - fases
  - cocina
aliases:
  - Fase 3
  - Tablero de cocina
---

# Fase 3 — Cocina (tablero en vivo)

Volver: [[00 - MOC]] · Anterior: [[Fase 2 - Login y Shell]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Cocina]]

> [!warning] Implementada, sin prueba manual
> Rama `feat/cocina`, working tree limpio. No se ha probado en navegador (backend caído), el payload no está verificado contra Swagger y la review nativa del tramo `00c94dd..2fad5cb` está pendiente. Fuente: `docs/progress/05-fase-3-cocina.md` y `odd/tasks/cocina.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder de `/cocina` por el tablero del diseño `pencil-export/cocina-admin.png`: cola `EN_PREPARACION` por orden de llegada, "Marcar listo", panel "Listos para salir" y actualización en vivo.

## Por qué va antes de Restaurante
El plan general numeraba Restaurante como fase 3 y Cocina como 6 (`docs/progress/00`). El usuario eligió Cocina primero: es el home de COCINERO y el backend añadió `GET /cocina/listos` y el topic STOMP el 2026-10-08.

## Tareas y commits
| Tarea | Commit | Qué |
|---|---|---|
| Dependencia | `00c94dd` | `@stomp/rx-stomp@2.4.0` (+ `@stomp/stompjs@7.3.0`), aprobada |
| T3.1 API y tipos | `8591b8c` | `cocina.types.ts`, `CocinaApi`, builders, proxy `/ws` |
| T3.2 Reglas | `7087023` | `cocina.rules.ts` |
| T3.3 Conexión en vivo | `6790b8d` | `CocinaLive` (STOMP) |
| T3.4 Página | `2fad5cb` | `cocina.page.ts`, ruta vía `moduleRoute` (5.º parámetro `load`), 8 iconos, `allowedCommonJsDependencies: ["@stomp/stompjs"]` en `angular.json`, 2 tests de ruta |
| T3.5 Nota | — | `docs/progress/05-fase-3-cocina.md` |

## Evidencia
- Suite completa (re-ejecutada por el coordinador): **17 archivos, 407 tests en verde** (base 340); specs de cocina: 65. `ng build` OK sin warnings.
- RED registrados: `Cannot find module` para api, rules y live; aridad de `moduleRoute` (TS2554) para T3.4. `odd/tasks/cocina.md` tiene T3.1 a T3.5 marcadas.

## Alcance y restricciones
- Dentro: `features/cocina`, `/ws` en el proxy, dependencia STOMP, contrato actualizado.
- Fuera: toggle de disponibilidad de productos (no está en el diseño), badge de conteo del sidebar, demás cambios del backend (§1–4, 6–8).
- `/cocina` **sin `subscriptionGuard`** (marcar listo se permite con 402, anunciado §5).

## Decisiones
Umbrales 15/25 min (usuario; el texto de EGPHx manda sobre los colores de `cocina-admin.png`); `@stomp/rx-stomp` en vez de polling de 5 s; `moduleRoute` acepta `load` conservando `routeActionGuard`. Ver [[Decisiones (ADR)]] (ADR-14, 15, 16, 19).

## Trade-offs (de `docs/progress/05`)
- WebSocket: tiempo real y menos tráfico, a cambio de una dependencia y lógica de reconexión; se mantiene una carga HTTP inicial para que el tablero funcione aunque el socket no conecte.
- "hace N min" en Listos solo aparece si el front vio el paso a LISTO (marcado propio o evento); tras recargar desaparece, porque el backend no envía la hora de LISTO.
- El chip de tiempo se calcula desde `createdAt` (no hay hora de entrada a EN_PREPARACION); llega sin zona y se interpreta como hora local: si el backend manda UTC, los timers quedan corridos.
- Píldora de desconexión oscura (patrón `kUmH1`), no la clara de `cocina-admin.png`; Listos vacío sin texto propio; sin badge "Cocina 6" en el sidebar.

## Pendientes
Verificar shape contra Swagger y zona horaria de `createdAt`; prueba manual en navegador (checklist en `docs/progress/05`); review nativa de `00c94dd..2fad5cb`. Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
