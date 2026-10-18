---
title: API
date: 2026-10-17
tags:
  - servidos
  - api
  - contrato
aliases:
  - Contrato API
  - Endpoints
---

# API

> [!abstract] Fuentes
> `docs/FRONTEND_CONTEXT.md` (sincronizado 2026-10-02 con el backend, con adendas del 2026-10-08) y los clientes en `src/app/**/data`. Swagger dev: `http://localhost:8080/swagger-ui/index.html`.

> [!success] Verificado contra el código del backend (2026-10-16)
> Los cambios anunciados el 2026-10-08 ya están en `main` del backend (PRs #12 a #16, `c32dcba`) y esta nota se contrastó con su código. Fuente del backend: `CAMBIOS_FRONTEND.md` (§1 a §18) y `CHANGELOG.md` del repo `servidOS`. Lo que solo está en una rama del backend se marca **(rama)**. Falta contrastar contra `/v3/api-docs` en ejecución.

Volver: [[00 - MOC]] · Relacionado: [[Seguridad]] · [[Flujo del Sistema]] · [[Pendientes y Deuda Técnica]]

## Base y convenciones
- Base: `/api/v1` (`API_BASE`); mismo origen vía proxy. Métodos GET, POST, PUT, PATCH, DELETE.
- Error único: `{ timestamp, status, message, path, traceID }` (`ApiError`). `status` viene como texto Spring (`"402 Payment Required"`). Mostrar `message` tal cual (viene en español).
- Paginación `Page<T>`: `content`, `totalElements`, `totalPages`, `size`, `number`, `first`, `last`. Defaults: productos 20, restaurantes 10.

## Estado HTTP a comportamiento de UI
`toUiAction` en `core/http/domain/api-error.rules.ts`:

| Código | Cuándo | UI | Implementado |
|---|---|---|---|
| 400 | regla de negocio | mostrar `message` | regla sí; pantallas según módulo |
| 401 | sin/ inválido Bearer o refresh | refresh y reintento, luego login | sí (interceptor) |
| 402 | suscripción bloquea escritura | `/paywall` o `/suspendido` | sí (error interceptor) |
| 403 | rol insuficiente o cross-tenant | `/sin-permiso` | por guards; respuesta 403 de API sin tratamiento global |
| 404 | inexistente | — | página 404 solo para rutas |
| 409 | conflicto | mostrar `message` | regla |
| 422 | validación | marcar campos | login |
| 429 | rate limit | esperar `Retry-After` | login (cuenta regresiva, fallback 60 s) |

## Endpoints por dominio
Leyenda de "Front": **impl** = cliente existe en el repo; **plan** = aún no.

### Auth
| Endpoint | Roles | Notas | Front |
|---|---|---|---|
| `POST /auth/login` | público | 401 genérico, 422, 429 | impl `auth.api.ts` |
| `POST /auth/refresh` | cookie | requiere `X-Requested-With`; rota cookie | impl |
| `POST /auth/logout` | cookie | 204 siempre | impl |
| `GET /auth/me` | autenticado | `{usuarioId,email,nombre,restauranteId,rol,restauranteEstado,suscripcion}` | impl |

### Restaurante actual y plataforma
Roles de plataforma: SUPERADMIN y ADMIN (socio) hacen lo mismo, salvo que solo SUPERADMIN crea ADMINs; MODERADOR consulta y renueva. Ver [[Modelo de Negocio]].

| Endpoint | Roles | Front |
|---|---|---|
| `GET /restaurantes/actual` | autenticado | impl (`RestauranteApi.actual`; el campo `nombre` se contrastó con el código del backend el 2026-10-16, no con Swagger en ejecución) |
| `GET /restaurantes/actual/suscripcion` | autenticado (la vigente hoy; 400 si no hay) | impl (`SuscripcionApi`, `RestauranteApi.suscripcion`) |
| `POST /restaurantes/actual/suscripcion/cancelar` (`{password}`) | ADMINISTRADOR | plan |
| `GET /planes` (solo `ACTIVO`, por precio ascendente) | autenticado | impl `PlataformaApi.planes` (en `main`) |
| `POST /restaurantes` (crear; `slug`, `nombre`, `direccion?`, `planId`, `demo?`, `demoDias` 1–30, `administrador {nombre, apellido, email, password}`; 201 `RestauranteCreadoResponse` con `administrador {usuarioId, email, nombre}`, 400 slug duplicado o plan inexistente, 409 email ya registrado, 422 `administrador.*`; crea restaurante y dueño en una sola transacción, §18) | SUPERADMIN, ADMIN | impl `PlataformaApi.crear` (en `main` con `administrador`, PR #14) |
| `GET /restaurantes?page=&size=&sort=` (`size` 10 por defecto; `sort=nombre,asc` o `nombre,desc`; un campo desconocido da 500) | SUPERADMIN, ADMIN, MODERADOR | impl `PlataformaApi.listar` (en `main`; el front lo muestra solo a SUPERADMIN) |
| `GET /restaurantes/{id}`, `/{id}/suscripcion` | SUPERADMIN, ADMIN, MODERADOR | impl `PlataformaApi.detalle` y `.suscripcion` (en `main`; solo SUPERADMIN en la UI) |
| `POST /restaurantes/{id}/suscripcion/renovar` (`{planId?}`; un mes pagado; `planId` obligatorio sin suscripción previa; `INACTIVO` pasa a `ACTIVO`) | SUPERADMIN, ADMIN, MODERADOR | impl `PlataformaApi.renovar` (en `main`; solo SUPERADMIN en la UI) |
| `PATCH /restaurantes/{id}/estado` (`{estado}`; suspender o reactivar; 400 si ya está en ese estado; no toca la suscripción) | SUPERADMIN, ADMIN | impl `PlataformaApi.cambiarEstado` (en `main`; solo SUPERADMIN en la UI) |
| `PATCH /restaurantes/{id}/plan` (`{nuevoPlanId}`, sin contraseña; 400 si la suscripción no está activa) | SUPERADMIN, ADMIN | impl `PlataformaApi.cambiarPlan` (en `main`; solo SUPERADMIN en la UI) |

Eliminados: `POST /restaurantes/actual/suscripcion/renovar` y `PATCH /restaurantes/actual/plan` (el tenant ya no renueva ni cambia de plan; el front quitó ambos).

Las filas de plataforma se verificaron contra el OpenAPI local y con una sonda en vivo el 2026-10-15; los roles salen de los `@PreAuthorize` del backend (`c32dcba`, verificados el 2026-10-16) y las diferencias con la UI están en [[Modelo de Negocio]]. Fase [[Fase 5 - Plataforma]], módulo [[Plataforma]].

### Catálogo
Verificado contra el OpenAPI local el 2026-10-16. Clientes en `features/catalogo/data/catalogo.api.ts`; las escrituras llegaron a `main` con las ramas `feat/catalogo-01-datos` a `-03-formularios` (PRs #16 a #18). Fase [[Fase 6 - Catálogo]], módulo [[Catálogo]].

| Endpoint | Roles | Front |
|---|---|---|
| `GET /productos?categoriaId=&page=&size=&sort=` (`size` 20 por defecto) → `Page<ProductoResponse>` (`productoId, categoriaId, nombre, descripcion, imagenUrl, precio, tiempoPreparacion, estado`), `GET /categorias?page=&size=&sort=` → `Page<CategoriaResponse>` (`categoriaId, nombre, estado`) | autenticados | impl `catalogo.api.ts` (lectura, en `main` por el PR #11) |
| `GET /productos/{id}` | autenticados | impl `CatalogoApi.producto` (ramas de Catálogo) |
| `POST /productos`, `PUT /productos/{id}` (`nombre` mín. 1 y único por tenant, `precio` ≥ 0, `descripcion`, `categoriaId`, `tiempoPreparacion` ≥ 0, `estado` `AGOTADO`/`DISPONIBLE`, `imagenUrl` texto libre; el `PUT` reemplaza todo, así que el front reenvía el `estado` actual; 400 por datos inválidos o categoría ajena, 403, 422 `campo: mensaje`) | ADMINISTRADOR | impl `crearProducto` y `actualizarProducto` (ramas) |
| `POST /categorias` (`nombre` mín. 1, `estado` `HABILITADO`/`DESHABILITADO`; 400 por nombre duplicado) | ADMINISTRADOR | impl `crearCategoria` (ramas) |
| `PATCH /productos/{id}/estado` (`{estado}` → `ProductoResponse`; un `AGOTADO` no se puede pedir) | ADMINISTRADOR, COCINERO | impl `cambiarEstadoProducto` (ramas) |

Las escrituras de catálogo dan 402 con el tenant bloqueado (contrato §5; no figura en OpenAPI); por eso `/catalogo` no lleva `subscriptionGuard` y deshabilita sus controles. Los enums inválidos probablemente den 500, así que el cliente los valida. No existe endpoint para eliminar producto o categoría, renombrar o deshabilitar categoría, subir imágenes ni buscar.

### Pedidos
Verificado contra `/v3/api-docs` y `FRONTEND_CONTEXT` el 2026-10-11. Clientes en `features/pedidos/data/pedidos.api.ts` (Fase 4, en `main` por los PRs #9 a #12; ver [[Pedidos]]).

| Endpoint | Roles | Front |
|---|---|---|
| `GET /pedidos?estado=&fecha=&porCobrar=&page=&size=` (paginado, `size` 1–100, más nuevo primero; fila sin items; `estadoPago` `PAGADO`, `REEMBOLSADO` o `null`) | ADMINISTRADOR, RECEPCION, CAJERO | impl `PedidosApi.listar` (la lista lo usa para ADMINISTRADOR y RECEPCION; el CAJERO lo usa con `porCobrar=true` desde `/caja`) |
| `POST /pedidos` (`tipoPedido`, `mesaId?`, `observacion?`, `repartidorNombre?`, `items[]`) | ADMINISTRADOR, RECEPCION | impl `PedidosApi.crear` (sin `repartidorNombre`) |
| `POST /pedidos/{id}/confirmar` (`PENDIENTE` a `EN_PREPARACION`) | ADMINISTRADOR, RECEPCION | impl `PedidosApi.confirmar` |
| `PATCH /pedidos/{id}/estado` | ADMINISTRADOR, RECEPCION | impl `PedidosApi.cambiarEstado` |

No existe `GET /pedidos/{id}`. El backend calcula precios y total (anti-tamper): no enviar montos. `createdAt` de pedidos llega sin `Z` (hora local, §10). Solo `POST /pedidos` devuelve 402; `confirmar` y `PATCH estado` pasan con el tenant bloqueado.

### Pagos
| Endpoint | Roles | Front |
|---|---|---|
| `POST /pagos` (`pedidoId*`, `metodoPago*`, `montoEntregado` ≥ 0, `referenciaExterna` ≤ 100) → 201 `PagoResponse` (`pagoId`, `pedidoId`, `monto`, `vuelto`, `metodoPago`, `estado`, `reembolsoMotivo`, `reembolsoUsuarioId`) | ADMINISTRADOR, RECEPCION, CAJERO | impl `PagosApi.registrar` (en `main`, PRs #19 a #22) |
| `POST /pagos/{id}/reembolso` (`motivo` obligatorio; solo un pago `PAGADO`) | ADMINISTRADOR, RECEPCION | **bloqueado**: necesita el `pagoId`, que ninguna lectura expone (ver abajo) |

Métodos: `EFECTIVO`, `TARJETA_CREDITO`, `TARJETA_DEBITO`, `YAPE`, `PLIN`, `OTROS`. Estados de pago: `PENDIENTE`, `PAGADO`, `REEMBOLSADO`, `CANCELADO`.

Verificado contra el OpenAPI local el 2026-10-16. Fase [[Fase 7 - Caja]], módulo [[Pagos]].

- **`POST /pagos` no recibe `monto`:** el backend lo toma del pedido (anti-tamper); `montoEntregado` solo aplica a `EFECTIVO` y la respuesta trae el `vuelto` autoritativo. Errores: 400 "Pedido inexistente, ya pagado o monto insuficiente" (según el contrato también pedido cancelado o reembolsado), 403, 422 `campo: mensaje`.
- **Qué pedidos se cobran:** `GET /pedidos?porCobrar=true` devuelve los no cancelados y nunca cobrados, en cualquier estado (`size` ≤ 100). Cobrar no cambia el estado del pedido; un pedido pagado no se puede cancelar; `ENTREGADO` sin pago es válido.
- **Con el tenant bloqueado:** `POST /pagos` pasa (contrato §5), por eso `/caja` no lleva `subscriptionGuard`.
- **El reembolso necesita el `pagoId`:** `GET /pedidos` solo devuelve `estadoPago` y no existen `GET /pagos` ni `GET /pedidos/{id}`; el front solo conoce el `pagoId` en la respuesta 201 de `POST /pagos`. Solicitud al backend (campo `pago { pagoId, metodoPago, monto, referenciaExterna }` en cada fila de `GET /pedidos`): `docs/backend/pago-id-en-pedidos.md`.

### Usuarios
| Endpoint | Roles | Front |
|---|---|---|
| `POST /usuarios` (`nombre, apellido, email, password min 8, rolRestauranteId`) | ADMINISTRADOR | plan |
| `PATCH /usuarios/{id}/rol` (`{nuevoRolId}`, 204) | ADMINISTRADOR (tenant); SUPERADMIN o ADMIN (plataforma, solo roles menores al propio) | plan |
| `POST /usuarios/plataforma` (`nombre, apellido, email, password, rolPlataformaId`; 201, 409 email repetido) | SUPERADMIN (crea ADMIN o MODERADOR), ADMIN (solo MODERADOR) | plan |
| `DELETE /usuarios/{id}` (204, soft-delete) | ADMINISTRADOR | plan |

### Cocina
| Endpoint | Roles | Front |
|---|---|---|
| `GET /cocina/cola` | ADMINISTRADOR, RECEPCION, COCINERO | impl `cocina.api.ts` |
| `GET /cocina/listos` | ídem | impl |
| `POST /cocina/pedidos/{id}/listo` (204) | ídem | impl |
| WebSocket STOMP `/ws`, topic `/topic/restaurantes/{restauranteId}/cocina` | tenant autenticado | impl `cocina-live.ts` |

Mensaje del topic: `{ pedidoId, estadoAnterior, estadoNuevo }`. Items de cola y listos: `pedidoId, mesaId, tipoPedido, estado, observacion, total, createdAt, listoAt, items[{detalleId, productoId, nombreProducto, cantidad, observacion}]`. `createdAt` y `listoAt` en hora de Lima, sin zona; `listoAt` es `null` en la cola y es la hora en que el pedido pasó a LISTO (para "hace N min", no se pierde al recargar).

> [!success] Forma de cocina verificada contra el código
> `PreparacionPedidoResponse` y `CocinaDetalleResponse` del backend tienen exactamente esos campos (camelCase, `nombreProducto`). `listoAt` se agregó el 2026-10-16 (migración V13).

## Cambios del backend (2026-10-08 a 2026-10-16)
Numeración de `CAMBIOS_FRONTEND.md` del backend. §1 a §17 estaban en su `main` al verificar (2026-10-16). §18 estaba en una rama del backend ese día; luego se vio en el Swagger en ejecución (`POST /restaurantes` ya exige `administrador`) y el front lo implementó (PR #14). Columna "Estado" = implementación en el front, contrastada con `src/app/` el 2026-10-17.

| § | Cambio | Impacto en el front | Estado |
|---|---|---|---|
| 1 | Se elimina `renovar()` del tenant; paywall y `suspendido.page.ts` dicen que la plataforma regulariza la suscripción (texto parcial) | quitar `RestauranteApi.renovar`, botón del paywall; cambiar copy | implementado: sin llamada de renovar; el paywall muestra el pago manual (Yape + WhatsApp), ver [[Restaurante]] |
| 2 | `POST /restaurantes/actual/suscripcion/cancelar` exige `{password}`; 400 si falta o es incorrecta; cancelar = no renovar, opera hasta `fechaFin` | formulario con contraseña en la fase Restaurante | pendiente (`/restaurante` sigue siendo un placeholder) |
| 3 | `CANCELADA` sigue operando; 402 en escrituras solo si restaurante `INACTIVO`, sin suscripción vigente o `fechaFin < hoy` | `subscriptionGuard` debe usar `fechaFin < hoy`; aviso "Tu suscripción termina el {fechaFin}"; el 402 del backend sigue siendo la fuente de verdad | parcial: `isTenantWriteBlocked` usa `suscripcion.vencida` de `/auth/me` y no bloquea una `CANCELADA` vigente; falta el aviso "termina el {fechaFin}" |
| 4 | Sin suscripción vigente: solo lectura (402 en escrituras); mensajes 402 terminan en "contactá a la plataforma para regularizar tu suscripción"; `GET /restaurantes/actual/suscripcion` devuelve la vigente hoy, 400 si no hay | manejar 400 en ese GET; revisar copy | parcial: el paywall muestra el pago manual en lugar del texto del backend |
| 5 | Permitidas aun bloqueado (402): `PATCH /pedidos/{id}/estado`, `POST /pedidos/{id}/confirmar`, `POST /cocina/pedidos/{id}/listo`, `POST /pagos`, `POST /pagos/{id}/reembolso` | esas rutas no deben llevar `subscriptionGuard` | implementado: `/pedidos`, `/cocina` y `/caja` sin guard; solo `/pedidos/nuevo` lo lleva |
| 6 | Reembolso cancela el pedido si no está `ENTREGADO`; un pedido reembolsado no se puede cobrar de nuevo (400) | ocultar "Cobrar" | implementado en Caja (`porCobrar=true` no devuelve pedidos cobrados ni reembolsados); el reembolso sigue bloqueado por el `pagoId` |
| 7 | DELIVERY `EN_ENTREGA` a `CANCELADO` permitido si no pagado; `ENTREGADO` sin pago permitido | reglas de pedidos | implementado en las transiciones de `pedidos.rules.ts` (`EN_ENTREGA` a `ENTREGADO`/`CANCELADO`) |
| 8 | Validaciones cross-tenant ahora 400 (mesaId de otro restaurante; DELETE/PATCH usuarios de otro restaurante) | mostrar `message` | implementado de forma general: el front muestra el `message` del error |
| 9 | `POST /pedidos` corregido: registra el usuario del token | sin cambio | n/a |
| 10 | Nuevo `GET /cocina/listos` (misma forma que `/cocina/cola`) | usado por el tablero | implementado |
| 11 | WebSocket STOMP nativo en `/ws`, Bearer en CONNECT, topic de cocina, resync en cada (re)conexión, reconexión al refrescar token, canal solo lectura, proxy `/ws` con `ws:true` | `cocina-live.ts`, `proxy.conf.json` | implementado (la página de Cocina ya lo usa) |
| 10b | `listoAt` en `GET /cocina/listos` (`null` en la cola) | "hace N min" con la hora del backend en lugar de la local | pendiente: la página guarda un `listoAt` local por evento (`cocina.page.ts`) y los tipos no leen el campo del backend |
| 12 | `GET /pedidos` con `estado`, `fecha`, `porCobrar`; `estadoPago` por fila | Caja (`?porCobrar=true`) e historial | implementado: lista de Pedidos y Caja (historial aún no) |
| 13 | `POST /pagos` también para RECEPCION y CAJERO | `pagos.registrar` = ADMINISTRADOR, RECEPCION, CAJERO en `permissions.rules.ts` | implementado (Caja, PR #19) |
| 14 | El cambio de plan pasa a la plataforma (`PATCH /restaurantes/{id}/plan`, sin contraseña) | quitar el cambio de plan del tenant | implementado: el tenant no cambia de plan; lo hace Plataforma (`cambiarPlan`) |
| 15 | Backend en `America/Lima`: fechas sin zona ya son hora local | no agregar `Z` ni tratarlas como UTC | parcial: Pedidos (`formatCreatedAt`) y Plataforma (`America/Lima`) lo respetan; el comentario de `cocina.rules.ts` aún habla de UTC con `Z`, por revisar |
| 16 | Roles de plataforma: SUPERADMIN = ADMIN salvo crear ADMINs; MODERADOR consulta y renueva; `POST /usuarios/plataforma` | panel de plataforma por rol; alta de usuarios (ADMIN solo ofrece MODERADOR) | pendiente: las acciones de Plataforma son solo de SUPERADMIN y no hay alta de usuarios de plataforma |
| 17 | Período = un mes calendario; `fechaFin` inclusiva (11/10 a 10/11); demo de N días da N días | textos "vence el {fechaFin}"; días restantes = `fechaFin - hoy + 1` | parcial: Plataforma deriva "Vencida" con `fechaFin < hoy` en hora de Lima; falta el aviso de días restantes en el tenant |
| 18 | `POST /restaurantes` exige `administrador`; crea el dueño ADMINISTRADOR en la misma transacción; 409 email repetido, 422 `administrador.*`; respuesta suma `administrador {usuarioId, email, nombre}` | formulario "Crear restaurante" con sección Administrador | implementado (formulario en dos pasos, PR #14) |

El usuario aprobó `@stomp/rx-stomp` (commit `00c94dd`) y decidió los umbrales de cocina 15 min Atención / 25 min Crítico.

## Backlog de endpoints inexistentes
`GET /usuarios` (`docs/progress/01`) y un listado de roles de plataforma (el front no debe fijar los `rolPlataformaId`). `GET /pedidos` ya existe (verificado el 2026-10-11) y el listado `LISTO` para cocina quedó resuelto por `GET /cocina/listos` según el anuncio.
