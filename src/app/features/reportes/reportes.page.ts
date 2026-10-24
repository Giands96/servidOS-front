import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatMoney } from '../pedidos/domain/pedidos.rules';
import { RestauranteApi } from '../restaurante/data/restaurante.api';
import { ReportesApi } from './data/reportes.api';
import {
  ReportesTab,
  ReportesView,
  canGoNext,
  exportMenuLine,
  formatFechaButton,
  parseReportesView,
  periodCaption,
  rangeLabel,
  reportesQueryParams,
  shiftFecha,
  todayInLima,
} from './domain/reportes.rules';
import { ExportMenuComponent } from './export-menu.component';
import { ProductosListComponent } from './productos-list.component';
import { FormatoExport, OrdenVentas, Periodo, ReporteArchivo, ReporteProductos, ReporteVentas } from './reportes.types';
import { VentasListComponent } from './ventas-list.component';

/** The backend caps `size` at 100; the design shows 1–100 per page. */
const PAGE_SIZE = 100;

const PERIODOS: readonly { periodo: Periodo; label: string }[] = [
  { periodo: 'DIARIO', label: 'Día' },
  { periodo: 'SEMANAL', label: 'Semana' },
  { periodo: 'MENSUAL', label: 'Mes' },
];

const ORDENES: readonly { orden: OrdenVentas; label: string }[] = [
  { orden: 'MAS_RECIENTES', label: 'Más recientes' },
  { orden: 'MAS_ANTIGUOS', label: 'Más antiguos' },
  { orden: 'MAYOR_VENTA', label: 'Mayor venta' },
];

/** What a query was asked for: `tick` only exists to re-fire the same query ("Reintentar"). */
interface VentasRequest {
  periodo: Periodo;
  fecha: string;
  orden: OrdenVentas;
  page: number;
  tick: number;
}

interface ProductosRequest {
  periodo: Periodo;
  fecha: string;
  tick: number;
}

type Outcome<T> = { ok: true; data: T } | { ok: false };

const sameRequest = <T extends object>(a: T, b: T): boolean =>
  (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);

/** Saves a downloaded report through a temporary link; the object URL is released right after the click. */
function saveFile({ blob, filename }: ReporteArchivo): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Sales reports (ADMINISTRADOR): period bar, totals, sales table and best-selling ranking, plus the export of what
 * is on screen. The five view values live in the URL (`?periodo=&fecha=&tab=&orden=&page=`), so reload and back keep
 * the view; everything else is derived from them.
 */
@Component({
  selector: 'app-reportes-page',
  imports: [
    ButtonComponent,
    ExportMenuComponent,
    IconComponent,
    NgTemplateOutlet,
    ProductosListComponent,
    StatePanelComponent,
    VentasListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-4 sm:p-6 lg:p-8">
      <header class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold tracking-tight md:text-3xl">Reportes</h1>
          <p class="mt-1 hidden truncate text-sm text-muted md:block">{{ subtitle() }}</p>
        </div>
        <app-export-menu [line]="exportLine()" [busy]="exporting()" (exportar)="exportar($event)" />
      </header>

      <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Período" class="grid grid-cols-3 gap-1 rounded-control bg-neutral-soft p-1 md:inline-grid md:w-auto">
          @for (option of periodos; track option.periodo) {
            <button
              type="button"
              class="rounded-[0.4rem] px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand"
              [class]="
                option.periodo === view().periodo ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
              "
              [attr.aria-pressed]="option.periodo === view().periodo"
              (click)="selectPeriodo(option.periodo)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="order-1 flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-card hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
            aria-label="Período anterior"
            (click)="shift(-1)"
          >
            <app-icon name="chevronLeft" [size]="16" />
          </button>
          <p class="hidden min-w-40 text-center text-sm font-semibold md:order-2 md:block" aria-live="polite">
            {{ rangeText() ?? '…' }}
          </p>
          <button
            type="button"
            class="order-3 flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-card hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Período siguiente"
            [disabled]="!nextEnabled()"
            (click)="shift(1)"
          >
            <app-icon name="chevronRight" [size]="16" />
          </button>
          <div
            class="relative order-2 flex h-9 flex-1 items-center justify-center gap-2 rounded-control border border-line bg-card px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-brand md:order-4 md:flex-none md:font-medium"
          >
            <app-icon name="calendar" [size]="16" />
            <span class="md:hidden">{{ rangeText() ?? '…' }}</span>
            <span class="hidden md:inline">{{ fechaText() }}</span>
            <input
              #dateInput
              type="date"
              aria-label="Elegir fecha del reporte"
              class="absolute inset-0 size-full cursor-pointer opacity-0"
              [value]="view().fecha"
              [max]="today"
              (click)="openPicker(dateInput)"
              (change)="pickDate(dateInput.value)"
            />
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div class="flex items-center justify-between rounded-card border border-line bg-card px-4 py-3 md:block md:p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <app-icon name="banknote" [size]="14" />Total vendido
          </p>
          @if (summary(); as s) {
            <p class="font-mono text-xl font-bold md:mt-3 md:text-4xl">{{ money(s.totalVendido) }}</p>
            <p class="mt-2 hidden text-xs text-subtle md:block">{{ caption(s) }}</p>
          } @else {
            <p class="h-7 w-28 animate-pulse rounded-full bg-neutral-soft md:mt-3 md:h-10 md:w-56" aria-label="Cargando"></p>
          }
        </div>
        <div class="flex items-center justify-between rounded-card border border-line bg-card px-4 py-3 md:block md:p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <app-icon name="receipt" [size]="14" />Cantidad de ventas
          </p>
          @if (summary(); as s) {
            <p class="font-mono text-xl font-bold md:mt-3 md:text-4xl">{{ s.cantidadVentas }}</p>
            <p class="mt-2 hidden text-xs text-subtle md:block">Pedidos cobrados en el período</p>
          } @else {
            <p class="h-7 w-12 animate-pulse rounded-full bg-neutral-soft md:mt-3 md:h-10 md:w-24" aria-label="Cargando"></p>
          }
        </div>
      </div>

      <div class="mt-6 md:flex md:items-end md:justify-between md:border-b md:border-line">
        <div role="group" aria-label="Reporte" class="grid grid-cols-2 border-b border-line md:flex md:gap-6 md:border-b-0">
          <button
            type="button"
            class="-mb-px flex items-center justify-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand"
            [class]="view().tab === 'ventas' ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'"
            [attr.aria-pressed]="view().tab === 'ventas'"
            (click)="selectTab('ventas')"
          >
            <span class="md:hidden">Ventas @if (ventasCount() !== null) { · {{ ventasCount() }} }</span>
            <span class="hidden md:inline">Ventas</span>
            @if (ventasCount() !== null) {
              <span class="hidden rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand-strong md:inline">{{ ventasCount() }}</span>
            }
          </button>
          <button
            type="button"
            class="-mb-px flex items-center justify-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand"
            [class]="view().tab === 'productos' ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'"
            [attr.aria-pressed]="view().tab === 'productos'"
            (click)="selectTab('productos')"
          >
            <span class="md:hidden">Más vendidos</span>
            <span class="hidden md:inline">Productos más vendidos</span>
            @if (productosCount() !== null) {
              <span class="hidden rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand-strong md:inline">{{ productosCount() }}</span>
            }
          </button>
        </div>

        @if (view().tab === 'ventas') {
          <label class="mt-3 flex w-fit items-center gap-2 rounded-control border border-line bg-card px-3 py-2 text-sm md:mb-2 md:mt-0">
            <app-icon name="sort" [size]="14" />
            <span class="text-muted">Orden:</span>
            <select
              class="cursor-pointer bg-transparent font-semibold focus-visible:outline-2 focus-visible:outline-brand"
              [value]="view().orden"
              (change)="selectOrden($any($event.target).value)"
            >
              @for (option of ordenes; track option.orden) {
                <option [value]="option.orden" [selected]="option.orden === view().orden">{{ option.label }}</option>
              }
            </select>
          </label>
        }
      </div>

      <div class="mt-4">
        @if (view().tab === 'ventas') {
          @if (ventasFailed()) {
            <ng-container [ngTemplateOutlet]="failedTpl" />
          } @else if (ventas(); as report) {
            @if (report.cantidadVentas === 0) {
              <app-state-panel class="!min-h-[22rem]" icon="inbox" heading="No hubo ventas en este período">
                Cuando se cobren pedidos en estas fechas aparecerán aquí.
              </app-state-panel>
            } @else {
              <app-ventas-list [page]="report.ventas" [busy]="ventasLoading()" (pageChange)="selectPage($event)" />
            }
          } @else {
            <ng-container [ngTemplateOutlet]="skeletonTpl" />
          }
        } @else {
          @if (productosFailed()) {
            <ng-container [ngTemplateOutlet]="failedTpl" />
          } @else if (productos(); as report) {
            @if (report.productos.length === 0) {
              <app-state-panel class="!min-h-[22rem]" icon="inbox" heading="No hubo ventas en este período">
                Cuando se cobren pedidos en estas fechas aparecerán aquí.
              </app-state-panel>
            } @else {
              <app-productos-list [productos]="report.productos" />
            }
          } @else {
            <ng-container [ngTemplateOutlet]="skeletonTpl" />
          }
        }
      </div>
    </section>

    <ng-template #skeletonTpl>
      <div class="animate-pulse rounded-card border border-line bg-card p-4" aria-busy="true" aria-label="Cargando reporte">
        @for (n of skeletons; track n) {
          <div class="flex items-center gap-6 border-b border-line py-4 last:border-b-0">
            <div class="h-4 w-16 rounded-full bg-neutral-soft"></div>
            <div class="h-4 w-32 rounded-full bg-neutral-soft"></div>
            <div class="h-4 flex-1 rounded-full bg-neutral-soft"></div>
            <div class="h-4 w-20 rounded-full bg-neutral-soft"></div>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #failedTpl>
      <app-state-panel class="!min-h-[22rem]" icon="alert" heading="No se pudo cargar el reporte">
        Revisa tu conexión e inténtalo otra vez.
        <button actions appButton variant="secondary" type="button" (click)="reload()">
          <app-icon name="refresh" [size]="16" />Reintentar
        </button>
      </app-state-panel>
    </ng-template>
  `,
})
export class ReportesPage {
  private readonly api = inject(ReportesApi);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly periodos = PERIODOS;
  protected readonly ordenes = ORDENES;
  protected readonly skeletons = [1, 2, 3, 4, 5] as const;
  /** `yyyy-MM-dd` in Lima when the page opened: the latest date the report can be asked for. */
  protected readonly today = todayInLima(new Date());

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly view = computed<ReportesView>(() => parseReportesView((key) => this.params().get(key), this.today));

  private readonly restaurante = signal<string | null>(null);
  protected readonly subtitle = computed(() => {
    const name = this.restaurante();
    return name === null ? 'Ventas cobradas' : `Ventas cobradas de ${name}`;
  });

  protected readonly ventas = signal<ReporteVentas | null>(null);
  protected readonly ventasLoading = signal(true);
  protected readonly ventasFailed = signal(false);
  protected readonly productos = signal<ReporteProductos | null>(null);
  protected readonly productosFailed = signal(false);
  protected readonly exporting = signal(false);
  private readonly reloadTick = signal(0);

  /** Either response carries the totals of the period. */
  protected readonly summary = computed(() => this.ventas() ?? this.productos());
  protected readonly ventasCount = computed(() => this.summary()?.cantidadVentas ?? null);
  protected readonly productosCount = computed(() => this.productos()?.productos.length ?? null);
  protected readonly rangeText = computed(() => {
    const s = this.summary();
    return s === null ? null : rangeLabel(s.periodo, s.desde, s.hasta);
  });
  protected readonly fechaText = computed(() => formatFechaButton(this.view().fecha));
  protected readonly nextEnabled = computed(() => {
    const s = this.summary();
    return s !== null && canGoNext(s.hasta, this.today);
  });
  protected readonly exportLine = computed(() => exportMenuLine(this.view().tab, this.rangeText()));

  private readonly ventasRequest = computed<VentasRequest>(
    () => {
      const { periodo, fecha, orden, page } = this.view();
      return { periodo, fecha, orden, page, tick: this.reloadTick() };
    },
    { equal: sameRequest },
  );
  private readonly productosRequest = computed<ProductosRequest>(
    () => {
      const { periodo, fecha } = this.view();
      return { periodo, fecha, tick: this.reloadTick() };
    },
    { equal: sameRequest },
  );
  private lastPeriod = '';

  constructor() {
    inject(RestauranteApi)
      .actual()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (r) => this.restaurante.set(r.nombre), error: () => this.restaurante.set(null) });

    // switchMap drops the previous in-flight request, so a slow answer can never overwrite a newer one.
    toObservable(this.ventasRequest)
      .pipe(
        tap((request) => this.startVentas(request)),
        switchMap((request) =>
          this.settled(
            this.api.ventas({ periodo: request.periodo, fecha: request.fecha, orden: request.orden, page: request.page, size: PAGE_SIZE }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.settleVentas(outcome));

    toObservable(this.productosRequest)
      .pipe(
        tap(() => this.productosFailed.set(false)),
        switchMap((request) => this.settled(this.api.productos({ periodo: request.periodo, fecha: request.fecha }))),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => {
        if (outcome.ok) {
          this.productos.set(outcome.data);
        } else {
          this.productosFailed.set(true);
        }
      });
  }

  protected money(amount: number): string {
    return formatMoney(amount);
  }

  protected caption(report: ReporteVentas | ReporteProductos): string {
    return periodCaption(report.periodo, report.desde, report.hasta);
  }

  protected selectPeriodo(periodo: Periodo): void {
    if (periodo !== this.view().periodo) {
      this.go({ periodo, page: 0 });
    }
  }

  protected selectTab(tab: ReportesTab): void {
    if (tab !== this.view().tab) {
      this.go({ tab });
    }
  }

  protected selectOrden(orden: OrdenVentas): void {
    if (orden !== this.view().orden) {
      this.go({ orden, page: 0 });
    }
  }

  protected selectPage(page: number): void {
    this.go({ page });
  }

  /** Moves one period back or forward; never past today. */
  protected shift(dir: -1 | 1): void {
    const { periodo, fecha } = this.view();
    const moved = shiftFecha(periodo, fecha, dir);
    this.go({ fecha: moved > this.today ? this.today : moved, page: 0 });
  }

  protected pickDate(value: string): void {
    // An emptied input is ignored; out-of-range or malformed values are sanitized by the parser.
    if (value !== '' && value !== this.view().fecha) {
      this.go({ fecha: value, page: 0 });
    }
  }

  /** The input is invisible and covers the button: browsers open their picker from it when asked. */
  protected openPicker(input: HTMLInputElement): void {
    try {
      input.showPicker();
    } catch {
      // Not supported, or not allowed right now: the native control still works by keyboard.
    }
  }

  protected reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  protected exportar(formato: FormatoExport): void {
    if (this.exporting()) {
      return;
    }
    const { tab, periodo, fecha, orden } = this.view();
    this.exporting.set(true);
    this.api
      .exportar(tab, formato, {
        periodo,
        fecha,
        orden: tab === 'ventas' ? orden : undefined,
        desde: this.summary()?.desde,
      })
      .pipe(
        finalize(() => this.exporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (file) => saveFile(file),
        error: (error: unknown) => this.fail(error),
      });
  }

  private go(patch: Partial<ReportesView>): void {
    const next: ReportesView = { ...this.view(), ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: reportesQueryParams(next, this.today),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private settled<T>(request: Observable<T>): Observable<Outcome<T>> {
    return request.pipe(
      map((data): Outcome<T> => ({ ok: true, data })),
      catchError(() => of<Outcome<T>>({ ok: false })),
    );
  }

  private startVentas(request: VentasRequest): void {
    this.ventasLoading.set(true);
    this.ventasFailed.set(false);
    // A new period shows skeletons (and a blank summary) instead of the previous period's numbers.
    const period = `${request.periodo}|${request.fecha}`;
    if (period !== this.lastPeriod) {
      this.lastPeriod = period;
      this.ventas.set(null);
      this.productos.set(null);
    }
  }

  private settleVentas(outcome: Outcome<ReporteVentas>): void {
    this.ventasLoading.set(false);
    if (!outcome.ok) {
      this.ventas.set(null);
      this.ventasFailed.set(true);
      return;
    }
    const { ventas } = outcome.data;
    if (ventas.content.length === 0 && ventas.number > 0 && ventas.totalPages > 0) {
      // The URL asked for a page past the end: land on the last one.
      this.go({ page: ventas.totalPages - 1 });
      return;
    }
    this.ventas.set(outcome.data);
  }

  /** Shows the backend `message` as-is (400 messages already come in Spanish). */
  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.toasts.show(error.status, readApiError(error.error)?.message ?? 'No se pudo exportar el reporte');
    } else {
      this.toasts.show('Error', 'No se pudo exportar el reporte');
    }
  }
}
