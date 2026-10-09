---
title: Glosario
date: 2026-10-08
tags:
  - servidos
  - glosario
aliases:
  - Términos
---

# Glosario

Volver: [[00 - MOC]] · Ver también [[Modelo de Negocio]] · [[Arquitectura]]

| Término | Significado |
|---|---|
| **Tenant** | Un restaurante. Todo dato operativo está aislado por tenant. |
| **Plataforma** | Nivel superior que gestiona restaurantes y suscripciones (`SUPERADMIN`, `ADMIN`, `MODERADOR`). |
| **Scope** | `plataforma` si `restauranteId === null`, si no `restaurante` (`scopeOf`). |
| **Action** | Cadena tipada de permiso, p. ej. `cocina.ver`, definida en `permissions.rules.ts`. |
| **`can(user, action)`** | Única función que decide permisos en la UI. Solo conveniencia: el backend manda. |
| **`homeFor`** | Ruta de aterrizaje por rol tras el login. |
| **`moduleRoute`** | Helper de `src/app/app.routes.ts` que declara permiso, entrada de menú y título de una ruta en un solo lugar. |
| **`routeActionGuard`** | Guard que lee `route.data.action` y aplica `can()`; falla cerrado. |
| **`navEntriesFrom`** | Deriva las entradas del sidebar recorriendo `router.config`. |
| **Paywall** | Pantalla `/paywall` (ADMINISTRADOR) ante un 402. |
| **402** | "Payment Required": escritura bloqueada por suscripción. No confundir con 403 (sin permiso). |
| **Single-flight refresh** | N peticiones con 401 comparten un solo `POST /auth/refresh`. |
| **Hydrate** | Restaurar sesión al arrancar con refresh + `GET /auth/me`. |
| **Epoch** | Contador en `SessionStore` que invalida respuestas tardías tras `clear()`. |
| **Cola** | Pedidos `EN_PREPARACION` que ve cocina (`GET /cocina/cola`). |
| **Listos** | Pedidos `LISTO` pendientes de salir (`GET /cocina/listos`). |
| **STOMP** | Protocolo de mensajería sobre WebSocket usado para el tablero de cocina en vivo. |
| **Resync** | Volver a pedir cola y listos en cada (re)conexión, porque los mensajes se pierden desconectado. |
| **Atención / Crítico** | Umbrales del cronómetro de cocina: 15 y 25 minutos (decisión del usuario, 2026-10-08). |
| **ODD** | Organic Driven Development: flujo de trabajo del proyecto (`AGENTS.md` §0). |
| **RDD** | Receipt-driven development: revisiones nativas por commit; aparecen en `docs/progress` y `odd/tasks`. |
| **Page&lt;T&gt;** | Respuesta paginada estilo Spring (`content`, `totalElements`, …) en `api.types.ts`. |
| **pencil-export** | Carpeta con PNG del diseño. Ver [[Styles y Diseño]]. |
| **Placeholder** | Página "Módulo en construcción" (`module-placeholder.page.ts`) para módulos no construidos. |
