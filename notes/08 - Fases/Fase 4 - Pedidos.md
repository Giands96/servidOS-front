---
title: Fase 4 - Pedidos
date: 2026-10-16
tags:
  - servidos
  - fases
  - pedidos
aliases:
  - Fase 4
  - Lista y nuevo pedido
  - Fase 4b
  - Tablero de pedidos
---

# Fase 4 — Pedidos (lista + nuevo pedido)

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Pedidos]]

> [!success] Mergeada en `main` el 2026-10-15 (PRs #8 a #12, `main` en `c66c3ff`)
> El usuario hizo squash merge de los cinco PRs en orden y se borraron las ramas remotas. Sigue **sin prueba manual en navegador** (falta crear un restaurante desde [[Plataforma]]) y las páginas no tienen spec (AGENTS §6). Fuente: `docs/progress/07-fase-4-pedidos.md` y `odd/tasks/pedidos.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder de `/pedidos/nuevo` por dos pantallas reales: la **lista** de pedidos (`/pedidos`, diseño `QU3DR`) y el **nuevo pedido** (`/pedidos/nuevo`, diseño `Blp89`). El tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`) quedó para una feature posterior: ver la **Fase 4b** más abajo.

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

## Fase 4b — Tablero de pedidos (drag & drop)
> [!warning] Reglas mergeadas (#24); la interfaz del tablero espera su PR (2026-10-18)
> El usuario vio la lista y pidió el drag & drop ("No está el drag & drop"). Se construyó el tablero kanban de los diseños `EGPHx`, `Sd7pI` y `zFAgh` junto a la lista. Fuente: `docs/progress/10-tablero-pedidos.md` y `odd/tasks/pedidos-tablero.md`. Las ramas salen de `main` (`fdd9c50`).

| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T7.1 | `8bae4e3` | `feat/tablero-01-base` | `@angular/cdk` 22.2.3 y reglas puras del tablero (670 líneas) |
| T7.2 + T7.3 | `335ef1e` | `feat/tablero-02-tablero` | tablero, arrastre CDK, menú "⋯ Mover a…" y zonas Entregado / Cancelar (1125 líneas) |
| T7.4 | — | `feat/tablero-02-tablero` | nota de progreso, cuerpos de PR 19 y 20 y notas del Vault |

- **Qué hace**: alternancia Tablero | Lista (tablero por defecto, `?vista=lista`), chips por tipo con conteos, cuatro columnas de tarjetas y Entregado / Cancelado colapsadas con el conteo de hoy; mover por arrastre, por el botón primario o por el menú, siempre por las transiciones del contrato.
- **Decisiones**: dependencia `@angular/cdk` aprobada por el usuario (ver ADR-20 en [[Decisiones (ADR)]]); minutos desde la creación sin umbrales; sin movimientos hacia atrás (manda el contrato sobre `zFAgh`); sin sincronización en vivo.
- **Fuera de alcance (el backend no lo ofrece)**: ítems en la tarjeta, tiempo en la etapa y sus umbrales Atención/Crítico, presencia ("quién lo movió") y "En vivo"; Cobrar y Anular con reembolso van a Caja.
- **Evidencia**: 27 archivos / 1087 tests en verde en la punta, `ng build` OK; reviews nativas aprobadas (`review-45064623d1db4e80`, `review-47ff13cfb690c463`). El escritor lo verificó en navegador contra una API simulada.
- **Prueba contra el backend real (2026-10-22)**: con un restaurante de prueba "Tablero QA" creado desde [[Plataforma]] y pedidos de Recojo y Delivery. Pasó: carga del tablero; "0 min" en tarjetas nuevas (la hora de Lima se lee bien); botón primario; arrastre Pendiente → En preparación; arrastre inválido Pendiente → Listo vuelve a su lugar sin llamar al backend; menú "⋯ Mover a…" con solo las transiciones del contrato; soltar sobre Entregado; cancelar con confirmación; Delivery hasta En entrega; chips por tipo; alternancia Tablero | Lista; 375 px sin scroll horizontal de página. Consola: solo el 401 del arranque sin sesión. **Sin probar: arrastre con touch real** (la emulación manda eventos de mouse).
- **Observaciones de la prueba**: el menú titula "Mover Recojo a…" (el tipo, no el número); el backend deja pasar a Entregado un Recojo sin cobrar; un restaurante nuevo no tiene mesas, así que un pedido de Mesa da 400 "La mesa no existe" (el front lo muestra bien).
- **Entrega**: `stacked-to-main`. La primera slice (T7.1: reglas y `@angular/cdk`) entró a `main` en #24. La segunda (T7.2 + T7.3 y las notas) está rebaseada sobre `main` y espera su PR; pide `size:exception`. Los cuerpos `docs/prs/19` y `20` conservan la numeración planeada antes de abrir los PR.

## Pendientes
Prueba manual con RECEPCION (con ADMINISTRADOR ya se probaron la lista, Nuevo pedido y el tablero contra el backend el 2026-10-22, con un restaurante creado desde Plataforma); aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación de la plataforma; publicar y mergear el tablero (Fase 4b; ya probado en navegador contra el backend real el 2026-10-22, sin touch) y probarlo con touch; Cobrar (fase de Caja) y acceso de CAJERO; CSP y revisión visual en navegador. Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]]. La fase posterior a Pedidos fue [[Plataforma]] (decisión del usuario, 2026-10-15).
