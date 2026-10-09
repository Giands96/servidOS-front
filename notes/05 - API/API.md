---
title: API
date: 2026-10-08
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

> [!warning] Cambios del backend anunciados el 2026-10-08
> No están en ningún archivo del repositorio y **no se han verificado contra Swagger** (el backend estaba caído). Se marcan como "anunciado por backend, sin verificar contra Swagger".

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
| `GET /auth/me` | autenticado | `{usuarioId,email,nombre,restauranteId,rol}` | impl |

### Restaurante actual y plataforma
| Endpoint | Roles | Front |
|---|---|---|
| `GET /restaurantes/actual` | autenticado | impl (`RestauranteApi.actual`, campo `nombre` asumido) |
| `GET /restaurantes/actual/suscripcion` | autenticado | impl (`SuscripcionApi`, `RestauranteApi.suscripcion`) |
| `PATCH /restaurantes/actual/plan` (`{nuevoPlanId, confirmado:true, password}`) | ADMINISTRADOR, SUPERADMIN | plan |
| `POST /restaurantes/actual/suscripcion/renovar` | ADMINISTRADOR, SUPERADMIN | impl (`renovar()`), ver cambio anunciado |
| `POST /restaurantes/actual/suscripcion/cancelar` | ADMINISTRADOR, SUPERADMIN | plan |
| `POST /restaurantes` (crear) | SUPERADMIN, ADMIN | plan |
| `GET /restaurantes?page=&size=` | SUPERADMIN | plan |
| `GET /restaurantes/{id}`, `/{id}/suscripcion` | SUPERADMIN | plan |

### Catálogo
| Endpoint | Roles | Front |
|---|---|---|
| `GET /productos?categoriaId=&page=`, `GET /productos/{id}`, `GET /categorias` | autenticados | plan |
| `POST /productos`, `PUT /productos/{id}`, `POST /categorias` | ADMINISTRADOR | plan |
| `PATCH /productos/{id}/estado` (`DISPONIBLE`/`AGOTADO`) | ADMINISTRADOR, COCINERO | plan (fuera de alcance de cocina por ahora) |

### Pedidos
| Endpoint | Roles | Front |
|---|---|---|
| `POST /pedidos` (`tipoPedido`, `mesaId?`, `observacion?`, `repartidorNombre?`, `items[]`) | ADMINISTRADOR, RECEPCION | plan |
| `POST /pedidos/{id}/confirmar` (`PENDIENTE` a `EN_PREPARACION`) | ADMINISTRADOR, RECEPCION | plan |
| `PATCH /pedidos/{id}/estado` | ADMINISTRADOR, RECEPCION | plan |

El backend calcula precios y total (anti-tamper): no enviar montos.

### Pagos
| Endpoint | Roles | Front |
|---|---|---|
| `POST /pagos` (`pedidoId`, `metodoPago`, `montoEntregado?`, `referenciaExterna?`) | ADMINISTRADOR | plan |
| `POST /pagos/{id}/reembolso` (`motivo` obligatorio) | ADMINISTRADOR, RECEPCION | plan |

Métodos: `EFECTIVO`, `TARJETA_CREDITO`, `TARJETA_DEBITO`, `YAPE`, `PLIN`, `OTROS`. Estados de pago: `PENDIENTE`, `PAGADO`, `REEMBOLSADO`, `CANCELADO`.

### Usuarios
| Endpoint | Roles | Front |
|---|---|---|
| `POST /usuarios` (`nombre, apellido, email, password min 8, rolRestauranteId`) | ADMINISTRADOR | plan |
| `PATCH /usuarios/{id}/rol` (`{nuevoRolId}`, 204) | doble vía tenant/plataforma | plan |
| `DELETE /usuarios/{id}` (204, soft-delete) | ADMINISTRADOR | plan |

### Cocina
| Endpoint | Roles | Front |
|---|---|---|
| `GET /cocina/cola` | ADMINISTRADOR, RECEPCION, COCINERO | impl `cocina.api.ts` |
| `GET /cocina/listos` | ídem | impl |
| `POST /cocina/pedidos/{id}/listo` (204) | ídem | impl |
| WebSocket STOMP `/ws`, topic `/topic/restaurantes/{restauranteId}/cocina` | tenant autenticado | impl `cocina-live.ts` |

Mensaje del topic: `{ pedidoId, estadoAnterior, estadoNuevo }`. Items de cola: `pedidoId, mesaId, tipoPedido, estado, observacion, total, createdAt (hora local sin zona), items[{detalleId, productoId, nombreProducto, cantidad, observacion}]`.

> [!warning] Forma de cocina sin verificar
> La forma camelCase y `nombreProducto` de `/cocina/cola` y `/cocina/listos` salió de la nota de cambios del backend; `FRONTEND_CONTEXT` §7 advierte "NO verificada contra Swagger".

## Cambios anunciados por el backend (2026-10-08)
Anunciado por backend, sin verificar contra Swagger. Implementación en front: estado a la fecha.

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

El usuario aprobó `@stomp/rx-stomp` (commit `00c94dd`) y decidió los umbrales de cocina 15 min Atención / 25 min Crítico.

## Backlog de endpoints inexistentes
`GET /pedidos`, `GET /usuarios` (`docs/progress/01`). El listado `LISTO` para cocina quedó resuelto por `GET /cocina/listos` según el anuncio.
