---
title: Fases 4-9 - Planificadas
date: 2026-10-15
tags:
  - servidos
  - fases
  - planificado
aliases:
  - Fases futuras
  - Plan general
---

# Fases 4-9 — Planificadas

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Pedidos ya mergeado en `main`: [[Fase 4 - Pedidos]] · Estado: [[Estado Actual]]

> [!abstract] Fuente
> `docs/progress/00-plan-general.md` (2026-10-02) y los cambios del backend del 2026-10-08. Salvo lo indicado en Pedidos y Catálogo, nada de esto está construido: hoy son rutas placeholder (`module-placeholder.page.ts`).

> [!important] Siguiente fase: Plataforma (decisión del usuario, 2026-10-15)
> Un restaurante debe crearse desde la plataforma antes de poder probar en navegador cualquier pantalla del tenant. Orden acordado: 1) **Plataforma**; 2) prueba en navegador de Cocina y Pedidos; 3) módulos restantes (Restaurante, pantallas de Catálogo, kanban de Pedidos y Cobrar, Pagos/Caja, Usuarios). Esto prima sobre el orden del plan general.

> [!warning] Numeración
> El plan general numeraba: 3 Restaurante, 4 Catálogo, 5 Pedidos, 6 Cocina, 7 Pagos, 8 Usuarios, 9 Plataforma. El usuario eligió Cocina primero, por lo que Cocina pasó a ser la fase 3 (ver [[Fase 3 - Cocina]]). Las fases siguientes no tienen renumeración oficial; aquí se mantiene el orden del plan general excluyendo Cocina.

## Restaurante ([[Restaurante]])
- **Objetivo**: ver restaurante y suscripción, cambiar plan (doble confirmación con contraseña), cancelar y paywall.
- **Necesita diseño**: sí (`Efm03`, `m4qop`). **Decisión de negocio**: sí (paywall).
- **Cambios anunciados** (sin verificar): sin `renovar()` del tenant, cancelar con contraseña, aviso "termina el {fechaFin}", `subscriptionGuard` por `fechaFin`.
- **Tests previstos**: reglas de suscripción y guard.

## Catálogo ([[Catálogo]])
- Productos (paginado, por categoría), categorías, disponibilidad `DISPONIBLE/AGOTADO`. Diseño `hoW4s`, `i0YXQ`. Ya existe la acción de permiso, sin pantalla.
- **Avance**: la API de lectura (`GET /productos`, `GET /categorias`) ya está en `main` (PR #11), por necesidad del nuevo pedido. Falta la pantalla y la edición.

## Pedidos ([[Pedidos]]) — Fase 4, ver [[Fase 4 - Pedidos]]
- **v1 mergeada en `main` (2026-10-15, PRs #8 a #12, `c66c3ff`)**: lista (`/pedidos`, `QU3DR`) y nuevo pedido (`/pedidos/nuevo`, `Blp89`) con confirmar, avanzar (DELIVERY y `EN_ENTREGA`) y cancelar, más `subscriptionGuard` según contrato §5. Sin prueba manual en navegador ni specs de página.
- **Diferido**: tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`) y Cobrar (fase de Caja). El diseño `Ro7kZ`, listado en el plan original, no se usó en la v1.
- `GET /pedidos` **existe** (paginado, filtros por estado, fecha y `porCobrar`); no hay `GET /pedidos/{id}`.
- Tests: reglas de transición, MESA/`mesaId` y borrador del pedido (770 tests en total en `main`).

## Pagos ([[Pagos]])
- Registrar (EFECTIVO calcula vuelto) y reembolso con motivo. Diseño `P25cfL`, `tDcwg`.
- Cambios anunciados: reembolso cancela pedidos no entregados; pedido reembolsado no se cobra de nuevo.
- Tests previstos: vuelto/monto.

## Usuarios ([[Usuarios]])
- Crear con rol, cambiar rol, eliminar (409 por último ADMINISTRADOR). Diseño `VHQeZ`. **Bloqueo**: no existe `GET /usuarios`. Cambios anunciados: validaciones cross-tenant a 400.

## Plataforma ([[Plataforma]]) — SIGUIENTE fase
- **Por qué va ahora**: sin poder crear un restaurante desde la plataforma no se puede probar en navegador ninguna pantalla del tenant (Cocina, Pedidos). Las credenciales de plataforma de desarrollo existen en la configuración del backend (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); no se documentan en estas notas.
- Dashboard SUPERADMIN paginado, crear restaurante (demo exige `demoDias` 1–30), detalle. Diseño `x9DxqV`, `z8ZbK`.

## Riesgos generales
- Cada módulo de escritura debe montar `subscriptionGuard` por el parámetro `guards` de `moduleRoute` (excepto operaciones permitidas aun con 402).
- Forma de varios endpoints sin verificar contra Swagger. Ver [[API]] y [[Pendientes y Deuda Técnica]].
