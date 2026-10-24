---
title: Reportes
date: 2026-10-23
tags:
  - servidos
  - modulos
  - reportes
aliases:
  - Módulo Reportes
  - Reportes de ventas
---

# Reportes

Volver: [[00 - MOC]] · Ver [[Pagos]] · [[Pedidos]] · [[API]] · [[Modelo de Negocio]] · [[Estado Actual]] · [[Pendientes y Deuda Técnica]]

> [!abstract] Responsabilidad
> Pantalla `/reportes` para el ADMINISTRADOR: ventas cobradas del día, la semana o el mes, ranking de productos más vendidos y exportación de lo que se ve a Excel (.xlsx) y PDF.

> [!warning] Estado: dos ramas apiladas, sin publicar (2026-10-23)
> `feat/reportes-01-data` (review `review-953d26b3e0c03b91`, aprobada) y `feat/reportes-02-page` (evaluada `under_budget`, sin review pendiente). Probado en navegador a 375 / 768 / 1280 contra el backend local. 32 archivos / 1296 tests, build OK. Detalle en `docs/progress/13-reportes.md`.

## Ruta y permiso
- `/reportes`, acción `reportes.ver`, solo ADMINISTRADOR (`permissions.rules.ts`). El backend restringe los cuatro endpoints con `@PreAuthorize` ADMINISTRADOR.
- Entrada de navegación con ícono `chart`, entre Catálogo y Usuarios.

## Archivos
| Ruta | Contenido |
|---|---|
| `features/reportes/reportes.types.ts` | períodos, órdenes, respuestas de ventas y productos, `ReporteArchivo` |
| `features/reportes/data/reportes.api.ts` | `ventas`, `productos`, `exportar` → `{ blob, filename }` |
| `features/reportes/domain/reportes.rules.ts` | rangos y etiquetas de período, anterior/siguiente, fechas de venta, paginador, estado en la URL, nombre de archivo de respaldo |
| `features/reportes/reportes.page.ts` | orquesta: barra de período, tarjetas, pestañas, exportación |
| `features/reportes/export-menu.component.ts` | botón "Exportar" con menú Excel / PDF |
| `features/reportes/ventas-list.component.ts` | tabla (escritorio/tableta) y tarjetas (teléfono) de ventas |
| `features/reportes/productos-list.component.ts` | ranking con barras proporcionales |

## Endpoints (Swagger en vivo, 2026-10-23)
- `GET /reportes/ventas?periodo=DIARIO|SEMANAL|MENSUAL&fecha&orden=MAS_RECIENTES|MAS_ANTIGUOS|MAYOR_VENTA&page&size` (size máx. 100): totales más una página de `{ pedidoId, fechaPago, tipoPedido, metodoPago, total }`.
- `GET /reportes/productos?periodo&fecha`: sin paginar, ordenado por monto.
- `GET /reportes/ventas/export` y `GET /reportes/productos/export` con `formato=PDF|XLSX`; el nombre llega en `Content-Disposition`.
- Una venta es un pedido PAGADO no cancelado, fechado por el pago en hora de Lima. La semana va de lunes a domingo. Fechas sin zona.

## Estado en la URL
`periodo`, `fecha`, `tab`, `orden` y `page` viven en los query params: recargar y volver atrás conservan la vista. Período por defecto: SEMANAL. "Siguiente" se deshabilita cuando el período contiene hoy.

## Exportación
- Elegir formato exporta la pestaña activa con su período y orden.
- Nombre desde `Content-Disposition`; si falta, uno construido con `desde`.
- Descarga con un enlace temporal; el foco vuelve a "Exportar". Los errores llegan como blob y se lee su cuerpo.
- Bug hallado en la prueba en navegador (`dabcf9f`): `viewChild('trigger')` devolvía el componente `appButton` y no un `ElementRef`, así que elegir un formato fallaba sin pedir nada. Arreglo: `viewChild.required('trigger', { read: ElementRef<HTMLElement> })`.

## Montos
`formatMoney` separa miles en toda la app (ADR-22 en [[Decisiones (ADR)]]).

## Huecos del contrato
- Las filas de venta no traen número de mesa: se muestra "Mesa". Hoy, además, `tipoLabel` muestra el `mesaId` como número en otras pantallas (ver el plan de Mesas).
- El ranking no trae categoría: se oculta.
- Métodos TARJETA_CREDITO / TARJETA_DEBITO: se reutilizan las etiquetas de Caja.
- El diseño dice "Jue 23 oct"; el 2026-10-23 es viernes y las reglas muestran "Vie".
- Pedido al backend abierto: `mesa` y `categoria` opcionales.

## Ventajas y desventajas
| Ventaja | Desventaja |
|---|---|
| La URL es la única fuente del estado: compartible y recargable | Cada cambio de filtro es una navegación |
| Los totales los calcula el backend | La pantalla depende de que el contrato traiga mesa y categoría |
| Exporta exactamente lo que se ve | La descarga no se prueba con tests unitarios |

## Cómo extenderlo
- Reglas primero con su test (TDD estricto); la página solo orquesta.
- Revisar `/v3/api-docs` antes de tocar los tipos.
- No calcular totales en el cliente.
