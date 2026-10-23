import { fallbackFilename } from './reportes.rules';

describe('fallbackFilename', () => {
  it('builds the backend-style name from report, period, start date and format', () => {
    expect(fallbackFilename('ventas', 'SEMANAL', '2026-10-19', 'XLSX')).toBe('reporte-ventas-semanal-2026-10-19.xlsx');
    expect(fallbackFilename('productos', 'MENSUAL', '2026-10-01', 'PDF')).toBe(
      'reporte-productos-mensual-2026-10-01.pdf',
    );
    expect(fallbackFilename('ventas', 'DIARIO', '2026-10-23', 'PDF')).toBe('reporte-ventas-diario-2026-10-23.pdf');
  });

  it('leaves the date out when it is not known', () => {
    expect(fallbackFilename('productos', 'DIARIO', undefined, 'PDF')).toBe('reporte-productos-diario.pdf');
  });
});
