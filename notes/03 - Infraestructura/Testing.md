---
title: Testing
date: 2026-10-08
tags:
  - servidos
  - testing
  - vitest
aliases:
  - Estrategia de pruebas
---

# Testing

Volver: [[00 - MOC]] · Relacionado: [[Infraestructura]] · [[Reglas anti-spaghetti]]

## Herramientas
- Runner: **Vitest 4** con **jsdom**, ejecutado por `ng test` (`@angular/build:unit-test`).
- TDD estricto habilitado (configuración de sesión). Cada tarea registra RED (módulo o aserción que falla) y luego GREEN.

## Comandos
```
npx ng test --watch=false
npx ng test --watch=false --include='**/core/**/*.spec.ts'
npx ng test --include='**/domain/*.spec.ts'
npx ng test --include='**/data/*.spec.ts'
npx ng test --watch=false --include=<spec>
```

## Qué se testea y por qué
| Área | Specs | Motivo |
|---|---|---|
| Permisos | `permissions.rules.spec.ts` | tabla de roles: error aquí abre o cierra pantallas |
| Navegación | `navigation.rules.spec.ts` | menú por rol, `homeFor` |
| Sesión | `session.store.spec.ts` | single-flight, epoch, timeout |
| Interceptores | `auth.interceptor.spec.ts`, `error.interceptor.spec.ts` | refresh-retry, concurrencia, 402 |
| Guards | `guards.spec.ts`, `home-redirect.guard.spec.ts` | permisos y redirecciones |
| API | `auth.api.spec.ts`, `cocina.api.spec.ts` | URLs, headers, `withCredentials` |
| Errores | `api-error.rules.spec.ts` | mapa status a acción, `Retry-After` |
| Login | `login.rules.spec.ts` | mensajes, cuenta regresiva |
| Suscripción | `subscription.rules.spec.ts` | formato de fechas/estado |
| Rutas | `app.routes.spec.ts` | menú == módulos accesibles, home accesible por rol |
| Cocina | `cocina.rules.spec.ts`, `cocina-live.spec.ts` | urgencia, orden, eventos; conexión STOMP (cliente falso vía `COCINA_STOMP`) |
| Helpers | `testing/testing.spec.ts` | builders y mock-api |

## Helpers (`src/testing`)
- `builders.ts`: `aMe()`, `anApiError(status, message)` (formato Spring `"402 Payment Required"`), `FAKE_ACCESS_TOKEN`, `aColaPedido()`, `aColaItem()`.
- `mock-api.ts`: `expectApi(ctrl, method, path)` sobre `HttpTestingController`, antepone `API_BASE`.

> [!warning] Nunca JWT reales
> Usa `FAKE_ACCESS_TOKEN`. Pegar JWT reales en docs o tests está prohibido (`AGENTS.md` §6).

## Qué NO testear
Componentes pequeños, temas visuales y `shared/ui` (regla `AGENTS.md` §6). Playwright solo si el usuario lo pide.

## Cuántos tests hay
- Suite completa, re-ejecutada por el coordinador tras `2fad5cb`: **17 archivos, 407 tests en verde** (antes 340 en 14 archivos). Los specs de cocina suman 65 (api, rules, live). `ng build` OK sin warnings. Ver [[Estado Actual]].

## Prácticas observadas
- Pruebas de mutación manuales para validar tests (cambiar un guard y ver fallar).
- Tablas `it.each` para matrices por rol.
- `vi.waitFor` recomendado para esperas asíncronas (advisory abierto en `session.store.spec`).

## Cómo escribir un test nuevo
1. Lógica pura: archivo `<x>.rules.spec.ts` junto a la regla, sin TestBed.
2. API: `provideHttpClient()` + `provideHttpClientTesting()` y `expectApi`.
3. Rutas/guards: `RouterTestingHarness` con `provideRouter(routes)`, como en `app.routes.spec.ts`.
4. Observa el RED antes de implementar.
