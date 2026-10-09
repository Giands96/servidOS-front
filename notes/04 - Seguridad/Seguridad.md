---
title: Seguridad
date: 2026-10-08
tags:
  - servidos
  - seguridad
  - auth
aliases:
  - Modelo de seguridad
---

# Seguridad

> [!abstract] Principio
> El front es una conveniencia de UX; el backend es la autoridad. Todo permiso del cliente se puede evadir, así que cada guard evita errores, no protege datos.

Volver: [[00 - MOC]] · Relacionado: [[Core]] · [[Auth]] · [[API]] · [[Flujo del Sistema]] · [[Modelo de Negocio]]

## Sesión
- **Access token** (JWT corto, 10 min según contrato) en un signal de memoria (`SessionStore.accessToken`); nunca en web storage.
- **Refresh token**: cookie `HttpOnly`, `SameSite=Lax`, `path=/api/v1/auth`, 7 días (contrato). JavaScript no puede leerla. Same-origin gracias al proxy.
- `login`, `refresh` y `logout` van con `withCredentials: true`; `refresh` y `logout` añaden `X-Requested-With: XMLHttpRequest` (el backend responde 401 si falta) — `src/app/core/auth/data/auth.api.ts`.
- `restauranteId` y rol vienen de `GET /auth/me`; no hay datos de identidad editables.

## Interceptores
| Interceptor | Qué hace | Archivo |
|---|---|---|
| `authInterceptor` | añade `Bearer` a `/api/v1` (excepto `login`/`refresh`); ante 401 fuera de `/auth/*` hace un refresh y un reintento | `core/http/auth.interceptor.ts` |
| `errorInterceptor` | ante 402 navega a `/paywall` o `/suspendido`; relanza siempre el error | `core/http/error.interceptor.ts` |

Concurrencia: `ensureRefreshed()` comparte una promesa; el interceptor reutiliza un token más nuevo si otra petición ya lo renovó. Rechazo de auth (401/403 del refresh) limpia sesión y va a `/login?expired=1`; red/5xx/429 mantienen sesión y propagan el 401 original.

## Guards
| Guard | Regla | Falla hacia |
|---|---|---|
| `authGuard` | requiere usuario | `/login` |
| `guestGuard` | `/login` solo anónimo | `homeFor(user)` |
| `homeRedirectGuard` | raíz a home o login | — |
| `roleGuard(action)` | `can()` (solo se usa en `/paywall`) | `/sin-permiso` |
| `routeActionGuard` | `data.action` + `can()`; **sin acción deniega** | `/sin-permiso` |
| `subscriptionGuard` | `estado === 'CANCELADA'` a paywall/suspendido; **falla abierto** si el GET falla | `/paywall` o `/suspendido` |

> [!warning] `subscriptionGuard` hoy no está montado en ninguna ruta
> `moduleRoute` se llama sin guards extra. Además, el anuncio del backend (2026-10-08) exige cambiar su criterio a `fechaFin < hoy` (no `CANCELADA`) y mostrar "Tu suscripción termina el {fechaFin}". Sin verificar contra Swagger. Ver [[API]] y [[Pendientes y Deuda Técnica]].

## Fail-closed
- Ruta sin `data.action`: denegada.
- `can()` exige coherencia rol/scope: un rol de plataforma nunca obtiene acciones de tenant y viceversa.
- Entrada de menú con `nav` y sin `action`: no se lista.

## Arranque
`provideAppInitializer(() => inject(SessionStore).hydrate())`: refresh + `me`; anónimo ante fallo; timeout de 8 s con epoch para ignorar respuestas tardías (`HYDRATE_TIMEOUT_MS`).

## WebSocket (cocina)
Token en el frame `CONNECT` (`connectHeaders.Authorization`), nunca en la URL; se recalcula en cada intento de conexión (`beforeConnect`), y la conexión se recicla cuando cambia el token. El backend valida el token solo al conectar (contrato). Canal solo lectura. Ver [[Cocina]].

## Notas de XSS, CSRF y CSP
- **XSS**: Angular escapa plantillas por defecto; el token en memoria reduce el robo persistente pero no impide el uso mientras la página esté comprometida. Una búsqueda en `src/` no encontró `innerHTML`, `bypassSecurity*`, `localStorage` ni `sessionStorage`.
- **CSRF**: la cookie de refresh es `SameSite=Lax` y el backend exige `X-Requested-With`; el access token va en header, no en cookie.
- **CSP**: no hay CSP definida en el repositorio. Si se define: `font-src https://fonts.gstatic.com`. Ver [[Styles y Diseño]].
- **Privacidad**: cada visita contacta a Google para fuentes (ver ADR-11 en [[Decisiones (ADR)]]).

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Sin token en storage persistente | Recarga requiere refresh (latencia al arrancar) |
| Refresh single-flight evita revocar la familia de tokens | Lógica de epoch/abandono compleja de mantener |
| Matriz de permisos única y testeada | Puede desfasarse del backend; no es seguridad real |
| Fallo cerrado en rutas | Falla abierto en `subscriptionGuard` (decisión consciente) |

## Riesgos conocidos
1. Permisos duplicados respecto al backend (desfase posible).
2. Texto de login con correo de soporte y copy no presentes en documentos (`login.page.ts`): confirmar con el usuario.
3. `renovar()` del tenant sigue en `restaurante.api.ts`; el backend anunció su eliminación.
4. Sin CSP ni estrategia de despliegue documentadas.
5. `POST /auth/refresh` con backend lento retrasa el arranque hasta 8 s.
