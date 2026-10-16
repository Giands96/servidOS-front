---
title: Estado Actual
date: 2026-10-16
tags:
  - servidos
  - gobierno
  - estado
aliases:
  - Qué está hecho
---

# Estado Actual

Volver: [[00 - MOC]] · Pendientes: [[Pendientes y Deuda Técnica]] · Fases: [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] · [[Fase 5 - Plataforma]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Foto al 2026-10-16
> Rama principal `main` en `c66c3ff`. **Fases 0 a 4 en `main`**: el 2026-10-15 se mergeó por squash la cadena de Pedidos (PRs #8 a #12) y se borraron las ramas remotas. **Fase 5 (Plataforma) implementada en seis ramas locales apiladas, pendiente de merge** (punta `c6085d9`: 24 archivos / 939 tests, build OK); aún no está en `main` ni publicada. Cocina, Pedidos y Plataforma siguen sin prueba manual en navegador.

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
| Plataforma: datos y permisos (`feat/plataforma-01-datos`, `0003c47`) | implementada en rama, pendiente de merge | [[Plataforma]] · [[Fase 5 - Plataforma]] |
| Plataforma: reglas del dashboard y del alta (`feat/plataforma-02-reglas`, `2596829`) | implementada en rama, pendiente de merge | [[Plataforma]] |
| Plataforma: lista con panel de detalle (`feat/plataforma-03-lista`, `28efe2e`) | implementada en rama, pendiente de merge; sin prueba en navegador | [[Plataforma]] |
| Plataforma: alta de restaurantes, modal y `/nuevo` (`feat/plataforma-04-alta`, `3923b7a`) | implementada en rama, pendiente de merge; sin prueba en navegador | [[Plataforma]] |
| Plataforma: Renovar, Cambiar plan, Suspender/Reactivar (`feat/plataforma-05-acciones`, `86de23a`) | implementada en rama, pendiente de merge; sin prueba en navegador | [[Plataforma]] · `docs/progress/08-fase-5-plataforma.md` |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger y zona horaria de `createdAt`.

## Pendiente de Pedidos
Prueba manual en navegador con backend; aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación hecha por la plataforma; tablero kanban; Cobrar (fase de Caja). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Plataforma
Mergear la cadena de seis ramas en orden (squash, reubicando cada rama sobre `main` tras cada merge); prueba en navegador de todas las pantallas; Escape para cerrar panel y modal; partir `restaurantes.page.ts` (847 líneas). Detalle en [[Pendientes y Deuda Técnica]].

## Tests
- **`main` (`c66c3ff`): 21 archivos, 770 tests en verde** (`npx ng test --watch=false`); `npx ng build` OK. Ver [[Testing]].
- **Punta de la cadena de Plataforma (`feat/plataforma-06-administrador`, `c6085d9`): 24 archivos, 939 tests en verde**; `npx ng build` OK. No es el estado de `main`.
- En el merge se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna ahora cada campo de forma explícita en lugar de `...overrides`, con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).

## Decisiones recientes
- `homeFor` de ADMINISTRADOR y RECEPCION es `/pedidos` (la lista, sin `subscriptionGuard`; `3598eb0`). Decisión cerrada.
- **Plan (decisión del usuario, 2026-10-15):** la siguiente fase era **Plataforma**, porque hay que poder crear un restaurante desde la plataforma antes de probar en navegador cualquier pantalla del tenant. Ya está implementada en ramas (ver arriba). El backend ya tiene credenciales de plataforma de desarrollo (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); se consultan allí, no se documentan aquí.
- **Alcance de Plataforma (decisión del usuario, 2026-10-15): "Diseño + acciones"** (lista, alta y acciones Renovar, Cambiar plan y Suspender/Reactivar). Los defaults del orquestador están en [[Fase 5 - Plataforma]].
- **ADMINISTRADOR del tenant**: resuelto en T5.7 (`c6085d9`): el alta del restaurante crea también la cuenta del dueño, en un asistente de dos pasos.

## Qué sigue
1. **Mergear la cadena de Plataforma** en orden (squash) y probar en navegador sus pantallas: [[Plataforma]] · [[Fase 5 - Plataforma]].
2. Prueba en navegador de las interfaces del tenant (Cocina y Pedidos), con el restaurante creado desde Plataforma.
3. Cerrar Cocina (prueba manual, Swagger, zona horaria de `createdAt`).
4. Módulos restantes: Restaurante, pantallas de Catálogo, tablero kanban de Pedidos y Cobrar, Pagos/Caja, Usuarios (bloqueado: no existe `GET /usuarios`). Los cambios de suscripción anunciados que siguen abiertos están en [[Pendientes y Deuda Técnica]].

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/plataforma.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
