---
title: Shared
date: 2026-10-08
tags:
  - servidos
  - modulos
  - shared
aliases:
  - Módulo Shared
---

# Shared

Volver: [[00 - MOC]] · Ver [[Styles y Diseño]] · [[Core]] · [[Arquitectura]]

> [!abstract] Responsabilidad
> UI "tonta" reutilizable y páginas de estado genéricas. Sin tests por regla (`AGENTS.md` §6). Estado: **implementado**.

## Archivos
| Ruta | Función |
|---|---|
| `src/app/shared/ui/button/button.component.ts` | `button[appButton]`, `a[appButton]` |
| `shared/ui/badge/badge.component.ts` | píldora de estado |
| `shared/ui/icon/icon.component.ts` | iconos SVG propios |
| `shared/ui/modal/modal.component.ts` | modal centrado con slots |
| `shared/ui/state-panel/state-panel.component.ts` | panel de estado a pantalla completa |
| `shared/ui/text-field/text-field.component.ts` | campo con etiqueta y error |
| `shared/ui/toast/{toast.service,toast-host.component}.ts` | cola de toasts |
| `shared/pages/module-placeholder.page.ts` | "Módulo en construcción" |
| `shared/pages/not-found.page.ts` | 404, funciona sin sesión |
| `shared/pages/sin-permiso.page.ts` | 403 con botón "Ir a {home}" |
| `shared/pages/sin-modulos.page.ts` | rol sin módulos |
| `shared/pages/suspendido.page.ts` | vista de solo lectura para no administradores |

## API usada
Ninguna. Las páginas leen `SessionStore` y `navigation.rules`.

## Reglas
Ninguna de negocio. Las páginas derivan textos de `homeLabel` y `roleLabel`.

> [!warning] Copy afectado por el anuncio del backend
> `suspendido.page.ts` dice "Contacta al administrador de tu restaurante para renovar el plan". El backend anunció que el texto debe decir que la plataforma regulariza la suscripción (sin verificar). Ver [[API]].

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Cero dependencias; consistencia visual | Sin tests: un cambio roto se detecta a ojo o por build |
| Slots simples (`[icon]`, `[footer]`, `[actions]`) | Iconos agregados a mano |
| Páginas de estado reutilizan `app-state-panel` | `toast-host` no es puramente presentacional (lee `ToastService`) |

## Cómo extenderlo
- Un componente nuevo no debe importar servicios de features ni `Router`.
- Si necesitas un icono, agrega los paths a `ICONS` en `icon.component.ts`.
- Nueva página de estado: usa `app-state-panel`, no crees otro layout.
- Texto que no esté en el diseño: español neutro y avisa al usuario para revisarlo.
