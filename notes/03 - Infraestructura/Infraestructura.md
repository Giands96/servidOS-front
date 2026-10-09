---
title: Infraestructura
date: 2026-10-08
tags:
  - servidos
  - infraestructura
  - build
aliases:
  - Build y configuración
---

# Infraestructura

Volver: [[00 - MOC]] · Relacionado: [[Testing]] · [[Seguridad]] · [[Decisiones (ADR)]]

## Build (`angular.json`)
- Builder `@angular/build:application`, entrada `src/main.ts`, `tsConfig: tsconfig.app.json`, estilos `src/styles.css`, assets desde `public/`.
- **SPA**: no hay SSR (ver ADR-01 en [[Decisiones (ADR)]]). `ng build` genera solo `dist/front/browser`.
- `security.allowedHosts: []` en las opciones de build.
- Configuración por defecto: `production` (`outputHashing: all`). `development`: sin optimización, con sourcemaps.
- **Presupuestos de producción**: `initial` 500 kB aviso / 1 MB error; `anyComponentStyle` 4 kB aviso / 8 kB error. Medición de la Fase 2: initial 283.80 kB raw sin avisos.
- `allowedCommonJsDependencies: ["@stomp/stompjs"]` en las opciones de build (commit `2fad5cb`) para silenciar el warning de CommonJS.
- `serve` usa `proxyConfig: proxy.conf.json`; `test` usa `@angular/build:unit-test` (Vitest).

## TypeScript (`tsconfig.json`)
`strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, target `ES2022`, `isolatedModules`. Angular: `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`. `tsconfig.app.json` excluye `*.spec.ts`; `tsconfig.spec.json` aparte.

## Proxy (`proxy.conf.json`)
| Ruta | Destino | Extra |
|---|---|---|
| `/api` | `http://localhost:8080` | `secure: false`, `changeOrigin: false` |
| `/ws` | `http://localhost:8080` | `ws: true` (añadido para cocina) |

Motivo: la cookie de refresh queda en el mismo origen y no se depende de CORS. En el contrato, el CORS dev permite `http://localhost:4200` con credenciales (`FRONTEND_CONTEXT` §1), pero el proxy es lo que realmente se usa.

## Entornos / base de la API
No existe `environments/`. La base es la constante `API_BASE = '/api/v1'` en `src/app/core/http/api.config.ts` (relativa, mismo origen). El WebSocket usa `/ws` mismo origen (`brokerUrl` en `cocina-live.ts`).

> [!warning] No verificado: despliegue
> Ningún documento del repositorio describe cómo se sirve en producción. Con la base relativa y cookie con `path=/api/v1/auth`, un despliegue necesitaría un reverse proxy que sirva SPA y `/api`/`/ws` bajo el mismo origen. Es una consecuencia del diseño, no algo documentado.

## Scripts (`package.json`)
`start` = `ng serve`, `build` = `ng build`, `watch` = `ng build --watch --configuration development`, `test` = `ng test`. No hay script de lint; `prettier` está en devDependencies (configuración no revisada).

## Dependencias y por qué existen
| Paquete | Tipo | Para qué |
|---|---|---|
| `@angular/*` `^22.2.1` | prod | framework |
| `rxjs` `~7.8.0` | prod | HttpClient, STOMP |
| `tslib` | prod | helpers TS |
| `@stomp/rx-stomp` `^2.4.0` | prod | tablero de cocina en vivo (aprobada, `00c94dd`); trae `@stomp/stompjs 7.3.0` |
| `@angular/build`, `cli`, `compiler-cli` | dev | toolchain |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | dev | estilos |
| `vitest`, `jsdom` | dev | tests |
| `typescript` `~6.0.2`, `prettier`, `@types/node` | dev | tipado y formato |

Se removieron en la Fase 0: `@angular/ssr`, `@angular/platform-server`, `express`, `@types/express`. Hubo un bump a Angular 22.2.1 (`cbe9ef7`) por una vulnerabilidad de SSR y otra de `piscina` (según el mensaje del commit).

> [!tip] Regla
> Nada de dependencias nuevas sin aprobación explícita (`AGENTS.md` §6). Cuando se agregó una, se registró y revisó (RDD).

## Flujo de trabajo
1. Verificar estado sano (`ng build`, `ng test`) antes de empezar (AGENTS §8).
2. Rama de feature (`feat/frontend-core`, `feat/cocina`).
3. Un commit por unidad de trabajo, con tests y docs; Conventional Commits.
4. Nota en `docs/progress/`.
5. PR: tests en verde + 1 aprobación; squash merge.

### Revisiones RDD (resumen)
Con receipt-driven development habilitado, cada slice de commits se evalúa por riesgo; las de riesgo medio/alto pasan por revisión nativa con lentes (reliability, risk, resilience, readability). Los resultados quedan en `odd/tasks/servidos-frontend.md` (todas aprobadas hasta `484abaa`). Es una herramienta del flujo de trabajo, no del producto.

## Pendientes de infraestructura
- CSP `font-src https://fonts.gstatic.com` si el deploy define Content-Security-Policy.
- Definir cómo se despliega y se sirve (reverse proxy). Ver [[Pendientes y Deuda Técnica]].
