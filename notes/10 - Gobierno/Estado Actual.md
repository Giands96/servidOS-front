---
title: Estado Actual
date: 2026-10-14
tags:
  - servidos
  - gobierno
  - estado
aliases:
  - Qué está hecho
---

# Estado Actual

Volver: [[00 - MOC]] · Pendientes: [[Pendientes y Deuda Técnica]] · Fases: [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Foto al 2026-10-14
> Rama de trabajo `feat/pedidos-04-alta` (principal: `main`, `fe42e14`). Fases 0 a 3 en `main`; **Fase 4 (Pedidos: lista + nuevo pedido) implementada en cinco ramas locales sin push**, pendientes de merge. Cocina y Pedidos sin prueba manual en navegador.

## Hecho
| Área | Estado | Referencia |
|---|---|---|
| Infra (SPA, strict, proxy, tipos, testing helpers) | completo | [[Fase 0 - Infra]] |
| Auth núcleo (sesión, interceptores, guards, permisos) | completo | [[Fase 1 - Core Auth]] |
| Login, shell, tokens, fuentes, páginas de estado, paywall | completo | [[Fase 2 - Login y Shell]] |
| Menú derivado de rutas, `moduleRoute` con guards extra | completo | [[Arquitectura]] |
| Dependencia `@stomp/rx-stomp` | aprobada y commiteada (`00c94dd`) | [[Decisiones (ADR)]] |
| Paywall: pago manual por Yape + confirmación por WhatsApp (sin `renovar()`); el tenant no renueva ni cambia de plan | implementado en `fix/paywall-pago-manual`; el dueño debe configurar número y QR | [[Restaurante]] · `docs/progress/06-paywall-pago-manual.md` |
| Cocina: tipos, API, reglas, cliente STOMP, página y ruta | commiteado (`8591b8c`, `7087023`, `6790b8d`, `2fad5cb`) | [[Cocina]] · [[Fase 3 - Cocina]] |
| Pedidos: API y reglas de transición (`1e8fece`), página de la lista (`f38f2da`, `eb75ba9`, `5d173bc`), página de nuevo pedido (`b37b47d`) | commiteado en `feat/pedidos-01-datos` → `02-lista` → `03-alta-datos` → `04-alta`; sin push, pendiente de merge | [[Pedidos]] · [[Fase 4 - Pedidos]] · `docs/progress/07-fase-4-pedidos.md` |
| Catálogo: API de lectura (`9b43b5d`) | commiteado en `feat/pedidos-03-alta-datos`; pendiente de merge | [[Catálogo]] |
| `subscriptionGuard` según contrato §5 (`/auth/me`: INACTIVO, sin suscripción o vencida) | commiteado en `fix/subscription-guard-vigencia` (`6c42861`); pendiente de merge | [[Pedidos]] |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger, zona horaria de `createdAt` y review nativa de `00c94dd..2fad5cb`.

## Pendiente de cierre de Pedidos
Merge en orden: `fix/subscription-guard-vigencia` (independiente, antes de `04-alta`), luego `feat/pedidos-01-datos`, `02-lista`, `03-alta-datos` y `04-alta`; tras cada squash merge, rebase de la siguiente sobre `main`. Prueba manual en navegador con backend, aviso por borrador sin guardar y decisión sobre `homeFor`. Detalle en [[Pendientes y Deuda Técnica]].

## Tests
- **Punta `feat/pedidos-04-alta`: 21 archivos, 747 tests en verde** (`ng build` OK). Base `main`: 17 archivos / 419. Por rama: `fix/subscription-guard-vigencia` 436, `feat/pedidos-01-datos` 503, `feat/pedidos-02-lista` 583, `feat/pedidos-03-alta-datos` 670, `feat/pedidos-04-alta` 747.
- Cocina, antes: 17 archivos, 407 tests tras `2fad5cb` (base 340). Ver [[Testing]].

## Qué sigue
0. Mergear la cadena de Pedidos y probarla en navegador.
1. Cerrar Cocina (prueba manual, Swagger, review nativa).
2. Implementar los cambios de suscripción anunciados que siguen abiertos ([[Pendientes y Deuda Técnica]]); renovar, cambiar de plan y habilitar restaurantes quedan en [[Plataforma]].
3. Siguiente módulo según el plan (Restaurante, Catálogo, tablero kanban de Pedidos, Pagos, Usuarios, Plataforma); `GET /usuarios` aún no existe.

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/cocina.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
