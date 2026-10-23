import { FormatoExport, Periodo, TipoReporte } from '../reportes.types';

/**
 * File name used when the response carries no Content-Disposition. Same naming as the backend:
 * `reporte-{ventas|productos}-{diario|semanal|mensual}-{desde}.{xlsx|pdf}`; the date is left out when unknown.
 */
export function fallbackFilename(
  reporte: TipoReporte,
  periodo: Periodo,
  desde: string | undefined,
  formato: FormatoExport,
): string {
  const parts = ['reporte', reporte, periodo.toLowerCase(), ...(desde === undefined ? [] : [desde])];
  return `${parts.join('-')}.${formato.toLowerCase()}`;
}
