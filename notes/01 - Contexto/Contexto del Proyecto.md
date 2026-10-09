---
title: Contexto del Proyecto
date: 2026-10-08
tags:
  - servidos
  - contexto
aliases:
  - Qué es ServidOS Front
---

# Contexto del Proyecto

> [!abstract] En una frase
> Cliente web Angular (SPA) del sistema ServidOS, un SaaS multi-tenant para restaurantes. Consume el backend bajo `/api/v1`. Es una aplicación operativa de uso diario (salón, cocina, caja), no una landing comercial (`docs/DESIGN_BRIEF.md` §1).

Volver: [[00 - MOC]] · Siguiente: [[Modelo de Negocio]] · [[Arquitectura]]

## Alcance
- Cada restaurante (tenant) opera su catálogo, pedidos, cocina, caja y usuarios aislados; existe un nivel plataforma que gestiona restaurantes y suscripciones. Ver [[Modelo de Negocio]].
- El contrato de la API vive en `docs/FRONTEND_CONTEXT.md`; el modelo de negocio en `docs/Flujo - Recepcion Cocina.md` y **manda sobre cualquier suposición de UX** (`AGENTS.md` §2). Ver [[API]].
- El diseño visual viene de `pencil-export/` y no se inventa. Ver [[Styles y Diseño]].
- Regla del README: si el contrato y el código del backend discrepan, manda el código del backend y se actualiza el contrato.

## Stack (verificado en `package.json`)
| Pieza | Versión | Notas |
|---|---|---|
| Angular (common, core, router, forms…) | `^22.2.1` | standalone + signals, sin NgModules |
| TypeScript | `~6.0.2` | `strict`, `strictTemplates` |
| RxJS | `~7.8.0` | HttpClient y STOMP |
| `@stomp/rx-stomp` | `^2.4.0` | canal en vivo de cocina (aprobado, commit `00c94dd`) |
| Tailwind CSS + `@tailwindcss/postcss` | `^4.1.12` | tokens en `@theme` |
| Vitest + jsdom | `^4.0.8` / `^28.0.0` | vía `ng test` |
| Gestor | `npm@12.0.1` (`packageManager`) | |

Detalle y motivos en [[Infraestructura]].

## Cómo ejecutarlo
Comandos tomados de `AGENTS.md` §3 y `package.json`:

```
npm ci                 # instalar
npm start              # ng serve con proxy a http://localhost:8080
npx ng build           # build de producción (SPA)
npx ng test --watch=false
npx ng test --watch=false --include='**/core/**/*.spec.ts'   # auth, interceptores, guards
npx ng test --include='**/domain/*.spec.ts'
npx ng test --include='**/data/*.spec.ts'
```

> [!warning] Requisito
> Para probar flujos reales hace falta el backend en `localhost:8080` (perfil `dev`). El proxy (`proxy.conf.json`) deja la cookie de refresh en el mismo origen. Ver [[Infraestructura]] y [[Seguridad]].

## Estructura de carpetas (resumen)
```
src/app/core        singletons: auth, http, guards, layout
src/app/features    un dominio por carpeta (data / domain / page)
src/app/shared      UI tonta y páginas de estado
src/testing         builders y helpers de mock-api
```
Explicación completa en [[Arquitectura]].

## Cómo se trabaja (ODD v3)
Resumen de `AGENTS.md` §0: simple se hace de una; con incertidumbre se investiga y se pregunta; lo grande se parte en tareas con criterios de aceptación y evidencia. Cada fase deja una nota en `docs/progress/`. Ver [[Fase 0 - Infra]] y [[Estado Actual]].

> [!tip] No-negociables para quien extienda el proyecto
> No inventar UI ni flujos de negocio; no agregar dependencias sin aprobación; el `restauranteId` nunca va en un formulario; el backend es la autoridad final. Ver [[Reglas anti-spaghetti]].
