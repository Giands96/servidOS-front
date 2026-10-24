export type EstadoMesa = 'LIBRE' | 'OCUPADA';

/** `MesaResponse` of GET /mesas. `comensales` is null while the table is LIBRE. */
export interface Mesa {
  mesaId: number;
  numero: number;
  capacidad: number;
  comensales: number | null;
  estado: EstadoMesa;
  activa: boolean;
}

/** Body of POST /mesas/{id}/ocupar; `comensales` goes from 1 to the table capacity. */
export interface OcuparMesaRequest {
  comensales: number;
}
