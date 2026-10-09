---
title: Estado Actual
date: 2026-10-08
tags:
  - servidos
  - gobierno
  - estado
aliases:
  - Qué está hecho
---

# Estado Actual

Volver: [[00 - MOC]] · Pendientes: [[Pendientes y Deuda Técnica]] · Fases: [[Fase 3 - Cocina]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Foto al 2026-10-08
> Rama `feat/cocina` (principal: `main`). Fases 0 a 3 implementadas; working tree limpio. Cocina sin prueba manual.

## Hecho
| Área | Estado | Referencia |
|---|---|---|
| Infra (SPA, strict, proxy, tipos, testing helpers) | completo | [[Fase 0 - Infra]] |
| Auth núcleo (sesión, interceptores, guards, permisos) | completo | [[Fase 1 - Core Auth]] |
| Login, shell, tokens, fuentes, páginas de estado, paywall | completo | [[Fase 2 - Login y Shell]] |
| Menú derivado de rutas, `moduleRoute` con guards extra | completo | [[Arquitectura]] |
| Dependencia `@stomp/rx-stomp` | aprobada y commiteada (`00c94dd`) | [[Decisiones (ADR)]] |
| Cocina: tipos, API, reglas, cliente STOMP, página y ruta | commiteado (`8591b8c`, `7087023`, `6790b8d`, `2fad5cb`) | [[Cocina]] · [[Fase 3 - Cocina]] |

## Pendiente de cierre de Cocina
Prueba manual en navegador con backend, verificación del payload contra Swagger, zona horaria de `createdAt` y review nativa de `00c94dd..2fad5cb`.

## Tests
- 17 archivos, 407 tests en verde (re-ejecución completa tras `2fad5cb`; antes 340). `ng build` OK sin warnings. Ver [[Testing]].

## Qué sigue
1. Cerrar Cocina (prueba manual, Swagger, review nativa).
2. Implementar los cambios de suscripción anunciados ([[Pendientes y Deuda Técnica]]).
3. Siguiente módulo según el plan (Restaurante, Catálogo, Pedidos, Pagos, Usuarios, Plataforma); varios dependen de endpoints de listado que el backend aún no ofrece.

## Cómo retomar
Verificar `git status`, correr `npx ng build` y `npx ng test --watch=false`, leer `odd/tasks/cocina.md` y `docs/progress`. Mantener la nota de progreso de cada fase (memoria del proyecto: documentar cada fase, feature y fix).
