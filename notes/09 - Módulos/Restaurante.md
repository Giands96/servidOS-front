---
title: Restaurante
date: 2026-10-16
tags:
  - servidos
  - modulos
  - restaurante
  - suscripcion
aliases:
  - Módulo Restaurante
  - Paywall
---

# Restaurante

Volver: [[00 - MOC]] · Ver [[Modelo de Negocio]] · [[Seguridad]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Responsabilidad
> Datos del restaurante actual y su suscripción: paywall hoy; plan, cancelación y detalle más adelante. Estado: **parcial** (paywall y API de lectura implementados; la ruta `/restaurante` es placeholder). El tenant **no renueva ni cambia de plan**: el pago es manual por Yape con confirmación por WhatsApp.

## Archivos
- `src/app/features/restaurante/data/restaurante.api.ts` — `actual()`, `suscripcion()` (`renovar()` eliminado).
- `features/restaurante/domain/subscription.rules.ts` (+ spec, 15 casos) — `formatDate`, `formatPeriod`, `estadoLabel`, `estadoVariant`, `whatsappPaymentLink`, `paymentConfirmationMessage`.
- `features/restaurante/domain/payment-contact.ts` — `PAYMENT_CONTACT` (`whatsappNumber`, `yapeQrSrc`); el dueño completa el número y agrega `public/yape-qr.png`.
- `features/restaurante/paywall.page.ts` — `/paywall`, solo ADMINISTRADOR.
- Relacionados en core: `core/auth/data/suscripcion.api.ts`, `core/auth/guards/subscription.guard.ts`.

## API usada
`GET /restaurantes/actual` (`nombre`, también para personalizar el mensaje de WhatsApp del paywall), `GET /restaurantes/actual/suscripcion`. `POST .../suscripcion/renovar` ya no existe en el backend ni en el front. Renovar, cambiar de plan y habilitar restaurantes corresponden al módulo [[Plataforma]].

## Pago manual (Yape + WhatsApp)
El restaurante paga la suscripción a ServidOS por Yape, fuera de la app. En el paywall, "Renovar suscripción" muestra el QR de Yape, una instrucción y "Confirmar pago por WhatsApp" (enlace `wa.me` con mensaje prellenado; deshabilitado si no hay número configurado). El dueño verifica el pago y habilita al restaurante desde [[Plataforma]]. Detalle en `docs/progress/06-paywall-pago-manual.md`.

## Reglas de dominio
Formato de fechas ("14 sep 2026"), etiquetas/variantes de estado, enlace de WhatsApp (solo dígitos, `null` sin número) y mensaje de confirmación de pago. `subscriptionLapsedRoute(user)` decide `/paywall` o `/suspendido`.

## Permisos
`restaurante.suscripcion.gestionar`: solo ADMINISTRADOR (ruta `/restaurante` y `/paywall`). `restaurante.ver` (todos los roles de tenant) para el nombre del sidebar.

> [!warning] Pendiente respecto del backend (verificado contra su código, 2026-10-16)
> `renovar()` ya fue eliminado y el paywall muestra el pago manual (ver arriba). Falta:
> - copy que indique que la plataforma regulariza la suscripción;
> - `subscriptionGuard` por `fechaFin < hoy`;
> - aviso "Tu suscripción termina el {fechaFin}";
> - cancelar con contraseña (`{password}`, solo ADMINISTRADOR);
> - manejar el 400 del GET de suscripción cuando no hay ninguna vigente;
> - quitar cualquier cambio de plan del tenant (`PATCH /restaurantes/actual/plan` ya no existe).
>
> `fechaFin` es **inclusiva** (el restaurante opera ese día) y un período es un mes calendario: los días restantes son `fechaFin - hoy + 1`. Checklist en [[Pendientes y Deuda Técnica]].

## Ventajas y desventajas
| Ventajas | Desventajas |
|---|---|
| Reglas de formato puras | Paywall muestra "Plan {id}" (sin nombre de plan) |
| Errores van a toast con `message` del backend | `formatDate` acepta fechas imposibles (31/02) |
| Solo ADMINISTRADOR ve la gestión | Paywall sin test de página (pago manual); su texto dice "cancelada" aun con estado ACTIVA |

## Cómo extenderlo
- Nuevas llamadas en `restaurante.api.ts` (solo `HttpClient`).
- Si agregas escrituras, pasa `subscriptionGuard` por el parámetro `guards` de `moduleRoute`.
- Evita agregar un segundo GET de suscripción: reutiliza el existente o unifica (deuda registrada).
