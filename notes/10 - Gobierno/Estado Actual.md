---
title: Estado Actual
date: 2026-10-17
tags:
  - servidos
  - gobierno
  - estado
aliases:
  - Qué está hecho
---

# Estado Actual

Volver: [[00 - MOC]] · Pendientes: [[Pendientes y Deuda Técnica]] · Fases: [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] · [[Fase 5 - Plataforma]] · [[Fase 6 - Catálogo]] · [[Fase 7 - Caja]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Foto al 2026-10-17
> Rama principal `main` en `527e1e6`. **Fases 0 a 6 en `main`**: Cocina, Pedidos, Plataforma 01 a 06 (cuenta del dueño, #14) y Catálogo 01 a 03 (#16 a #18), más las notas del Vault (#15). **Fase 7 (Caja) implementada en tres ramas locales apiladas sobre `main`, sin publicar** (punta `feat/caja-03-atajos`: 28 archivos / 1108 tests, build OK); el reembolso está **bloqueado por el backend** (falta el `pagoId`). El tablero de pedidos (`feat/tablero-01-base` y `feat/tablero-02-tablero`) está publicado y espera sus PR. Ningún módulo se probó aún en navegador.

## Hecho
| Área | Estado | Referencia |
|---|---|---|
| Infra (SPA, strict, proxy, tipos, testing helpers) | completo | [[Fase 0 - Infra]] |
| Auth núcleo (sesión, interceptores, guards, permisos) | completo | [[Fase 1 - Core Auth]] |
| Login, shell, tokens, fuentes, páginas de estado, paywall | completo | [[Fase 2 - Login y Shell]] |
| Menú derivado de rutas, `moduleRoute` con guards extra | completo | [[Arquitectura]] |
| Dependencia `@stomp/rx-stomp` | aprobada y commiteada (`00c94dd`) | [[Decisiones (ADR)]] |
| Paywall: pago manual por Yape + confirmación por WhatsApp (sin `renovar()`); el tenant no renueva ni cambia de plan | implementado; el dueño debe configurar número y QR | [[Restaurante]] · `docs/progress/06-paywall-pago-manual.md` |
| Cocina: tipos, API, reglas, cliente STOMP, página y ruta | en `main` (`8591b8c`, `7087023`, `6790b8d`, `2fad5cb`); sin prueba manual | [[Cocina]] · [[Fase 3 - Cocina]] |
| `subscriptionGuard` según contrato §5 (`/auth/me`: INACTIVO, sin suscripción o vencida) | en `main`: PR #8 (`2b812b0`) | [[Pedidos]] |
| Pedidos: API y reglas de transición | en `main`: PR #9 (`04b462f`) | [[Pedidos]] · [[Fase 4 - Pedidos]] |
| Pedidos: página de la lista (`/pedidos`) | en `main`: PR #10 (`87f0cd9`) | [[Pedidos]] |
| Catálogo: API de lectura (`GET /productos`, `GET /categorias`) y reglas del nuevo pedido | en `main`: PR #11 (`40930c5`) | [[Catálogo]] |
| Pedidos: página de nuevo pedido (`/pedidos/nuevo`) | en `main`: PR #12 (`c66c3ff`) | [[Pedidos]] · `docs/progress/07-fase-4-pedidos.md` |
| Plataforma 01 a 05: datos, reglas, lista con panel, alta y acciones (Renovar, Cambiar plan, Suspender/Reactivar) | en `main`: PR #13 de GitHub (`5e8b272`); sin prueba en navegador | [[Plataforma]] · [[Fase 5 - Plataforma]] · `docs/progress/08-fase-5-plataforma.md` |
| Plataforma 06: cuenta del dueño en el alta, asistente de dos pasos | en `main`: PR #14 (`f7112e6`); sin prueba en navegador | [[Plataforma]] · [[Fase 5 - Plataforma]] |
| Catálogo: escrituras y reglas, página `/catalogo` y modales de producto y categoría | en `main`: PRs #16 (`27b231e`), #17 (`fdd9c50`) y #18 (`527e1e6`); sin prueba en navegador | [[Catálogo]] · [[Fase 6 - Catálogo]] · `docs/progress/09-fase-6-catalogo.md` |
| Caja: cliente de pagos, `pagos.registrar` para ADMINISTRADOR, RECEPCION y CAJERO, home de CAJERO = `/caja` y reglas del cobro (`feat/caja-01-datos`, `e0fa5ed` y `25642e5`) | implementada en rama local, sin publicar; el cambio de roles es de riesgo alto | [[Pagos]] · [[Fase 7 - Caja]] |
| Caja: página `/caja` con lista "Por cobrar" y formulario de cobro (`feat/caja-02-pagina`, `14f394f`) | implementada en rama local, sin publicar; sin prueba en navegador | [[Pagos]] |
| Caja: botón "Cobrar S/ …" en la lista de pedidos (`feat/caja-03-atajos`, `3bdb24b`) | implementada en rama local, sin publicar; el chip del tablero espera el merge del tablero | [[Pagos]] · `docs/progress/11-fase-7-caja.md` |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger y zona horaria de `createdAt`.

## Pendiente de Pedidos
Prueba manual en navegador con backend; aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación hecha por la plataforma; tablero kanban; Cobrar (fase de Caja). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Plataforma
Prueba en navegador de todas las pantallas, incluido el asistente y el login real del dueño; Escape para cerrar panel y modal; partir `restaurantes.page.ts` (847 líneas). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Catálogo
Prueba en navegador de la pantalla y los modales con ADMINISTRADOR, COCINERO y RECEPCION; decidir el cierre del modal durante un guardado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 6 - Catálogo]].

## Pendiente de Caja
Publicar y mergear la cadena 21 → 22 → 23 (squash, reubicando cada rama sobre `main`); agregar el chip "Cobrar S/ …" al tablero tras mergear el tablero (T8.4b); prueba en navegador con ADMINISTRADOR, RECEPCION y CAJERO; **reembolso bloqueado: el backend debe exponer el `pagoId` en las filas de `GET /pedidos`** (`docs/backend/pago-id-en-pedidos.md`). Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 7 - Caja]].

## Tests
- **`main` (`527e1e6`)**: incluye Catálogo 01 a 03; los totales exactos de `main` no se midieron en esta actualización (la última medición registrada es de `c66c3ff`: 21 archivos / 770 tests). Ver [[Testing]].
- **Punta de la cadena de Catálogo antes de mergear (`98c7d10`)**: 26 archivos / 985 tests en verde; `npx ng build` OK.
- **Punta de la cadena de Caja (`feat/caja-03-atajos`, `3bdb24b`)**: **28 archivos / 1108 tests en verde**; `npx ng build` OK. No es el estado de `main`.
- En el merge de Pedidos se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna ahora cada campo de forma explícita en lugar de `...overrides`, con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).

## Decisiones recientes
- `homeFor` de ADMINISTRADOR y RECEPCION es `/pedidos` (la lista, sin `subscriptionGuard`; `3598eb0`). Decisión cerrada.
- **Plan (decisión del usuario, 2026-10-15):** la siguiente fase era **Plataforma**, porque hay que poder crear un restaurante desde la plataforma antes de probar en navegador cualquier pantalla del tenant. Plataforma 01 a 06 ya está en `main`. El backend ya tiene credenciales de plataforma de desarrollo (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); se consultan allí, no se documentan aquí.
- **Caja (decisión del usuario, 2026-10-16):** plan aprobado; el reembolso espera a que el backend exponga el `pagoId`. `pagos.registrar` pasa de solo ADMINISTRADOR a ADMINISTRADOR, RECEPCION y CAJERO según el contrato §3, y el home de CAJERO es `/caja`. Detalle en [[Fase 7 - Caja]].
- **Alcance de Plataforma (decisión del usuario, 2026-10-15): "Diseño + acciones"** (lista, alta y acciones Renovar, Cambiar plan y Suspender/Reactivar). Los defaults del orquestador están en [[Fase 5 - Plataforma]].
- **ADMINISTRADOR del tenant**: resuelto en T5.7 (`c6085d9`): el alta del restaurante crea también la cuenta del dueño, en un asistente de dos pasos.

## Qué sigue
1. **Probar en navegador** las pantallas de [[Plataforma]] (crear un restaurante con su dueño) y luego las del tenant (Cocina, Pedidos y Catálogo) con ese restaurante.
2. **Publicar y mergear la cadena de Caja** (21 → 22 → 23 en `docs/prs`): [[Pagos]] · [[Fase 7 - Caja]]. Después, el chip "Cobrar S/ …" del tablero (T8.4b) una vez mergeado el tablero.
3. **Pedir al backend el `pagoId` en las filas de `GET /pedidos`** (`docs/backend/pago-id-en-pedidos.md`) para desbloquear el reembolso.
4. Cerrar Cocina (prueba manual, Swagger, zona horaria de `createdAt`).
5. Módulos restantes: Restaurante, reembolso (Pagos) y Usuarios (bloqueado: no existe `GET /usuarios`). Los cambios de suscripción anunciados que siguen abiertos están en [[Pendientes y Deuda Técnica]].

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/caja.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
