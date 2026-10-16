---
title: Pendientes y Deuda Técnica
date: 2026-10-16
tags:
  - servidos
  - gobierno
  - pendientes
aliases:
  - Deuda técnica
  - Backlog
---

# Pendientes y Deuda Técnica

Volver: [[00 - MOC]] · Relacionado: [[Estado Actual]] · [[API]] · [[Fases 4-9 - Planificadas]]

> [!abstract] Alcance
> Todo lo abierto según `docs/progress/*`, `odd/tasks/*` y lo observado al leer el código. Cada ítem indica su origen.

## Checklist de cambios del backend (2026-10-08 a 2026-10-16)
Numeración de `CAMBIOS_FRONTEND.md` del backend. Verificados contra su código el 2026-10-16 (§1 a §17 en `main`; §18 en una rama); falta contrastar contra Swagger en ejecución. Los ítems marcan el trabajo del front.
- [x] §1 `RestauranteApi.renovar()` eliminado; el botón del paywall ahora muestra el pago manual por Yape + WhatsApp ([[Restaurante]], `docs/progress/06-paywall-pago-manual.md`). Falta el copy de `suspendido.page.ts` ("la plataforma regulariza la suscripción"; hoy dice "renovar el plan").
- [ ] Pago manual: el dueño debe completar `whatsappNumber` en `payment-contact.ts` y agregar `public/yape-qr.png`; decidir si se avisa en pantalla cuando el número no está configurado.
- [ ] Renovación, cambio de plan y habilitación de restaurantes tras confirmar el pago: módulo [[Plataforma]] (el tenant no los hace).
- [ ] §2 Cancelar suscripción con `{password}` (400 si falta o es incorrecta); no renueva, opera hasta `fechaFin`.
- [ ] (parcial) §3 `subscriptionGuard`: bloquear por `fechaFin < hoy`, no por `CANCELADA`. **Guard hecho** en `fix/subscription-guard-vigencia` (`6c42861`, pendiente de merge; ver [[Pedidos]]). Falta el aviso "Tu suscripción termina el {fechaFin}"; el 402 del backend sigue siendo la fuente de verdad.
- [ ] §4 Sin suscripción vigente = solo lectura; manejar 400 en `GET /restaurantes/actual/suscripcion`; mensajes 402 terminan en "contactá a la plataforma para regularizar tu suscripción".
- [ ] (parcial) §5 Rutas permitidas con 402 sin `subscriptionGuard`: cocina listo cumple; la **lista de pedidos** (estado/confirmar) cumple en `feat/pedidos-02-lista` (pendiente de merge); falta pagos al construirlos.
- [ ] §6 Reembolso cancela pedidos no entregados; ocultar "Cobrar" en pedidos reembolsados.
- [ ] (parcial) §7 DELIVERY `EN_ENTREGA` a `CANCELADO` si no pagado; `ENTREGADO` sin pago. La tabla de transiciones de `pedidos.rules.ts` ya lo contempla (ramas de Pedidos, pendientes de merge); falta verificarlo contra un backend real.
- [ ] §8 Validaciones cross-tenant a 400 (mostrar `message`).
- [x] §9 `POST /pedidos` corregido (sin impacto).
- [x] §10 `GET /cocina/listos` (cliente `cocina.api.ts` hecho).
- [x] §11 WebSocket STOMP: cliente, proxy y página implementados (sin prueba manual).
- [ ] §10b Usar el `listoAt` de `GET /cocina/listos` para "hace N min" (hoy se calcula con la hora local del aviso y se pierde al recargar).
- [ ] §12 Caja con `GET /pedidos?porCobrar=true` e historial con `?fecha=`; "Cobrar" solo si `estadoPago` es `null` y "Reembolsar" solo si es `PAGADO`.
- [ ] §13 `pagos.registrar` = ADMINISTRADOR, RECEPCION y CAJERO (backend 2026-10-09); `pedidos` también para CAJERO.
- [ ] §14 Sin cambio de plan del tenant (`PATCH /restaurantes/actual/plan` ya no existe); el cambio va al panel de [[Plataforma]] (`PATCH /restaurantes/{id}/plan`).
- [ ] §15 Fechas sin zona = hora de Lima: no agregar `Z` ni tratarlas como UTC.
- [ ] §16 Panel de plataforma por rol (ADMIN = SUPERADMIN salvo crear ADMINs; MODERADOR ve y renueva) y alta de usuarios de plataforma (`POST /usuarios/plataforma`; a un ADMIN solo ofrecerle MODERADOR). MODERADOR necesita un home de plataforma.
- [ ] §17 `fechaFin` inclusiva y período de un mes calendario: textos "vence el {fechaFin}" y días restantes `fechaFin - hoy + 1`.
- [ ] §18 (rama del backend) Formulario "Crear restaurante" con la sección Administrador (nombre, apellido, email, contraseña con confirmación en el cliente); 409 bajo Email, 422 `administrador.*` bajo su campo; el aviso de éxito muestra `administrador.email` de la respuesta.

## Cocina (implementada, por cerrar)
- [x] Página, nota `docs/progress/05`, checkboxes de `odd/tasks/cocina.md` y tests de conexión/reconexión (cocina-live) hechos.
- [ ] Prueba manual en navegador con backend (checklist en `docs/progress/05`).
- [ ] Review nativa de `00c94dd..2fad5cb` (riesgo medio, presupuesto alcanzado).
- [x] Zona horaria de `createdAt`: el backend corre en `America/Lima` y manda la hora local sin zona (§15), así que leerla como local es correcto.
- [ ] Verificar forma de `/cocina/cola` y `/listos` contra Swagger (ya coincide con los DTO del backend).
- [ ] Actualizar `docs/FRONTEND_CONTEXT.md` §9 (aún dice "no existen WebSockets de cocina") y el flujo de polling de `Flujo - Recepcion Cocina.md`, `DESIGN_BRIEF` §6.6 y `frontend-alineacion-seguridad.md`.

## Pedidos (Fase 4, implementada en ramas locales)
Origen: `docs/progress/07-fase-4-pedidos.md` y `odd/tasks/pedidos.md`. Ver [[Pedidos]] y [[Fase 4 - Pedidos]].
- [ ] Mergear la cadena en orden (`fix/subscription-guard-vigencia`, `feat/pedidos-01-datos`, `02-lista`, `03-alta-datos`, `04-alta`) con rebase de la siguiente rama tras cada squash merge.
- [ ] `fix/subscription-guard-vigencia` debe estar mergeado para que el guard de `/pedidos/nuevo` siga el contrato (sin él se usa el guard anterior, que consulta la suscripción y bloquea a los `CANCELADA`).
- [ ] Aviso por borrador sin guardar al salir de `/pedidos/nuevo`.
- [ ] Specs de las páginas no escritos por decisión (AGENTS §6); las reviews advirtieron la orquestación sin tests en ambas páginas. Reabrir la decisión con el usuario si se quiere cubrirlos.
- [x] `homeFor` de ADMINISTRADOR y RECEPCION pasa a `/pedidos` (decisión del usuario 2026-10-14, commit `3598eb0`): un tenant bloqueado ya no vuelve al paywall al pulsar "Seguir en solo lectura". Un spec de rutas verifica que ningún home de rol de restaurante lleve `subscriptionGuard`.
- [ ] Foto vieja de `/auth/me`: tras una renovación de la plataforma el tenant sigue en `/paywall` hasta recargar; un tenant que vence a mitad de sesión no se redirige hasta entonces. Propuesta: volver a pedir `/auth/me` desde el paywall o al navegar a una ruta bloqueada.
- [ ] Tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`): feature posterior.
- [ ] Caja (Cobrar y Reembolsar) y acceso de CAJERO a la lista; en el código del front `pagos.registrar` es solo de ADMINISTRADOR, y el backend ya permite cobrar a RECEPCION y CAJERO (§13).
- [ ] Prueba manual en navegador (checklist en `docs/progress/07`), CSP e imágenes de producto.
- [ ] `fail()` duplicada en `pedidos.page.ts` y `nuevo-pedido.page.ts`.
- [ ] Advertencias menores: `cantidad` sin tope superior y `productoId` duplicado sin validar; el cargador de catálogo confía en la forma de la página; copy del paywall aún dice "cancelada"; `core/auth/data/suscripcion.api.ts` solo contiene un tipo; nombre y documentación de `subscriptionLapsedRoute`.
- [ ] `size:exception` solicitado en cuatro PRs de la cadena (617, 974, 1.004 y 1.132 líneas); el PR de `fix/subscription-guard-vigencia` (196) cumple el presupuesto.
- [ ] Comentario de ocurrencia del defecto #4441 de Gentle AI sin publicar (sin acceso autenticado a GitHub); texto en `docs/gentle-ai-ocurrencia-4441.md`.

## Deuda técnica y advisories de las reviews
- Ruta/permiso duplicado entre `app.routes.ts` y `navigation.rules.ts`: **resuelto** por `02bca02` (menú derivado); queda el test de consistencia como guardia.
- `navEntriesFrom` solo recorre `children` síncronos (no `loadChildren`); el shell lee rutas una vez (`resetConfig` no actualiza).
- Tests de paridad del menú: el helper duplica el recorrido de rutas y `homeFor` usa `JSON.stringify` frágil.
- Login: falta test de página (429, fallback 60 s, formulario deshabilitado). Paywall: sin test de página (el enlace y el mensaje de pago sí tienen test en `subscription.rules.spec`); su texto dice "cancelada" con estado ACTIVA.
- Toast de éxito: icono de reloj y código "200" inventado.
- `formatDate` acepta 31/02.
- `session.store.spec`: usar `vi.waitFor`; fijar que el rechazo abandonado es `Error` plano; `finally` depende de que `clear()` sea el único escritor del epoch.
- `SuscripcionApi` (core) y `RestauranteApi.suscripcion()` duplican el GET.
- Core importa `features/restaurante` (shell); `subscription.rules` importa `BadgeVariant` de `shared/ui`.
- Tipos de pedido en `cocina.types.ts`: **resuelto** en `feat/pedidos-01-datos` (`pedidos.types.ts` es el dueño y cocina los re-exporta); pendiente de merge.

## Decisiones de producto abiertas
- Foto del panel de login; confirmar campo `nombre` de `GET /restaurantes/actual`.
- Textos redactados sin diseño (404, sin-modulos, suspendido, 403): revisar con el usuario. Copy del login (soporte@servidos.pe, titulares): sin respaldo documental.
- Geist Mono para números (opcional).
- MESERO/CAJERO/REPARTIDOR ven "Catálogo" pero su home es `/sin-modulos`; `/caja` exige `pagos.registrar`, así RECEPCION no ve caja aunque pueda reembolsar.
- Backlog backend: `GET /usuarios`. (`GET /pedidos` ya existe y está en uso; ver [[Pedidos]].)

## Infraestructura
- CSP `font-src https://fonts.gstatic.com` y decisión sobre fuentes auto-hospedadas.
- Estrategia de despliegue y reverse proxy no documentada.
- Dev server: la hoja de Google Fonts se descarga externa.

## Contradicciones documentales detectadas
| Documentos | Contradicción |
|---|---|
| `FRONTEND_CONTEXT` §7 vs §9 | §7 describe el WebSocket; §9 dice que no existe |
| `FRONTEND_CONTEXT` §1 vs `progress/00` | §1 dice que `ng serve` calza directo con CORS; el proyecto usa proxy |
| `DESIGN_BRIEF` §6.5 vs `FRONTEND_CONTEXT` §7 | reembolso solo ADMINISTRADOR vs ADMINISTRADOR y RECEPCION (vale el segundo y el código) |
| `DESIGN_BRIEF` §6.6 / Flujo / `frontend-alineacion-seguridad` | polling 5–10 s vs WebSocket ya implementado en el cliente |
| `FRONTEND_CONTEXT` §5 vs anuncio 2026-10-08 | CANCELADA bloquea y `renovar` existe vs nuevo modelo por `fechaFin`; `cancelar` sin body vs con `{password}` |
| `Flujo - Recepcion Cocina` regla 5 vs anuncio §7 | cancelación "hasta LISTO" vs `EN_ENTREGA` a `CANCELADO` |
| Notas y `Fases 4-9` previas vs contrato verificado 2026-10-11 | decían que `GET /pedidos` no existe; existe (paginado). Corregido en [[Pedidos]], [[API]] y [[Modelo de Negocio]] |
| `progress/02` vs código | "RECEPCION solo cocina" (previo a T1.7) vs matriz ampliada |
