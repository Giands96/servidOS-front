---
title: Reglas anti-spaghetti
date: 2026-10-08
tags:
  - servidos
  - arquitectura
  - convenciones
aliases:
  - Checklist de extensión
  - Cómo extender sin romper
---

# Reglas anti-spaghetti

> [!abstract] Para qué sirve
> Checklist concreto de dónde va cada cosa y qué no hacer, derivado de `AGENTS.md` y del código. Si dudas, esta nota gana a la intuición.

Volver: [[00 - MOC]] · Base teórica: [[Arquitectura]] · Testing: [[Testing]]

## Dónde va el código nuevo
| Necesito… | Va en… | Nombre |
|---|---|---|
| Llamar a un endpoint | `features/<dominio>/data/` | `<dominio>.api.ts` |
| Una regla, cálculo o formateo | `features/<dominio>/domain/` | `<dominio>.rules.ts` (+ `.spec.ts`) |
| Una pantalla | `features/<dominio>/` | `<dominio>.page.ts` |
| Tipos del contrato | `features/<dominio>/` | `<dominio>.types.ts` (ejemplo: `cocina.types.ts`) |
| Un widget reutilizable sin lógica | `shared/ui/<nombre>/` | `<nombre>.component.ts` |
| Una página de estado genérica | `shared/pages/` | `*.page.ts` |
| Algo transversal (sesión, HTTP, guards, layout) | `core/` | |
| Datos de prueba | `src/testing/` | `builders.ts`, `mock-api.ts` |

## Haz / No hagas
- **Haz** consultar permisos solo con `can(user, action)`. **No** compares roles con `if (rol === 'ADMINISTRADOR')` en vistas.
- **Haz** declarar el permiso una vez en la ruta con `moduleRoute`. **No** repitas la acción en el menú.
- **Haz** que las páginas solo orquesten (señales, llamadas, navegación). **No** metas reglas de negocio en `*.page.ts`.
- **Haz** que `*.api` solo use `HttpClient`. **No** importes `Router` ni componentes en `*.api` / `*.service` (excepción: `core/http`).
- **Haz** mostrar el `message` del backend tal cual en 400/409. **No** lo reescribas ni inventes textos de error de negocio.
- **Haz** pedir el `restauranteId` al token/`/auth/me`, nunca a un formulario. Si un diseño lo pide, es error.
- **No** guardes el access token en `localStorage`/`sessionStorage`. Ver [[Seguridad]].
- **No** agregues dependencias (UI kits, state libs) sin aprobación; `@stomp/rx-stomp` fue aprobada explícitamente.
- **No** inventes diseño ni flujos: pregunta. Si es negocio (roles, 402, cocina, pagos), pregunta primero (`AGENTS.md` §8).
- **No** subas `.env`, tokens o JWT reales a docs/tests. Usa `FAKE_ACCESS_TOKEN`.

## Cómo agregar un módulo/ruta de forma segura
1. Define la `Action` en `permissions.rules.ts` y a qué roles aplica (tabla `RESTAURANTE_ACTIONS` o `PLATFORM_ACTIONS`), con su test de tabla. Confirma la matriz con el contrato antes.
2. Crea `features/<dominio>/{data,domain}/` y la página.
3. Añade la ruta en `app.routes.ts` con `moduleRoute(action, label, icon, guards, load)`.
4. Si es de **escritura**, agrega `subscriptionGuard` **en el parámetro `guards`**: `moduleRoute('x.y', 'Label', 'icon', [subscriptionGuard], load)`. Nunca `{ ...moduleRoute(...), canActivate: [...] }`.
5. Excepción documentada: las operaciones permitidas aun con 402 (p. ej. cocina marcar listo) **no** llevan `subscriptionGuard`. Ver [[Cocina]].
6. Si añades un `NavIcon` nuevo o un icono, agrégalo a `icon.component.ts` (iconos propios, sin librería).
7. Si el menú debe cambiar, no toques `navigation.rules.ts`: se deriva de la ruta.
8. Verifica con `npx ng build` y los specs de rutas/guards (`app.routes.spec.ts`, `guards.spec.ts`).

> [!warning] Trampa conocida
> `Route.data` es débil: usa siempre `routeAccess()` (lo hace `moduleRoute`). Si adoptas `loadChildren`, `navEntriesFrom` no verá esas rutas hasta que se adapte.

## Cuándo escribir tests (`AGENTS.md` §6 y §9)
- **Sí**: funciones complejas y lógica pura (`*.rules`, interceptores, guards, stores, `cocina-live`).
- **No**: componentes pequeños ni temas visuales; `shared/` no se testea.
- Con Strict TDD activo: RED observado, luego GREEN, luego refactor. Ver [[Testing]].

## Convenciones de commits y ramas
Conventional Commits (`feat:`, `fix:`, `chore:`), squash merge, PR con tests en verde y 1 aprobación. Ver [[Infraestructura]].

## Antes de empezar (AGENTS §8)
Verifica que el proyecto compila y los tests pasan; si algo falla, no empieces. Crea un plan con pasos y resultado esperado. Después de codificar, deja nota en `docs/progress/`.

## Señales de que te estás yendo a spaghetti
- Un `*.page.ts` supera lo que cabe en una pantalla de lógica de decisión.
- Dos archivos escriben el mismo permiso/ruta/etiqueta.
- Un servicio de datos conoce una pantalla.
- Un `if` por rol en una plantilla.
- Un `catch` que traga errores sin mostrar `message`.
