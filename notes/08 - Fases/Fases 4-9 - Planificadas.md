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

Volver: [[00 - MOC]] · Anterior: [[Fase 3 - Cocina]] · Pedidos v1 en `main`, tablero (Fase 4b) en ramas locales: [[Fase 4 - Pedidos]] · Plataforma en `main`: [[Fase 5 - Plataforma]] · Catálogo 01 y 02 en `main`, 03 pendiente: [[Fase 6 - Catálogo]] · Estado: [[Estado Actual]]

> [!abstract] Fuente
> `docs/progress/00-plan-general.md` (2026-10-02) y los cambios del backend del 2026-10-08. Salvo lo indicado en Pedidos, Catálogo y Plataforma, nada de esto está construido: hoy son rutas placeholder (`module-placeholder.page.ts`).

> [!important] Plataforma y Catálogo 01-02 en `main`; tablero de Pedidos en ramas (2026-10-16)
> Un restaurante debe crearse desde la plataforma antes de poder probar en navegador cualquier pantalla del tenant (decisión del usuario, 2026-10-15). Plataforma 01 a 06 ya está en `main` (PRs #13 y #14 de GitHub; `main` en `fdd9c50`), así que esa prueba ya es posible y **no se ha hecho**. Catálogo 01 y 02 también están en `main` (#16 y #17); falta Catálogo 03, que debe reubicarse sobre `main`. El tablero de Pedidos está implementado en dos ramas locales (punta `335ef1e`, 1087 tests). Orden: 1) probar en navegador las pantallas de Plataforma y crear un restaurante; 2) mergear Catálogo 03 y el tablero de Pedidos; 3) prueba en navegador de Cocina, Pedidos (con el tablero, incluido touch) y Catálogo; 4) módulos restantes (Restaurante, Cobrar de Pedidos, Pagos/Caja, Usuarios). Esto prima sobre el orden del plan general.

> [!warning] Numeración
> El plan general numeraba: 3 Restaurante, 4 Catálogo, 5 Pedidos, 6 Cocina, 7 Pagos, 8 Usuarios, 9 Plataforma. El usuario eligió Cocina primero, por lo que Cocina pasó a ser la fase 3 (ver [[Fase 3 - Cocina]]). Las fases siguientes no tienen renumeración oficial; aquí se mantiene el orden del plan general excluyendo Cocina.

## Restaurante ([[Restaurante]])
- **Objetivo**: ver restaurante y suscripción, cambiar plan (doble confirmación con contraseña), cancelar y paywall.
- **Necesita diseño**: sí (`Efm03`, `m4qop`). **Decisión de negocio**: sí (paywall).
- **Cambios anunciados** (sin verificar): sin `renovar()` del tenant, cancelar con contraseña, aviso "termina el {fechaFin}", `subscriptionGuard` por `fechaFin`.
- **Tests previstos**: reglas de suscripción y guard.

## Catálogo ([[Catálogo]]) — Fase 6, ver [[Fase 6 - Catálogo]]
- **Estado: 01 y 02 en `main` desde el 2026-10-16 (PRs #16 y #17 de GitHub, `main` en `fdd9c50`); 03 pendiente en GitHub.** `feat/catalogo-03-formularios` (`98c7d10`) debe reubicarse sobre `main` antes de su review. Tres reviews aprobadas. Sin prueba en navegador.
- **Construido**: pantalla `/catalogo` según `hoW4s` (categorías con conteos, tabla, paginador), crear y editar producto (con URL de imagen opcional), crear categoría y el interruptor `DISPONIBLE`/`AGOTADO` (ADMINISTRADOR y COCINERO). La lectura de `GET /productos` y `GET /categorias` ya estaba en `main` (PR #11).
- **Huecos**: sin endpoint no hay eliminar ni renombrar o deshabilitar categorías, subida de imágenes ni búsqueda. La columna ESTADO no está en el diseño.
- **Siguiente**: reubicar y mergear Catálogo 03 (18 en `docs/prs`) y probar en navegador.

## Pedidos ([[Pedidos]]) — Fase 4, ver [[Fase 4 - Pedidos]]
- **v1 mergeada en `main` (2026-10-15, PRs #8 a #12, `c66c3ff`)**: lista (`/pedidos`, `QU3DR`) y nuevo pedido (`/pedidos/nuevo`, `Blp89`) con confirmar, avanzar (DELIVERY y `EN_ENTREGA`) y cancelar, más `subscriptionGuard` según contrato §5. Sin prueba manual en navegador ni specs de página.
- **Tablero kanban (Fase 4b, 2026-10-16)**: implementado en dos ramas locales apiladas, sin publicar: `feat/tablero-01-base` (`8bae4e3`: reglas y `@angular/cdk`, aprobado como ADR-20) y `feat/tablero-02-tablero` (`335ef1e`: tablero, arrastre y menú). 27 archivos / 1087 tests, build OK, dos reviews aprobadas. Diseños `EGPHx`, `Sd7pI`, `zFAgh`. Sin ítems en la tarjeta, tiempo en la etapa, presencia ni sincronización en vivo (el backend no los ofrece). No se probó con touch ni contra el backend real. Detalle en [[Fase 4 - Pedidos]].
- **Diferido**: Cobrar y Anular con reembolso (fase de Caja). El diseño `Ro7kZ`, listado en el plan original, no se usó en la v1.
- `GET /pedidos` **existe** (paginado, filtros por estado, fecha y `porCobrar`); no hay `GET /pedidos/{id}`.
- Tests: reglas de transición, MESA/`mesaId`, borrador del pedido y reglas del tablero (770 tests en `main` en `c66c3ff`; 1087 en la punta del tablero).

## Pagos ([[Pagos]])
- Registrar (EFECTIVO calcula vuelto) y reembolso con motivo. Diseño `P25cfL`, `tDcwg`.
- Cambios anunciados: reembolso cancela pedidos no entregados; pedido reembolsado no se cobra de nuevo.
- Tests previstos: vuelto/monto.

## Usuarios ([[Usuarios]])
- Crear con rol, cambiar rol, eliminar (409 por último ADMINISTRADOR). Diseño `VHQeZ`. **Bloqueo**: no existe `GET /usuarios`. Cambios anunciados: validaciones cross-tenant a 400.

## Plataforma ([[Plataforma]]) — Fase 5, ver [[Fase 5 - Plataforma]]
- **Estado: 01 a 06 en `main` desde el 2026-10-16 (PR #13 de GitHub, `5e8b272`, y PR #14, `f7112e6`, cuenta del dueño).** Sin prueba en navegador.
- **Por qué fue primero**: sin poder crear un restaurante desde la plataforma no se puede probar en navegador ninguna pantalla del tenant (Cocina, Pedidos). Las credenciales de plataforma de desarrollo existen en la configuración del backend (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); no se documentan en estas notas.
- **Construido**: lista SUPERADMIN paginada con panel de detalle (`x9DxqV`), alta de restaurante (`z8ZbK`; `demo` exige `demoDias` 1–30) y acciones Renovar, Cambiar plan y Suspender/Reactivar.
- **Huecos**: gestionar usuarios de plataforma (sin `GET /usuarios`). El ADMINISTRADOR del tenant ya se crea en el alta del restaurante (T5.7).
- **Siguiente**: probar en navegador las pantallas de plataforma y del tenant.

## Riesgos generales
- Cada módulo de escritura debe montar `subscriptionGuard` por el parámetro `guards` de `moduleRoute` (excepto operaciones permitidas aun con 402).
- Forma de varios endpoints sin verificar contra Swagger. Ver [[API]] y [[Pendientes y Deuda Técnica]].
