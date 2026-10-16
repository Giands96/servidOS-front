---
title: Plataforma
date: 2026-10-16
tags:
  - servidos
  - modulos
  - plataforma
  - pendiente
aliases:
  - Módulo Plataforma
  - Restaurantes (plataforma)
---

# Plataforma

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Nivel plataforma: crear restaurantes con su dueño, listarlos, ver y renovar suscripciones, cambiar plan, suspender o reactivar, y dar de alta usuarios de plataforma. Estado: **placeholder** (`/plataforma/restaurantes` y `/plataforma/restaurantes/nuevo`).

## Archivos
Solo las rutas en `src/app/app.routes.ts`.

## API (plan)
Verificado contra el código del backend (2026-10-16). Detalle en [[API]].

| Endpoint | Roles |
|---|---|
| `POST /restaurantes` | SUPERADMIN, ADMIN |
| `GET /restaurantes?page=&size=`, `GET /restaurantes/{id}`, `GET /restaurantes/{id}/suscripcion` | SUPERADMIN, ADMIN, MODERADOR |
| `POST /restaurantes/{id}/suscripcion/renovar` (`{planId?}`) | SUPERADMIN, ADMIN, MODERADOR |
| `PATCH /restaurantes/{id}/plan` (`{nuevoPlanId}`) | SUPERADMIN, ADMIN |
| `PATCH /restaurantes/{id}/estado` | SUPERADMIN, ADMIN |
| `POST /usuarios/plataforma` | SUPERADMIN (ADMIN o MODERADOR), ADMIN (solo MODERADOR) |

**Crear restaurante con su dueño** (§18, **en rama del backend**, sin mergear). `POST /restaurantes` exige `administrador {nombre, apellido, email, password}`. En una sola transacción crea:
- el restaurante;
- su suscripción;
- el usuario dueño, con su membresía ADMINISTRADOR.

Reglas y respuestas:
- Si algo falla, no se guarda nada.
- Límites: nombre y apellido hasta 100 caracteres, email hasta 150 y único en todo el sistema, password de 8 a 72.
- Errores: 409 "El email ya existe"; 422 con el campo anidado (`administrador.email: ...`); 400 por slug, plan o demo.
- La respuesta 201 suma `administrador {usuarioId, email, nombre}`, con el email en minúsculas, que es con el que el dueño inicia sesión.

**Suscripción:**
- `demo=true` exige `demoDias` (1 a 30) y monto 0.
- `demo=false` crea un mes calendario con `fechaFin` inclusiva (antes eran 30 días).
- La renovación se encadena al día siguiente de `fechaFin` si la actual sigue vigente; si no, arranca hoy.
- Renovar un restaurante INACTIVO lo deja ACTIVO.

## Permisos
En el front: `plataforma.restaurantes.ver` = SUPERADMIN; `plataforma.restaurantes.crear` = SUPERADMIN y ADMIN. El backend ya da a ADMIN las mismas funciones que a SUPERADMIN (salvo crear ADMINs) y a MODERADOR ver y renovar: falta alinear la matriz, ver [[Modelo de Negocio]]. `navFor` oculta "Crear restaurante" si el rol ya ve la lista (SUPERADMIN la alcanza desde esa pantalla). Existe prueba de que SUPERADMIN y ADMIN abren la ruta de crear.

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Permisos y homes ya cubiertos por tests | Sin pantallas |
| Aislamiento por scope evita mezclar plataforma y tenant | Sin filtros ni búsqueda en el dashboard (el backend no los ofrece) |

## Cómo extenderlo
Usar `Page<T>` de `core/http/api.types.ts`; no mezclar acciones de tenant; confirmar diseño (`x9DxqV`, `z8ZbK`). MODERADOR ya tiene permisos en el backend (ver y renovar), así que necesita un home en plataforma en lugar de `/sin-modulos`. En el alta de usuarios de plataforma, a un ADMIN solo ofrecerle MODERADOR, y no fijar los `rolPlataformaId` (dependen de la base).
