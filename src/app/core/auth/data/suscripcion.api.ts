export interface Suscripcion {
  suscripcionId: number;
  restauranteId: number;
  planId: number;
  estado: 'ACTIVA' | 'CANCELADA';
  fechaInicio: string;
  fechaFin: string;
}
