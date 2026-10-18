---
title: Fase 7 - Caja
date: 2026-10-17
tags:
  - servidos
  - fases
  - caja
  - pagos
aliases:
  - Fase 7
  - Cobro de pedidos
---

# Fase 7 — Caja (cobro de pedidos)

Volver: [[00 - MOC]] · Anterior: [[Fase 6 - Catálogo]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Pagos]]

> [!success] En `main` (2026-10-17, PRs #19 a #22, `b7fb568`)
> Las tareas T8.1 a T8.4a se mergearon por squash como `feat/caja-01-datos` (#19), `feat/caja-02-pagina` (#20) y `feat/caja-03-atajos` (#21), más los avisos de review (#22). Los cuerpos de PR 21 a 23 en `docs/prs` usan una numeración propia, no la de GitHub. La review nativa aprobó todo el rango (`review-6e314892b3ffcd3f`) y **nada de esta fase se probó en navegador**. El **reembolso está bloqueado por el backend** y el chip del tablero espera el merge del tablero. Fuente: `docs/progress/11-fase-7-caja.md` y `odd/tasks/caja.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder `/caja` por la **pantalla del cajero** (diseño `P25cfL`): lista "Por cobrar", formulario con seis métodos de pago y vuelto en efectivo, y atajos "Cobrar S/ …" desde los pedidos. Antes los pedidos se tomaban y se entregaban, pero no se podían cobrar desde la web.

## Alcance decidido con el usuario
Plan aprobado el 2026-10-16 ("implementa caja para realizar los pagos en el flujo de los pedidos"). **El reembolso espera a que el backend exponga el `pagoId`**; la especificación del cambio se entregó en `docs/backend/pago-id-en-pedidos.md`. Entrega en cadena `stacked-to-main`, sin specs de página por AGENTS §6. Fuera de alcance: cierre/arqueo, historial de pagos y pagos parciales (sin endpoints).

## Tareas y commits
| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T8.1 | `e0fa5ed` | `feat/caja-01-datos` | tipos y `PagosApi.registrar`; `pagos.registrar` a ADMINISTRADOR, RECEPCION y CAJERO; home de CAJERO = `/caja` |
| T8.2 | `25642e5` | `feat/caja-01-datos` | reglas puras: métodos, efectivo y vuelto, atajos de monto, petición, errores y vistas |
| T8.3 | `14f394f` | `feat/caja-02-pagina` | página `/caja` (lista, formulario, "Último pago") y cambio de ruta |
| T8.4a | `3bdb24b` | `feat/caja-03-atajos` | botón "Cobrar S/ …" en las filas de la lista de pedidos |
| T8.4b | — | pendiente | el mismo chip en las tarjetas del tablero, tras mergear el tablero |
| T8.5 | — | `feat/caja-03-atajos` | nota de progreso, cuerpos de PR 21–23 y estas notas del Vault |
| T8.6 | — | bloqueada | modal de reembolso (`tDcwg`) y "Anular con reembolso" en el tablero |

## Evidencia
- Punta de la cadena (`feat/caja-03-atajos`): **28 archivos, 1108 tests en verde**; `npx ng build` OK.
- Por tarea (suite completa): T8.1 27 / 1028, T8.2 28 / 1084, T8.3 28 / 1085, T8.4a 28 / 1108.
- RED registrados: matriz de permisos, home de CAJERO y menús (core 9 fallos / 310) más `pagos.api` inexistente; `caja.rules` inexistente; spec de rutas contra el placeholder.
- Reviews nativas aprobadas: T8.1 `review-aa065b1ede656df8` (riesgo **alto**, autorización, 4 lentes); T8.2 `review-e2ff609e44106504` y T8.3 `review-c12133e9629dfca7` (medio, lente reliability). T8.4a (70 líneas) quedó bajo presupuesto.
- Tamaños de slice: 701, 622 y 70 líneas; las dos primeras piden `size:exception` (cuerpos de PR en `docs/prs/21` a `23`).

## Cambio de roles (decisión de contrato)
`pagos.registrar` pasa de **solo ADMINISTRADOR** a **ADMINISTRADOR, RECEPCION y CAJERO**, según `FRONTEND_CONTEXT` §3; el documento `Flujo - Recepcion Cocina.md` lo daba solo a ADMINISTRADOR y vale el contrato. Efectos: RECEPCION y CAJERO ven "Caja"; el home de CAJERO es `/caja` (antes `/sin-modulos`) y su menú queda en Caja y Catálogo. `pagos.reembolsar` no cambia. Matriz completa en [[Modelo de Negocio]].

## Hechos del contrato (OpenAPI local, 2026-10-16)
- `POST /pagos` `{ pedidoId*, metodoPago*, montoEntregado ≥ 0, referenciaExterna ≤ 100 }` → 201 `PagoResponse` (`pagoId, pedidoId, monto, vuelto, metodoPago, estado, reembolsoMotivo, reembolsoUsuarioId`). **No hay `monto` en la petición**: sale del pedido. 400 "Pedido inexistente, ya pagado o monto insuficiente", 403, 422.
- `GET /pedidos?porCobrar=true`: pedidos no cancelados y nunca cobrados, en cualquier estado; `size` ≤ 100.
- Cobrar **no cambia el estado** del pedido; un pedido pagado no se puede cancelar; `ENTREGADO` sin pago es válido.
- Con el tenant bloqueado `POST /pagos` pasa (contrato §5): `/caja` no lleva `subscriptionGuard`.
- Detalle en [[Pagos]] y [[API]].

## Decisiones
Defaults del orquestador (a revisar con el usuario):
- Atajos de monto **derivados** del total: "Exacto" más los billetes de 10/20/50/100/200 por encima (máximo 3); desde S/ 200, los siguientes múltiplos de 50. El "S/ 80" del diseño no se produce.
- El **vuelto del cliente es solo vista previa**; manda el valor del servidor (aviso tras el cobro).
- `referenciaExterna` **opcional** en todos los métodos que no son efectivo.
- **Sin ítems en el encabezado del formulario**: la fila de `GET /pedidos` no los trae; se muestra la observación.
- Sin enlace "Reembolsar" hasta que exista el `pagoId`.
- Los montos se comparan en **céntimos** para evitar ruido de coma flotante.

## Pendientes
- **Reembolso (T8.6), bloqueado:** `POST /pagos/{id}/reembolso` necesita el `pagoId`, que solo llega en la respuesta de `POST /pagos`. Hay que pedir al backend el campo `pago { pagoId, metodoPago, monto, referenciaExterna }` en cada fila de `GET /pedidos` (`docs/backend/pago-id-en-pedidos.md`). Con eso: modal `tDcwg`, "Reembolsar" en Caja y "Anular con reembolso" en el tablero.
- **Chip del tablero (T8.4b)** tras mergear las ramas del tablero.
- Prueba en navegador con ADMINISTRADOR, RECEPCION y CAJERO, y con el tenant bloqueado.
- Más de 100 pedidos por cobrar: sin paginación ni aviso.
- Riesgo del interceptor 402 si alguna llamada de pagos devolviera 402.
- (hecho) La cadena se mergeó en orden el 2026-10-17 (#19 a #22).

Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
