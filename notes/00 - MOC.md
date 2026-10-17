---
title: ServidOS Front - MOC
date: 2026-10-17
tags:
  - servidos
  - frontend
  - moc
aliases:
  - Indice ServidOS Front
  - Mapa de Contenido Front
---

# ServidOS Front — Mapa de Contenido

> [!abstract] Qué es esta bóveda
> Documentación del cliente Angular de ServidOS (`D:\servidos-frontend\front`). Cada nota es atómica, cita rutas del repositorio y separa lo **verificado en código/docs** de lo **anunciado sin verificar**. Su objetivo: que cualquiera entienda qué hace el proyecto y pueda extenderlo sin romperlo ni convertirlo en spaghetti. El backend tiene su propia bóveda (`ServidOS - MOC` en el repo del backend).

> [!info] Estado del módulo Cocina
> Cocina está **implementada y en `main`** (hasta `2fad5cb`), pero sin prueba manual en navegador, con payload sin verificar contra Swagger y con la review nativa pendiente. Ver [[Fase 3 - Cocina]] y [[Estado Actual]].

> [!info] Cambios del backend (2026-10-08 a 2026-10-16)
> Los cambios anunciados por el backend ya están en su `main` y se verificaron contra su código (`c32dcba`) el 2026-10-16; la verificación se incorporó a esta bóveda el 2026-10-17. Además, el backend:
> - suma `GET /pedidos`, `listoAt` en cocina y el cobro para RECEPCION y CAJERO;
> - pasa el cambio de plan a la plataforma y define los roles de plataforma (ADMIN = SUPERADMIN salvo crear ADMINs; MODERADOR ve y renueva);
> - usa períodos de un mes con `fechaFin` inclusiva;
> - en una rama, crea el dueño junto con el restaurante.
>
> Contrato en [[API]], permisos en [[Modelo de Negocio]] y trabajo pendiente del front en [[Pendientes y Deuda Técnica]]. Qué parte ya implementa el front se indica en cada módulo ([[Plataforma]], [[Pagos]], [[Cocina]], [[Pedidos]]).

> [!info] Estado del módulo Pedidos
> Pedidos (lista + nuevo pedido) está **mergeado en `main`** desde el 2026-10-15 (PRs #8 a #12, `c66c3ff`). El **tablero kanban con drag & drop** (Fase 4b) va en dos cortes: el corte 1 (reglas `tablero.rules.ts` y la dependencia `@angular/cdk`, ADR-20) está **en `main`** (PR #24); el corte 2 (la interfaz del tablero, con alternancia "Tablero | Lista") está implementado en la rama `feat/tablero-02-tablero` y su PR está pendiente. Sin prueba manual en navegador ni táctil. Ver [[Fase 4 - Pedidos]] y [[Estado Actual]].

> [!info] Estado del módulo Plataforma
> Plataforma 01 a 06 (lista, alta con cuenta del dueño y acciones de restaurantes) está **en `main`** (PRs #13 y #14, `f7112e6`). Sin prueba en navegador. Ver [[Fase 5 - Plataforma]], [[Plataforma]] y [[Estado Actual]].

> [!info] Estado del módulo Catálogo
> Catálogo (pantalla del menú, producto, categoría y disponibilidad) está **en `main`** (PRs #16 a #18, `527e1e6`); sin prueba en navegador. Ver [[Fase 6 - Catálogo]], [[Catálogo]] y [[Estado Actual]].

> [!info] Estado del módulo Pagos (Caja)
> El cobro de pedidos (`/caja` y el atajo "Cobrar" de la lista) está **en `main`** (PRs #19 a #22, `b7fb568`, 2026-10-17); sin prueba en navegador. `pagos.registrar` incluye ahora a RECEPCION y CAJERO. El **reembolso está bloqueado** hasta que el backend exponga el `pagoId`. Ver [[Fase 7 - Caja]], [[Pagos]] y [[Estado Actual]].

## Navegación

### 01 - Contexto
- [[Contexto del Proyecto]] — qué es, alcance, stack, cómo ejecutarlo
- [[Modelo de Negocio]] — multi-tenant, suscripción, roles, estados de pedido
- [[Glosario]] — términos del dominio y del código

### 02 - Arquitectura
- [[Arquitectura]] — capas, rutas como fuente única, ventajas y desventajas
- [[Buenas practicas|Reglas anti-spaghetti]] — checklist de qué va dónde y qué no hacer
- [[Decisiones (ADR)]] — decisiones tomadas con contexto y trade-offs

### 03 - Infraestructura
- [[Infraestructura]] — build, proxy, dependencias, flujo git
- [[Testing]] — Vitest, TDD, qué se testea y qué no

### 04 a 07
- [[Seguridad]] — token en memoria, refresh, guards, riesgos
- [[API]] — contrato `/api/v1`, errores, endpoints, cambios anunciados
- [[Flujo del Sistema]] — diagramas de arranque, login, refresh, guards, pedido, cocina en vivo
- [[Styles y Diseño]] — tokens Tailwind 4, tipografía, primitivas, índice de pantallas

### 08 - Fases
- [[Fase 0 - Infra]] · [[Fase 1 - Core Auth]] · [[Fase 2 - Login y Shell]] · [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] (incluye la Fase 4b, tablero) · [[Fase 5 - Plataforma]] · [[Fase 6 - Catálogo]] · [[Fase 7 - Caja]] · [[Fases 4-9 - Planificadas]]

### 09 - Módulos
- [[Core]] · [[Shared]] · [[Auth]] · [[Cocina]] · [[Restaurante]] · [[Pedidos]] · [[Pagos]] · [[Catálogo]] · [[Usuarios]] · [[Plataforma]]

### 10 - Gobierno
- [[Estado Actual]] — qué está hecho, rama, siguiente paso
- [[Pendientes y Deuda Técnica]] — todo lo abierto, incluido el checklist de cambios del backend

## Mapa de notas

```mermaid
graph TD
    MOC[00 - MOC] --> Ctx[Contexto del Proyecto]
    MOC --> Neg[Modelo de Negocio]
    MOC --> Arq[Arquitectura]
    Arq --> Anti[Reglas anti-spaghetti]
    Arq --> ADR[Decisiones ADR]
    MOC --> Infra[Infraestructura]
    Infra --> Test[Testing]
    MOC --> Seg[Seguridad]
    MOC --> API[API]
    MOC --> Flujo[Flujo del Sistema]
    MOC --> Sty[Styles y Diseño]
    MOC --> Fases[08 - Fases]
    MOC --> Mods[09 - Módulos]
    Mods --> Core
    Mods --> Cocina
    Fases --> F3[Fase 3 - Cocina]
    F3 --> Cocina
    Fases --> F4[Fase 4 - Pedidos]
    F4 --> Pedidos
    Fases --> F5[Fase 5 - Plataforma]
    F5 --> Plataforma
    Fases --> F6[Fase 6 - Catálogo]
    F6 --> Catalogo[Catálogo]
    Fases --> F7[Fase 7 - Caja]
    F7 --> Pagos
    Mods --> Pedidos
    Mods --> Plataforma
    Mods --> Catalogo
    Mods --> Pagos
    MOC --> Gob[10 - Gobierno]
    Gob --> Estado[Estado Actual]
    Gob --> Pend[Pendientes y Deuda Técnica]
    Seg --> Core
    API --> Pend
```

> [!tip] Orden de lectura sugerido para alguien nuevo
> [[Contexto del Proyecto]] → [[Modelo de Negocio]] → [[Arquitectura]] → [[Buenas practicas|Reglas anti-spaghetti]] → [[Seguridad]] → el módulo que vaya a tocar en [[Core]] / [[Cocina]].

## Fuentes del repositorio
`AGENTS.md`, `README.md`, `docs/FRONTEND_CONTEXT.md`, `docs/Flujo - Recepcion Cocina.md`, `docs/DESIGN_BRIEF.md`, `docs/frontend-alineacion-seguridad.md`, `docs/progress/*.md`, `odd/tasks/*.md`, y el código bajo `src/`.
