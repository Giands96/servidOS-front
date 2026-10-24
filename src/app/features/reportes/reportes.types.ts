import { Page } from '../../core/http/api.types';
import { MetodoPago } from '../pagos/pagos.types';
import { TipoPedido } from '../pedidos/pedidos.types';

/** Report period: a day, a Monday-to-Sunday week or a calendar month. */
export type Periodo = 'DIARIO' | 'SEMANAL' | 'MENSUAL';

export type OrdenVentas = 'MAS_RECIENTES' | 'MAS_ANTIGUOS' | 'MAYOR_VENTA';

export type FormatoExport = 'PDF' | 'XLSX';

export type TipoReporte = 'ventas' | 'productos';

/** One paid order of the period (`VentaPedidoResponse`). */
export interface VentaReporte {
  pedidoId: number;
  /** Payment date, no zone: Lima local time. */
  fechaPago: string;
  tipoPedido: TipoPedido;
  metodoPago: MetodoPago;
  total: number;
  /** Not in the contract yet: shown as "Mesa N" when the backend starts sending it. */
  mesaId?: number | null;
}

/** `GET /reportes/ventas`. `desde`/`hasta` are `yyyy-MM-dd`, both inclusive. */
export interface ReporteVentas {
  periodo: Periodo;
  desde: string;
  hasta: string;
  cantidadVentas: number;
  totalVendido: number;
  ventas: Page<VentaReporte>;
}

export interface ProductoVendido {
  posicion: number;
  productoId: number;
  nombre: string;
  cantidad: number;
  monto: number;
  /** Not in the contract yet: hidden until the backend sends it. */
  categoria?: string | null;
}

/** `GET /reportes/productos`: the whole ranking, ordered by monto, no pagination. */
export interface ReporteProductos {
  periodo: Periodo;
  desde: string;
  hasta: string;
  cantidadVentas: number;
  totalVendido: number;
  productos: ProductoVendido[];
}

/** Query of the reports. `fecha` (`yyyy-MM-dd`) is any day of the period; omitted = today in Lima. */
export interface PeriodoQuery {
  periodo: Periodo;
  fecha?: string;
}

export interface VentasQuery extends PeriodoQuery {
  orden: OrdenVentas;
  page: number;
  size: number;
}

/** Query of an export: the ventas report also takes the sort order, the productos report does not. */
export interface ExportQuery extends PeriodoQuery {
  orden?: OrdenVentas;
}

/** A downloaded report: the bytes and the file name the backend chose. */
export interface ReporteArchivo {
  blob: Blob;
  filename: string;
}
