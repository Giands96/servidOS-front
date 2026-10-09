---
title: Flujo del Sistema
date: 2026-10-08
tags:
  - servidos
  - flujos
  - mermaid
aliases:
  - Flujos
  - Diagramas
---

# Flujo del Sistema

> [!abstract] Contenido
> Diagramas derivados del código (`session.store.ts`, interceptores, guards, `cocina-live.ts`) y del documento de Flujo. El diagrama de cocina en vivo coincide con `cocina-live.ts` y `cocina.page.ts` (implementado, sin prueba manual).

Volver: [[00 - MOC]] · Relacionado: [[Seguridad]] · [[Modelo de Negocio]] · [[Cocina]] · [[API]]

## Arranque de la app
```mermaid
sequenceDiagram
    participant B as bootstrapApplication
    participant S as SessionStore.hydrate
    participant A as AuthApi
    B->>S: provideAppInitializer
    S->>A: POST /auth/refresh (cookie)
    alt refresh ok
        A-->>S: accessToken
        S->>A: GET /auth/me
        A-->>S: usuario
        S-->>B: sesión restaurada
    else fallo o 8 s
        S-->>B: anónimo (clear, epoch++)
    end
    B->>B: Router evalúa guards
```

## Login
```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as LoginPage
    participant S as SessionStore
    participant A as AuthApi
    U->>L: envía correo y contraseña
    L->>S: login()
    S->>A: POST /auth/login
    A-->>S: accessToken + cookie refresh
    S->>A: GET /auth/me
    alt me falla
        S->>S: clear() y relanza
    end
    S-->>L: ok
    L->>L: navigate(homeFor(user))
    Note over L: 401 mensaje genérico, 422 marca campos, 429 cuenta regresiva
```

## Petición con refresh
```mermaid
sequenceDiagram
    participant C as Componente
    participant I as authInterceptor
    participant S as SessionStore
    participant API as Backend
    C->>I: GET /api/v1/x
    I->>API: Bearer token
    API-->>I: 401
    I->>S: ensureRefreshed (single-flight)
    S->>API: POST /auth/refresh
    alt 401 o 403
        S->>S: clear
        I-->>C: error y navega a /login?expired=1
    else red, 5xx, 429
        I-->>C: 401 original (sesión se mantiene)
    else ok
        I->>API: reintenta con token nuevo
        API-->>C: respuesta
    end
```

## Decisión de guards al entrar a una ruta
```mermaid
flowchart TD
    A[navegación] --> B{authGuard: hay usuario?}
    B -- no --> L[/login/]
    B -- sí --> C{routeActionGuard: data.action definida?}
    C -- no --> P[/sin-permiso/]
    C -- sí --> D{can user action?}
    D -- no --> P
    D -- sí --> E{guards extra: subscriptionGuard?}
    E -- bloqueado --> W[/paywall o suspendido/]
    E -- ok --> F[carga la página lazy]
```

## Ciclo de vida del pedido
Fuente: `docs/Flujo - Recepcion Cocina.md` regla 5 (más anuncios del 2026-10-08, sin verificar, marcados).
```mermaid
stateDiagram-v2
    [*] --> PENDIENTE: RECEPCION crea
    PENDIENTE --> EN_PREPARACION: RECEPCION confirma
    EN_PREPARACION --> LISTO: COCINERO marca listo
    LISTO --> ENTREGADO: RECEPCION entrega (MESA/RECOJO)
    LISTO --> EN_ENTREGA: DELIVERY
    EN_ENTREGA --> ENTREGADO: RECEPCION entrega
    PENDIENTE --> CANCELADO
    EN_PREPARACION --> CANCELADO
    LISTO --> CANCELADO
    EN_ENTREGA --> CANCELADO: anunciado, sin verificar (si no pagado)
    ENTREGADO --> [*]
    CANCELADO --> [*]
```

## Tablero de cocina en vivo
```mermaid
sequenceDiagram
    participant P as CocinaPage
    participant L as CocinaLive
    participant WS as /ws STOMP
    participant API as cocina.api
    P->>API: carga HTTP inicial de cola y listos
    P->>L: start()
    L->>WS: CONNECT con Bearer (beforeConnect)
    WS-->>L: conectado
    L-->>P: connected$ emite
    P->>API: GET /cocina/cola y /listos (resync en cada conexión)
    WS-->>L: {pedidoId, estadoAnterior, estadoNuevo}
    L-->>P: events$
    P->>P: applyKitchenEvent(board, event)
    Note over L: cambia el token: deactivate y activate con token nuevo
    Note over L: sin restaurante o sin token: desconectado
    P->>API: POST /cocina/pedidos/{id}/listo
```
`applyKitchenEvent`: `EN_PREPARACION` pide refetch de cola; `LISTO` mueve la tarjeta localmente o pide refetch de listos; otro estado quita la tarjeta de donde estaba.
