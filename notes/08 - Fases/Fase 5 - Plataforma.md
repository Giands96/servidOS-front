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

> [!success] Mergeada en `main` (2026-10-17)
> Las seis tareas de código (`feat/plataforma-01-datos` … `feat/plataforma-06-administrador`) están en `main`: PR #13 (01 a 05) y PR #14 (06). Pendiente: probar en navegador; **nada de esta fase se probó en navegador**. Fuente: `docs/progress/08-fase-5-plataforma.md` y `odd/tasks/plataforma.md`.

> [!abstract] Objetivo
> Reemplazar los placeholders de `/plataforma/restaurantes` y `/plataforma/restaurantes/nuevo` por la **lista de restaurantes con panel de detalle** (diseño `x9DxqV`), el **formulario de alta** (diseño `z8ZbK`) y las **acciones del dueño** sobre el panel: Renovar suscripción, Cambiar plan y Suspender/Reactivar. Sin esto no se puede crear ni habilitar un restaurante y, por tanto, no se puede probar ninguna pantalla del tenant (Cocina, Pedidos).

## Alcance decidido con el usuario
"Diseño + acciones" (2026-10-15): las dos pantallas del diseño más las tres acciones con modales de confirmación en el estilo existente. Entrega en cadena `stacked-to-main`. Sin specs de página por AGENTS §6. Fuera de alcance: gestión de usuarios de plataforma (no hay `GET /usuarios`), filtros y búsqueda (el backend no los ofrece). Crear el ADMINISTRADOR del tenant estaba fuera de alcance por falta de endpoint; **se incorporó el 2026-10-16 como T5.7** tras el cambio de backend (ver abajo).

## Tareas y commits
| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T5.1 | `0003c47` | `feat/plataforma-01-datos` | tipos, `PlataformaApi`, acciones de permiso (SUPERADMIN), builders |
| T5.2 | `2596829` | `feat/plataforma-02-reglas` | reglas puras del dashboard y del alta |
| T5.3 | `28efe2e` | `feat/plataforma-03-lista` | página de la lista con panel, cambio de ruta, íconos |
| T5.4 | `3923b7a` | `feat/plataforma-04-alta` | formulario de alta (modal en la lista, página en `/nuevo`), `app-modal` y `text-field` ampliados |
| T5.5 | `86de23a` | `feat/plataforma-05-acciones` | Renovar, Cambiar plan, Suspender/Reactivar con confirmación |
| T5.6 | — | `docs/obsidian-pedidos-merge` | nota de progreso, cuerpos de PR y estas notas del Vault |
| T5.7 | `c6085d9` | `feat/plataforma-06-administrador` | cuenta del dueño: `administrador` en `POST /restaurantes`, asistente de dos pasos (Restaurante, Administrador), errores del servidor por campo y por paso |

## Evidencia
- Punta de la cadena (`c6085d9`): **24 archivos, 939 tests en verde**; plataforma 3 archivos / 149; `npx ng build` OK. Base `main` (`c66c3ff`): 21 archivos / 770.
- Por tarea (suite completa): T5.1 22 / 799, T5.2 24 / 891, T5.3 24 / 892, T5.4 24 / 896, T5.5 24 / 907, T5.7 24 / 939.
- RED registrados en cada tarea (módulos o exports inexistentes, spec de rutas contra el placeholder); detalle en `docs/progress/08-fase-5-plataforma.md`.
- Reviews nativas aprobadas: T5.1 (`review-298b587d17b07cc8`, riesgo alto, 4 lentes); T5.2 + T5.3 (`review-771ebd1248f0ad2d`); T5.4 + T5.5 (`review-abcfded157918a82`); T5.7 (`review-9ffad59b9f186eed`, `86de23a..c6085d9`, riesgo medio, 9 archivos / 975 líneas).
- Dos `operation_timeout` en el preflight de la herramienta de revisión se canalizaron como defecto de Gentle AI (issues abiertos #4208 y #4655); los comentarios de ocurrencia **no se publicaron** (sin acceso autenticado a GitHub) y quedaron como borradores locales.
- Tamaños: T5.1 362 líneas; T5.2 864; T5.3 506; T5.4 471; T5.5 464; T5.7 975. Los cinco últimos piden `size:exception`.

## Hechos del contrato (verificados en vivo el 2026-10-15)
- `GET /restaurantes?page&size&sort` → `Page<RestauranteDashboardResponse>`; `size` por defecto 10; `sort=nombre,asc|desc` verificado. **Un campo de orden desconocido da 500**: el cliente solo envía campos conocidos.
- `POST /restaurantes`: `demoDias` 1–30 solo con `demo`. Contrato original (2026-10-15): no creaba al ADMINISTRADOR del tenant. **Vigente desde el 2026-10-16**: exige `administrador` (nombre 2–100, apellido ≤100, email ≤150 único, contraseña 8–72), crea restaurante, suscripción, usuario y membresía en una transacción, responde 201 `RestauranteCreadoResponse` y da 409 por email duplicado y 422 `campo: mensaje`.
- Renovar registra un mes pagado y pasa un `INACTIVO` a `ACTIVO`; el cambio de estado **no toca la suscripción** (reactivar un tenant vencido lo deja bloqueado: hay que Renovar); cambiar plan exige suscripción `ACTIVA`.
- Detalle completo en [[Plataforma]] y [[API]].

## Decisiones
Defaults del orquestador (a revisar con el usuario): modal de alta sobre la lista para SUPERADMIN y página `/nuevo` para ADMIN; estado derivado "Vencida" y "Sin suscripción" en la insignia; ids simples en el panel; plan precargado al Renovar; "Cambiar plan" solo con `ACTIVA` vigente; aviso al reactivar un tenant vencido. El pie del diseño "Solo CANCELADA bloquea escrituras" no se copió: está desactualizado frente al contrato §5.

## T5.7 — Cuenta del dueño (2026-10-16)
- **Brecha reportada por el usuario**: un restaurante creado desde la plataforma no tenía con qué iniciar sesión (`POST /restaurantes` no creaba al dueño y `POST /usuarios` es solo del tenant).
- **Decisiones del usuario**: el dueño se crea en el mismo `POST /restaurantes`, en una transacción; el usuario implementó el backend; a mitad de la tarea pidió una creación en dos pasos, hecha como asistente sobre la única petición atómica.
- **Front**: **Paso 1 Restaurante**, **Paso 2 Administrador**; una sola petición al confirmar; errores del servidor bajo cada campo y el asistente vuelve al paso con el error; contraseñas limpiadas tras el éxito y nunca mostradas; el aviso de éxito informa el email del dueño.
- **Evidencia**: `c6085d9`; plataforma 149, suite 24 archivos / 939, build OK; review `review-9ffad59b9f186eed` aprobada. Sin prueba en navegador. **El PR #15 requiere el backend con `administrador` desplegado primero.**

## Pendientes
Prueba en navegador de todas las pantallas (plataforma y luego tenant); cerrar con Escape el panel y el modal; partir `restaurantes.page.ts` (847 líneas) en componentes; probar en navegador el asistente de T5.7 y el login real del dueño (el ADMINISTRADOR del tenant ya se crea en el alta; el script `scripts/sql/crear_admin.sql` ya no hace falta para restaurantes nuevos); gestión de usuarios de plataforma (bloqueada). Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
