---
title: Fase 6 - Catálogo
date: 2026-10-16
tags:
  - servidos
  - fases
  - catalogo
aliases:
  - Fase 6
  - Menú, productos y disponibilidad
---

# Fase 6 — Catálogo (menú, productos y disponibilidad)

Volver: [[00 - MOC]] · Anterior: [[Fase 5 - Plataforma]] · Siguiente: [[Fases 4-9 - Planificadas]] · Módulo: [[Catálogo]]

> [!success] Mergeada en `main` (2026-10-17)
> Las cuatro tareas de código (`feat/catalogo-01-datos`, `feat/catalogo-02-pagina` y `feat/catalogo-03-formularios`) están en `main` por los PRs #16, #17 y #18 (`main` en `527e1e6`). Pendiente: probar en navegador; **nada de esta fase se probó en navegador**. Fuente: `docs/progress/09-fase-6-catalogo.md` y `odd/tasks/catalogo.md`.

> [!abstract] Objetivo
> Reemplazar el placeholder `/catalogo` por la **pantalla del menú** (diseño `hoW4s`): lista de categorías con conteos, tabla de productos, crear y editar producto, crear categoría y el interruptor Disponible/Agotado. Sin esto un restaurante no puede cargar su menú y no se puede probar Nuevo pedido con datos reales.

## Alcance decidido con el usuario
Plan aprobado el 2026-10-16, con un **campo opcional de URL para la imagen** del producto (sin subida de archivos). Entrega en cadena `stacked-to-main`. Sin specs de página ni de componentes por AGENTS §6. Fuera de alcance porque el backend no tiene el endpoint: eliminar producto o categoría, renombrar o habilitar/deshabilitar categoría, subir imágenes y búsqueda.

## Tareas y commits
| Tarea | Commit | Rama | Qué |
|---|---|---|---|
| T6.1 | `acdd6de` | `feat/catalogo-01-datos` | escrituras en `CatalogoApi` (`producto`, `crearProducto`, `actualizarProducto`, `cambiarEstadoProducto`, `crearCategoria`), tipos de petición y builders |
| T6.2 | `e5a1a70` | `feat/catalogo-01-datos` | reglas puras: vista del menú, interruptor de estado, formulario de producto y categoría, mapeo de errores, disponibilidad de escritura |
| T6.3 | `01bec53` | `feat/catalogo-02-pagina` | página `/catalogo` (categorías con conteos, tabla, interruptor, paginador), cambio de ruta e íconos |
| T6.4 | `98c7d10` | `feat/catalogo-03-formularios` | modal de producto (crear y editar) y modal de categoría |
| T6.5 | — | `docs/obsidian-pedidos-merge` | nota de progreso, cuerpos de PR 16–18 y estas notas del Vault |

## Evidencia
- Punta de la cadena (`98c7d10`): **26 archivos, 985 tests en verde**; catalogo 3 archivos / 97; `npx ng build` OK.
- Por tarea (suite completa): T6.1 24 / 912, T6.2 26 / 980, T6.3 26 / 981, T6.4 26 / 985.
- RED registrados en cada tarea (métodos y módulos inexistentes, spec de rutas contra el placeholder, `categoriaOptions`); detalle en `docs/progress/09-fase-6-catalogo.md`.
- Reviews nativas aprobadas, todas de riesgo medio con la lente reliability: T6.1 + T6.2 (`review-0e9c0c7fd77af064`, `main..e5a1a70`, 8 archivos / 994 líneas); T6.3 (`review-96271976eeb1bffb`, 4 archivos / 534); T6.4 (`review-aeb4555b876a3d61`, 6 archivos / 550).
- Tamaños de slice: 994, 534 y 550 líneas; las tres piden `size:exception` (cuerpos de PR en `docs/prs/16` a `18`).

## Hechos del contrato (OpenAPI local, 2026-10-16)
- `POST /productos` y `PUT /productos/{id}`: `nombre` obligatorio (mín. 1, único por tenant), `precio` obligatorio (≥ 0), `descripcion`, `categoriaId`, `tiempoPreparacion` (≥ 0), `estado` (`AGOTADO` o `DISPONIBLE`) e `imagenUrl` (texto libre). 400 por datos inválidos o categoría ajena; 403; 422 con `campo: mensaje`.
- `PATCH /productos/{id}/estado` `{ estado }`; `POST /categorias` `{ nombre, estado }` (400 por nombre duplicado). Un producto `AGOTADO` no se puede pedir.
- Roles (contrato §3): crear y editar producto y crear categoría = ADMINISTRADOR; cambiar estado = ADMINISTRADOR y COCINERO; lectura = todos. Las escrituras dan 402 con el tenant bloqueado (contrato §5; no figura en OpenAPI). Los enums inválidos probablemente den 500: se validan en el cliente.
- Detalle en [[Catálogo]] y [[API]].

## Decisiones
Defaults del orquestador (a revisar con el usuario):
- Menú completo cargado una vez; filtro, conteos y paginado de 10 en 10 en el cliente (un menú son decenas de ítems y la API no da conteos).
- Categorías `DESHABILITADO` atenuadas y fuera del selector del formulario de producto; productos sin categoría como "Sin categoría"; `estado` nulo tratado como `DISPONIBLE` solo al mostrar.
- **Editar conserva `estado`**: el `PUT` es un reemplazo completo y omitir el estado reactivaría un plato agotado.
- Sin `subscriptionGuard` en la ruta: la lectura siempre funciona; con el tenant bloqueado los controles de escritura se deshabilitan con un aviso.
- **Columna ESTADO agregada, no está en el diseño** `hoW4s`: aloja el interruptor.

## Pendientes
Prueba en navegador de la pantalla y los modales con los tres roles; decidir qué hacer al cerrar el modal con la X durante un guardado (hoy la petición se desmonta y el producto puede existir sin verse hasta recargar); confirmar la columna ESTADO con el usuario. Ver [[Pendientes y Deuda Técnica]] y [[Estado Actual]].
