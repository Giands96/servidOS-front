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

Volver: [[00 - MOC]] · Pendientes: [[Pendientes y Deuda Técnica]] · Fases: [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] · [[Fase 5 - Plataforma]] · [[Fase 6 - Catálogo]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Foto al 2026-10-16
> Rama principal `main` en `fdd9c50`. **Fases 0 a 4, Plataforma 01 a 06 y Catálogo 01 y 02 en `main`** (PRs #13, #14, #16 y #17 de GitHub, squash; las notas del Vault entraron como #15). **Catálogo 03** (`feat/catalogo-03-formularios`) sigue pendiente en GitHub y necesita reubicarse sobre `main`. **Tablero de Pedidos (Fase 4b) implementado en dos ramas locales apiladas, sin publicar** (`feat/tablero-01-base`, `8bae4e3`, y `feat/tablero-02-tablero`, `335ef1e`; punta: 27 archivos / 1087 tests, build OK). Cocina, Pedidos, Plataforma y Catálogo siguen sin prueba manual en navegador.

> [!success] Plataforma 06 ya está en `main` (PR #14, `f7112e6`)
> El formulario de alta envía la cuenta del dueño (`administrador`), que el backend exige en `POST /restaurantes`. Con eso se puede crear un restaurante desde la plataforma y probar en navegador las pantallas del tenant; esa prueba **aún no se ha hecho**.

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
| Plataforma 06: cuenta del dueño en el alta, asistente de dos pasos | en `main`: PR #14 de GitHub (`f7112e6`); sin prueba en navegador | [[Plataforma]] · [[Fase 5 - Plataforma]] |
| Vault de Obsidian (Pedidos y Plataforma) | en `main`: PR #15 de GitHub (`3e2f905`) | [[00 - MOC]] |
| Catálogo: escrituras y reglas (`feat/catalogo-01-datos`) | en `main`: PR #16 de GitHub (`27b231e`) | [[Catálogo]] · [[Fase 6 - Catálogo]] |
| Catálogo: página `/catalogo` (`feat/catalogo-02-pagina`) | en `main`: PR #17 de GitHub (`fdd9c50`); sin prueba en navegador | [[Catálogo]] |
| Catálogo: modales de producto y categoría (`feat/catalogo-03-formularios`, `98c7d10`) | **pendiente en GitHub**: debe reubicarse sobre `main` antes de su review; sin prueba en navegador | [[Catálogo]] · `docs/progress/09-fase-6-catalogo.md` |
| Pedidos: reglas del tablero y dependencia `@angular/cdk` (`feat/tablero-01-base`, `8bae4e3`) | implementada en rama local, sin publicar; review aprobada | [[Pedidos]] · [[Fase 4 - Pedidos]] · ADR-20 en [[Decisiones (ADR)]] |
| Pedidos: tablero kanban con drag & drop, menú "Mover a…" y zonas Entregado / Cancelar (`feat/tablero-02-tablero`, `335ef1e`) | implementada en rama local, sin publicar; review aprobada; sin prueba táctil ni contra el backend real | [[Pedidos]] · `docs/progress/10-tablero-pedidos.md` |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger y zona horaria de `createdAt`.

## Pendiente de Pedidos
Prueba manual en navegador con backend; aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación hecha por la plataforma; publicar y mergear el tablero (Fase 4b: 19 → 20) y probarlo con touch y contra el backend real; Cobrar (fase de Caja). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Plataforma
Prueba en navegador de todas las pantallas, incluido el asistente de dos pasos y el login real del dueño (06 ya está en `main`); Escape para cerrar panel y modal; partir `restaurantes.page.ts` (847 líneas). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Catálogo
Reubicar `feat/catalogo-03-formularios` sobre `main` y mergear su PR (01 y 02 ya están en `main`); prueba en navegador de la pantalla y los modales con ADMINISTRADOR, COCINERO y RECEPCION; decidir el cierre del modal durante un guardado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 6 - Catálogo]].

## Pendiente del tablero de Pedidos
Publicar y mergear 19 → 20 (squash, reubicando la segunda sobre `main` tras el primer merge); prueba táctil del arrastre; prueba en navegador contra el backend real (solo se verificó con una API simulada); indicador cuando una columna pase de 100 pedidos; unificar el aviso de error duplicado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 4 - Pedidos]].

## Tests
- **`main` (`fdd9c50`)**: incluye Plataforma 01 a 06 y Catálogo 01 y 02; los totales exactos de `main` no se midieron en esta actualización (la última medición registrada de `main` es de `c66c3ff`: 21 archivos / 770 tests). Ver [[Testing]].
- **Punta del tablero (`feat/tablero-02-tablero`, `335ef1e`)**: **27 archivos / 1087 tests en verde** (pedidos 4 archivos / 382); `npx ng build` OK. Es el único total medido sobre una base que ya incluye Catálogo 01 y 02.
- **Punta de Catálogo 03 (`feat/catalogo-03-formularios`, `98c7d10`)**: 26 archivos / 985 tests en verde, medido antes de reubicarla sobre `main`; no es el estado de `main`.
- En el merge de Pedidos se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna ahora cada campo de forma explícita en lugar de `...overrides`, con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).

## Decisiones recientes
- `homeFor` de ADMINISTRADOR y RECEPCION es `/pedidos` (la lista, sin `subscriptionGuard`; `3598eb0`). Decisión cerrada.
- **Plan (decisión del usuario, 2026-10-15):** la siguiente fase era **Plataforma**, porque hay que poder crear un restaurante desde la plataforma antes de probar en navegador cualquier pantalla del tenant. Plataforma 01 a 06 ya está en `main`. El backend ya tiene credenciales de plataforma de desarrollo (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); se consultan allí, no se documentan aquí.
- **Alcance de Plataforma (decisión del usuario, 2026-10-15): "Diseño + acciones"** (lista, alta y acciones Renovar, Cambiar plan y Suspender/Reactivar). Los defaults del orquestador están en [[Fase 5 - Plataforma]].
- **ADMINISTRADOR del tenant**: resuelto en T5.7 (`c6085d9`): el alta del restaurante crea también la cuenta del dueño, en un asistente de dos pasos.
- **Tablero de Pedidos (decisión del usuario, 2026-10-16):** implementar el tablero con drag & drop y aprobar la dependencia `@angular/cdk` (ADR-20 en [[Decisiones (ADR)]]). Defaults del orquestador (a revisar): tablero como vista por defecto con `?vista=lista`; minutos desde la creación sin umbrales; sin movimientos hacia atrás (manda el contrato); sin sincronización en vivo. Detalle en [[Fase 4 - Pedidos]].

## Qué sigue
1. **Probar en navegador las pantallas de [[Plataforma]]** y crear un restaurante con su dueño (06 ya está en `main`).
2. **Catálogo 03:** reubicar `feat/catalogo-03-formularios` sobre `main` y mergear su PR (18 en `docs/prs`): [[Catálogo]] · [[Fase 6 - Catálogo]].
3. **Publicar y mergear el tablero de Pedidos** (19 → 20 en `docs/prs`): [[Pedidos]] · [[Fase 4 - Pedidos]].
4. Prueba en navegador de las interfaces del tenant (Cocina, Pedidos con el tablero y Catálogo), con el restaurante creado desde Plataforma, incluida la prueba táctil del arrastre.
5. Cerrar Cocina (prueba manual, Swagger, zona horaria de `createdAt`).
6. Módulos restantes: Restaurante, Cobrar de Pedidos, Pagos/Caja, Usuarios (bloqueado: no existe `GET /usuarios`). Los cambios de suscripción anunciados que siguen abiertos están en [[Pendientes y Deuda Técnica]].

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/pedidos-tablero.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
