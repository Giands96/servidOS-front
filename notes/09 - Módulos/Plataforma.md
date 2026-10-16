---
title: Plataforma
date: 2026-10-16
tags:
  - servidos
  - modulos
  - plataforma
  - implementado-en-ramas
aliases:
  - Módulo Plataforma
  - Restaurantes (plataforma)
---

# Plataforma

Volver: [[00 - MOC]] · Fase: [[Fase 5 - Plataforma]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Nivel plataforma: listar restaurantes con su suscripción, crear restaurantes **junto con la cuenta de su dueño** y operarlos (renovar, cambiar de plan, suspender o reactivar). El tenant paga al dueño por Yape, fuera de la app; el dueño confirma y habilita **desde aquí**.

> [!warning] Estado: implementada en 6 ramas locales, pendiente de merge (2026-10-16)
> Las pantallas existen en `feat/plataforma-01-datos` … `feat/plataforma-06-administrador` (punta `c6085d9`, 24 archivos / 939 tests, build OK), pero **todavía no están en `main`**. En `main` (`c66c3ff`) las rutas siguen siendo placeholders. Sin prueba manual en navegador y sin spec de las páginas (AGENTS §6). Detalle en [[Fase 5 - Plataforma]].

## Pantallas
| Ruta | Rol | Qué hace |
|---|---|---|
| `/plataforma/restaurantes` | SUPERADMIN | Tabla de restaurantes (10 por página, orden por nombre A–Z / Z–A, paginador numerado) y panel de detalle con las acciones. Diseño `x9DxqV` |
| modal "Crear restaurante" sobre la lista | SUPERADMIN | Asistente de dos pasos (ver abajo). Al crear cierra el modal y recarga la lista. Diseño `z8ZbK` |
| `/plataforma/restaurantes/nuevo` | SUPERADMIN y ADMIN | El mismo asistente como página (ADMIN no ve la lista). Al crear: aviso de éxito (con el email del dueño) y formulario reiniciado |

## Alta con cuenta del dueño (T5.7)
- **Asistente de dos pasos**: **Paso 1 Restaurante** (slug, nombre, dirección, plan, demo) y **Paso 2 Administrador** (nombre, apellido, email, contraseña con confirmación en el cliente). "Siguiente" avanza solo si el paso es válido.
- **Una sola petición atómica**: al confirmar se envía un único `POST /restaurantes` con `administrador`; el backend crea restaurante, suscripción, usuario y membresía ADMINISTRADOR en una transacción.
- **Errores por campo**: el 409 (email duplicado) bajo Email, los 422 `administrador.*` bajo su campo y el 400 de slug bajo Slug. Si el error es de otro paso, el asistente vuelve a ese paso.
- **Contraseñas**: se limpian tras el éxito y nunca aparecen en avisos ni mensajes.
- Commit `c6085d9`, rama `feat/plataforma-06-administrador` (9 archivos, 975 líneas, `size:exception`). **Requiere el cambio de backend desplegado primero.** Review `review-9ffad59b9f186eed` aprobada.

La insignia de suscripción muestra Activa, Cancelada, **Vencida** (derivada: `fechaFin` anterior a hoy en hora de Lima) o "Sin suscripción" (`suscripcion` nulo).

## Acciones del panel (solo SUPERADMIN, con modal de confirmación)
- **Renovar suscripción**: registra un mes pagado. El plan viene precargado con el actual; es obligatorio si no hay suscripción previa. Si la actual sigue vigente, la nueva empieza el día siguiente a su fin; un restaurante `INACTIVO` pasa a `ACTIVO`.
- **Cambiar plan**: solo con suscripción `ACTIVA` y no vencida. No reactiva un `INACTIVO`.
- **Suspender / Reactivar**: `INACTIVO` deja al tenant en solo lectura (escrituras con 402). **No toca la suscripción**: reactivar un tenant vencido lo deja bloqueado y el modal avisa que hay que Renovar.
- Los mensajes 400 del backend se muestran tal cual y, ante un 4xx, la lista se recarga. Tras el éxito también se recarga.

## Archivos (en las ramas)
| Ruta | Contenido |
|---|---|
| `features/plataforma/plataforma.types.ts` | restaurante del dashboard, suscripción, plan y requests |
| `features/plataforma/data/plataforma.api.ts` | `listar`, `crear`, `detalle`, `suscripcion`, `renovar`, `cambiarEstado`, `cambiarPlan`, `planes` |
| `features/plataforma/domain/plataforma.rules.ts` | vista de suscripción (`estadoCopy`), acciones disponibles, paginador, `canConfirmAction`, `planChoiceOptions`, `renovarPlanIdToSend` |
| `features/plataforma/domain/crear-restaurante.rules.ts` | validación del alta por paso (`canAdvance`), `toRequest` con `administrador`, errores por campo (`fieldErrorsFromResponse`, `firstStepWithErrors`, `stepErrors`, `stepOfField`), `restauranteCreadoMessage` |
| `features/plataforma/restaurantes.page.ts` | lista, panel y acciones (solo orquesta; **847 líneas**, por partir en componentes) |
| `features/plataforma/crear-restaurante-form.component.ts` | asistente de dos pasos compartido (modal y página) |
| `features/plataforma/crear-restaurante.page.ts` | página de `/nuevo` para ADMIN |
| `shared/ui/modal`, `shared/ui/text-field` | ampliados: `form` y `closed` en el modal; `mono`, `hint` e `inputmode` en el campo |

## API usada
Verificada contra el OpenAPI local y con una sonda en vivo el 2026-10-15. Tabla de endpoints y roles en [[API]].
- `GET /restaurantes?page&size&sort` (SUPERADMIN). `size` por defecto 10; **un `sort` desconocido da 500**, así que solo se envía `nombre`.
- `POST /restaurantes` (SUPERADMIN y ADMIN): `slug` 3–100 `^[a-z0-9-]+$`, `nombre` ≤150, `direccion` ≤255, `planId`, `demo` y `demoDias` 1–30. 400 por slug duplicado, plan inexistente o demo inválido; 422 por validación (`campo: mensaje`). Desde el cambio de backend del 2026-10-16 exige `administrador` (`AdministradorRequest`: `nombre` 2–100, `apellido` ≤100, `email` ≤150 y único, `password` 8–72), responde 201 `RestauranteCreadoResponse` (con `administrador { usuarioId, email, nombre }`, sin contraseña) y da 409 por email ya registrado.
- `GET /restaurantes/{id}` y `/{id}/suscripcion`, `POST /restaurantes/{id}/suscripcion/renovar`, `PATCH /restaurantes/{id}/estado`, `PATCH /restaurantes/{id}/plan` (SUPERADMIN).
- `GET /planes`: solo planes `ACTIVO`, por precio ascendente.

## Permisos
`plataforma.restaurantes.ver`: SUPERADMIN. `plataforma.restaurantes.crear`: SUPERADMIN y ADMIN. `plataforma.suscripcion.gestionar` (renovar y cambiar plan) y `plataforma.restaurantes.estado` (suspender y reactivar): solo SUPERADMIN, agregadas en T5.1. `navFor` oculta "Crear restaurante" si el rol ya ve la lista. MODERADOR no tiene módulos y mantiene `/sin-modulos`.

## Decisiones
- Usuario (2026-10-15): "Diseño + acciones".
- Usuario (2026-10-16): el dueño se crea en el mismo `POST /restaurantes` (el usuario implementó el backend); a mitad de la tarea pidió un alta en dos pasos, implementada como asistente sobre la única petición atómica.
- Defaults del orquestador, a revisar con el usuario: modal sobre la lista para SUPERADMIN y página `/nuevo` para ADMIN; estados derivados "Vencida" y "Sin suscripción"; ids simples en el panel; plan precargado al Renovar; "Cambiar plan" solo con `ACTIVA` vigente.
- El pie del diseño "Solo CANCELADA bloquea escrituras" no se copió: contradice el contrato §5 (`CANCELADA` opera hasta `fechaFin`; bloquea `INACTIVO`, sin suscripción o vencida).

## Huecos conocidos
- ~~Crear el ADMINISTRADOR del tenant no tiene endpoint.~~ **Resuelto el 2026-10-16 (T5.7)**: el backend lo crea dentro del mismo `POST /restaurantes` y el script `scripts/sql/crear_admin.sql` ya no hace falta para restaurantes nuevos. Pendiente: probar en navegador el asistente y el login real del dueño.
- **Usuarios de plataforma fuera de alcance**: `PATCH /usuarios/{id}/rol` necesita una lista de usuarios y ids de rol que no existen (no hay `GET /usuarios`). Ver [[Usuarios]].
- Sin filtros ni búsqueda (el backend no los ofrece).
- Tras renovar, el tenant sigue en `/paywall` hasta recargar su sesión (foto vieja de `/auth/me`; ver [[Pendientes y Deuda Técnica]]).

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| El dueño crea, habilita, renueva y suspende sin tocar la base de datos; desbloquea la prueba de Cocina y Pedidos | Página única de 847 líneas, sin spec por AGENTS §6 |
| Reglas puras con tests; las páginas solo orquestan | Sin prueba en navegador; panel y modal no cierran con Escape |
| Los mensajes del backend se muestran sin reinterpretar | Solo se ordena por nombre (un `sort` desconocido da 500) |
| Aislamiento por scope evita mezclar plataforma y tenant | El PR #15 depende de que el backend con `administrador` esté desplegado antes |

## Cómo extenderlo
Usar `Page<T>` de `core/http/api.types.ts`; no mezclar acciones de tenant; la lógica nueva va en `domain/*.rules.ts` con test. Antes de agregar más acciones, partir `restaurantes.page.ts` en componentes (tabla, panel y modales de acción). Rutas y permisos viven en `app.routes.ts` y `permissions.rules.ts`.
