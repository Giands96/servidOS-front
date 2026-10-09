---
title: Fase 0 - Infra
date: 2026-10-08
tags:
  - servidos
  - fases
  - infra
aliases:
  - Fase 0
---

# Fase 0 — Infra

Volver: [[00 - MOC]] · Siguiente: [[Fase 1 - Core Auth]] · Ver [[Infraestructura]] · [[Decisiones (ADR)]]

> [!abstract] Objetivo
> Dejar el scaffold listo para construir seguro: sin SSR, TypeScript estricto, HttpClient con interceptores, proxy de desarrollo, tipos de error/paginación y utilidades de test. Fuente: `docs/progress/01-fase-0-infra.md`, `docs/progress/00-plan-general.md`.

## Estado inicial (verificación AGENTS §8)
`ng build` OK con SSR activo, `ng test` con 1 archivo y 2 tests, `routes = []`, sin `provideHttpClient`, sin proxy.

## Tareas y commits
| Tarea | Commit | Resultado |
|---|---|---|
| T0.1 Quitar SSR, strict, proxy, HttpClient | `2a2bea3` | `ng build` genera solo `dist/front/browser` |
| T0.2 `api.types` + `api-error.rules` (TDD) | `c47be35` | RED (módulo inexistente), GREEN 17 tests |
| T0.3 `src/testing` builders y mock-api | `066a3c7` | 3 tests |
| Previo | `cbe9ef7` | bump a Angular 22.2.1 |

## Evidencia
3 archivos de test, 21 tests en verde. Revisión nativa (lente reliability): aprobada.

## Decisiones
Ver ADR-01 (sin SSR), ADR-18 (proxy), y: `strict` + `strictTemplates` activados con scaffold vacío ("costo cero ahora"), FRONTEND_CONTEXT manda sobre el diseño. Detalle en [[Decisiones (ADR)]].

## Trade-offs
- Quitar SSR elimina prerender; encaja con token en memoria.
- Proxy mismo origen evita CORS pero exige un reverse proxy equivalente en producción (no documentado).

## Pendientes que dejó (resueltos en T1.0, `d8e2e63`)
`parseRetryAfter` estricto y `anApiError` con `status` real.

## Backlog de backend detectado
`GET /pedidos`, `GET /usuarios`, listado `LISTO` para cocina. Ver [[Pendientes y Deuda Técnica]].
