---
title: ServidOS Front - MOC
date: 2026-10-16
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

> [!info] Estado del módulo Pedidos
> Pedidos (lista + nuevo pedido) está **mergeado en `main`** desde el 2026-10-15 (PRs #8 a #12, `c66c3ff`). El **tablero kanban con drag & drop** (Fase 4b) está implementado en dos ramas locales sin publicar (2026-10-16, punta `335ef1e`, 1087 tests; añade la dependencia `@angular/cdk`, ADR-20). Sin prueba manual en navegador ni táctil. Ver [[Fase 4 - Pedidos]] y [[Estado Actual]].

> [!info] Estado del módulo Plataforma
> Plataforma 01 a 06 (lista, alta con la cuenta del dueño y acciones de restaurantes) está **en `main`** desde el 2026-10-16 (PRs #13 y #14 de GitHub, `main` en `fdd9c50`). Sin prueba en navegador. Ver [[Fase 5 - Plataforma]], [[Plataforma]] y [[Estado Actual]].

> [!info] Estado del módulo Catálogo
> Catálogo 01 y 02 (escrituras, reglas y pantalla `/catalogo`) están **en `main`** (PRs #16 y #17 de GitHub, 2026-10-16); Catálogo 03 (modales de producto y categoría) sigue pendiente en GitHub y debe reubicarse sobre `main`. Sin prueba en navegador. Ver [[Fase 6 - Catálogo]], [[Catálogo]] y [[Estado Actual]].

## Navegación

### 01 - Contexto
- [[Contexto del Proyecto]] — qué es, alcance, stack, cómo ejecutarlo
- [[Modelo de Negocio]] — multi-tenant, suscripción, roles, estados de pedido
- [[Glosario]] — términos del dominio y del código

### 02 - Arquitectura
- [[Arquitectura]] — capas, rutas como fuente única, ventajas y desventajas
- [[Reglas anti-spaghetti]] — checklist de qué va dónde y qué no hacer
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
- [[Fase 0 - Infra]] · [[Fase 1 - Core Auth]] · [[Fase 2 - Login y Shell]] · [[Fase 3 - Cocina]] · [[Fase 4 - Pedidos]] (incluye la Fase 4b, tablero) · [[Fase 5 - Plataforma]] · [[Fase 6 - Catálogo]] · [[Fases 4-9 - Planificadas]]

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
    Mods --> Pedidos
    Mods --> Plataforma
    Mods --> Catalogo
    MOC --> Gob[10 - Gobierno]
    Gob --> Estado[Estado Actual]
    Gob --> Pend[Pendientes y Deuda Técnica]
    Seg --> Core
    API --> Pend
```

> [!tip] Orden de lectura sugerido para alguien nuevo
> [[Contexto del Proyecto]] → [[Modelo de Negocio]] → [[Arquitectura]] → [[Reglas anti-spaghetti]] → [[Seguridad]] → el módulo que vaya a tocar en [[Core]] / [[Cocina]].

## Fuentes del repositorio
`AGENTS.md`, `README.md`, `docs/FRONTEND_CONTEXT.md`, `docs/Flujo - Recepcion Cocina.md`, `docs/DESIGN_BRIEF.md`, `docs/frontend-alineacion-seguridad.md`, `docs/progress/*.md`, `odd/tasks/*.md`, y el código bajo `src/`.
