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
> Rama principal `main` en `5e8b272`. **Fases 0 a 4 y Plataforma 01 a 05 en `main`** (Plataforma entró como PR #13 de GitHub, squash). `feat/plataforma-06-administrador` (`b034b57`, cuenta del dueño) y `docs/obsidian-pedidos-merge` (notas del Vault) se publicaron en `origin` el 2026-10-16 y **esperan su PR**. **Fase 6 (Catálogo) implementada en tres ramas locales apiladas, sin publicar** (punta `98c7d10`: 26 archivos / 985 tests, build OK). Cocina, Pedidos, Plataforma y Catálogo siguen sin prueba manual en navegador.

> [!warning] Mientras 06 no se mergee, crear un restaurante desde `main` falla
> El backend ya exige `administrador` en `POST /restaurantes`, pero el formulario de `main` aún no lo envía: la creación responde 422 "administrador: no debe ser nulo". Sin poder crear restaurantes no se prueban las pantallas del tenant, así que mergear la rama 06 (PR #15 de `docs/prs`) es lo que desbloquea la prueba en navegador.

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
| Plataforma 06: cuenta del dueño en el alta, asistente de dos pasos (`feat/plataforma-06-administrador`, `b034b57`) | publicada en `origin`, espera su PR; requiere el backend con `administrador` | [[Plataforma]] · [[Fase 5 - Plataforma]] |
| Catálogo: escrituras y reglas (`feat/catalogo-01-datos`, `acdd6de` y `e5a1a70`) | implementada en rama local, sin publicar | [[Catálogo]] · [[Fase 6 - Catálogo]] |
| Catálogo: página `/catalogo` (`feat/catalogo-02-pagina`, `01bec53`) | implementada en rama local, sin publicar; sin prueba en navegador | [[Catálogo]] |
| Catálogo: modales de producto y categoría (`feat/catalogo-03-formularios`, `98c7d10`) | implementada en rama local, sin publicar; sin prueba en navegador | [[Catálogo]] · `docs/progress/09-fase-6-catalogo.md` |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger y zona horaria de `createdAt`.

## Pendiente de Pedidos
Prueba manual en navegador con backend; aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación hecha por la plataforma; tablero kanban; Cobrar (fase de Caja). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Plataforma
Abrir y mergear el PR de `feat/plataforma-06-administrador` (la publicación ya se hizo); prueba en navegador de todas las pantallas, incluido el asistente y el login real del dueño; Escape para cerrar panel y modal; partir `restaurantes.page.ts` (847 líneas). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Catálogo
Publicar y mergear la cadena de tres ramas en orden (squash, reubicando cada rama sobre `main` tras cada merge); prueba en navegador de la pantalla y los modales con ADMINISTRADOR, COCINERO y RECEPCION; decidir el cierre del modal durante un guardado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 6 - Catálogo]].

## Tests
- **`main` (`5e8b272`)**: incluye Plataforma 01 a 05; los totales exactos no se midieron en esta actualización (la última medición registrada es de `c66c3ff`: 21 archivos / 770 tests). Ver [[Testing]].
- **Punta de Plataforma 06 (`feat/plataforma-06-administrador`)**: 24 archivos / 939 tests en verde (medido sobre `c6085d9`, antes de reubicarla); `npx ng build` OK.
- **Punta de la cadena de Catálogo (`feat/catalogo-03-formularios`, `98c7d10`)**: **26 archivos / 985 tests en verde**; `npx ng build` OK. No es el estado de `main`.
- En el merge de Pedidos se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna ahora cada campo de forma explícita en lugar de `...overrides`, con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).

## Decisiones recientes
- `homeFor` de ADMINISTRADOR y RECEPCION es `/pedidos` (la lista, sin `subscriptionGuard`; `3598eb0`). Decisión cerrada.
- **Plan (decisión del usuario, 2026-10-15):** la siguiente fase era **Plataforma**, porque hay que poder crear un restaurante desde la plataforma antes de probar en navegador cualquier pantalla del tenant. Plataforma 01 a 05 ya está en `main`; falta la 06 (ver arriba). El backend ya tiene credenciales de plataforma de desarrollo (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); se consultan allí, no se documentan aquí.
- **Alcance de Plataforma (decisión del usuario, 2026-10-15): "Diseño + acciones"** (lista, alta y acciones Renovar, Cambiar plan y Suspender/Reactivar). Los defaults del orquestador están en [[Fase 5 - Plataforma]].
- **ADMINISTRADOR del tenant**: resuelto en T5.7 (`c6085d9`): el alta del restaurante crea también la cuenta del dueño, en un asistente de dos pasos.

## Qué sigue
1. **Abrir y mergear el PR de `feat/plataforma-06-administrador`** (ya está en `origin`): desbloquea la creación de restaurantes contra el backend actual. Luego probar en navegador las pantallas de [[Plataforma]] y crear un restaurante con su dueño.
2. **Publicar y mergear la cadena de Catálogo** (16 → 17 → 18 en `docs/prs`): [[Catálogo]] · [[Fase 6 - Catálogo]]. Abrir también el PR de `docs/obsidian-pedidos-merge`.
3. Prueba en navegador de las interfaces del tenant (Cocina, Pedidos y Catálogo), con el restaurante creado desde Plataforma.
4. Cerrar Cocina (prueba manual, Swagger, zona horaria de `createdAt`).
5. Módulos restantes: Restaurante, tablero kanban de Pedidos y Cobrar, Pagos/Caja, Usuarios (bloqueado: no existe `GET /usuarios`). Los cambios de suscripción anunciados que siguen abiertos están en [[Pendientes y Deuda Técnica]].

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/catalogo.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
