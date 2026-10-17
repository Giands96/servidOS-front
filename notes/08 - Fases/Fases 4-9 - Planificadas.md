---
title: Fases 4-9 - Planificadas
date: 2026-10-17
tags:
  - servidos
  - fases
  - planificado
aliases:
  - Fases futuras
  - Plan general
---

# Fases 4-9 — Planificadas

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Pedidos ya mergeado en `main`: [[Fase 4 - Pedidos]] · Plataforma en `main`: [[Fase 5 - Plataforma]] · Catálogo en `main`: [[Fase 6 - Catálogo]] · Caja implementada en ramas locales: [[Fase 7 - Caja]] · Estado: [[Estado Actual]]

> [!abstract] Fuente
> `docs/progress/00-plan-general.md` (2026-10-02) y los cambios del backend del 2026-10-08. Salvo lo indicado en Pedidos, Catálogo, Plataforma y Pagos (Caja), nada de esto está construido: hoy son rutas placeholder (`module-placeholder.page.ts`).

> [!important] Plataforma y Catálogo en `main`; Caja implementada en ramas (2026-10-17)
> Un restaurante debe crearse desde la plataforma antes de poder probar en navegador cualquier pantalla del tenant (decisión del usuario, 2026-10-15). Plataforma 01 a 06 y Catálogo 01 a 03 ya están en `main` (`527e1e6`). Caja está implementada en tres ramas locales (punta `feat/caja-03-atajos`, 1108 tests); el reembolso está bloqueado por el backend. Orden: 1) prueba en navegador de Plataforma y del tenant (Cocina, Pedidos, Catálogo) con el restaurante creado; 2) publicar y mergear la cadena de Caja (21 → 22 → 23) y el tablero; 3) reembolso cuando el backend exponga el `pagoId`; 4) módulos restantes (Restaurante, Usuarios). Esto prima sobre el orden del plan general.

> [!warning] Numeración
> El plan general numeraba: 3 Restaurante, 4 Catálogo, 5 Pedidos, 6 Cocina, 7 Pagos, 8 Usuarios, 9 Plataforma. El usuario eligió Cocina primero, por lo que Cocina pasó a ser la fase 3 (ver [[Fase 3 - Cocina]]). Las fases siguientes no tienen renumeración oficial; aquí se mantiene el orden del plan general excluyendo Cocina.

## Restaurante ([[Restaurante]])
- **Objetivo**: ver restaurante y suscripción, cambiar plan (doble confirmación con contraseña), cancelar y paywall.
- **Necesita diseño**: sí (`Efm03`, `m4qop`). **Decisión de negocio**: sí (paywall).
- **Cambios anunciados** (sin verificar): sin `renovar()` del tenant, cancelar con contraseña, aviso "termina el {fechaFin}", `subscriptionGuard` por `fechaFin`.
- **Tests previstos**: reglas de suscripción y guard.

## Catálogo ([[Catálogo]]) — Fase 6, ver [[Fase 6 - Catálogo]]
- **Estado: en `main` (PRs #16 a #18, `527e1e6`).** Eran tres ramas apiladas (`acdd6de`, `e5a1a70`, `01bec53` y `98c7d10`); 26 archivos / 985 tests al cerrar la cadena, build OK, tres reviews aprobadas. Sin prueba en navegador.
- **Construido**: pantalla `/catalogo` según `hoW4s` (categorías con conteos, tabla, paginador), crear y editar producto (con URL de imagen opcional), crear categoría y el interruptor `DISPONIBLE`/`AGOTADO` (ADMINISTRADOR y COCINERO). La lectura de `GET /productos` y `GET /categorias` ya estaba en `main` (PR #11).
- **Huecos**: sin endpoint no hay eliminar ni renombrar o deshabilitar categorías, subida de imágenes ni búsqueda. La columna ESTADO no está en el diseño.
- **Siguiente**: probar en navegador.

## Pedidos ([[Pedidos]]) — Fase 4, ver [[Fase 4 - Pedidos]]
- **v1 mergeada en `main` (2026-10-15, PRs #8 a #12, `c66c3ff`)**: lista (`/pedidos`, `QU3DR`) y nuevo pedido (`/pedidos/nuevo`, `Blp89`) con confirmar, avanzar (DELIVERY y `EN_ENTREGA`) y cancelar, más `subscriptionGuard` según contrato §5. Sin prueba manual en navegador ni specs de página.
- **Diferido**: tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`; publicado en `feat/tablero-01-base` y `feat/tablero-02-tablero`, espera sus PR) y Cobrar (resuelto en la fase de Caja, ver abajo). El diseño `Ro7kZ`, listado en el plan original, no se usó en la v1.
- `GET /pedidos` **existe** (paginado, filtros por estado, fecha y `porCobrar`); no hay `GET /pedidos/{id}`.
- Tests: reglas de transición, MESA/`mesaId` y borrador del pedido (770 tests en total en `main`).

## Pagos ([[Pagos]]) — Fase 7, ver [[Fase 7 - Caja]]
- **Estado: cobro implementado en tres ramas locales, sin publicar (2026-10-17).** `feat/caja-01-datos` (`e0fa5ed`, `25642e5`), `feat/caja-02-pagina` (`14f394f`) y `feat/caja-03-atajos` (`3bdb24b`), apiladas sobre `main` (`527e1e6`); 28 archivos / 1108 tests, build OK, tres reviews aprobadas. Sin prueba en navegador.
- **Construido**: cliente `POST /pagos`, reglas del cobro (efectivo con vuelto, atajos de monto, errores), pantalla `/caja` según `P25cfL` (lista "Por cobrar" y formulario con seis métodos) y botón "Cobrar S/ …" en la lista de pedidos. `pagos.registrar` pasa de solo ADMINISTRADOR a ADMINISTRADOR, RECEPCION y CAJERO (contrato §3); el home de CAJERO es `/caja`.
- **Huecos**: el **reembolso está bloqueado por el backend**: `POST /pagos/{id}/reembolso` necesita el `pagoId` y ninguna lectura lo expone (solicitud en `docs/backend/pago-id-en-pedidos.md`). El chip "Cobrar S/ …" del tablero espera el merge del tablero. Sin endpoint: cierre/arqueo, historial y pagos parciales.
- Cambios anunciados: reembolso cancela pedidos no entregados; pedido reembolsado no se cobra de nuevo (la lista y el atajo ya no ofrecen pedidos cobrados).
- **Siguiente**: publicar y mergear la cadena (21 → 22 → 23), probar en navegador y, con el `pagoId`, el modal de reembolso `tDcwg`.

## Usuarios ([[Usuarios]])
- Crear con rol, cambiar rol, eliminar (409 por último ADMINISTRADOR). Diseño `VHQeZ`. **Bloqueo**: no existe `GET /usuarios`. Cambios anunciados: validaciones cross-tenant a 400.

## Plataforma ([[Plataforma]]) — Fase 5, ver [[Fase 5 - Plataforma]]
- **Estado: 01 a 06 en `main` (PR #13 de GitHub, `5e8b272`, y PR #14, `f7112e6`, cuenta del dueño).** Sin prueba en navegador.
- **Por qué fue primero**: sin poder crear un restaurante desde la plataforma no se puede probar en navegador ninguna pantalla del tenant (Cocina, Pedidos). Las credenciales de plataforma de desarrollo existen en la configuración del backend (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); no se documentan en estas notas.
- **Construido**: lista SUPERADMIN paginada con panel de detalle (`x9DxqV`), alta de restaurante (`z8ZbK`; `demo` exige `demoDias` 1–30) y acciones Renovar, Cambiar plan y Suspender/Reactivar.
- **Huecos**: gestionar usuarios de plataforma (sin `GET /usuarios`). El ADMINISTRADOR del tenant ya se crea en el alta del restaurante (T5.7).
- **Siguiente**: probar en navegador las pantallas de plataforma y del tenant.

## Riesgos generales
- Cada módulo de escritura debe montar `subscriptionGuard` por el parámetro `guards` de `moduleRoute` (excepto operaciones permitidas aun con 402).
- Forma de varios endpoints sin verificar contra Swagger. Ver [[API]] y [[Pendientes y Deuda Técnica]].
