---
title: Pendientes y Deuda Técnica
date: 2026-10-17
tags:
  - servidos
  - gobierno
  - pendientes
aliases:
  - Deuda técnica
  - Backlog
---

# Pendientes y Deuda Técnica

Volver: [[00 - MOC]] · Relacionado: [[Estado Actual]] · [[API]] · [[Fases 4-9 - Planificadas]] · [[Fase 5 - Plataforma]] · [[Fase 6 - Catálogo]] · [[Fase 7 - Caja]]

> [!abstract] Alcance
> Todo lo abierto según `docs/progress/*`, `odd/tasks/*` y lo observado al leer el código. Cada ítem indica su origen.

## Checklist de cambios anunciados por el backend (2026-10-08)
Anunciados por backend, sin verificar contra Swagger.
- [x] §1 `RestauranteApi.renovar()` eliminado; el botón del paywall ahora muestra el pago manual por Yape + WhatsApp ([[Restaurante]], `docs/progress/06-paywall-pago-manual.md`). Falta el copy de `suspendido.page.ts` ("la plataforma regulariza la suscripción"; hoy dice "renovar el plan").
- [ ] Pago manual: el dueño debe completar `whatsappNumber` en `payment-contact.ts` y agregar `public/yape-qr.png`; decidir si se avisa en pantalla cuando el número no está configurado.
- [ ] (en `main`, sin prueba en navegador) Renovación, cambio de plan y habilitación de restaurantes tras confirmar el pago: módulo [[Plataforma]] (el tenant no los hace). Acciones Renovar, Cambiar plan y Suspender/Reactivar mergeadas con Plataforma 01 a 05 (PR #13 de GitHub, `5e8b272`).
- [ ] §2 Cancelar suscripción con `{password}` (400 si falta o es incorrecta); no renueva, opera hasta `fechaFin`.
- [ ] (parcial) §3 `subscriptionGuard`: bloquear por `fechaFin < hoy`, no por `CANCELADA`. **Guard hecho y en `main`** (PR #8, `2b812b0`; ver [[Pedidos]]). Falta el aviso "Tu suscripción termina el {fechaFin}"; el 402 del backend sigue siendo la fuente de verdad.
- [ ] §4 Sin suscripción vigente = solo lectura; manejar 400 en `GET /restaurantes/actual/suscripcion`; mensajes 402 terminan en "contactá a la plataforma para regularizar tu suscripción".
- [ ] (parcial) §5 Rutas permitidas con 402 sin `subscriptionGuard`: cocina listo cumple; la **lista de pedidos** (estado/confirmar) cumple y está en `main` (PR #10); **`/caja` (`POST /pagos`) cumple** (sin `subscriptionGuard`, ramas de Caja publicadas, PRs pendientes). Falta el reembolso al construirlo. Riesgo: si una llamada de pagos devolviera 402, el interceptor redirigiría a `/paywall` o `/suspendido`.
- [ ] (parcial) §6 Reembolso cancela pedidos no entregados; ocultar "Cobrar" en pedidos reembolsados. Lo segundo está hecho en las ramas de Caja (`isCobrable` y `porCobrar` solo ofrecen pedidos nunca cobrados); falta el reembolso, bloqueado por el `pagoId` (ver Caja).
- [ ] (parcial) §7 DELIVERY `EN_ENTREGA` a `CANCELADO` si no pagado; `ENTREGADO` sin pago. La tabla de transiciones de `pedidos.rules.ts` ya lo contempla (en `main`, PR #9); falta verificarlo contra un backend real.
- [ ] §8 Validaciones cross-tenant a 400 (mostrar `message`).
- [x] §9 `POST /pedidos` corregido (sin impacto).
- [x] §10 `GET /cocina/listos` (cliente `cocina.api.ts` hecho).
- [x] §11 WebSocket STOMP: cliente, proxy y página implementados (sin prueba manual).

## Cocina (implementada, por cerrar)
- [x] Página, nota `docs/progress/05`, checkboxes de `odd/tasks/cocina.md` y tests de conexión/reconexión (cocina-live) hechos.
- [ ] Prueba manual en navegador con backend (checklist en `docs/progress/05`).
- [ ] Review nativa de `00c94dd..2fad5cb` (riesgo medio, presupuesto alcanzado).
- [ ] Confirmar zona horaria de `createdAt` (se lee como hora local).
- [ ] Verificar forma de `/cocina/cola` y `/listos` contra Swagger.
- [ ] Actualizar `docs/FRONTEND_CONTEXT.md` §9 (aún dice "no existen WebSockets de cocina") y el flujo de polling de `Flujo - Recepcion Cocina.md`, `DESIGN_BRIEF` §6.6 y `frontend-alineacion-seguridad.md`.

## Pedidos (Fase 4, mergeada en `main` el 2026-10-15)
Origen: `docs/progress/07-fase-4-pedidos.md` y `odd/tasks/pedidos.md`. Ver [[Pedidos]] y [[Fase 4 - Pedidos]].
- [x] Cadena mergeada por squash en orden: PRs #8 (`2b812b0`), #9 (`04b462f`), #10 (`87f0cd9`), #11 (`40930c5`), #12 (`c66c3ff`). Ramas remotas borradas. `main`: 21 archivos / 770 tests en verde, `ng build` OK. Conflicto en `src/testing/builders.ts` resuelto (`aMe` asigna cada campo de forma explícita).
- [x] El guard de `/pedidos/nuevo` ya sigue el contrato §5 (PR #8 en `main`).
- [ ] Aviso por borrador sin guardar al salir de `/pedidos/nuevo`.
- [ ] Specs de las páginas no escritos por decisión (AGENTS §6); las reviews advirtieron la orquestación sin tests en ambas páginas. Reabrir la decisión con el usuario si se quiere cubrirlos.
- [x] `homeFor` de ADMINISTRADOR y RECEPCION pasa a `/pedidos` (decisión del usuario 2026-10-14, commit `3598eb0`): un tenant bloqueado ya no vuelve al paywall al pulsar "Seguir en solo lectura". Un spec de rutas verifica que ningún home de rol de restaurante lleve `subscriptionGuard`.
- [ ] Foto vieja de `/auth/me`: tras una renovación de la plataforma el tenant sigue en `/paywall` hasta recargar; un tenant que vence a mitad de sesión no se redirige hasta entonces. Propuesta: volver a pedir `/auth/me` desde el paywall o al navegar a una ruta bloqueada.
- [ ] Tablero kanban (`EGPHx`, `Sd7pI`, `zFAgh`): publicado en `feat/tablero-01-base` y `feat/tablero-02-tablero`; PRs 19 y 20 pendientes de merge.
- [ ] Tiempo real en el tablero de Pedidos y en Caja (hoy solo Cocina usa STOMP): requiere topic del backend. Por ahora ambos usan el botón "Actualizar" y recargan tras cada acción; falta verificar contra el contrato o Swagger si el backend publica más topics que el de cocina. Ver [[Arquitectura]] (Tiempo real y RxJS).
- [x] Cobrar y roles: `pagos.registrar` ya es de ADMINISTRADOR, RECEPCION y CAJERO (contrato §3) y CAJERO aterriza en `/caja`; ramas de Caja publicadas, PRs pendientes (ver la sección de Caja). CAJERO no ve la lista de pedidos: cobra desde `/caja`.
- [ ] Reembolso: bloqueado por el backend (ver la sección de Caja).
- [ ] Prueba manual en navegador (checklist en `docs/progress/07`), CSP e imágenes de producto. Depende de crear un restaurante desde [[Plataforma]] (01 a 06 en `main`, incluida la cuenta del dueño; ver la sección de Plataforma).
- [ ] `fail()` duplicada en `pedidos.page.ts` y `nuevo-pedido.page.ts`.
- [ ] Advertencias menores: `cantidad` sin tope superior y `productoId` duplicado sin validar; el cargador de catálogo confía en la forma de la página; copy del paywall aún dice "cancelada"; `core/auth/data/suscripcion.api.ts` solo contiene un tipo; nombre y documentación de `subscriptionLapsedRoute`.
- [ ] Comentario de ocurrencia del defecto #4441 de Gentle AI sin publicar (sin acceso autenticado a GitHub); texto en `docs/gentle-ai-ocurrencia-4441.md`.

## Plataforma (Fase 5; 01 a 06 en `main`)
Origen: `docs/progress/08-fase-5-plataforma.md` y `odd/tasks/plataforma.md`. Ver [[Plataforma]] y [[Fase 5 - Plataforma]].
- [x] Plataforma 01 a 05 mergeada en `main` (PR #13 de GitHub, `5e8b272`, 2026-10-16): datos, reglas, lista con panel, alta y acciones.
- [x] Plataforma 06 (cuenta del dueño) mergeada en `main`: PR #14 (`f7112e6`); las notas del Vault, PR #15 (`3e2f905`). Con el backend que exige `administrador`, crear un restaurante ya funciona desde `main`.
- [ ] Prueba manual en navegador de todas las pantallas (lista, panel, alta, acciones): **no hecha**. Después, las pantallas del tenant (Cocina, Pedidos, Catálogo) con el restaurante creado.
- [ ] Cerrar con Escape el panel de detalle y el modal.
- [ ] Partir `restaurantes.page.ts` (847 líneas, casi todo plantilla) en componentes (tabla, panel, modales de acción) tras la prueba en navegador.
- [x] **Crear el ADMINISTRADOR del tenant** — resuelto el 2026-10-16 (T5.7, rama `feat/plataforma-06-administrador`): el backend crea el dueño dentro del mismo `POST /restaurantes` y el front lo pide en un asistente de dos pasos. El script `scripts/sql/crear_admin.sql` ya no hace falta para restaurantes nuevos (si se usa para uno anterior, su correo por defecto sigue chocando con el del usuario de arranque de la plataforma).
- [ ] Prueba manual en navegador del asistente de dos pasos y del login real del dueño recién creado: **no hecha**.
- [ ] Gestión de usuarios de plataforma: fuera de alcance, bloqueada (no existe `GET /usuarios`; `PATCH /usuarios/{id}/rol` necesita ids de rol).
- [ ] Sin filtros ni búsqueda en la lista (el backend no los ofrece); solo se ordena por nombre (un `sort` desconocido responde 500).
- [ ] Copy del pie del diseño "Solo CANCELADA bloquea escrituras": no copiado a propósito (desactualizado frente al contrato §5); confirmar con el usuario si se quiere un texto equivalente actualizado.
- [ ] Comentarios de ocurrencia de los defectos #4208 y #4655 de Gentle AI sin publicar (sin acceso autenticado a GitHub); borradores en `docs/gentle-ai-ocurrencia-4208.md` y `docs/gentle-ai-ocurrencia-4655.md`.

## Catálogo (Fase 6, en `main`)
Origen: `docs/progress/09-fase-6-catalogo.md` y `odd/tasks/catalogo.md`. Ver [[Catálogo]] y [[Fase 6 - Catálogo]].
- [x] Cadena mergeada por squash en orden: PRs #16 (`27b231e`), #17 (`fdd9c50`) y #18 (`527e1e6`). Reviews aprobadas: `review-0e9c0c7fd77af064`, `review-96271976eeb1bffb`, `review-aeb4555b876a3d61`.
- [ ] Prueba manual en navegador de la pantalla y de los modales con ADMINISTRADOR (crear categoría, crear producto con URL de imagen, editar conservando el estado, alternar), COCINERO (solo alternar), RECEPCION (solo lectura) y un tenant bloqueado (aviso de solo lectura): **no hecha**.
- [ ] Cerrar el modal con la X durante un guardado en curso desmonta la petición: el producto puede existir en el servidor y la lista lo muestra tras recargar (el nombre único evita duplicados). Decidir si se bloquea el cierre mientras guarda.
- [ ] La columna ESTADO (interruptor Disponible/Agotado) se agregó y no está en el diseño `hoW4s`: confirmar con el usuario.
- [ ] Los modales no se cierran con Escape.
- [ ] Sin endpoint en el backend, fuera de alcance: eliminar producto o categoría, renombrar o habilitar/deshabilitar categoría, subir imágenes (la imagen es una URL de texto) y búsqueda.
- [ ] Sin specs de la página ni de los modales por decisión (AGENTS §6); las reglas sí tienen tests (catalogo 97).
- [ ] El menú se filtra y pagina en el cliente (decenas de ítems); si crece, pasarlo al servidor.

## Caja (Fase 7, publicada en tres ramas, PRs 21 a 23 pendientes)
Origen: `docs/progress/11-fase-7-caja.md` y `odd/tasks/caja.md`. Ver [[Pagos]] y [[Fase 7 - Caja]].
- [ ] Mergear la cadena en orden (squash; ramas publicadas el 2026-10-17): `feat/caja-01-datos` (`e0fa5ed`, `25642e5`; 701 líneas), `feat/caja-02-pagina` (`14f394f`; 622) y `feat/caja-03-atajos` (`3bdb24b`; 70); reubicar cada rama sobre `main` tras cada merge. Las dos primeras piden `size:exception`. Reviews aprobadas: `review-aa065b1ede656df8` (riesgo alto: amplía `pagos.registrar`), `review-e2ff609e44106504` y `review-c12133e9629dfca7`; la review nativa aprobó además todo el rango (`review-6e314892b3ffcd3f`); T8.4a (70 líneas) queda bajo presupuesto, pendiente en la slice.
- [ ] **Reembolso bloqueado por el backend (T8.6):** `POST /pagos/{id}/reembolso` necesita el `pagoId`, que ninguna lectura expone (`GET /pedidos` solo trae `estadoPago`; no existen `GET /pagos` ni `GET /pedidos/{id}`). **Solicitud al backend:** agregar a cada fila de `GET /pedidos` el resumen `pago { pagoId, metodoPago, monto, referenciaExterna }` (`null` si nunca se cobró); especificación en `docs/backend/pago-id-en-pedidos.md`. Con eso: modal `tDcwg` con motivo obligatorio, "Reembolsar" en Caja (ADMINISTRADOR y RECEPCION) y "Anular con reembolso" en el tablero (`Sd7pI`, `zFAgh`).
- [ ] Chip "Cobrar S/ …" en las tarjetas del tablero (T8.4b): esperar el merge de `feat/tablero-01-base` y `feat/tablero-02-tablero` y reubicar; `pedidos.page.ts` y `icon.component.ts` los tocan ambas cadenas (posible conflicto de rebase).
- [ ] Prueba manual en navegador de `/caja` y del atajo de la lista con ADMINISTRADOR, RECEPCION y CAJERO (efectivo con vuelto, monto corto, Yape con referencia, `?pedido=`, pedido ya pagado → 400) y con el tenant bloqueado: **no hecha**.
- [ ] Más de 100 pedidos por cobrar: la petición pide `size=100`, el encabezado cuenta `totalElements` y solo hay tarjetas para los primeros 100; sin paginación ni aviso.
- [ ] Riesgo del interceptor 402: el contrato dice que `pagos` pasa con el tenant bloqueado; si alguna llamada de pagos devolviera 402, el interceptor redirigiría al paywall en lugar de mostrar el mensaje en Caja. Verificar contra el backend real.
- [ ] Sin specs de la página por decisión (AGENTS §6); las reglas sí tienen tests (pagos 61).
- [ ] Sin endpoint en el backend, fuera de alcance: cierre/arqueo, historial de pagos y pagos parciales.

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
- Tipos de pedido en `cocina.types.ts`: **resuelto** y en `main` (PR #9; `pedidos.types.ts` es el dueño y cocina los re-exporta).

## Decisiones de producto abiertas
- Foto del panel de login; confirmar campo `nombre` de `GET /restaurantes/actual`.
- Textos redactados sin diseño (404, sin-modulos, suspendido, 403): revisar con el usuario. Copy del login (soporte@servidos.pe, titulares): sin respaldo documental.
- Geist Mono para números (opcional).
- MESERO y REPARTIDOR ven "Catálogo" pero su home es `/sin-modulos`. (Resuelto en las ramas de Caja: `pagos.registrar` incluye ahora a RECEPCION y CAJERO, así que RECEPCION ve Caja y el home de CAJERO es `/caja`.)
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
| `Flujo - Recepcion Cocina` / `progress/03` vs `FRONTEND_CONTEXT` §3 | `pagos.registrar` solo ADMINISTRADOR vs ADMINISTRADOR, RECEPCION y CAJERO (vale el contrato; código actualizado en `feat/caja-01-datos`) |
