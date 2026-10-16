---
title: Fase 5 - Plataforma
date: 2026-10-16
tags:
  - servidos
  - fases
  - plataforma
aliases:
  - Fase 5
  - Lista, alta y acciones de restaurantes
---

# Fase 5 — Plataforma (lista, alta y acciones de restaurantes)

Volver: [[00 - MOC]] · Anterior: [[Fase 4 - Pedidos]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Plataforma]]

> [!warning] Implementada en ramas locales, pendiente de merge (2026-10-16)
> Las cinco tareas de código están en cinco ramas apiladas (`feat/plataforma-01-datos` … `feat/plataforma-05-acciones`), **todavía no están en `main`** ni publicadas. Falta mergear la cadena (squash, en orden) y probar en navegador: **nada de esta fase se probó en navegador**. Fuente: `docs/progress/08-fase-5-plataforma.md` y `odd/tasks/plataforma.md`.

> [!abstract] Objetivo
> Reemplazar los placeholders de `/plataforma/restaurantes` y `/plataforma/restaurantes/nuevo` por la **lista de restaurantes con panel de detalle** (diseño `x9DxqV`), el **formulario de alta** (diseño `z8ZbK`) y las **acciones del dueño** sobre el panel: Renovar suscripción, Cambiar plan y Suspender/Reactivar. Sin esto no se puede crear ni habilitar un restaurante y, por tanto, no se puede probar ninguna pantalla del tenant (Cocina, Pedidos).

## Alcance decidido con el usuario
"Diseño + acciones" (2026-10-15): las dos pantallas del diseño más las tres acciones con modales de confirmación en el estilo existente. Entrega en cadena `stacked-to-main`. Sin specs de página por AGENTS §6. Fuera de alcance: gestión de usuarios de plataforma (no hay `GET /usuarios`), crear el ADMINISTRADOR del tenant (no hay endpoint), filtros y búsqueda (el backend no los ofrece).

## Tareas y commits
| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T5.1 | `0003c47` | `feat/plataforma-01-datos` | tipos, `PlataformaApi`, acciones de permiso (SUPERADMIN), builders |
| T5.2 | `2596829` | `feat/plataforma-02-reglas` | reglas puras del dashboard y del alta |
| T5.3 | `28efe2e` | `feat/plataforma-03-lista` | página de la lista con panel, cambio de ruta, íconos |
| T5.4 | `3923b7a` | `feat/plataforma-04-alta` | formulario de alta (modal en la lista, página en `/nuevo`), `app-modal` y `text-field` ampliados |
| T5.5 | `86de23a` | `feat/plataforma-05-acciones` | Renovar, Cambiar plan, Suspender/Reactivar con confirmación |
| T5.6 | — | `docs/obsidian-pedidos-merge` | nota de progreso, cuerpos de PR y estas notas del Vault |

## Evidencia
- Punta de la cadena (`86de23a`): **24 archivos, 907 tests en verde**; plataforma 3 archivos / 117; `npx ng build` OK. Base `main` (`c66c3ff`): 21 archivos / 770.
- Por tarea (suite completa): T5.1 22 / 799, T5.2 24 / 891, T5.3 24 / 892, T5.4 24 / 896, T5.5 24 / 907.
- RED registrados en cada tarea (módulos o exports inexistentes, spec de rutas contra el placeholder); detalle en `docs/progress/08-fase-5-plataforma.md`.
- Reviews nativas aprobadas: T5.1 (`review-298b587d17b07cc8`, riesgo alto, 4 lentes); T5.2 + T5.3 (`review-771ebd1248f0ad2d`); T5.4 + T5.5 (`review-abcfded157918a82`).
- Dos `operation_timeout` en el preflight de la herramienta de revisión se canalizaron como defecto de Gentle AI (issues abiertos #4208 y #4655); los comentarios de ocurrencia **no se publicaron** (sin acceso autenticado a GitHub) y quedaron como borradores locales.
- Tamaños: T5.1 362 líneas; T5.2 864; T5.3 506; T5.4 471; T5.5 464. Los cuatro últimos piden `size:exception`.

## Hechos del contrato (verificados en vivo el 2026-10-15)
- `GET /restaurantes?page&size&sort` → `Page<RestauranteDashboardResponse>`; `size` por defecto 10; `sort=nombre,asc|desc` verificado. **Un campo de orden desconocido da 500**: el cliente solo envía campos conocidos.
- `POST /restaurantes` crea el restaurante pero **no** al ADMINISTRADOR del tenant. `demoDias` 1–30 solo con `demo`.
- Renovar registra un mes pagado y pasa un `INACTIVO` a `ACTIVO`; el cambio de estado **no toca la suscripción** (reactivar un tenant vencido lo deja bloqueado: hay que Renovar); cambiar plan exige suscripción `ACTIVA`.
- Detalle completo en [[Plataforma]] y [[API]].

## Decisiones
Defaults del orquestador (a revisar con el usuario): modal de alta sobre la lista para SUPERADMIN y página `/nuevo` para ADMIN; estado derivado "Vencida" y "Sin suscripción" en la insignia; ids simples en el panel; plan precargado al Renovar; "Cambiar plan" solo con `ACTIVA` vigente; aviso al reactivar un tenant vencido. El pie del diseño "Solo CANCELADA bloquea escrituras" no se copió: está desactualizado frente al contrato §5.

## Pendientes
Mergear la cadena en orden (squash; reubicar cada rama sobre `main` tras cada merge); prueba en navegador de todas las pantallas (plataforma y luego tenant); cerrar con Escape el panel y el modal; partir `restaurantes.page.ts` (847 líneas) en componentes; crear el ADMINISTRADOR del tenant (sin endpoint: en desarrollo se usa el script del backend `scripts/sql/crear_admin.sql`, cuyo correo por defecto choca con el del usuario de arranque de la plataforma, hay que cambiarlo antes de ejecutarlo); gestión de usuarios de plataforma (bloqueada). Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
