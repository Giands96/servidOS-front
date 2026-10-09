---
title: Auth
date: 2026-10-08
tags:
  - servidos
  - modulos
  - auth
aliases:
  - Módulo Auth
  - Login
---

# Auth (feature de login)

Volver: [[00 - MOC]] · Lógica de sesión: [[Core]] · [[Seguridad]] · [[Flujo del Sistema]]

> [!abstract] Responsabilidad
> Página de login y sus reglas puras. La sesión misma vive en [[Core]]. Estado: **implementado**.

## Archivos
- `src/app/features/auth/login.page.ts` — orquesta el formulario.
- `src/app/features/auth/domain/login.rules.ts` (+ spec) — `formatCountdown`, `countdownProgress`, `loginErrorMessage`, `marksFields`, `INVALID_CREDENTIALS`.

## API usada
`POST /auth/login` y `GET /auth/me` (a través de `SessionStore.login`).

## Reglas de dominio
- 401: siempre "Credenciales inválidas" (no revela qué falló).
- 429: sin mensaje; cuenta regresiva con `Retry-After` (fallback 60 s, mínimo 1 s) y barra de progreso; formulario y botón deshabilitados.
- 422: banner con el mensaje del backend o "Revisa los datos ingresados"; marca ambos campos.
- Estado 0: "No se pudo conectar con el servidor".
- `?expired=1`: modal "Tu sesión expiró".

## Permisos
Ruta pública con `guestGuard` (un usuario con sesión va a su home).

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas puras testeadas (16 tests) | La página no tiene test (429, fallback 60 s) |
| Mensaje genérico evita enumeración de usuarios | En 422 solo hay un mensaje, no por campo |
| Login atómico (si `me` falla se limpia) | Panel izquierdo con degradado, sin foto |

> [!note] Texto sin respaldo documental
> El panel izquierdo incluye "Soporte: soporte@servidos.pe", el titular y los ítems de la lista. No aparecen en los documentos leídos; confirmarlos con el usuario.

## Cómo extenderlo sin romperlo
- Nuevos mensajes o estados: en `login.rules.ts` con test, no en la página.
- No guardes credenciales ni el token fuera del `SessionStore`.
- Cualquier cambio de redirección post-login pasa por `homeFor` (no hardcodear rutas).
