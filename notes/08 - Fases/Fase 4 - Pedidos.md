---
title: Fase 4 - Pedidos
date: 2026-10-14
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

> [!warning] Implementada en ramas locales, pendiente de merge, sin prueba manual
> Cinco ramas sin push (cadena `stacked-to-main`). No se probó en navegador y las páginas no tienen spec (AGENTS §6). Fuente: `docs/progress/07-fase-4-pedidos.md` y `odd/tasks/pedidos.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder de `/pedidos/nuevo` por dos pantallas reales: la **lista** de pedidos (`/pedidos`, diseño `QU3DR`) y el **nuevo pedido** (`/pedidos/nuevo`, diseño `Blp89`). El tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`) queda para una feature posterior.

## Alcance decidido con el usuario
Lista + nuevo pedido (2026-10-11); tablero después; entrega en cadena `stacked-to-main`; sin specs de página por AGENTS §6. Fuera: Cobrar y Reembolsar (Caja), edición del catálogo, panel de detalle (no existe `GET /pedidos/{id}` y la fila no trae items), nombre de cliente, `repartidorNombre`, acceso de CAJERO.

## Tareas y commits
| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T4.1 | `6c42861` | `fix/subscription-guard-vigencia` | `subscriptionGuard` según contrato §5 (desde `/auth/me`) |
| T4.2 | `1e8fece` | `feat/pedidos-01-datos` | tipos, `PedidosApi`, reglas de transición |
| T4.3 | `f38f2da` | `feat/pedidos-02-lista` | página de la lista, ruta y entrada de menú |
| T4.3b-1 | `eb75ba9` | `feat/pedidos-02-lista` | arreglo del doble envío (`isRowBusy`) |
| T4.4 | `9b43b5d` | `feat/pedidos-03-alta-datos` | API de catálogo de solo lectura |
| T4.5 | `ea0dc77` | `feat/pedidos-03-alta-datos` | reglas del nuevo pedido + `PedidosApi.crear` |
| T4.3b | `5d173bc` | `feat/pedidos-04-alta` | robustez de la lista |
| T4.6 | `b37b47d` | `feat/pedidos-04-alta` | página de nuevo pedido + `subscriptionGuard` en la ruta |
| T4.7 | — | `feat/pedidos-04-alta` | nota de progreso y notas del Vault |

## Evidencia
- Suite completa en la punta: **21 archivos, 747 tests en verde** (base `main`: 17 archivos / 419). `ng build` OK.
- RED registrados en cada tarea (módulos o exports inexistentes, fallos de comportamiento); detalle en `docs/progress/07-fase-4-pedidos.md`.
- Reviews nativas aprobadas por slice y una acumulada (`main..ea0dc77`, 4 lentes). La acumulada anterior (`main..600c5fd`) falló por `operation_timeout` y se canalizó como defecto de Gentle AI (issue equivalente #4441); el comentario no se publicó por falta de acceso a GitHub.

## Hechos del contrato
- `GET /pedidos` existe: paginado, más nuevo primero. Las filas no traen items.
- Solo `POST /pedidos` devuelve 402. La lista **no** lleva `subscriptionGuard`; `/pedidos/nuevo` sí.
- `createdAt` llega sin `Z` (hora local de Lima) en pedidos; en cocina llega en UTC con `Z`.
- Cancelar un pedido pagado da 400. Detalle de transiciones y reglas en [[Pedidos]].

## Decisiones
Defaults del orquestador (a revisar con el usuario): "Pedidos" del menú → `/pedidos`; `homeFor` sin cambio (`/pedidos/nuevo`); refresco manual y tras cada acción (sin polling ni WebSocket); pestañas sin conteos; cancelar con confirmación; tras crear se navega a la lista.

## Pendientes
Aviso por borrador sin guardar; decidir si `homeFor` pasa a `/pedidos` (con el guard actual, un tenant bloqueado vuelve al paywall al pulsar "Seguir en solo lectura"); #04 debe mergearse para que el guard siga el contrato; foto vieja de `/auth/me`; kanban; Caja y CAJERO; CSP y revisión visual en navegador. Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
