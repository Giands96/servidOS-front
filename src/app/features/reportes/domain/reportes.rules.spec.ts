import { Page } from '../../../core/http/api.types';
import { VentaReporte } from '../reportes.types';
import {
  barRatio,
  canGoNext,
  exportMenuLine,
  fallbackFilename,
  formatFechaButton,
  pageIndicator,
  pagerItems,
  pageSummary,
  parseReportesView,
  periodCaption,
  rangeLabel,
  reportesQueryParams,
  shiftFecha,
  tipoVentaLabel,
  todayInLima,
  ventaDateTime,
} from './reportes.rules';

const venta = (over: Partial<VentaReporte> = {}): VentaReporte => ({
  pedidoId: 583,
  fechaPago: '2026-10-23T14:52:07',
  tipoPedido: 'MESA',
  metodoPago: 'YAPE',
  total: 50,
  ...over,
});

const page = (over: Partial<Page<VentaReporte>> = {}, rows = 100): Page<VentaReporte> => ({
  content: Array.from({ length: rows }, () => venta()),
  totalElements: 214,
  totalPages: 3,
  size: 100,
  number: 0,
  first: true,
  last: false,
  ...over,
});

describe('rangeLabel', () => {
  it('shows the day with its weekday', () => {
    expect(rangeLabel('DIARIO', '2026-10-23', '2026-10-23')).toBe('Vie 23 oct 2026');
    expect(rangeLabel('DIARIO', '2026-10-25', '2026-10-25')).toBe('Dom 25 oct 2026');
  });

  it('collapses a week inside one month', () => {
    expect(rangeLabel('SEMANAL', '2026-10-19', '2026-10-25')).toBe('19 – 25 oct 2026');
  });

  it('names both months when the week crosses a month', () => {
    expect(rangeLabel('SEMANAL', '2026-09-28', '2026-10-04')).toBe('28 sep – 4 oct 2026');
  });

  it('names both years when the week crosses a year', () => {
    expect(rangeLabel('SEMANAL', '2025-12-29', '2026-01-04')).toBe('29 dic 2025 – 4 ene 2026');
  });

  it('shows the month and year in full', () => {
    expect(rangeLabel('MENSUAL', '2026-10-01', '2026-10-31')).toBe('Octubre 2026');
    expect(rangeLabel('MENSUAL', '2026-03-01', '2026-03-31')).toBe('Marzo 2026');
  });
});

describe('periodCaption', () => {
  it('describes the day, the week and the month', () => {
    expect(periodCaption('DIARIO', '2026-10-23', '2026-10-23')).toBe('Vie 23 oct 2026');
    expect(periodCaption('SEMANAL', '2026-10-19', '2026-10-25')).toBe('Semana del 19 al 25 oct 2026');
    expect(periodCaption('MENSUAL', '2026-10-01', '2026-10-31')).toBe('Del 1 al 31 oct 2026');
  });

  it('names the months and years a week spans', () => {
    expect(periodCaption('SEMANAL', '2026-09-28', '2026-10-04')).toBe('Semana del 28 sep al 4 oct 2026');
    expect(periodCaption('SEMANAL', '2025-12-29', '2026-01-04')).toBe('Semana del 29 dic 2025 al 4 ene 2026');
  });
});

describe('shiftFecha', () => {
  it('moves a day by one', () => {
    expect(shiftFecha('DIARIO', '2026-10-23', -1)).toBe('2026-10-22');
    expect(shiftFecha('DIARIO', '2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftFecha('DIARIO', '2026-01-01', -1)).toBe('2025-12-31');
  });

  it('moves a week by seven days', () => {
    expect(shiftFecha('SEMANAL', '2026-10-23', -1)).toBe('2026-10-16');
    expect(shiftFecha('SEMANAL', '2026-12-28', 1)).toBe('2027-01-04');
  });

  it('moves a month keeping the day, clamped to the target month', () => {
    expect(shiftFecha('MENSUAL', '2026-10-23', -1)).toBe('2026-09-23');
    expect(shiftFecha('MENSUAL', '2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftFecha('MENSUAL', '2028-03-31', -1)).toBe('2028-02-29');
    expect(shiftFecha('MENSUAL', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftFecha('MENSUAL', '2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftFecha('MENSUAL', '2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('canGoNext', () => {
  it('is false when the period already contains today', () => {
    expect(canGoNext('2026-10-25', '2026-10-23')).toBe(false);
    expect(canGoNext('2026-10-23', '2026-10-23')).toBe(false);
  });

  it('is true for a period that ended before today', () => {
    expect(canGoNext('2026-10-18', '2026-10-23')).toBe(true);
  });

  it('is false for a period in the future', () => {
    expect(canGoNext('2026-11-30', '2026-10-23')).toBe(false);
  });
});

describe('todayInLima', () => {
  it('uses the Lima date, five hours behind UTC', () => {
    expect(todayInLima(new Date('2026-10-23T15:00:00Z'))).toBe('2026-10-23');
  });

  it('is still the previous day just after midnight UTC', () => {
    expect(todayInLima(new Date('2026-10-24T02:30:00Z'))).toBe('2026-10-23');
    expect(todayInLima(new Date('2026-10-24T04:59:59Z'))).toBe('2026-10-23');
  });

  it('turns over at 05:00 UTC', () => {
    expect(todayInLima(new Date('2026-10-24T05:00:00Z'))).toBe('2026-10-24');
  });
});

describe('ventaDateTime', () => {
  it('formats the three variants from the wall clock of the string', () => {
    expect(ventaDateTime('2026-10-23T14:52:07', 'full')).toBe('Vie 23 oct 2026 · 14:52');
    expect(ventaDateTime('2026-10-23T14:52:07', 'short')).toBe('23 oct · 14:52');
    expect(ventaDateTime('2026-10-23T14:52:07', 'phone')).toBe('Vie 23 oct · 14:52');
  });

  it('does not shift zones: the clock parts are printed as they come', () => {
    expect(ventaDateTime('2026-10-23T00:05:00', 'full')).toBe('Vie 23 oct 2026 · 00:05');
    expect(ventaDateTime('2026-10-23T23:59:59.123', 'short')).toBe('23 oct · 23:59');
  });

  it('accepts a space separator and no seconds', () => {
    expect(ventaDateTime('2026-10-23 09:03', 'full')).toBe('Vie 23 oct 2026 · 09:03');
  });

  it('shows an em dash for an unreadable value', () => {
    expect(ventaDateTime('garbage', 'full')).toBe('—');
    expect(ventaDateTime('', 'short')).toBe('—');
  });
});

describe('tipoVentaLabel', () => {
  it('names the table when the number is known', () => {
    expect(tipoVentaLabel(venta({ mesaId: 4 }))).toBe('Mesa 4');
  });

  it('shows just "Mesa" without a table number', () => {
    expect(tipoVentaLabel(venta())).toBe('Mesa');
    expect(tipoVentaLabel(venta({ mesaId: null }))).toBe('Mesa');
  });

  it('labels delivery and pickup', () => {
    expect(tipoVentaLabel(venta({ tipoPedido: 'DELIVERY' }))).toBe('Delivery');
    expect(tipoVentaLabel(venta({ tipoPedido: 'RECOJO' }))).toBe('Recojo');
  });
});

describe('barRatio', () => {
  it('is the share of the top amount', () => {
    expect(barRatio(50, 200)).toBe(0.25);
    expect(barRatio(200, 200)).toBe(1);
  });

  it('is 0 when there is no top amount', () => {
    expect(barRatio(0, 0)).toBe(0);
    expect(barRatio(10, 0)).toBe(0);
  });

  it('stays within 0 and 1', () => {
    expect(barRatio(300, 200)).toBe(1);
    expect(barRatio(-5, 200)).toBe(0);
  });
});

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

describe('pageSummary', () => {
  it('shows the range of the page out of the total', () => {
    expect(pageSummary(page(), 'full')).toBe('Mostrando 1–100 de 214 ventas');
    expect(pageSummary(page(), 'phone')).toBe('1–100 de 214');
  });

  it('counts from the page offset and the rows it holds', () => {
    const last = page({ number: 2, first: false, last: true }, 14);
    expect(pageSummary(last, 'full')).toBe('Mostrando 201–214 de 214 ventas');
    expect(pageSummary(last, 'phone')).toBe('201–214 de 214');
  });

  it('uses the singular for a single sale', () => {
    expect(pageSummary(page({ totalElements: 1, totalPages: 1 }, 1), 'full')).toBe('Mostrando 1–1 de 1 venta');
  });

  it('says "Sin ventas" when the period has none', () => {
    const empty = page({ totalElements: 0, totalPages: 0 }, 0);
    expect(pageSummary(empty, 'full')).toBe('Sin ventas');
    expect(pageSummary(empty, 'phone')).toBe('Sin ventas');
  });
});

describe('pageIndicator', () => {
  it('shows the 1-based page out of the total', () => {
    expect(pageIndicator(page({ number: 0, totalPages: 3 }))).toBe('Pág. 1 de 3');
    expect(pageIndicator(page({ number: 2, totalPages: 3 }))).toBe('Pág. 3 de 3');
  });

  it('never shows page 0 of 0', () => {
    expect(pageIndicator(page({ number: 0, totalPages: 0 }))).toBe('Pág. 1 de 1');
  });
});

const TODAY = '2026-10-23';
const fromParams = (params: Record<string, string>) => parseReportesView((key) => params[key] ?? null, TODAY);

describe('parseReportesView', () => {
  it('defaults to the current week of the Ventas tab, newest first, first page', () => {
    expect(fromParams({})).toEqual({
      periodo: 'SEMANAL',
      fecha: TODAY,
      tab: 'ventas',
      orden: 'MAS_RECIENTES',
      page: 0,
    });
  });

  it('reads valid values; the page travels 1-based and is held 0-based', () => {
    expect(
      fromParams({ periodo: 'MENSUAL', fecha: '2026-09-30', tab: 'productos', orden: 'MAYOR_VENTA', page: '3' }),
    ).toEqual({ periodo: 'MENSUAL', fecha: '2026-09-30', tab: 'productos', orden: 'MAYOR_VENTA', page: 2 });
  });

  it('falls back to the default of each value that is unknown', () => {
    const view = fromParams({ periodo: 'ANUAL', tab: 'x', orden: 'daily', page: 'abc' });
    expect(view).toMatchObject({ periodo: 'SEMANAL', tab: 'ventas', orden: 'MAS_RECIENTES', page: 0 });
  });

  it('rejects dates that are malformed, impossible or in the future', () => {
    for (const fecha of ['2026-13-01', '2026-02-30', '23/10/2026', '2026-10-24', '2027-01-01', '']) {
      expect(fromParams({ fecha }).fecha).toBe(TODAY);
    }
  });

  it('accepts today and past dates, including a leap day', () => {
    expect(fromParams({ fecha: TODAY }).fecha).toBe(TODAY);
    expect(fromParams({ fecha: '2024-02-29' }).fecha).toBe('2024-02-29');
  });

  it('rejects pages that are not positive integers', () => {
    for (const page of ['0', '-2', '1.5', '1e3', ' 2']) {
      expect(fromParams({ page }).page).toBe(0);
    }
  });
});

describe('reportesQueryParams', () => {
  it('leaves every default out of the URL', () => {
    const view = fromParams({});
    expect(reportesQueryParams(view, TODAY)).toEqual({
      periodo: null,
      fecha: null,
      tab: null,
      orden: null,
      page: null,
    });
  });

  it('writes what differs from the defaults, the page 1-based', () => {
    const view = fromParams({ periodo: 'DIARIO', fecha: '2026-10-20', tab: 'productos', orden: 'MAS_ANTIGUOS', page: '2' });
    expect(reportesQueryParams(view, TODAY)).toEqual({
      periodo: 'DIARIO',
      fecha: '2026-10-20',
      tab: 'productos',
      orden: 'MAS_ANTIGUOS',
      page: '2',
    });
  });

  it('round-trips through the parser', () => {
    const view = fromParams({ periodo: 'MENSUAL', fecha: '2026-08-15', orden: 'MAYOR_VENTA', page: '4' });
    const params = reportesQueryParams(view, TODAY);
    expect(parseReportesView((key) => params[key] ?? null, TODAY)).toEqual(view);
  });
});

describe('pagerItems', () => {
  it('lists every page when there are few', () => {
    expect(pagerItems(0, 3)).toEqual([0, 1, 2]);
    expect(pagerItems(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('shows a single page for an empty or single-page result', () => {
    expect(pagerItems(0, 0)).toEqual([0]);
    expect(pagerItems(0, 1)).toEqual([0]);
  });

  it('collapses the far end with an ellipsis near the start', () => {
    expect(pagerItems(0, 20)).toEqual([0, 1, 'gap', 19]);
    expect(pagerItems(2, 20)).toEqual([0, 1, 2, 3, 'gap', 19]);
  });

  it('collapses both sides in the middle', () => {
    expect(pagerItems(9, 20)).toEqual([0, 'gap', 8, 9, 10, 'gap', 19]);
  });

  it('collapses the near end with an ellipsis at the end', () => {
    expect(pagerItems(19, 20)).toEqual([0, 'gap', 18, 19]);
    expect(pagerItems(17, 20)).toEqual([0, 'gap', 16, 17, 18, 19]);
  });

  it('never hides a single page behind an ellipsis', () => {
    expect(pagerItems(3, 9)).toEqual([0, 1, 2, 3, 4, 'gap', 8]);
  });
});

describe('exportMenuLine', () => {
  it('names the tab and the period that would be exported', () => {
    expect(exportMenuLine('ventas', '19 – 25 oct 2026')).toBe('Ventas · 19 – 25 oct 2026');
    expect(exportMenuLine('productos', 'Octubre 2026')).toBe('Productos más vendidos · Octubre 2026');
  });

  it('shows only the tab while the period is unknown', () => {
    expect(exportMenuLine('ventas', null)).toBe('Ventas');
  });
});

describe('formatFechaButton', () => {
  it('writes the reference date as dd/mm/yyyy', () => {
    expect(formatFechaButton('2026-10-23')).toBe('23/10/2026');
    expect(formatFechaButton('2026-01-05')).toBe('05/01/2026');
  });
});
