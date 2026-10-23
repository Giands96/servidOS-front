---
title: Pedidos
date: 2026-10-17
tags:
  - servidos
  - modulos
  - pedidos
  - parcial
aliases:
  - Módulo Pedidos
---

# Pedidos

Volver: [[00 - MOC]] · Fase: [[Fase 4 - Pedidos]] · Ver [[Modelo de Negocio]] · [[Flujo del Sistema]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Listar pedidos, crear (MESA, DELIVERY, RECOJO), confirmarlos ("Enviar a cocina"), cambiar de estado y cancelar. `/pedidos` (tablero kanban por defecto y lista) es el home de ADMINISTRADOR y RECEPCION.

> [!warning] Estado: en `main` desde el 2026-10-15, sin prueba manual
> Lista (`/pedidos`) y nuevo pedido (`/pedidos/nuevo`) mergeados por squash en los PRs #8 a #12 (`c66c3ff`). Sin spec de las páginas (AGENTS §6) y sin prueba en navegador.

> [!info] Tablero kanban (Fase 4b): corte 1 en `main`, corte 2 con su PR pendiente (2026-10-16)
> Corte 1, en `main` (PR #24, `1d3e3c8`): `tablero.rules.ts` con su spec y la dependencia `@angular/cdk` (ADR-20). Corte 2, en la rama `feat/tablero-02-tablero` (tablero, arrastre y menú), con su PR pendiente; ambos cortes pasaron dos reviews aprobadas. El tablero se probó en navegador contra el backend real (2026-10-22); el arrastre no se probó con touch. Detalle en [[Fase 4 - Pedidos]] y `docs/progress/10-tablero-pedidos.md`.

## Archivos
| Ruta | Contenido |
|---|---|
| `features/pedidos/pedidos.types.ts` | `TipoPedido`, `EstadoPedido`, `EstadoPago`, `PedidoListado`, `CrearPedidoRequest`; cocina los re-exporta |
| `features/pedidos/data/pedidos.api.ts` | `listar`, `confirmar`, `cambiarEstado`, `crear` |
| `features/pedidos/domain/pedidos.rules.ts` | transiciones, acciones, etiquetas y formato de la lista |
| `features/pedidos/domain/nuevo-pedido.rules.ts` | borrador, carrito, validación y `toRequest` |
| `features/pedidos/domain/tablero.rules.ts` | columnas, destinos del arrastre, menú "Mover a…", consultas, conteos de hoy y tarjeta (en `main`, PR #24) |
| `features/pedidos/pedidos.page.ts` | alternancia Tablero / Lista y lista (solo orquesta) |
| `features/pedidos/tablero.component.ts` | tablero kanban con arrastre CDK y menú (rama `feat/tablero-02-tablero`, PR pendiente) |
| `features/pedidos/nuevo-pedido.page.ts` | alta de pedido (solo orquesta) |
| `features/catalogo/data/catalogo.api.ts` | lectura del menú (ver [[Catálogo]]) |
| `src/testing/builders.ts` | `aPedidoListado`, `aPage`, `aProducto`, `aCategoria` |

## API (verificada contra `/v3/api-docs` y `FRONTEND_CONTEXT` el 2026-10-11)
- `GET /pedidos?estado=&fecha=&porCobrar=&page=&size=`: **existe**. Paginado (`size` 1–100, 20 por defecto), más nuevo primero, sin `sort`. Fila: `pedidoId, tipoPedido, mesaId, estado, total, observacion, createdAt, estadoPago` (`PAGADO`, `REEMBOLSADO` o `null`).
- No existe `GET /pedidos/{id}` y la fila no trae items: no hay panel de detalle.
- `POST /pedidos` → 201 en `PENDIENTE`. Cuerpo `{ tipoPedido, mesaId?, observacion?, items: [{ productoId, cantidad, observacion? }] }`. Items vacíos o `cantidad < 1` dan 422; los 400 vienen en español y se muestran tal cual.
- `POST /pedidos/{id}/confirmar` (`PENDIENTE` → `EN_PREPARACION`) y `PATCH /pedidos/{id}/estado` `{ estado }`: ambos responden `PedidoResponse`.
- `createdAt` llega sin `Z` (hora local de Lima, §10): se parsea sin agregar `Z`. Un enum inválido o una fecha mal formada probablemente devuelve 500: se valida en el cliente.

## Reglas de dominio
**Transiciones** (`TRANSITIONS`, `nextEstados`, `primaryAction`): `PENDIENTE` → `EN_PREPARACION` | `CANCELADO`; `EN_PREPARACION` → `LISTO` | `CANCELADO`; `LISTO` (DELIVERY) → `EN_ENTREGA` | `CANCELADO`; `LISTO` (MESA, RECOJO) → `ENTREGADO` | `CANCELADO`; `EN_ENTREGA` → `ENTREGADO` | `CANCELADO`; `ENTREGADO` y `CANCELADO` sin salida. `canCancel` es falso para estados finales y para pedidos `PAGADO` (el backend responde 400). Las reglas degradan a "sin acción" ante estados o tipos fuera de las uniones.

**Nuevo pedido** (`nuevo-pedido.rules.ts`): `MESA` exige `mesaId` entero mayor a 0; productos `AGOTADO` no se pueden agregar (el backend da 400); el total en pantalla (`totalReferencial`, centavos enteros) es solo referencial; `toRequest` envía `mesaId` solo para MESA, nunca montos, omite observaciones en blanco y lanza si el borrador es inválido.

**Tablero** (reglas en `tablero.rules.ts`, en `main`; interfaz en la rama `feat/tablero-02-tablero`): cuatro columnas activas (Pendiente, En preparación, Listo, En entrega) y Entregado / Cancelado colapsadas con el conteo de hoy, que sirven de zonas de soltar. Una petición por columna (`estado=X`, `size=100`) más los conteos de hoy (`fecha`, `size=1`); refresco manual y tras cada acción. `canDrop`/`dropTargets` salen de las transiciones de `pedidos.rules` (sin movimientos hacia atrás: el contrato no los tiene); soltar usa `confirmar` para PENDIENTE → EN_PREPARACION y `PATCH estado` en el resto. La tarjeta muestra los minutos desde `createdAt`, sin umbrales (el backend no da el tiempo en la etapa). La vista se guarda en `?vista=lista`; el tablero es el valor por defecto.

**Lista**: `isRowBusy` bloquea la fila desde la petición hasta que llega la última respuesta de la lista; `shouldReloadAfterRejection` recarga ante un 4xx; `failedLoadView` conserva las filas si falla la recarga de la misma vista.

## Rutas y permisos
`pedidos.gestionar`: ADMINISTRADOR, RECEPCION. `/pedidos` se declara con `moduleRoute('pedidos.gestionar', 'Pedidos', 'receipt', [], load)` y es la única entrada de menú; `/pedidos/nuevo` usa ícono `null` (sin entrada de menú) y `[subscriptionGuard]`.

> [!important] Dónde va el `subscriptionGuard`
> Solo `POST /pedidos` devuelve 402. Confirmar y `PATCH estado` pasan con el tenant bloqueado, así que la **lista no lleva `subscriptionGuard`** y solo `/pedidos/nuevo` lo lleva. No se ocultan acciones sobre pedidos existentes. El guard bloquea por `/auth/me`: `INACTIVO`, sin suscripción o `vencida`; `CANCELADA` por sí sola no bloquea (PR #8, necesario para que `/pedidos/nuevo` siga el contrato).

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas de transición, de borrador y del tablero en `domain`, testeadas (pedidos 382 tests en la punta del tablero) | Las páginas y el componente del tablero no tienen spec; el tablero se probó en navegador contra el backend real, no con touch |
| La lista sigue operable con el tenant bloqueado | `homeFor` apunta a `/pedidos` (sin guard), así que "Seguir en solo lectura" del paywall lleva a la lista |
| El backend calcula precios; el front nunca envía montos | Sin aviso por borrador sin guardar; el tablero aún no está en `main` |
| Pedidos es dueño de los tipos; cocina los re-exporta | `fail()` duplicada en ambas páginas y un aviso de error duplicado en el tablero |
| Tablero: arrastre, botón y menú llevan a la misma transición (CDK, con soporte táctil) | Dependencia nueva `@angular/cdk`; sin sincronización en vivo; sin ítems, sin tiempo en la etapa, sin aviso si una columna pasa de 100 pedidos |

## Cómo extenderlo
- Reglas nuevas en `domain` con test; las páginas solo orquestan.
- Tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`): implementado reutilizando `pedidos.rules.ts`; las reglas están en `main` (PR #24) y falta mergear la interfaz (`feat/tablero-02-tablero`). Ítems en tarjeta, tiempo en la etapa y presencia dependen de nuevos campos o canales del backend.
- Cobrar y Reembolsar pertenecen a [[Pagos]]. El cobro se implementó en [[Fase 7 - Caja]] (en `main`, PR #21): la lista muestra "Cobrar S/ …" en las filas sin cobrar a quien tiene `pagos.registrar` y lleva a `/caja?pedido=ID`. CAJERO no ve esta lista: cobra desde `/caja`. El reembolso está bloqueado hasta que el backend exponga el `pagoId`. El chip "Cobrar S/ …" en las tarjetas del tablero (T8.4b) queda pendiente hasta que la interfaz del tablero llegue a `main`.
- No añadas `subscriptionGuard` a `/pedidos`.
