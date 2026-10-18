---
title: Pagos
date: 2026-10-17
tags:
  - servidos
  - modulos
  - pagos
  - parcial
aliases:
  - Módulo Pagos
  - Caja
---

# Pagos (Caja)

Volver: [[00 - MOC]] · Fase: [[Fase 7 - Caja]] · Ver [[Modelo de Negocio]] · [[API]] · [[Pedidos]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Cobrar pedidos desde la pantalla `/caja` (acción `pagos.registrar`). El reembolso queda pendiente.

> [!warning] Estado: cobro publicado en tres ramas, PRs pendientes de merge (2026-10-17); reembolso bloqueado
> `feat/caja-01-datos` (datos, permisos y reglas), `feat/caja-02-pagina` (página `/caja`) y `feat/caja-03-atajos` (botón "Cobrar" en la lista de pedidos), apiladas sobre `main` (`527e1e6`): 28 archivos / 1108 tests, build OK, sin prueba en navegador. **El reembolso no está implementado:** `POST /pagos/{id}/reembolso` necesita el `pagoId` y ninguna lectura lo expone (ver más abajo).

## Archivos
| Ruta | Contenido |
|---|---|
| `features/pagos/pagos.types.ts` | `MetodoPago`, `EstadoPagoRegistro`, `RegistrarPagoRequest`, `Pago` |
| `features/pagos/data/pagos.api.ts` | `PagosApi.registrar` → `POST /pagos` (omite los opcionales no definidos; `0` es un valor) |
| `features/pagos/domain/caja.rules.ts` | métodos, `parseMonto`, validación del efectivo, vuelto, atajos de monto, petición, errores 400/422, vistas y `parsePedidoParam` |
| `features/pagos/caja.page.ts` | lista "Por cobrar", formulario de cobro y "Último pago" (solo orquesta) |
| `features/pedidos/domain/pedidos.rules.ts` | `isCobrable` y `cobrarLabel` (atajo de la lista) |

## API
- `POST /pagos` (`pedidoId`, `metodoPago`, `montoEntregado?`, `referenciaExterna?` ≤ 100) → 201 `PagoResponse` (`pagoId, pedidoId, monto, vuelto, metodoPago, estado, reembolsoMotivo, reembolsoUsuarioId`). **El `monto` no va en la petición**: sale del pedido. 400 "Pedido inexistente, ya pagado o monto insuficiente" (también cancelado o reembolsado, según el contrato), 403, 422 `campo: mensaje`.
- `GET /pedidos?porCobrar=true`: alimenta la lista "Por cobrar" (no cancelados y nunca cobrados, en cualquier estado).
- `POST /pagos/{id}/reembolso` (`motivo` obligatorio): **sin cliente en el front** hasta tener el `pagoId`.

## Permisos
| Acción | Roles |
|---|---|
| `pagos.registrar` | ADMINISTRADOR, **RECEPCION y CAJERO** (antes solo ADMINISTRADOR; cambio de la rama `feat/caja-01-datos`, según `FRONTEND_CONTEXT` §3) |
| `pagos.reembolsar` | ADMINISTRADOR y RECEPCION |

- La ruta `/caja` exige `pagos.registrar` y **no lleva `subscriptionGuard`**: `POST /pagos` pasa con el tenant bloqueado (contrato §5).
- **Home de CAJERO = `/caja`** (antes `/sin-modulos`); su menú muestra Caja y Catálogo. RECEPCION y ADMINISTRADOR conservan `/pedidos`, y RECEPCION gana la entrada Caja en el menú.

## Comportamiento de la pantalla
- Lista "POR COBRAR · n" con tarjetas seleccionables (tipo, número, estado, total) y "Actualizar" manual; `?pedido=ID` selecciona ese pedido en la primera carga.
- Formulario "Cobrar pedido #N · Mesa X": "Total a cobrar", observación (no hay ítems en la fila de `GET /pedidos`), seis métodos (Efectivo, Tarjeta crédito, Tarjeta débito, Yape, Plin, Otros).
- **Efectivo:** "Monto entregado", vuelto en vivo (vista previa; manda el del servidor), atajos derivados del total y botón deshabilitado mientras lo entregado no cubra el total. **Otros métodos:** "N.º de voucher u operación", opcional.
- Tras el cobro: aviso con el vuelto del servidor, el pedido sale de la lista y el pie muestra "Último pago". Los errores del backend se muestran tal cual.
- Atajo "Cobrar S/ …" en las filas sin cobrar de la lista de `/pedidos` (solo con `pagos.registrar`). El mismo chip en las tarjetas del tablero (T8.4b) espera el merge del tablero.

## Reglas
- Efectivo calcula vuelto con `montoEntregado`; solo ese método lo usa. Los montos se comparan en céntimos.
- Cobrar **no cambia el estado** del pedido; un pedido pagado no se puede cancelar; `ENTREGADO` sin pago es válido.
- Anunciado sin verificar: el reembolso cancela el pedido si no está `ENTREGADO` y un pedido reembolsado no se cobra de nuevo (400).

## Reembolso: bloqueado por el backend
`POST /pagos/{id}/reembolso` necesita el `pagoId`, pero `GET /pedidos` solo devuelve `estadoPago` y no existe `GET /pagos` ni `GET /pedidos/{id}`. El front solo conoce el `pagoId` en la respuesta 201 de `POST /pagos`, así que no puede reembolsar un cobro hecho antes, en otra sesión o por otro usuario.

- **Solicitud al backend:** agregar a cada fila de `GET /pedidos` un resumen `pago { pagoId, metodoPago, monto, referenciaExterna }` (`null` si nunca se cobró). Especificación completa en `docs/backend/pago-id-en-pedidos.md`.
- **Cuando exista:** modal `tDcwg` con motivo obligatorio, enlace "Reembolsar" en Caja (ADMINISTRADOR y RECEPCION; el texto "Solo un administrador" del diseño se ajusta) y "Anular con reembolso" en el tablero (`Sd7pI`, `zFAgh`). Verificar antes contra `/v3/api-docs`.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas del cobro y del dinero en `domain`, testeadas (pagos 61 tests) | La página no tiene spec (AGENTS §6) ni prueba en navegador |
| El backend toma el monto del pedido; el front no envía montos | Sin reembolso hasta que el backend exponga el `pagoId` |
| Cobro disponible con el tenant bloqueado, según el contrato | La lista "Por cobrar" no pagina (`size=100`) |
| Roles alineados con el contrato (RECEPCION y CAJERO) | Si un 402 llegara a `pagos`, el interceptor redirigiría al paywall |

## Cómo extenderlo
- Reglas nuevas en `features/pagos/domain` con test; la página solo orquesta.
- No confiar en montos del cliente ni enviar `monto`.
- No añadir `subscriptionGuard` a `/caja`.
- Reembolso: esperar el `pagoId` (ver arriba) y confirmar el diseño `tDcwg` con el usuario.
