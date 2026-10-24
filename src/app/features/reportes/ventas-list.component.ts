import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Page } from '../../core/http/api.types';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { metodoLabel } from '../pagos/domain/caja.rules';
import { formatMoney, formatOrderNumber, tipoIcon } from '../pedidos/domain/pedidos.rules';
import { TipoPedido } from '../pedidos/pedidos.types';
import { PagerItem, pageIndicator, pagerItems, pageSummary, tipoVentaLabel, ventaDateTime } from './domain/reportes.rules';
import { VentaReporte } from './reportes.types';

const TIPO_TONE: Readonly<Record<TipoPedido, string>> = {
  MESA: 'bg-info-soft text-info',
  DELIVERY: 'bg-flow-soft text-flow',
  RECOJO: 'bg-ok-soft text-ok',
};

interface VentaRow {
  key: number;
  number: string;
  full: string;
  short: string;
  phone: string;
  tipo: string;
  icon: IconName;
  tone: string;
  metodo: string;
  total: string;
}

/**
 * Sales of the period, one page: table from `md` (date and method columns shorten below `lg`), cards on phones.
 * Presentational: the page owns the data and the page index; this only asks for another one.
 */
@Component({
  selector: 'app-ventas-list',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-card border border-line bg-card transition-opacity" [class.opacity-60]="busy()" [attr.aria-busy]="busy()">
      <table class="hidden w-full border-collapse text-left text-sm md:table">
        <caption class="sr-only">
          Ventas cobradas del período
        </caption>
        <thead>
          <tr class="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
            <th scope="col" class="px-4 py-3">Pedido</th>
            <th scope="col" class="px-4 py-3">
              <span class="lg:hidden">Fecha y hora</span><span class="hidden lg:inline">Fecha y hora del pago</span>
            </th>
            <th scope="col" class="px-4 py-3">Tipo</th>
            <th scope="col" class="px-4 py-3">
              <span class="lg:hidden">Método</span><span class="hidden lg:inline">Método de pago</span>
            </th>
            <th scope="col" class="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.key) {
            <tr class="border-b border-line last:border-b-0">
              <td class="px-4 py-3 font-mono font-semibold">{{ row.number }}</td>
              <td class="px-4 py-3 text-muted">
                <span class="lg:hidden">{{ row.short }}</span><span class="hidden lg:inline">{{ row.full }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-2">
                  <span [class]="tile(row)"><app-icon [name]="row.icon" [size]="14" /></span>
                  {{ row.tipo }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted">{{ row.metodo }}</td>
              <td class="px-4 py-3 text-right font-mono font-semibold">{{ row.total }}</td>
            </tr>
          }
        </tbody>
      </table>

      <ul class="md:hidden" aria-label="Ventas cobradas del período">
        @for (row of rows(); track row.key) {
          <li class="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0">
            <span [class]="tile(row, 'size-10')"><app-icon [name]="row.icon" [size]="18" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">
                <span class="font-mono font-semibold">{{ row.number }}</span> {{ row.tipo }}
              </p>
              <p class="truncate text-xs text-muted">{{ row.phone }} · {{ row.metodo }}</p>
            </div>
            <p class="shrink-0 font-mono text-sm font-semibold">{{ row.total }}</p>
          </li>
        }
      </ul>

      <div class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
        <p>
          <span class="md:hidden">{{ summaryPhone() }}</span><span class="hidden md:inline">{{ summaryFull() }}</span>
        </p>

        <nav aria-label="Páginas de ventas" class="hidden items-center gap-1 md:flex">
          <button type="button" [class]="pageButton(false)" aria-label="Página anterior" [disabled]="page().first || busy()" (click)="go(page().number - 1)">
            <app-icon name="chevronLeft" [size]="14" />
          </button>
          @for (item of items(); track $index) {
            @if (item === 'gap') {
              <span class="px-1 text-subtle" aria-hidden="true">…</span>
            } @else {
              <button
                type="button"
                [class]="pageButton(item === page().number)"
                [attr.aria-label]="'Página ' + (item + 1)"
                [attr.aria-current]="item === page().number ? 'page' : null"
                [disabled]="busy()"
                (click)="go(item)"
              >
                {{ item + 1 }}
              </button>
            }
          }
          <button type="button" [class]="pageButton(false)" aria-label="Página siguiente" [disabled]="page().last || busy()" (click)="go(page().number + 1)">
            <app-icon name="chevronRight" [size]="14" />
          </button>
        </nav>

        <nav aria-label="Páginas de ventas" class="flex items-center gap-2 md:hidden">
          <button type="button" [class]="pageButton(false, true)" aria-label="Página anterior" [disabled]="page().first || busy()" (click)="go(page().number - 1)">
            <app-icon name="chevronLeft" [size]="16" />
          </button>
          <span class="min-w-16 text-center text-ink">{{ indicator() }}</span>
          <button type="button" [class]="pageButton(false, true)" aria-label="Página siguiente" [disabled]="page().last || busy()" (click)="go(page().number + 1)">
            <app-icon name="chevronRight" [size]="16" />
          </button>
        </nav>
      </div>
    </div>
  `,
})
export class VentasListComponent {
  readonly page = input.required<Page<VentaReporte>>();
  /** Another page (or order) is loading: the rows stay, dimmed, and the pager is locked. */
  readonly busy = input(false);
  /** 0-based page asked for. */
  readonly pageChange = output<number>();

  protected readonly rows = computed<VentaRow[]>(() =>
    this.page().content.map((venta) => ({
      key: venta.pedidoId,
      number: formatOrderNumber(venta.pedidoId),
      full: ventaDateTime(venta.fechaPago, 'full'),
      short: ventaDateTime(venta.fechaPago, 'short'),
      phone: ventaDateTime(venta.fechaPago, 'phone'),
      tipo: tipoVentaLabel(venta),
      icon: tipoIcon(venta.tipoPedido) ?? 'receipt',
      tone: TIPO_TONE[venta.tipoPedido] ?? 'bg-neutral-soft text-neutral',
      metodo: metodoLabel(venta.metodoPago),
      total: formatMoney(venta.total),
    })),
  );
  protected readonly items = computed<PagerItem[]>(() => pagerItems(this.page().number, this.page().totalPages));
  protected readonly summaryFull = computed(() => pageSummary(this.page(), 'full'));
  protected readonly summaryPhone = computed(() => pageSummary(this.page(), 'phone'));
  protected readonly indicator = computed(() => pageIndicator(this.page()));

  protected tile(row: VentaRow, size = 'size-7'): string {
    return `flex ${size} shrink-0 items-center justify-center rounded-control ${row.tone}`;
  }

  protected pageButton(current: boolean, large = false): string {
    const size = large ? 'size-9' : 'size-7';
    const tone = current ? 'bg-ink text-white' : 'border border-line bg-card text-ink hover:bg-surface';
    return `flex ${size} items-center justify-center rounded-control text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 ${tone}`;
  }

  protected go(index: number): void {
    if (index >= 0 && index < Math.max(this.page().totalPages, 1) && index !== this.page().number) {
      this.pageChange.emit(index);
    }
  }
}
