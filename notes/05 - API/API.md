---
title: API
date: 2026-10-16
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
| `GET /restaurantes/actual` | autenticado | impl (`RestauranteApi.actual`) |
| `GET /restaurantes/actual/suscripcion` | autenticado (la vigente hoy; 400 si no hay) | impl (`SuscripcionApi`, `RestauranteApi.suscripcion`) |
| `POST /restaurantes/actual/suscripcion/cancelar` (`{password}`) | ADMINISTRADOR | plan |
| `GET /planes` | autenticado | plan |
| `POST /restaurantes` (crear; exige `administrador {nombre, apellido, email, password}`, ver §18) | SUPERADMIN, ADMIN | plan |
| `GET /restaurantes?page=&size=`, `GET /restaurantes/{id}`, `GET /restaurantes/{id}/suscripcion` | SUPERADMIN, ADMIN, MODERADOR | plan |
| `PATCH /restaurantes/{id}/estado` (suspender o reactivar) | SUPERADMIN, ADMIN | plan |
| `POST /restaurantes/{id}/suscripcion/renovar` (`{planId?}`, obligatorio en la primera) | SUPERADMIN, ADMIN, MODERADOR | plan |
| `PATCH /restaurantes/{id}/plan` (`{nuevoPlanId}`) | SUPERADMIN, ADMIN | plan |

Eliminados: `POST /restaurantes/actual/suscripcion/renovar` y `PATCH /restaurantes/actual/plan` (el tenant ya no renueva ni cambia de plan).

### Catálogo
| Endpoint | Roles | Front |
|---|---|---|
| `GET /productos?categoriaId=&page=`, `GET /categorias` | autenticados | impl `catalogo.api.ts` (solo lectura, rama `feat/pedidos-03-alta-datos`, pendiente de merge) |
| `GET /productos/{id}` | autenticados | plan |
| `POST /productos`, `PUT /productos/{id}`, `POST /categorias` | ADMINISTRADOR | plan |
| `PATCH /productos/{id}/estado` (`DISPONIBLE`/`AGOTADO`) | ADMINISTRADOR, COCINERO | plan (fuera de alcance de cocina por ahora) |

### Pedidos
Verificado contra `/v3/api-docs` y `FRONTEND_CONTEXT` el 2026-10-11. Clientes en `features/pedidos/data/pedidos.api.ts` (ramas de la Fase 4, pendientes de merge; ver [[Pedidos]]).

| Endpoint | Roles | Front |
|---|---|---|
| `GET /pedidos?estado=&fecha=&porCobrar=&page=&size=` (paginado, `size` 1–100, más nuevo primero; fila sin items; `estadoPago` `PAGADO`, `REEMBOLSADO` o `null`) | ADMINISTRADOR, RECEPCION, CAJERO | impl `PedidosApi.listar` |
| `POST /pedidos` (`tipoPedido`, `mesaId?`, `observacion?`, `repartidorNombre?`, `items[]`) | ADMINISTRADOR, RECEPCION | impl `PedidosApi.crear` (sin `repartidorNombre`) |
| `POST /pedidos/{id}/confirmar` (`PENDIENTE` a `EN_PREPARACION`) | ADMINISTRADOR, RECEPCION | impl `PedidosApi.confirmar` |
| `PATCH /pedidos/{id}/estado` | ADMINISTRADOR, RECEPCION | impl `PedidosApi.cambiarEstado` |

No existe `GET /pedidos/{id}`. El backend calcula precios y total (anti-tamper): no enviar montos. `createdAt` de pedidos llega sin `Z` (hora local, §10). Solo `POST /pedidos` devuelve 402; `confirmar` y `PATCH estado` pasan con el tenant bloqueado.

### Pagos
| Endpoint | Roles | Front |
|---|---|---|
| `POST /pagos` (`pedidoId`, `metodoPago`, `montoEntregado?`, `referenciaExterna?`) | ADMINISTRADOR, RECEPCION, CAJERO | plan |
| `POST /pagos/{id}/reembolso` (`motivo` obligatorio; solo un pago `PAGADO`) | ADMINISTRADOR, RECEPCION | plan |

Métodos: `EFECTIVO`, `TARJETA_CREDITO`, `TARJETA_DEBITO`, `YAPE`, `PLIN`, `OTROS`. Estados de pago: `PENDIENTE`, `PAGADO`, `REEMBOLSADO`, `CANCELADO`.

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
Numeración de `CAMBIOS_FRONTEND.md` del backend. §1 a §17 están en `main`; §18 **(rama)**. Columna "Estado" = implementación en el front.

| § | Cambio | Impacto en el front | Estado |
|---|---|---|---|
| 1 | Se elimina `renovar()` del tenant; paywall y `suspendido.page.ts` dicen que la plataforma regulariza la suscripción (texto parcial) | quitar `RestauranteApi.renovar`, botón del paywall; cambiar copy | pendiente |
| 2 | `POST /restaurantes/actual/suscripcion/cancelar` exige `{password}`; 400 si falta o es incorrecta; cancelar = no renovar, opera hasta `fechaFin` | formulario con contraseña en la fase Restaurante | pendiente |
| 3 | `CANCELADA` sigue operando; 402 en escrituras solo si restaurante `INACTIVO`, sin suscripción vigente o `fechaFin < hoy` | `subscriptionGuard` debe usar `fechaFin < hoy`; aviso "Tu suscripción termina el {fechaFin}"; el 402 del backend sigue siendo la fuente de verdad | pendiente |
| 4 | Sin suscripción vigente: solo lectura (402 en escrituras); mensajes 402 terminan en "contactá a la plataforma para regularizar tu suscripción"; `GET /restaurantes/actual/suscripcion` devuelve la vigente hoy, 400 si no hay | manejar 400 en ese GET; revisar copy | pendiente |
| 5 | Permitidas aun bloqueado (402): `PATCH /pedidos/{id}/estado`, `POST /pedidos/{id}/confirmar`, `POST /cocina/pedidos/{id}/listo`, `POST /pagos`, `POST /pagos/{id}/reembolso` | esas rutas no deben llevar `subscriptionGuard` | parcial: cocina sin guard |
| 6 | Reembolso cancela el pedido si no está `ENTREGADO`; un pedido reembolsado no se puede cobrar de nuevo (400) | ocultar "Cobrar" | pendiente |
| 7 | DELIVERY `EN_ENTREGA` a `CANCELADO` permitido si no pagado; `ENTREGADO` sin pago permitido | reglas de pedidos | pendiente |
| 8 | Validaciones cross-tenant ahora 400 (mesaId de otro restaurante; DELETE/PATCH usuarios de otro restaurante) | mostrar `message` | pendiente |
| 9 | `POST /pedidos` corregido: registra el usuario del token | sin cambio | n/a |
| 10 | Nuevo `GET /cocina/listos` (misma forma que `/cocina/cola`) | usado por el tablero | implementado |
| 11 | WebSocket STOMP nativo en `/ws`, Bearer en CONNECT, topic de cocina, resync en cada (re)conexión, reconexión al refrescar token, canal solo lectura, proxy `/ws` con `ws:true` | `cocina-live.ts`, `proxy.conf.json` | implementado (sin página aún) |
| 10b | `listoAt` en `GET /cocina/listos` (`null` en la cola) | "hace N min" con la hora del backend en lugar de la local | pendiente |
| 12 | `GET /pedidos` con `estado`, `fecha`, `porCobrar`; `estadoPago` por fila | Caja (`?porCobrar=true`) e historial | lista implementada; Caja pendiente |
| 13 | `POST /pagos` también para RECEPCION y CAJERO | `pagos.registrar` = ADMINISTRADOR, RECEPCION, CAJERO en `permissions.rules.ts` | pendiente |
| 14 | El cambio de plan pasa a la plataforma (`PATCH /restaurantes/{id}/plan`, sin contraseña) | quitar el cambio de plan del tenant | pendiente |
| 15 | Backend en `America/Lima`: fechas sin zona ya son hora local | no agregar `Z` ni tratarlas como UTC | pendiente de revisar |
| 16 | Roles de plataforma: SUPERADMIN = ADMIN salvo crear ADMINs; MODERADOR consulta y renueva; `POST /usuarios/plataforma` | panel de plataforma por rol; alta de usuarios (ADMIN solo ofrece MODERADOR) | pendiente |
| 17 | Período = un mes calendario; `fechaFin` inclusiva (11/10 a 10/11); demo de N días da N días | textos "vence el {fechaFin}"; días restantes = `fechaFin - hoy + 1` | pendiente |
| 18 | **(rama)** `POST /restaurantes` exige `administrador`; crea el dueño ADMINISTRADOR en la misma transacción; 409 email repetido, 422 `administrador.*`; respuesta suma `administrador {usuarioId, email, nombre}` | formulario "Crear restaurante" con sección Administrador | pendiente |

El usuario aprobó `@stomp/rx-stomp` (commit `00c94dd`) y decidió los umbrales de cocina 15 min Atención / 25 min Crítico.

## Backlog de endpoints inexistentes
`GET /usuarios` (`docs/progress/01`) y un listado de roles de plataforma (el front no debe fijar los `rolPlataformaId`). `GET /pedidos` ya existe (verificado el 2026-10-11) y el listado `LISTO` para cocina quedó resuelto por `GET /cocina/listos` según el anuncio.
