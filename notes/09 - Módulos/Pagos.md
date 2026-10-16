---
title: Pagos
date: 2026-10-16
tags:
  - servidos
  - modulos
  - pagos
  - pendiente
aliases:
  - Módulo Pagos
  - Caja
---

# Pagos (Caja)

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Cobrar pedidos y reembolsar. Estado: **placeholder** (`/caja`, acción `pagos.registrar`).

## Archivos
Solo la ruta en `src/app/app.routes.ts`. Sin carpeta de feature.

## API (plan)
`POST /pagos` (`pedidoId`, `metodoPago`, `montoEntregado?`, `referenciaExterna?`), `POST /pagos/{id}/reembolso` (`motivo` obligatorio; respuesta incluye `reembolsoMotivo` y `reembolsoUsuarioId`).

## Reglas previstas
EFECTIVO calcula vuelto con `montoEntregado`; solo ese método lo usa. Anti-doble-pago. Verificado contra el código del backend:
- Solo se reembolsa un pago `PAGADO`: mostrar "Reembolsar" solo si `estadoPago` es `PAGADO`.
- El reembolso cancela el pedido si no está `ENTREGADO`.
- Un pedido reembolsado no se cobra de nuevo: ocultar "Cobrar" si `estadoPago` no es `null`.
- Un pedido pagado no se cancela; se reembolsa.
- Ambos endpoints funcionan con el restaurante bloqueado (402).
- Para la caja: `GET /pedidos?porCobrar=true` trae los pedidos no cancelados que nunca se cobraron.

## Permisos
Backend (2026-10-09): cobrar = ADMINISTRADOR, RECEPCION y CAJERO; reembolsar = ADMINISTRADOR y RECEPCION. En el front `pagos.registrar` sigue solo en ADMINISTRADOR: al alinearlo, RECEPCION y CAJERO verán `/caja`, y se cierra la deuda "RECEPCION reembolsa pero no ve caja".

## Ventajas y desventajas (previsto)
| Ventajas | Desventajas |
|---|---|
| Acciones separadas cobrar/reembolsar | Matriz asimétrica entre menú y permisos |
| Auditoría de reembolso en la respuesta | El listado de pedidos "por cobrar" aún no está en el front (`GET /pedidos?porCobrar=` existe; llega con la fase de Caja) |

## Cómo extenderlo
`features/pagos/{data,domain}` con reglas de vuelto/monto probadas; no confiar en montos del cliente; confirmar diseño (`P25cfL`, `tDcwg`) con el usuario.
