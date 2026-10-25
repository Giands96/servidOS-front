---
title: Decisiones (ADR)
date: 2026-10-23
tags:
  - servidos
  - adr
  - decisiones
aliases:
  - ADR
  - Decisiones de arquitectura
---

# Decisiones (ADR)

> [!abstract] Alcance
> Solo decisiones con evidencia en `docs/progress/*`, `odd/tasks/*` o código. Los commits se citan tal como aparecen en esos documentos o en `git log`.

Volver: [[00 - MOC]] · Ver [[Arquitectura]] · [[Seguridad]] · [[Fase 0 - Infra]] · [[Fase 3 - Cocina]]

## ADR-01 Eliminar SSR (SPA pura)
- **Contexto**: el token vive en memoria y la cookie de refresh tiene `path=/api/v1/auth`; el servidor Node no tendría sesión.
- **Decisión**: quitar SSR (decisión del usuario). Removidos `@angular/ssr`, `@angular/platform-server`, `express`, `@types/express`. Commit `2a2bea3`.
- **Alternativas**: dejar rutas autenticadas en `RenderMode.Client`.
- **Ventajas**: sin superficie de servidor Node, coherente con auth en memoria, menos dependencias.
- **Desventajas**: sin prerender/SEO (irrelevante para app operativa), todo el render ocurre en cliente.

## ADR-02 Access token solo en memoria
- **Contexto**: mitigar robo por XSS.
- **Decisión**: `SessionStore.accessToken` es un signal; nunca web storage. La sesión se restaura al recargar con `POST /auth/refresh` + `GET /auth/me`.
- **Alternativas**: `localStorage`.
- **Ventajas**: no persiste a XSS de almacenamiento.
- **Desventajas**: cada recarga necesita un refresh; un XSS activo aún puede usar el token mientras vive la página. Ver [[Seguridad]].

## ADR-03 Refresh single-flight
- **Contexto**: reusar una cookie ya rotada revoca toda la familia de tokens (robo detectado, logout total).
- **Decisión**: `ensureRefreshed()` comparte una promesa; el interceptor reutiliza el token si otra petición ya renovó. Commits `fed17c2`, `53aa6cb`; endurecimiento `65cc42e`, `3fd8d00`.
- **Ventajas**: N peticiones 401, un solo refresh; sin cierres de sesión espurios.
- **Desventajas**: más complejidad (epoch, abandono de vuelo); requiere tests finos.

## ADR-04 Un refresh transitorio no cierra sesión
- **Decisión** (`65cc42e`): solo 401/403 del refresh limpian sesión; red, 5xx y 429 la mantienen.
- **Desventaja aceptada**: con el backend caído el usuario ve errores en vez de ir a login.

## ADR-05 Timeout de arranque de 8 s
- **Contexto**: Angular no renderiza hasta que `hydrate()` termina; un backend colgado dejaba pantalla en blanco.
- **Decisión**: `HYDRATE_TIMEOUT_MS = 8000`, la app arranca anónima; el `epoch` descarta respuestas tardías.
- **Nota**: 8 s es decisión de UX, no SLA del backend.

## ADR-06 Tabla única de permisos
- **Decisión** (`5943a2b`, `b01c389`): `permissions.rules.ts` es la fuente para guards y botones. `can()` exige que rol y scope coincidan.
- **Ventajas**: un cambio de permiso en un solo lugar. **Desventajas**: duplica conocimiento del backend; puede desfasarse.

## ADR-07 Menú derivado de las rutas
- **Contexto**: la acción estaba escrita en `app.routes.ts` y en `NAV_ITEMS`.
- **Decisión del usuario (2026-10-03)**: "el menú solo debe mostrar las rutas a las que el trabajador puede entrar". Commit `02bca02`, fix `484abaa`.
- **Ventajas**: divergencia imposible por construcción. **Desventajas**: `Route.data` débil, `loadChildren` no soportado. Ver [[Arquitectura]].

## ADR-08 "Restaurante y plan" solo para ADMINISTRADOR
- **Decisión del usuario (2026-10-03)**, commit `1dcd8a8`, test positivo `f5312ca`. Ruta y menú usan `restaurante.suscripcion.gestionar`. `restaurante.ver` se conserva para lecturas (nombre en el sidebar).

## ADR-09 Tailwind 4 con tokens `@theme`
- **Decisión** (`4d8b1c0`): tokens extraídos de `pencil-export` en `src/styles.css`. **Ventajas**: coherencia visual, sin CSS por pantalla. **Desventajas**: depende de que el diseño se mantenga sincronizado con los tokens. Ver [[Styles y Diseño]].

## ADR-10 Iconos propios (SVG inline)
- **Decisión** (`4d8b1c0`): `icon.component.ts` con paths a mano en vez de una librería. **Ventajas**: cero dependencias. **Desventajas**: agregar cada icono a mano.

## ADR-11 Google Fonts (Bricolage Grotesque + Geist)
- **Pedido del usuario**, commit `3a41996`. `preconnect` + hoja con `display=swap`; en producción el build inlinea `@font-face`.
- **Desventajas**: tercero externo (privacidad, CSP `font-src https://fonts.gstatic.com`); alternativa: auto-hospedar `.woff2`. Pendiente al definir infraestructura.

## ADR-12 `subscriptionGuard` falla abierto
- **Decisión** (`1e7592b`): ante error de red el guard deja pasar; el backend sigue aplicando el 402. **Desventaja**: la UI puede mostrar pantallas de escritura que luego fallan con 402 (que redirige igual).

## ADR-13 `**` renderiza 404
- **Decisión** (`7a4245a`): una redirección a `''` generaba bucle mientras no existían las home por rol.

## ADR-14 Dependencia `@stomp/rx-stomp`
- **Decisión del usuario (2026-10-08)**, commit `00c94dd`, revisión nativa aprobada. **Motivo**: tablero de cocina en vivo (WebSocket STOMP nativo en `/ws`). **Alternativa**: polling 5–10 s (previsto antes del cambio de backend). **Desventajas**: dependencia nueva (`@stomp/stompjs 7.3.0` transitiva); requiere tests de conexión/reconexión (advisory de la review).

## ADR-15 Umbrales del cronómetro de cocina
- **Decisión del usuario (2026-10-08)**: Atención a 15 min, Crítico a 25 min; el texto del diseño EGPHx manda sobre los colores de `cocina-admin.png`. Constante única `URGENCY_THRESHOLDS` en `cocina.rules.ts`.

## ADR-16 `/cocina` sin `subscriptionGuard`
- **Contexto**: el backend permite marcar listo aun con suscripción bloqueada (anunciado §5). **Decisión**: la ruta no lleva el guard (comentario en `app.routes.ts`). **Desventaja**: depende de la veracidad del anuncio, **sin verificar contra Swagger**.

## ADR-17 FRONTEND_CONTEXT manda sobre el diseño
- **Decisión del usuario**: pantallas que requieren endpoints no documentados no se construyen (p. ej. `GET /pedidos`, `GET /usuarios`).

## ADR-18 Proxy de desarrollo mismo origen
- **Decisión**: `proxy.conf.json` (`/api` y `/ws`) para que la cookie `refresh_token` sea same-origin y no dependa de CORS.

## ADR-19 `moduleRoute` acepta `load` y `/cocina` no lleva `subscriptionGuard`
- **Contexto**: había que sustituir el placeholder de `/cocina` por la página real sin perder el guard de permisos ni el menú derivado.
- **Decisión** (`2fad5cb`): `moduleRoute(action, label, icon, guards = [], load = placeholder)` recibe el componente real como 5.º parámetro; se conserva `[routeActionGuard, ...guards]`. Para `/cocina` se pasa `guards = []`: sin `subscriptionGuard`, porque marcar listo se permite con suscripción bloqueada (anunciado §5, sin verificar). Dos tests de ruta lo fijan.
- **Alternativas**: declarar la ruta a mano con `canActivate` propio (riesgo de perder `routeActionGuard`, ver R2-001).
- **Ventajas**: permiso y menú siguen declarados en un solo lugar. **Desventajas**: depende de la veracidad del anuncio del backend; la firma posicional de `moduleRoute` crece (5 parámetros).

## ADR-20 Dependencia `@angular/cdk` para el drag & drop del tablero de pedidos
- **Contexto**: el usuario pidió el drag & drop en `/pedidos` ("No está el drag & drop", 2026-10-16); el tablero kanban se había diferido en la v1 de Pedidos. AGENTS §6 exige aprobación para agregar dependencias.
- **Decisión del usuario (2026-10-16)**: aprobar `@angular/cdk@^22.2.3` (instalada la 22.2.3), commit `8bae4e3` en `feat/tablero-01-base`, revisión nativa aprobada (`review-45064623d1db4e80`). Solo se usa para el arrastre en el tablero; `cdk-drag` entra únicamente en el chunk lazy de pedidos.
- **Alternativa descartada**: drag & drop nativo de HTML5, que **no soporta touch**. Otra salida sin dependencia es el menú "Mover a…", que se construyó igualmente como camino de teclado.
- **Ventajas**: soporte táctil y de teclado del arrastre sin código propio; mantenida por el equipo de Angular y alineada con la versión del framework (`^22`).
- **Desventajas**: dependencia nueva (trae `parse5` y `entities`, que el lockfile deja de marcar como `dev`); el comportamiento táctil sigue sin probarse en un dispositivo.
- **Estado**: mergeada en `main` (#24). Su primer uso, la interfaz del tablero, también está en `main` (#27). Ver [[Fase 4 - Pedidos]].

## ADR-21 Navegación responsive: barra superior con píldoras bajo `lg`, sidebar desde `lg`
- **Contexto**: bajo `lg` el sidebar completo se apilaba sobre cada página y quitaba unos 250 a 300 px de alto en teléfonos. No existe diseño móvil en `pencil-export`.
- **Decisión del usuario (2026-10-23, revisada el mismo día)**: bajo `lg` (teléfonos y tabletas) una barra superior oscura (logo, "ServidOS", nombre del restaurante, avatar) con una fila de píldoras de enlace desplazable en horizontal (ícono + etiqueta; la activa en naranja), según una imagen de diseño que el usuario compartió en el chat. Desde `lg` se conserva el sidebar. Commits `42e6a10` y `f8e2cf3` en `feat/responsive-01-shell`.
- **Alternativa descartada**: cajón con hamburguesa y riel de iconos en tabletas, implementado como `f0357f5` y descartado con un reset local al llegar el diseño del usuario.
- **Defaults del orquestador** (a revisar): sin contadores en las píldoras (el backend no tiene endpoints de conteo, igual que en la Fase 2); degradado en el borde que desborda; la píldora activa se desplaza a la vista; "Cerrar sesión" pasa a un menú del avatar; la barra no se oculta al desplazar.
- **Ventajas**: la cabecera baja de unos 250-300 px a 108 px; todos los módulos siguen a un toque, sin abrir ni cerrar un cajón; reutiliza tokens y primitivas existentes (sin lenguaje visual nuevo); el escritorio no cambia; el comportamiento (menú del avatar, navegación) tiene tests.
- **Desventajas**: la fila de píldoras desborda con muchos módulos y obliga a desplazar (mitigado con el degradado y el auto-scroll de la activa); la barra siempre ocupa 108 px de alto; la marca queda duplicada entre la barra y el sidebar; los degradados no tienen test y no se recalculan si cambian los ítems; un solo quiebre (`lg`) significa que una tableta apaisada de 1024 px ya recibe el sidebar.
- **Estado**: slice 1 publicada (`origin/feat/responsive-01-shell`, PR por abrir); slice 2 lista en `feat/responsive-02-pages`. Ver [[Styles y Diseño]] (sección Responsive) y [[Estado Actual]].

## ADR-22 Montos con separador de miles en toda la app
- **Contexto**: el diseño de Reportes muestra `S/ 18,452.50`, pero `formatMoney` imprimía `S/ 18452.50` (sin separador).
- **Decisión del usuario (2026-10-24)**: mostrar los montos con separador de miles en toda la app. `formatAmount` vive en `pedidos.rules` y lo usan `formatMoney` y `formatPrecio` de Plataforma. Commit `cfd535e` en `feat/reportes-02-page`.
- **Alcance**: los inputs de formulario (precio del producto, monto entregado de Caja) conservan `toFixed` sin separador, porque su valor se reparsea.
- **Evidencia**: RED con 7 pruebas fallando (`S/ 1000.00` frente a `S/ 1,000.00`), luego GREEN; suite 32 archivos / 1296; build OK.
- **Ventajas**: lectura uniforme de montos grandes; una sola función de formato.
- **Desventajas**: el cambio toca pantallas ya mergeadas (Pedidos, Caja, Plataforma, Catálogo) dentro de la rama de Reportes; los inputs muestran un formato distinto al de las etiquetas.
- **Estado**: en `feat/reportes-02-page`, sin publicar. Ver [[Reportes]].

## ADR-23 Nuevo pedido Local con la mesa primero y sin selector de tipo en el carrito
- **Contexto**: el tipo de pedido vivía en el carrito, después de los productos, y Local pedía un `mesaId` numérico en un input; el personal no veía qué mesas estaban libres.
- **Decisión del usuario (2026-10-24)**: flujo Tipo de pedido → (Local) Mesa → Comensales → Productos; el selector Mesa / Delivery / Recojo del carrito se quita para todos los tipos y se reemplaza por un resumen con "Cambiar" que vuelve al paso 0. Una mesa OCUPADA abre su cuenta y "Agregar ronda" no pide comensales. Comensales de 1 a `capacidad`.
- **Alternativa descartada**: mantener el selector en el carrito además del paso 0 (dos lugares para elegir el tipo y una forma de saltarse la mesa).
- **Ventajas**: un solo lugar para elegir el tipo; no se puede crear un pedido Local sin mesa; las tarjetas muestran ocupación, tiempo abierto y consumido.
- **Desventajas**: un paso más para Delivery y Recojo; la página orquesta más estado (paso, mesa, comensales, detalle).
- **Estado**: slice 1 en `main`, slices 2 y 3 sin mergear. Ver [[Pedidos]].

## ADR-24 Ocupar la mesa justo antes de crear el pedido, con `liberar` como compensación
- **Contexto**: se podía ocupar la mesa al confirmar los comensales o al crear el pedido.
- **Decisión (default del orquestador, 2026-10-24)**: `POST /mesas/{id}/ocupar` se llama al pulsar "Crear pedido", justo antes de `POST /pedidos`; solo para mesas LIBRE. Si `ocupar` falla, se muestra el mensaje del backend y se vuelve a un selector recargado conservando el carrito. Si `crear` falla después de `ocupar`, se llama a `liberar` (mejor esfuerzo) y el borrador queda intacto.
- **Ventajas**: descartar nunca deja una mesa ocupada sin pedidos.
- **Desventajas**: no es atómico. Cualquier error de `ocupar` se trata como "mesa tomada"; un fallo de `liberar` o un `crear` ambiguo (timeout con el pedido ya creado) puede dejar una mesa huérfana; `crearPedido` no tiene tests. Queda como seguimiento en [[Pendientes y Deuda Técnica]].
- **Alternativa**: un endpoint atómico del backend que ocupe y cree.
- **Evidencia**: probado en navegador (pedido #2354; conflicto "La mesa ya está ocupada"; fallo forzado de `POST /pedidos` con `liberar`). Ver [[Mesas]].

## ADR-25 Para llevar de una mesa como RECOJO con `mesaId`, cobrado con la mesa, y "Cobrar cuenta" oculto
- **Decisión del usuario (2026-10-24)**: un para llevar pedido desde una mesa es un `RECOJO` con el `mesaId` de la mesa y se cobra junto con su cuenta (sección "Para llevar" separada, nunca numerada como ronda). "Cobrar cuenta" no se muestra: cobrar la cuenta de la mesa en Caja (`POST /mesas/{id}/cuenta/pagar`) es una feature aparte.
- **Ventajas**: el para llevar aparece en la cuenta de la mesa sin ocupar la mesa de nuevo.
- **Desventajas**: hasta que Caja soporte la cuenta de mesa, el cobro del conjunto no tiene pantalla; la cuenta se ve pero no se cobra desde ahí.
- **Estado**: pedido #2357 verificado en la cuenta de la mesa 4. Ver [[Pedidos]] y [[Pagos]].

> [!note] Decisión de proceso
> Flujo ODD v3 con revisiones nativas (RDD) por commit/slice. Ver [[Infraestructura]].
