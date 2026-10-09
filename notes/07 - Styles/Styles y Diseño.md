---
title: Styles y Diseño
date: 2026-10-08
tags:
  - servidos
  - diseño
  - tailwind
aliases:
  - Diseño visual
  - Tokens
---

# Styles y Diseño

> [!abstract] Regla
> No inventar UI. El diseño está en `pencil-export/*.png`; si no existe pantalla para algo, se pregunta al usuario. Los textos que no están en el diseño (404, sin-modulos, suspendido, cuerpo del 403) se redactaron en español neutro y están pendientes de revisión (`docs/progress/04`).

Volver: [[00 - MOC]] · Relacionado: [[Shared]] · [[Decisiones (ADR)]] · [[Arquitectura]]

## Tailwind 4 y tokens (`src/styles.css`)
`@import 'tailwindcss'` y un bloque `@theme`. Valores reales:

| Grupo | Tokens |
|---|---|
| Marca | `brand #d9480f`, `brand-strong #b83a09`, `brand-soft #fce8de` |
| Tinta (sidebar/oscuro) | `ink #14110d`, `ink-soft #2a2520`, `ink-line #3a342d`, `ink-muted #a39a8e` |
| Superficies | `surface #f7f5f1`, `card #ffffff`, `line #e5e0d7`, `muted #6b655c`, `subtle #9a9388` |
| Semánticos | `ok #2e7d4f` / soft `#e3f1e8`; `info #2f5bb7` / `#e4ecfa`; `warn #a8620a` / `#fdf0d5`; `flow #6d4bc2` / `#ece6f8`; `danger #c42b1c` (strong `#a82216`) / `#fbe3e0`; `neutral #6b655c` / `#ece9e3` |
| Radios | `control 0.5rem`, `card 0.75rem`, `modal 1rem` |
| Sombra | `shadow-modal: 0 24px 60px -12px rgb(20 17 13 / 0.35)` |

Capa base: `body` con fondo `surface`, color `ink`, `font-sans`; `h1–h3` con `font-display`; cursor pointer en botones habilitados.

## Tipografía
- **Bricolage Grotesque** (títulos, `--font-display`) y **Geist** (cuerpo, `--font-sans`), cargadas desde Google Fonts en `src/index.html` (`display=swap`, fuentes variables). `--font-mono` usa stack del sistema (precios, tickets, timers).
- Producción inlinea los `@font-face`; en dev se descarga la hoja externa. Pendiente opcional: Geist Mono.

## Primitivas (`src/app/shared/ui`)
| Componente | API | Notas |
|---|---|---|
| `button[appButton]`, `a[appButton]` | `variant: primary \| secondary \| destructive \| ghost`, `block` | se aplica a elementos nativos |
| `app-badge` | `variant: ok \| info \| warn \| flow \| danger \| neutral` | píldora con punto |
| `app-icon` | `name` (requerido), `size` (20) | SVG inline por trazo; los paths están en `icon.component.ts` |
| `app-modal` | `heading`, `tone: neutral \| brand \| danger`; slots `[icon]`, cuerpo, `[footer]` | el padre decide si se renderiza |
| `app-state-panel` | `icon`, `caption`, `heading`; slot `[actions]` | páginas 403/404/etc. |
| `app-text-field` | `label`, `name`, `type`, `error`, `invalid`, `disabled`, `required`, `[(value)]` | |
| `ToastService` + `app-toast-host` | `show(code, message, kind)`; auto-cierre 6 s (`TOAST_DURATION_MS`) | host una vez en `App` |

Iconos disponibles hoy incluyen los del sidebar y estados (chef, receipt, flame, wallet, book, users, store, building, plus, logout, login, alert, hourglass, timer, clock, shieldOff, lock, refresh, x, arrowRight, search, inbox) y los agregados para cocina en el working tree (wifiOff, utensils, bike, bag, expand, check, checkCircle, triangleAlert, spinner).

## Fuente de diseño: `pencil-export`
| PNG | Pantalla |
|---|---|
| `Blp89` | Nuevo pedido |
| `D3DDxI`, `JPYEo` | Login |
| `EGPHx`, `Sd7pI`, `zFAgh` | Pedidos (tablero) |
| `QU3DR`, `Ro7kZ` | Pedidos (lista) |
| `Efm03`, `m4qop` | Restaurante y plan |
| `P25cfL`, `tDcwg` | Caja |
| `VHQeZ` | Usuarios |
| `Z1Ujr` | 403 |
| `bi8Au` | Componentes |
| `hoW4s`, `i0YXQ` | Catálogo |
| `NJ53j` | Mapa de pantallas por rol |
| `kUmH1` | Estados del sistema |
| `x9DxqV`, `z8ZbK` | Restaurantes (plataforma) |
| `cocina-admin` | Cocina |
| `JUjl0` | Cocina (versión anterior con "Actualiza cada 5 s", polling; observado al abrir la imagen, no listado en el pedido) |

> [!warning] Detalle de cocina
> `cocina-admin.png` es el diseño vigente; `JUjl0.png` muestra una versión de polling a 5 s, previa al WebSocket. El texto de EGPHx manda sobre los colores de `cocina-admin.png` para los umbrales (ver [[Fase 3 - Cocina]]).

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Tokens centralizados: cambio de marca en un archivo | Los tokens dependen de mantener sincronizado el diseño |
| Sin librería de UI: cero dependencias | Iconos a mano; cada uno requiere paths |
| Fuentes variables: un archivo por familia | Tercero externo (privacidad, CSP) |
| Primitivas tontas sin tests | Sin tests de regresión visual |

## Responsive
Mobile-first para salón/cocina y desktop para administración (`DESIGN_BRIEF` §2). El shell usa sidebar de 240 px en `lg` y barra superior en pantallas pequeñas (clases `lg:`).
