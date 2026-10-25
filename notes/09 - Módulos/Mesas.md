---
title: Mesas
date: 2026-10-24
tags:
  - servidos
  - modulos
  - mesas
  - parcial
aliases:
  - Módulo Mesas
---

# Mesas

Volver: [[00 - MOC]] · Ver [[Pedidos]] · [[API]] · [[Modelo de Negocio]] · [[Estado Actual]] · [[Pendientes y Deuda Técnica]]

> [!abstract] Responsabilidad
> Capa de datos de las mesas del salón: listar, ocupar con comensales, liberar y leer la cuenta de una mesa. Hoy la usa solo el flujo "Nuevo pedido · Local" de [[Pedidos]]; todavía no existe una pantalla propia de mesas.

> [!warning] Estado: solo capa de datos (2026-10-24)
> `MesasApi` y `CuentaMesaApi` están en `main` (PR #33, `75edfa6`). La administración de mesas (crear, editar, desactivar) y los números de mesa en el resto de pantallas siguen pendientes. Detalle en `odd/tasks/mesas.md`.

## Archivos
| Ruta | Contenido |
|---|---|
| `features/mesas/mesas.types.ts` | `EstadoMesa` (`LIBRE` / `OCUPADA`), `Mesa`, `OcuparMesaRequest`, `ItemCuenta`, `PedidoCuenta`, `CuentaMesa` |
| `features/mesas/data/mesas.api.ts` | `MesasApi`: `listar(estado?)`, `ocupar(id, comensales)`, `liberar(id)` |
| `features/mesas/data/cuenta-mesa.api.ts` | `CuentaMesaApi.obtener(mesaId)` |
| `src/testing/builders.ts` | `aMesa`, `aCuentaMesa`, `aPedidoCuenta` |

## Contrato usado (Swagger en vivo y backend, 2026-10-24)
- `GET /mesas?estado=` → `{ mesaId, numero, capacidad, comensales, estado, activa }[]`, solo mesas activas, ordenadas por número. Roles ADMINISTRADOR, RECEPCION, CAJERO y MESERO.
- `POST /mesas/{id}/ocupar { comensales }`: de 1 a `capacidad`; 400 si ya está OCUPADA. Roles ADMINISTRADOR, RECEPCION y MESERO.
- `POST /mesas/{id}/liberar`: 400 si está LIBRE o con pedidos pendientes (el commit `c8b203e` del backend cuenta también RECOJO/DELIVERY vinculados sin pagar).
- `GET /mesas/{mesaId}/cuenta` → `{ mesaId, numero, estado, comensales, capacidad, pedidos[], total }`. `pedidos[]` son las rondas MESA sin pagar y no canceladas más los RECOJO/DELIVERY vinculados; vacía devuelve `pedidos: []` y `total: 0`. Roles ADMINISTRADOR, RECEPCION y CAJERO.
- `POST /mesas/{mesaId}/cuenta/pagar` (cobro atómico de la cuenta): existe en el backend, **el front no lo usa todavía** (ver [[Pagos]]).
- `POST /pedidos` con `tipoPedido = MESA` ocupa sola una mesa LIBRE sin comensales; RECOJO/DELIVERY con `mesaId` solo validan la mesa.
- `MesaResponse` no trae "ocupada desde": el tiempo abierto se deriva del pedido pendiente más antiguo de la mesa (`GET /pedidos?porCobrar=true`).

## Qué falta
- Página de administración de mesas (crear, editar, desactivar, reactivar) y su ruta y permisos (tareas M3 y M4 de `odd/tasks/mesas.md`).
- Mostrar el número de mesa en el tablero, Cocina, Caja y Reportes en lugar de `mesaId` (tarea M5); depende de una tienda compartida de mesas.
- Los métodos `listarInactivas`, `crear`, `actualizar`, `desactivar` y `reactivar` de la tarea M1 no están construidos; la feature de Nuevo pedido solo implementó los que necesitaba.
- Cobrar la cuenta de una mesa desde Caja: ver [[Pendientes y Deuda Técnica]].

## Ventajas y desventajas
| Ventaja | Desventaja |
|---|---|
| Datos aislados en `*.api`, sin importar vistas ni Router | Sin pantalla propia: las mesas solo se crean desde fuera del front |
| La cuenta de la mesa viene del backend, que es la fuente de verdad del cobro | `ocupar` + `crear` no son atómicos desde el cliente (ver ADR-24 en [[Decisiones (ADR)]]) |

## Cómo extenderlo
- Reglas nuevas en `domain` con test; las páginas solo orquestan.
- Revisar `/v3/api-docs` antes de tocar los tipos.
- Las tarjetas y la cuenta de Nuevo pedido viven en `features/pedidos/domain/nuevo-pedido-local.rules.ts`; ver [[Pedidos]].
