---
title: Cocina
date: 2026-10-08
tags:
  - servidos
  - modulos
  - cocina
aliases:
  - Módulo Cocina
---

# Cocina

Volver: [[00 - MOC]] · Fase: [[Fase 3 - Cocina]] · Ver [[Flujo del Sistema]] · [[API]] · [[Seguridad]]

> [!abstract] Responsabilidad
> Tablero de cocina: cola de pedidos `EN_PREPARACION` por orden de llegada, "Marcar listo", panel "Listos para salir" y actualización en vivo por WebSocket STOMP.

> [!warning] Estado: implementado, sin prueba manual
> Commits hasta `2fad5cb`. No probado en navegador (backend caído); payload sin verificar contra Swagger; review nativa pendiente.

## Archivos
| Ruta | Contenido |
|---|---|
| `src/app/features/cocina/cocina.types.ts` | `TipoPedido`, `EstadoPedido`, `ColaItem`, `ColaPedido`, `CocinaEvent` |
| `features/cocina/data/cocina.api.ts` | `cola()`, `listos()`, `marcarListo(id)` |
| `features/cocina/data/cocina-live.ts` | `CocinaLive`, `COCINA_STOMP`, `brokerUrl`, `parseCocinaEvent`, `RECONNECT_DELAY_MS = 3000` |
| `features/cocina/domain/cocina.rules.ts` | reglas puras |
| `features/cocina/cocina.page.ts` | página (solo orquesta) |
| `src/testing/builders.ts` | `aColaPedido`, `aColaItem` |

## API usada
`GET /cocina/cola`, `GET /cocina/listos`, `POST /cocina/pedidos/{id}/listo` (204), STOMP `/ws` topic `/topic/restaurantes/{restauranteId}/cocina`. Forma sin verificar contra Swagger. Ver [[API]].

## Reglas de dominio (`cocina.rules.ts`)
`URGENCY_THRESHOLDS` (Atención 15, Crítico 25) y `urgencyOf`; `elapsedMinutes`, `minutesSince`; `sortByArrival` (antiguo primero, desempate por `pedidoId`); `sortListos` (más reciente primero según `listoAt` local, luego `pedidoId` desc); `tipoLabel`, `formatOrderNumber` (`#0476`), `formatClock`, `queueSummary`; `applyKitchenEvent(board, event)` inmutable que devuelve qué lista recargar.

## Conexión en vivo (`CocinaLive`)
`start()`/`stop()`; `status` (`connecting`/`connected`/`disconnected`); `connected$` (resync); `events$` validados. Token en `connectHeaders` recalculado en `beforeConnect`; se recicla la conexión si cambia el token; se detiene sin token; no abre socket sin `restauranteId` (plataforma). Cliente sustituible vía `COCINA_STOMP`.

## Comportamiento de la página
- Carga HTTP de cola y listos al iniciar y en cada (re)conexión (con `switchMap`, la última gana); aplica eventos con las reglas; los timers se refrescan cada 30 s.
- Encabezado con resumen y píldora: "En vivo · HH:mm:ss" / "Conectando…" / "Sin conexión · reintentando" (oscura con punto rojo, patrón `kUmH1`); botón "Pantalla completa" si el navegador lo soporta.
- Tarjetas con chip de urgencia (borde y color según nivel), ítems con cantidad, observaciones y botón "Marcar listo" que pasa a "Marcando…"; si falla, toast con `message` y recarga de la cola.
- Panel "Listos para salir" con "hace N min" solo para pedidos cuyo paso a LISTO vio el front (`listoAt` local); vacío sin texto propio; sin badge en el sidebar.
- `createdAt` se interpreta como hora local.

## Permisos y ruta
`cocina.ver` / `cocina.listo`: ADMINISTRADOR, RECEPCION, COCINERO. La ruta usa `moduleRoute('cocina.ver', 'Cocina', 'flame', [], load)` (conserva `routeActionGuard`) y **no** lleva `subscriptionGuard`. Dos tests de ruta lo fijan.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Lógica pura aislada y testeada (65 tests de cocina) | Sin prueba manual contra un backend real |
| Funciona aunque el socket no conecte (carga HTTP) | Payload y zona horaria de `createdAt` sin verificar |
| Cliente STOMP sustituible en tests | Dependencia nueva (`@stomp/*`) y `allowedCommonJsDependencies` |
| Un solo `URGENCY_THRESHOLDS` | "hace N min" se pierde al recargar (sin timestamp de LISTO) |

## Cómo extenderlo sin romperlo
- Reglas nuevas en `cocina.rules.ts` con test; la página solo orquesta.
- No añadas `subscriptionGuard` a `/cocina`.
- Si cambia la forma del evento, actualiza `parseCocinaEvent` y su spec.
- Nunca el token en la URL del WebSocket.
- El toggle de disponibilidad de productos pertenece a [[Catálogo]].
