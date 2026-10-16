---
title: Fases 4-9 - Planificadas
date: 2026-10-16
tags:
  - servidos
  - fases
  - planificado
aliases:
  - Fases futuras
  - Plan general
---

# Fases 4-9 — Planificadas

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Pedidos ya implementado en ramas: [[Fase 4 - Pedidos]] · Estado: [[Estado Actual]]

> [!abstract] Fuente
> `docs/progress/00-plan-general.md` (2026-10-02) y los cambios del backend del 2026-10-08. Salvo lo indicado en Pedidos y Catálogo, nada de esto está construido: hoy son rutas placeholder (`module-placeholder.page.ts`).

> [!warning] Numeración
> El plan general numeraba: 3 Restaurante, 4 Catálogo, 5 Pedidos, 6 Cocina, 7 Pagos, 8 Usuarios, 9 Plataforma. El usuario eligió Cocina primero, por lo que Cocina pasó a ser la fase 3 (ver [[Fase 3 - Cocina]]). Las fases siguientes no tienen renumeración oficial; aquí se mantiene el orden del plan general excluyendo Cocina.

## Restaurante ([[Restaurante]])
- **Objetivo**: ver restaurante y suscripción, cancelar (con contraseña) y paywall. El cambio de plan ya no es del tenant: pasó a [[Plataforma]] (backend §14).
- **Necesita diseño**: sí (`Efm03`, `m4qop`). **Decisión de negocio**: sí (paywall).
- **Cambios del backend** (verificados contra su código): sin `renovar()` ni cambio de plan del tenant, cancelar con contraseña, aviso "termina el {fechaFin}", `subscriptionGuard` por `fechaFin` (inclusiva, período de un mes calendario).
- **Tests previstos**: reglas de suscripción y guard.

## Catálogo ([[Catálogo]])
- Productos (paginado, por categoría), categorías, disponibilidad `DISPONIBLE/AGOTADO`. Diseño `hoW4s`, `i0YXQ`. Ya existe la acción de permiso, sin pantalla.
- **Avance**: la API de lectura (`GET /productos`, `GET /categorias`) ya existe en `feat/pedidos-03-alta-datos` (pendiente de merge) por necesidad del nuevo pedido. Falta la pantalla y la edición.

## Pedidos ([[Pedidos]]) — Fase 4, ver [[Fase 4 - Pedidos]]
- **v1 hecha en ramas locales, pendiente de merge**: lista (`/pedidos`, `QU3DR`) y nuevo pedido (`/pedidos/nuevo`, `Blp89`) con confirmar, avanzar (DELIVERY y `EN_ENTREGA`) y cancelar. Cadena de 4 PRs `stacked-to-main` más `fix/subscription-guard-vigencia`. Sin prueba manual ni specs de página.
- **Diferido**: tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`) y Cobrar (fase de Caja). El diseño `Ro7kZ`, listado en el plan original, no se usó en la v1.
- `GET /pedidos` **existe** (paginado, filtros por estado, fecha y `porCobrar`); no hay `GET /pedidos/{id}`.
- Tests: reglas de transición, MESA/`mesaId` y borrador del pedido (747 tests en total en la punta).

## Pagos ([[Pagos]])
- Registrar (EFECTIVO calcula vuelto) y reembolso con motivo. Diseño `P25cfL`, `tDcwg`.
- Cambios anunciados: reembolso cancela pedidos no entregados; pedido reembolsado no se cobra de nuevo.
- Tests previstos: vuelto/monto.

## Usuarios ([[Usuarios]])
- Crear con rol, cambiar rol, eliminar (409 por último ADMINISTRADOR). Diseño `VHQeZ`. **Bloqueo**: no existe `GET /usuarios`. Cambios anunciados: validaciones cross-tenant a 400.

## Plataforma ([[Plataforma]])
- Dashboard de plataforma paginado (SUPERADMIN, ADMIN y MODERADOR lo ven), crear restaurante **con su dueño** (§18; demo exige `demoDias` 1–30), detalle, renovar, cambiar plan, suspender o reactivar y alta de usuarios de plataforma. Diseño `x9DxqV`, `z8ZbK`. Permisos por rol en [[Modelo de Negocio]].

## Riesgos generales
- Cada módulo de escritura debe montar `subscriptionGuard` por el parámetro `guards` de `moduleRoute` (excepto operaciones permitidas aun con 402).
- La forma de los endpoints ya se verificó contra el código del backend (2026-10-16), pero no contra Swagger en ejecución. Ver [[API]] y [[Pendientes y Deuda Técnica]].
