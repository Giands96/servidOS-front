---
title: Pagos
date: 2026-10-08
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
EFECTIVO calcula vuelto con `montoEntregado`; solo ese método lo usa. Anti-doble-pago. Anunciado sin verificar: reembolso cancela el pedido si no está `ENTREGADO`; un pedido reembolsado no se cobra de nuevo (ocultar "Cobrar"); ambos endpoints se permiten con 402.

## Permisos
`pagos.registrar`: solo ADMINISTRADOR. `pagos.reembolsar`: ADMINISTRADOR y RECEPCION (la ruta `/caja` solo exige `pagos.registrar`, así RECEPCION no vería la pantalla aunque pueda reembolsar: decisión de UX pendiente de definir).

## Ventajas y desventajas (previsto)
| Ventajas | Desventajas |
|---|---|
| Acciones separadas cobrar/reembolsar | Matriz asimétrica entre menú y permisos |
| Auditoría de reembolso en la respuesta | Sin listado de pedidos "por cobrar" (`GET /pedidos` no existe) |

## Cómo extenderlo
`features/pagos/{data,domain}` con reglas de vuelto/monto probadas; no confiar en montos del cliente; confirmar diseño (`P25cfL`, `tDcwg`) con el usuario.
