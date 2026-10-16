---
title: Fase 4 - Pedidos
date: 2026-10-15
tags:
  - servidos
  - fases
  - pedidos
aliases:
  - Fase 4
  - Lista y nuevo pedido
---

# Fase 4 — Pedidos (lista + nuevo pedido)

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Pedidos]]

> [!success] Mergeada en `main` el 2026-10-15 (PRs #8 a #12, `main` en `c66c3ff`)
> El usuario hizo squash merge de los cinco PRs en orden y se borraron las ramas remotas. Sigue **sin prueba manual en navegador** (falta crear un restaurante desde [[Plataforma]]) y las páginas no tienen spec (AGENTS §6). Fuente: `docs/progress/07-fase-4-pedidos.md` y `odd/tasks/pedidos.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder de `/pedidos/nuevo` por dos pantallas reales: la **lista** de pedidos (`/pedidos`, diseño `QU3DR`) y el **nuevo pedido** (`/pedidos/nuevo`, diseño `Blp89`). El tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`) queda para una feature posterior.

## Alcance decidido con el usuario
Lista + nuevo pedido (2026-10-11); tablero después; entrega en cadena `stacked-to-main`; sin specs de página por AGENTS §6. Fuera: Cobrar y Reembolsar (Caja), edición del catálogo, panel de detalle (no existe `GET /pedidos/{id}` y la fila no trae items), nombre de cliente, `repartidorNombre`, acceso de CAJERO.

## Tareas y commits
Los commits de trabajo vivían en ramas que ya se borraron; en `main` cada PR quedó como un único commit de squash.

| Tarea | Commit de trabajo | PR (squash en `main`) | Qué |
|---|---|---|---|
| T4.1 | `6c42861` | #8 (`2b812b0`) | `subscriptionGuard` según contrato §5 (desde `/auth/me`) |
| T4.2 | `1e8fece` | #9 (`04b462f`) | tipos, `PedidosApi`, reglas de transición |
| T4.3 | `f38f2da` | #10 (`87f0cd9`) | página de la lista, ruta y entrada de menú |
| T4.3b-1 | `eb75ba9` | #10 (`87f0cd9`) | arreglo del doble envío (`isRowBusy`) |
| T4.4 | `9b43b5d` | #11 (`40930c5`) | API de catálogo de solo lectura |
| T4.5 | `ea0dc77` | #11 (`40930c5`) | reglas del nuevo pedido + `PedidosApi.crear` |
| T4.3b | `5d173bc` | #12 (`c66c3ff`) | robustez de la lista |
| T4.6 | `b37b47d` | #12 (`c66c3ff`) | página de nuevo pedido + `subscriptionGuard` en la ruta |
| T4.7 | — | #12 (`c66c3ff`) | nota de progreso y notas del Vault |
| T4.8 | `3598eb0` | #12 (`c66c3ff`) | `homeFor` de ADMINISTRADOR y RECEPCION → `/pedidos` |

## Evidencia
- Suite completa en `main` (`c66c3ff`): **21 archivos, 770 tests en verde** (`npx ng test --watch=false`); `npx ng build` OK. Cifras previas al merge (punta de la cadena, no vigentes): 747 tests, 753 tras T4.8.
- En el merge se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna cada campo de forma explícita (sin `...overrides`), con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).
- RED registrados en cada tarea (módulos o exports inexistentes, fallos de comportamiento); detalle en `docs/progress/07-fase-4-pedidos.md`.
- Reviews nativas aprobadas por slice y una acumulada (`main..ea0dc77`, 4 lentes). La acumulada anterior (`main..600c5fd`) falló por `operation_timeout` y se canalizó como defecto de Gentle AI (issue equivalente #4441); el comentario no se publicó por falta de acceso a GitHub.

## Hechos del contrato
- `GET /pedidos` existe: paginado, más nuevo primero. Las filas no traen items.
- Solo `POST /pedidos` devuelve 402. La lista **no** lleva `subscriptionGuard`; `/pedidos/nuevo` sí.
- `createdAt` llega sin `Z` (hora local de Lima) en pedidos; en cocina llega en UTC con `Z`.
- Cancelar un pedido pagado da 400. Detalle de transiciones y reglas en [[Pedidos]].

## Decisiones
`homeFor` de ADMINISTRADOR y RECEPCION → `/pedidos` (decisión del usuario 2026-10-14, `3598eb0`; **cerrada**: la lista no lleva `subscriptionGuard`). Defaults del orquestador (a revisar con el usuario): "Pedidos" del menú → `/pedidos`; refresco manual y tras cada acción (sin polling ni WebSocket); pestañas sin conteos; cancelar con confirmación; tras crear se navega a la lista.

## Pendientes
Prueba manual en navegador con el backend (bloqueada hasta tener Plataforma); aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación de la plataforma; tablero kanban; Cobrar (fase de Caja) y acceso de CAJERO; CSP y revisión visual en navegador. Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]]. La siguiente fase es [[Plataforma]] (decisión del usuario, 2026-10-15).
