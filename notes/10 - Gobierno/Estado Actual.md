---
title: Estado Actual
date: 2026-10-23
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
> Rama principal `main` en `6a6a4a7`. **Fases 0 a 7 en `main`**: Cocina, Pedidos, Plataforma 01 a 06 (cuenta del dueño, #14), Catálogo 01 a 03 (#16 a #18) y Caja 01 a 03 con sus avisos de review (#19 a #22), más las notas del Vault (#15); la review nativa aprobó todo el rango de Caja (`review-6e314892b3ffcd3f`). El reembolso está **bloqueado por el backend** (falta el `pagoId`). El **tablero de pedidos** (Fase 4b) va en dos cortes: el corte 1 (reglas y `@angular/cdk`, ADR-20) está en `main` (PR #24) y el corte 2 (la interfaz del tablero) está en `main` (PR #27, `6a6a4a7`, 2026-10-23). Contra el backend real se probaron en navegador Plataforma y Pedidos (lista, Nuevo pedido y tablero) el 2026-10-22, y Caja y Cocina en la revisión responsive del 2026-10-23; el arrastre del tablero no se probó con touch real. La verificación del backend (`c32dcba`) se incorporó el 2026-10-17 (PR #26): ver [[API]] y los permisos sin alinear en [[Pendientes y Deuda Técnica]].

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
| Caja: cliente de pagos, `pagos.registrar` para ADMINISTRADOR, RECEPCION y CAJERO, home de CAJERO = `/caja` y reglas del cobro (`feat/caja-01-datos`, `e0fa5ed` y `25642e5`) | en `main`: PR #19 (`16260dd`); el cambio de roles es de riesgo alto | [[Pagos]] · [[Fase 7 - Caja]] |
| Caja: página `/caja` con lista "Por cobrar" y formulario de cobro (`feat/caja-02-pagina`, `14f394f`) | en `main`: PR #20 (`9a0eb4c`); sin prueba en navegador | [[Pagos]] |
| Caja: botón "Cobrar S/ …" en la lista de pedidos (`feat/caja-03-atajos`, `3bdb24b`) | en `main`: PR #21 (`c6f7a88`); el chip del tablero espera el merge de la interfaz del tablero | [[Pagos]] · `docs/progress/11-fase-7-caja.md` |
| Caja: avisos de la review (`caja.rules.ts`, `caja.page.ts`) | en `main`: PR #22 (`b7fb568`) | [[Pagos]] |
| Pedidos: reglas del tablero y dependencia `@angular/cdk` (corte 1 de la Fase 4b) | en `main`: PR #24 (`1d3e3c8`); review aprobada | [[Pedidos]] · [[Fase 4 - Pedidos]] · ADR-20 en [[Decisiones (ADR)]] |
| Pedidos: tablero kanban con drag & drop, menú "Mover a…" y zonas Entregado / Cancelado (corte 2, `feat/tablero-02-tablero`) | **mergeada en `main`** (PR #27, `6a6a4a7`, 2026-10-23); review aprobada; probado en navegador contra el backend real el 2026-10-22 y revisado en la prueba responsive del 2026-10-23, sin touch | [[Pedidos]] · `docs/progress/10-tablero-pedidos.md` |
| UI responsive para teléfonos y tabletas, slice 1: barra superior con píldoras bajo `lg`, `min-h-dvh`, inputs de 16 px y padding `p-4 sm:p-6` (`feat/responsive-01-shell`, `42e6a10`, `f8e2cf3`, `a49b62e`) | **publicada** (`origin/feat/responsive-01-shell`); **PR pendiente** (lo abre el usuario); review de riesgo alto aprobada (`review-af39a8ca79b7ef9d`) | [[Styles y Diseño]] · ADR-21 en [[Decisiones (ADR)]] · `docs/progress/12-responsive-ui.md` |
| UI responsive, slice 2: tablero, Nuevo pedido, Caja, Cocina y Plataforma (`feat/responsive-02-pages`, `5db3ac0` a `f236db9`) | **lista en su rama, sin publicar**; review aprobada (`review-bafd76275f80cf31`); probada en navegador a 375 / 768 / 1024 px contra el backend local, sin touch real | [[Styles y Diseño]] · [[Pedidos]] · `docs/progress/12-responsive-ui.md` |
| Reportes, slice 1: tipos, `ReportesApi`, reglas, ruta `/reportes` y permiso `reportes.ver` (`feat/reportes-01-data`, `69b37e4`, `be0211e`, `3692018`) | **lista en su rama, sin publicar**; review de riesgo alto aprobada (`review-953d26b3e0c03b91`) | [[Reportes]] · `docs/progress/13-reportes.md` |
| Reportes, slice 2: página, menú de exportación, listas y separador de miles en toda la app (`feat/reportes-02-page`, `5b6b2f8` a `dabcf9f`) | **lista en su rama, sin publicar**; review pendiente (`under_budget`); probada en navegador a 375 / 768 / 1280 px contra el backend local | [[Reportes]] · ADR-22 en [[Decisiones (ADR)]] |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger y zona horaria de `createdAt`.

## Pendiente de Pedidos
Prueba manual con RECEPCION (con ADMINISTRADOR ya se hizo contra el backend el 2026-10-22); aviso por borrador sin guardar en Nuevo pedido; foto vieja de `/auth/me` tras una renovación hecha por la plataforma; probar con touch la interfaz del tablero (Fase 4b, corte 2; ya en `main`, PR #27; contra el backend real ya se probó el 2026-10-22); el chip "Cobrar" en el tablero (T8.4b, desbloqueado). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Plataforma
Prueba en navegador de todas las pantallas, incluido el asistente y el login real del dueño; Escape para cerrar panel y modal; partir `restaurantes.page.ts` (847 líneas). Detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Catálogo
Prueba en navegador de la pantalla y los modales con ADMINISTRADOR, COCINERO y RECEPCION; decidir el cierre del modal durante un guardado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 6 - Catálogo]].

## Pendiente del tablero de Pedidos
Prueba táctil del arrastre (la interfaz del tablero ya está en `main`: PR #27, `6a6a4a7`; el corte 1, reglas y `@angular/cdk`, por el PR #24) (la prueba en navegador contra el backend real pasó el 2026-10-22); indicador cuando una columna pase de 100 pedidos; unificar el aviso de error duplicado. Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 4 - Pedidos]].

## Pendiente de la UI responsive
Abrir el PR de la slice 1 y publicar la slice 2 (stacked-to-main); prueba táctil real del arrastre del tablero y de las columnas con deslizamiento; avisos de las dos reviews como deuda de baja prioridad; decidir qué hacer con el toast sobre la barra de Nuevo pedido. Reportes queda fuera (feature aparte). Detalle en [[Pendientes y Deuda Técnica]] y [[Styles y Diseño]].

## Pendiente de Reportes
Publicar las tres ramas (`feat/reportes-01-data`, `feat/reportes-02-page` y `fix/page-height-regression`, decisión del usuario); solicitud al backend de número de mesa opcional en `/reportes/ventas` y `categoria` en `/reportes/productos`; el diseño dice "Jue 23 oct" pero el 2026-10-23 es viernes; revisar cómo muestra el login un 429. Detalle en [[Pendientes y Deuda Técnica]] y [[Reportes]].

## Pendiente de alineación con el backend
Verificación contra el backend (`c32dcba`) incorporada el 2026-10-17. Quedan diferencias reales entre sus `@PreAuthorize` y la matriz del front: `GET /pedidos` para CAJERO; ver restaurantes, renovar, cambiar plan, suspender y reactivar para ADMIN y MODERADOR (hoy solo SUPERADMIN); alta de usuarios de plataforma. Cobrar ya quedó alineado con Caja. Tabla en [[Modelo de Negocio]] y detalle en [[Pendientes y Deuda Técnica]].

## Pendiente de Caja
Agregar el chip "Cobrar S/ …" al tablero tras mergear su interfaz (T8.4b); prueba en navegador con ADMINISTRADOR, RECEPCION y CAJERO; **reembolso bloqueado: el backend debe exponer el `pagoId` en las filas de `GET /pedidos`** (`docs/backend/pago-id-en-pedidos.md`). Detalle en [[Pendientes y Deuda Técnica]] y [[Fase 7 - Caja]].

## Tests
- **`main` (`b7fb568`)**: incluye Catálogo 01 a 03 y Caja 01 a 03 (la punta de Caja tenía 1108 tests y el build OK antes de mergear); los totales exactos de `main` no se midieron en esta actualización (la última medición registrada es de `c66c3ff`: 21 archivos / 770 tests). Ver [[Testing]].
- **Punta de la cadena de Catálogo antes de mergear (`98c7d10`)**: 26 archivos / 985 tests en verde; `npx ng build` OK.
- **Interfaz del tablero**: mergeada en `main` (PR #27, `6a6a4a7`); las reglas y `@angular/cdk` entraron antes por el PR #24. La punta de la UI responsive, medida sobre ese `main`, está en la línea siguiente.
- **Punta de la UI responsive (`feat/responsive-02-pages`, `f236db9`)**: 30 archivos / 1213 tests en verde; `npx ng build` OK (medido el 2026-10-23, sobre `main` `6a6a4a7`).
- **Punta de Reportes (`feat/reportes-02-page`, `dabcf9f`)**: 32 archivos / 1296 tests en verde; `npx ng build` OK (medido el 2026-10-23).
- En el merge de Pedidos se resolvió un conflicto en `src/testing/builders.ts`: `aMe` asigna ahora cada campo de forma explícita en lugar de `...overrides`, con los mismos valores por defecto (restaurante `ACTIVO`, suscripción `ACTIVA` con `fechaFin` 2099-12-31).

## Decisiones recientes
- `homeFor` de ADMINISTRADOR y RECEPCION es `/pedidos` (la lista, sin `subscriptionGuard`; `3598eb0`). Decisión cerrada.
- **Plan (decisión del usuario, 2026-10-15):** la siguiente fase era **Plataforma**, porque hay que poder crear un restaurante desde la plataforma antes de probar en navegador cualquier pantalla del tenant. Plataforma 01 a 06 ya está en `main`. El backend ya tiene credenciales de plataforma de desarrollo (bootstrap de `application-dev.yaml`, migración V9 y `scripts/sql/crear_admin_plataforma.sql`); se consultan allí, no se documentan aquí.
- **Caja (decisión del usuario, 2026-10-16):** plan aprobado; el reembolso espera a que el backend exponga el `pagoId`. `pagos.registrar` pasa de solo ADMINISTRADOR a ADMINISTRADOR, RECEPCION y CAJERO según el contrato §3, y el home de CAJERO es `/caja`. Detalle en [[Fase 7 - Caja]].
- **Alcance de Plataforma (decisión del usuario, 2026-10-15): "Diseño + acciones"** (lista, alta y acciones Renovar, Cambiar plan y Suspender/Reactivar). Los defaults del orquestador están en [[Fase 5 - Plataforma]].
- **ADMINISTRADOR del tenant**: resuelto en T5.7 (`c6085d9`): el alta del restaurante crea también la cuenta del dueño, en un asistente de dos pasos.
- **Tablero de Pedidos (decisión del usuario, 2026-10-16):** implementar el tablero con drag & drop y aprobar la dependencia `@angular/cdk` (ADR-20 en [[Decisiones (ADR)]]). Defaults del orquestador (a revisar): tablero como vista por defecto con `?vista=lista`; minutos desde la creación sin umbrales; sin movimientos hacia atrás (manda el contrato); sin sincronización en vivo. Detalle en [[Fase 4 - Pedidos]].
- **UI responsive (decisión del usuario, 2026-10-23, revisada el mismo día):** bajo `lg` una barra superior con píldoras de navegación según una imagen de diseño que compartió en el chat; desde `lg`, el sidebar. Descartado el cajón con riel de iconos. Sin contadores en las píldoras ni tablas a tarjetas (sin diseño). Detalle en ADR-21 de [[Decisiones (ADR)]].
- **Reportes (decisión del usuario, 2026-10-23):** pantalla `/reportes` para ADMINISTRADOR con ventas por día, semana y mes, productos más vendidos y exportación a Excel y PDF, según cuatro imágenes de diseño. **Montos con separador de miles en toda la app (2026-10-24)**: ADR-22 en [[Decisiones (ADR)]]. Detalle en [[Reportes]].

## Qué sigue
1. **Probar en navegador** las pantallas de [[Plataforma]] (crear un restaurante con su dueño) y luego las del tenant (Cocina, Pedidos y Catálogo) con ese restaurante.
2. **Chip "Cobrar S/ …" en las tarjetas del tablero (T8.4b)**, desbloqueado por el merge de la interfaz del tablero (PR #27): [[Pedidos]] · [[Fase 4 - Pedidos]] · [[Pagos]] · [[Fase 7 - Caja]].
3. **Pedir al backend el `pagoId` en las filas de `GET /pedidos`** (`docs/backend/pago-id-en-pedidos.md`) para desbloquear el reembolso.
4. Cerrar Cocina (prueba manual, Swagger, zona horaria de `createdAt`).
5. Módulos restantes: Restaurante, reembolso (Pagos) y Usuarios (bloqueado: no existe `GET /usuarios`). Los cambios de suscripción anunciados que siguen abiertos están en [[Pendientes y Deuda Técnica]].

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/pedidos-tablero.md`, `odd/tasks/caja.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
