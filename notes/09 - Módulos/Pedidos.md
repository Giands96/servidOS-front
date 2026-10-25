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

Volver: [[00 - MOC]] · Fase: [[Fase 4 - Pedidos]] · Ver [[Mesas]] · [[Modelo de Negocio]] · [[Flujo del Sistema]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Listar pedidos, crear (MESA, DELIVERY, RECOJO), confirmarlos ("Enviar a cocina"), cambiar de estado y cancelar. `/pedidos` (tablero kanban por defecto y lista) es el home de ADMINISTRADOR y RECEPCION.

> [!warning] Estado: en `main` desde el 2026-10-15, sin prueba manual
> Lista (`/pedidos`) y nuevo pedido (`/pedidos/nuevo`) mergeados por squash en los PRs #8 a #12 (`c66c3ff`). Sin spec de las páginas (AGENTS §6) y sin prueba en navegador.

> [!info] Tablero kanban (Fase 4b): corte 1 y corte 2 en `main` (2026-10-23)
> Corte 1, en `main` (PR #24, `1d3e3c8`): `tablero.rules.ts` con su spec y la dependencia `@angular/cdk` (ADR-20). Corte 2, en `main` (PR #27, `6a6a4a7`; tablero, arrastre y menú); ambos cortes pasaron dos reviews aprobadas. El tablero se probó en navegador contra el backend real (2026-10-22); el arrastre no se probó con touch. Detalle en [[Fase 4 - Pedidos]] y `docs/progress/10-tablero-pedidos.md`.

## Archivos
| Ruta | Contenido |
|---|---|
| `features/pedidos/pedidos.types.ts` | `TipoPedido`, `EstadoPedido`, `EstadoPago`, `PedidoListado`, `CrearPedidoRequest`; cocina los re-exporta |
| `features/pedidos/data/pedidos.api.ts` | `listar`, `confirmar`, `cambiarEstado`, `crear` |
| `features/pedidos/domain/pedidos.rules.ts` | transiciones, acciones, etiquetas y formato de la lista |
| `features/pedidos/domain/nuevo-pedido.rules.ts` | borrador, carrito, validación y `toRequest` |
| `features/pedidos/domain/nuevo-pedido-local.rules.ts` y `features/pedidos/nuevo-pedido/` | flujo Local con la mesa primero (ver la sección más abajo) |
| `features/pedidos/domain/tablero.rules.ts` | columnas, destinos del arrastre, menú "Mover a…", consultas, conteos de hoy y tarjeta (en `main`, PR #24) |
| `features/pedidos/pedidos.page.ts` | alternancia Tablero / Lista y lista (solo orquesta) |
| `features/pedidos/tablero.component.ts` | tablero kanban con arrastre CDK y menú (en `main`, PR #27) |
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

**Tablero** (reglas en `tablero.rules.ts`, en `main`; interfaz también en `main`, PR #27): cuatro columnas activas (Pendiente, En preparación, Listo, En entrega) y Entregado / Cancelado colapsadas con el conteo de hoy, que sirven de zonas de soltar. Una petición por columna (`estado=X`, `size=100`) más los conteos de hoy (`fecha`, `size=1`); refresco manual y tras cada acción. `canDrop`/`dropTargets` salen de las transiciones de `pedidos.rules` (sin movimientos hacia atrás: el contrato no los tiene); soltar usa `confirmar` para PENDIENTE → EN_PREPARACION y `PATCH estado` en el resto. La tarjeta muestra los minutos desde `createdAt`, sin umbrales (el backend no da el tiempo en la etapa). La vista se guarda en `?vista=lista`; el tablero es el valor por defecto.

**Lista**: `isRowBusy` bloquea la fila desde la petición hasta que llega la última respuesta de la lista; `shouldReloadAfterRejection` recarga ante un 4xx; `failedLoadView` conserva las filas si falla la recarga de la misma vista.

## Rutas y permisos
`pedidos.gestionar`: ADMINISTRADOR, RECEPCION. `/pedidos` se declara con `moduleRoute('pedidos.gestionar', 'Pedidos', 'receipt', [], load)` y es la única entrada de menú; `/pedidos/nuevo` usa ícono `null` (sin entrada de menú) y `[subscriptionGuard]`.

> [!important] Dónde va el `subscriptionGuard`
> Solo `POST /pedidos` devuelve 402. Confirmar y `PATCH estado` pasan con el tenant bloqueado, así que la **lista no lleva `subscriptionGuard`** y solo `/pedidos/nuevo` lo lleva. No se ocultan acciones sobre pedidos existentes. El guard bloquea por `/auth/me`: `INACTIVO`, sin suscripción o `vencida`; `CANCELADA` por sí sola no bloquea (PR #8, necesario para que `/pedidos/nuevo` siga el contrato).

## Nuevo pedido · Local (flujo con la mesa primero, 2026-10-24)
Origen: `odd/tasks/nuevo-pedido-local.md` y `docs/progress/15-nuevo-pedido-local.md`. Slice 1 (datos y reglas) en `main` (PR #33, `75edfa6`); slice 2 (pasos) en el PR #35, abierto; slice 3 (mesa ocupada, Para llevar y hoja móvil) en `feat/nuevo-pedido-local-03-mesa-ocupada`, sin publicar. Mesas y cuenta: [[Mesas]]. Decisiones: ADR-23 a ADR-25 en [[Decisiones (ADR)]].

**Pasos:** Tipo de pedido → (Local) Mesa → Comensales → Productos. Delivery y Recojo van directo a Productos. El selector de tipo del carrito se quitó; el carrito muestra un resumen con "Cambiar", que vuelve al paso 0. El indicador `1 Mesa · 2 Comensales · 3 Productos` solo aparece en Local y se oculta en Para llevar.

**Mesa libre:** pide comensales (de 1 a `capacidad`, empieza en 1) y `ocupar` se llama al pulsar "Crear pedido", justo antes de `POST /pedidos`; si la creación falla se llama a `liberar`. **Mesa ocupada:** abre su cuenta (panel lateral desde `lg`, bottom sheet debajo) con las rondas, la sección "Para llevar" y el total; "Agregar ronda" crea otro pedido MESA sin pedir comensales.

**Para llevar:** pedido `RECOJO` con el `mesaId` de la mesa; se cobra junto con ella. "Cobrar cuenta" está oculto hasta que Caja soporte la cuenta de mesa. En teléfono, "Ver pedido" abre el pedido como bottom sheet.

**Datos:** `GET /mesas` más `GET /pedidos?porCobrar=true` paginado (`size` 100, sigue `totalPages`), agrupados por `mesaId` en una regla pura; la cuenta abierta usa `GET /mesas/{id}/cuenta`.

| Ruta | Contenido |
|---|---|
| `features/pedidos/domain/nuevo-pedido-local.rules.ts` | pasos y progreso, comensales, tarjetas de mesa, filtros, alertas de tiempo (<30 / 30–60 / >60 min), secciones de la cuenta, `ocupacionAlCrear`, `resumenMesa`, `resumenParaLlevar` |
| `features/pedidos/nuevo-pedido/tipo-pedido-step.component.ts` | paso 0 |
| `features/pedidos/nuevo-pedido/progreso-local.component.ts` | indicador de progreso |
| `features/pedidos/nuevo-pedido/mesa-picker.component.ts` | tarjetas de mesa con filtros, esqueleto, vacío y error |
| `features/pedidos/nuevo-pedido/comensales-step.component.ts` | paso de comensales |
| `features/pedidos/nuevo-pedido/mesa-detalle.component.ts` | cuenta de la mesa ocupada |

`nuevo-pedido.rules.ts` cambió: `BorradorPedido.mesaId` es `number | null`, existe `paraLlevarDeMesa` y `toRequest` envía `mesaId` para MESA y para RECOJO con esa marca. Las páginas y componentes siguen sin spec (AGENTS §6); la suite quedó en 35 archivos / 1362 tests. Pendientes en [[Pendientes y Deuda Técnica]].

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
- Tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`): implementado reutilizando `pedidos.rules.ts`; las reglas (PR #24) y la interfaz (PR #27) están en `main`. Ítems en tarjeta, tiempo en la etapa y presencia dependen de nuevos campos o canales del backend.
- Cobrar y Reembolsar pertenecen a [[Pagos]]. El cobro se implementó en [[Fase 7 - Caja]] (en `main`, PR #21): la lista muestra "Cobrar S/ …" en las filas sin cobrar a quien tiene `pagos.registrar` y lleva a `/caja?pedido=ID`. CAJERO no ve esta lista: cobra desde `/caja`. El reembolso está bloqueado hasta que el backend exponga el `pagoId`. El chip "Cobrar S/ …" en las tarjetas del tablero (T8.4b) queda pendiente hasta que la interfaz del tablero llegue a `main`.
- No añadas `subscriptionGuard` a `/pedidos`.
