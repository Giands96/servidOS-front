---
title: Decisiones (ADR)
date: 2026-10-08
tags:
  - servidos
  - adr
  - decisiones
aliases:
  - ADR
  - Decisiones de arquitectura
---

# Decisiones (ADR)

> [!abstract] Alcance
> Solo decisiones con evidencia en `docs/progress/*`, `odd/tasks/*` o código. Los commits se citan tal como aparecen en esos documentos o en `git log`.

Volver: [[00 - MOC]] · Ver [[Arquitectura]] · [[Seguridad]] · [[Fase 0 - Infra]] · [[Fase 3 - Cocina]]

## ADR-01 Eliminar SSR (SPA pura)
- **Contexto**: el token vive en memoria y la cookie de refresh tiene `path=/api/v1/auth`; el servidor Node no tendría sesión.
- **Decisión**: quitar SSR (decisión del usuario). Removidos `@angular/ssr`, `@angular/platform-server`, `express`, `@types/express`. Commit `2a2bea3`.
- **Alternativas**: dejar rutas autenticadas en `RenderMode.Client`.
- **Ventajas**: sin superficie de servidor Node, coherente con auth en memoria, menos dependencias.
- **Desventajas**: sin prerender/SEO (irrelevante para app operativa), todo el render ocurre en cliente.

## ADR-02 Access token solo en memoria
- **Contexto**: mitigar robo por XSS.
- **Decisión**: `SessionStore.accessToken` es un signal; nunca web storage. La sesión se restaura al recargar con `POST /auth/refresh` + `GET /auth/me`.
- **Alternativas**: `localStorage`.
- **Ventajas**: no persiste a XSS de almacenamiento.
- **Desventajas**: cada recarga necesita un refresh; un XSS activo aún puede usar el token mientras vive la página. Ver [[Seguridad]].

## ADR-03 Refresh single-flight
- **Contexto**: reusar una cookie ya rotada revoca toda la familia de tokens (robo detectado, logout total).
- **Decisión**: `ensureRefreshed()` comparte una promesa; el interceptor reutiliza el token si otra petición ya renovó. Commits `fed17c2`, `53aa6cb`; endurecimiento `65cc42e`, `3fd8d00`.
- **Ventajas**: N peticiones 401, un solo refresh; sin cierres de sesión espurios.
- **Desventajas**: más complejidad (epoch, abandono de vuelo); requiere tests finos.

## ADR-04 Un refresh transitorio no cierra sesión
- **Decisión** (`65cc42e`): solo 401/403 del refresh limpian sesión; red, 5xx y 429 la mantienen.
- **Desventaja aceptada**: con el backend caído el usuario ve errores en vez de ir a login.

## ADR-05 Timeout de arranque de 8 s
- **Contexto**: Angular no renderiza hasta que `hydrate()` termina; un backend colgado dejaba pantalla en blanco.
- **Decisión**: `HYDRATE_TIMEOUT_MS = 8000`, la app arranca anónima; el `epoch` descarta respuestas tardías.
- **Nota**: 8 s es decisión de UX, no SLA del backend.

## ADR-06 Tabla única de permisos
- **Decisión** (`5943a2b`, `b01c389`): `permissions.rules.ts` es la fuente para guards y botones. `can()` exige que rol y scope coincidan.
- **Ventajas**: un cambio de permiso en un solo lugar. **Desventajas**: duplica conocimiento del backend; puede desfasarse.

## ADR-07 Menú derivado de las rutas
- **Contexto**: la acción estaba escrita en `app.routes.ts` y en `NAV_ITEMS`.
- **Decisión del usuario (2026-10-03)**: "el menú solo debe mostrar las rutas a las que el trabajador puede entrar". Commit `02bca02`, fix `484abaa`.
- **Ventajas**: divergencia imposible por construcción. **Desventajas**: `Route.data` débil, `loadChildren` no soportado. Ver [[Arquitectura]].

## ADR-08 "Restaurante y plan" solo para ADMINISTRADOR
- **Decisión del usuario (2026-10-03)**, commit `1dcd8a8`, test positivo `f5312ca`. Ruta y menú usan `restaurante.suscripcion.gestionar`. `restaurante.ver` se conserva para lecturas (nombre en el sidebar).

## ADR-09 Tailwind 4 con tokens `@theme`
- **Decisión** (`4d8b1c0`): tokens extraídos de `pencil-export` en `src/styles.css`. **Ventajas**: coherencia visual, sin CSS por pantalla. **Desventajas**: depende de que el diseño se mantenga sincronizado con los tokens. Ver [[Styles y Diseño]].

## ADR-10 Iconos propios (SVG inline)
- **Decisión** (`4d8b1c0`): `icon.component.ts` con paths a mano en vez de una librería. **Ventajas**: cero dependencias. **Desventajas**: agregar cada icono a mano.

## ADR-11 Google Fonts (Bricolage Grotesque + Geist)
- **Pedido del usuario**, commit `3a41996`. `preconnect` + hoja con `display=swap`; en producción el build inlinea `@font-face`.
- **Desventajas**: tercero externo (privacidad, CSP `font-src https://fonts.gstatic.com`); alternativa: auto-hospedar `.woff2`. Pendiente al definir infraestructura.

## ADR-12 `subscriptionGuard` falla abierto
- **Decisión** (`1e7592b`): ante error de red el guard deja pasar; el backend sigue aplicando el 402. **Desventaja**: la UI puede mostrar pantallas de escritura que luego fallan con 402 (que redirige igual).

## ADR-13 `**` renderiza 404
- **Decisión** (`7a4245a`): una redirección a `''` generaba bucle mientras no existían las home por rol.

## ADR-14 Dependencia `@stomp/rx-stomp`
- **Decisión del usuario (2026-10-08)**, commit `00c94dd`, revisión nativa aprobada. **Motivo**: tablero de cocina en vivo (WebSocket STOMP nativo en `/ws`). **Alternativa**: polling 5–10 s (previsto antes del cambio de backend). **Desventajas**: dependencia nueva (`@stomp/stompjs 7.3.0` transitiva); requiere tests de conexión/reconexión (advisory de la review).

## ADR-15 Umbrales del cronómetro de cocina
- **Decisión del usuario (2026-10-08)**: Atención a 15 min, Crítico a 25 min; el texto del diseño EGPHx manda sobre los colores de `cocina-admin.png`. Constante única `URGENCY_THRESHOLDS` en `cocina.rules.ts`.

## ADR-16 `/cocina` sin `subscriptionGuard`
- **Contexto**: el backend permite marcar listo aun con suscripción bloqueada (anunciado §5). **Decisión**: la ruta no lleva el guard (comentario en `app.routes.ts`). **Desventaja**: depende de la veracidad del anuncio, **sin verificar contra Swagger**.

## ADR-17 FRONTEND_CONTEXT manda sobre el diseño
- **Decisión del usuario**: pantallas que requieren endpoints no documentados no se construyen (p. ej. `GET /pedidos`, `GET /usuarios`).

## ADR-18 Proxy de desarrollo mismo origen
- **Decisión**: `proxy.conf.json` (`/api` y `/ws`) para que la cookie `refresh_token` sea same-origin y no dependa de CORS.

## ADR-19 `moduleRoute` acepta `load` y `/cocina` no lleva `subscriptionGuard`
- **Contexto**: había que sustituir el placeholder de `/cocina` por la página real sin perder el guard de permisos ni el menú derivado.
- **Decisión** (`2fad5cb`): `moduleRoute(action, label, icon, guards = [], load = placeholder)` recibe el componente real como 5.º parámetro; se conserva `[routeActionGuard, ...guards]`. Para `/cocina` se pasa `guards = []`: sin `subscriptionGuard`, porque marcar listo se permite con suscripción bloqueada (anunciado §5, sin verificar). Dos tests de ruta lo fijan.
- **Alternativas**: declarar la ruta a mano con `canActivate` propio (riesgo de perder `routeActionGuard`, ver R2-001).
- **Ventajas**: permiso y menú siguen declarados en un solo lugar. **Desventajas**: depende de la veracidad del anuncio del backend; la firma posicional de `moduleRoute` crece (5 parámetros).

> [!note] Decisión de proceso
> Flujo ODD v3 con revisiones nativas (RDD) por commit/slice. Ver [[Infraestructura]].
