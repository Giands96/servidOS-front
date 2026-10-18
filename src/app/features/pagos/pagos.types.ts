/** Payment methods accepted by POST /pagos. */
export type MetodoPago = 'EFECTIVO' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'YAPE' | 'PLIN' | 'OTROS';

/** Lifecycle state of a payment record. */
export type EstadoPagoRegistro = 'PENDIENTE' | 'PAGADO' | 'REEMBOLSADO' | 'CANCELADO';

/** Body of POST /pagos. The amount is never sent: the backend takes it from the order. */
export interface RegistrarPagoRequest {
  pedidoId: number;
  metodoPago: MetodoPago;
  /** Cash handed over by the customer (EFECTIVO only). */
  montoEntregado?: number;
  /** Voucher or operation number (max 100 characters). */
  referenciaExterna?: string;
}

/** `PagoResponse` of POST /pagos. */
export interface Pago {
  pagoId: number;
  pedidoId: number;
  monto: number;
  /** Change returned; null when the method is not cash. */
  vuelto: number | null;
  metodoPago: MetodoPago;
  estado: EstadoPagoRegistro;
  reembolsoMotivo: string | null;
  reembolsoUsuarioId: number | null;
}
