---
title: Pedidos
date: 2026-10-08
tags:
  - servidos
  - modulos
  - pedidos
  - pendiente
aliases:
  - Módulo Pedidos
---

# Pedidos

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[Flujo del Sistema]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Crear pedidos (MESA, DELIVERY, RECOJO), confirmarlos (mandar a preparar), cambiar estado y entregar. Estado: **placeholder** (ruta `/pedidos/nuevo` con `pedidos.gestionar`, página "Módulo en construcción"). Es el home de ADMINISTRADOR y RECEPCION.

## Archivos
Solo `src/app/app.routes.ts` (ruta). No hay carpeta `features/pedidos`. Tipos `TipoPedido` y `EstadoPedido` están por ahora en `features/cocina/cocina.types.ts`.

## API (plan)
`POST /pedidos`, `POST /pedidos/{id}/confirmar`, `PATCH /pedidos/{id}/estado`. **No existe `GET /pedidos`** (bloquea tablero y lista).

## Reglas de dominio previstas
`MESA` exige `mesaId`; el backend calcula precios; `AGOTADO` da 400; transiciones y cancelación según [[Modelo de Negocio]]. Anunciado sin verificar: DELIVERY `EN_ENTREGA` a `CANCELADO` si no pagado; `ENTREGADO` sin pago válido; `mesaId` de otro restaurante da 400.

## Permisos
`pedidos.gestionar`: ADMINISTRADOR, RECEPCION. Estas operaciones se permiten aun con 402 (anunciado §5): `PATCH estado` y `confirmar` no deberían llevar `subscriptionGuard`; `POST /pedidos` es escritura normal.

## Ventajas y desventajas (diseño previsto)
| Ventajas | Desventajas |
|---|---|
| Reglas en `domain` testeables | Sin listado en el backend no hay tablero real |
| Tipos compartidos con cocina | Hoy los tipos viven en cocina: moverlos a un lugar común cuando el módulo exista |

## Cómo extenderlo
Crear `features/pedidos/{data,domain}`, reutilizar los tipos (o moverlos a un archivo compartido sin romper cocina), sustituir el `load` de `moduleRoute` y confirmar con el usuario el diseño (`Blp89`, `EGPHx`, `QU3DR`).
