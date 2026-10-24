import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatMoney } from '../pedidos/domain/pedidos.rules';
import { barRatio } from './domain/reportes.rules';
import { ProductoVendido } from './reportes.types';

const TOP = 3;

interface ProductoRow {
  key: number;
  rank: number;
  nombre: string;
  categoria: string | null;
  cantidad: string;
  monto: string;
  /** Width of the bar, 0..100. */
  width: number;
  top: boolean;
}

/** Ranking of the best-selling products: table from `md`, compact rows on phones. Whole list, no pagination. */
@Component({
  selector: 'app-productos-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-card border border-line bg-card">
      <table class="hidden w-full border-collapse text-left text-sm md:table">
        <caption class="sr-only">
          Productos más vendidos del período
        </caption>
        <thead>
          <tr class="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
            <th scope="col" class="w-16 px-4 py-3">#</th>
            <th scope="col" class="px-4 py-3">Producto</th>
            <th scope="col" class="px-4 py-3 text-right">Cantidad</th>
            <th scope="col" class="px-4 py-3 text-right">Monto vendido</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.key) {
            <tr class="border-b border-line last:border-b-0">
              <td class="px-4 py-3"><span [class]="badge(row)">{{ row.rank }}</span></td>
              <td class="px-4 py-3">
                <p class="font-medium">
                  {{ row.nombre }}
                  @if (row.categoria) {
                    <span class="ml-1 text-xs font-normal text-subtle">{{ row.categoria }}</span>
                  }
                </p>
                <div class="mt-1.5 h-1 w-72 max-w-full overflow-hidden rounded-full bg-neutral-soft">
                  <div [class]="bar(row)" [style.width.%]="row.width"></div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-mono text-muted">{{ row.cantidad }}</td>
              <td class="px-4 py-3 text-right font-mono font-semibold">{{ row.monto }}</td>
            </tr>
          }
        </tbody>
      </table>

      <ul class="md:hidden" aria-label="Productos más vendidos del período">
        @for (row of rows(); track row.key) {
          <li class="flex items-start gap-3 border-b border-line px-3 py-3 last:border-b-0">
            <span [class]="badge(row)">{{ row.rank }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ row.nombre }}
                @if (row.categoria) {
                  <span class="ml-1 text-xs font-normal text-subtle">{{ row.categoria }}</span>
                }
              </p>
              <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-soft">
                <div [class]="bar(row)" [style.width.%]="row.width"></div>
              </div>
              <p class="mt-1 font-mono text-xs text-muted">{{ row.cantidad }}</p>
            </div>
            <p class="shrink-0 font-mono text-sm font-semibold">{{ row.monto }}</p>
          </li>
        }
      </ul>

      <p class="border-t border-line px-4 py-3 text-xs text-muted">
        Ranking completo de {{ rows().length }} {{ rows().length === 1 ? 'producto' : 'productos' }}, sin paginar
      </p>
    </div>
  `,
})
export class ProductosListComponent {
  readonly productos = input.required<readonly ProductoVendido[]>();

  protected readonly rows = computed<ProductoRow[]>(() => {
    const productos = this.productos();
    const max = productos.reduce((top, p) => Math.max(top, p.monto), 0);
    return productos.map((p, index) => ({
      key: p.productoId,
      rank: p.posicion,
      nombre: p.nombre,
      categoria: p.categoria?.trim() || null,
      cantidad: `${p.cantidad} u.`,
      monto: formatMoney(p.monto),
      width: barRatio(p.monto, max) * 100,
      top: index < TOP,
    }));
  });

  protected badge(row: ProductoRow): string {
    return `flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
      row.top ? 'bg-brand-soft text-brand-strong' : 'bg-neutral-soft text-neutral'
    }`;
  }

  protected bar(row: ProductoRow): string {
    return `h-full rounded-full ${row.top ? 'bg-brand' : 'bg-subtle/60'}`;
  }
}
