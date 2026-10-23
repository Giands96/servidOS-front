import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, forkJoin } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { shouldReloadAfterRejection } from '../pedidos/domain/pedidos.rules';
import { CategoriaFormComponent } from './categoria-form.component';
import { Categoria, Producto } from './catalogo.types';
import { CatalogoApi } from './data/catalogo.api';
import {
  CATALOGO_TABLE_PAGE_SIZE,
  CategoriaSelection,
  blockedNotice,
  catalogoWrites,
  categoriaNombre,
  categoryEntries,
  estadoChangedMessage,
  estadoProductoLabel,
  estadoProductoVariant,
  estadoToggleLabel,
  formatPrecio,
  pageNumbers,
  pageSlice,
  productosDe,
  rangeText,
  summaryLabel,
  toggledEstado,
  totalPages,
} from './domain/catalogo.rules';
import { categoriaCreadaMessage, productoGuardadoMessage } from './domain/producto-form.rules';
import { ProductoFormComponent } from './producto-form.component';

const DEFAULT_ERROR = 'Revisa tu conexión e inténtalo de nuevo.';
const TOGGLE_ERROR = 'No se pudo cambiar la disponibilidad';

interface Menu {
  categorias: readonly Categoria[];
  productos: readonly Producto[];
}

/** What the product modal opens with: a blank form or the product being edited. */
export type ProductoFormState = { mode: 'crear' } | { mode: 'editar'; producto: Producto };

interface RowView {
  producto: Producto;
  categoria: string;
  precio: string;
  estado: string;
  variant: BadgeVariant;
  toggleLabel: string;
  /** The estado change of this row is in flight. */
  busy: boolean;
}

/** The restaurant menu: categories with counts, the products table, and the DISPONIBLE/AGOTADO toggle. Orchestration only: the logic lives in catalogo.rules. */
@Component({
  selector: 'app-catalogo',
  imports: [
    BadgeComponent,
    ButtonComponent,
    CategoriaFormComponent,
    IconComponent,
    ModalComponent,
    ProductoFormComponent,
    StatePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-dvh bg-surface p-4 sm:p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Catálogo</h1>
          @if (subtitle(); as text) {
            <p class="mt-1 text-sm text-muted">{{ text }}</p>
          }
        </div>
        @if (writes().editar) {
          <div class="flex flex-wrap items-center gap-3">
            <button appButton type="button" variant="secondary" (click)="startCategoria()">
              <app-icon name="folderPlus" [size]="18" />Nueva categoría
            </button>
            <button appButton type="button" variant="primary" (click)="startProducto()">
              <app-icon name="plus" [size]="18" />Nuevo producto
            </button>
          </div>
        }
      </header>

      @if (writes().bloqueado) {
        <p
          class="mt-4 flex items-start gap-2 rounded-control border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn"
          role="status"
        >
          <app-icon name="lock" [size]="16" class="mt-0.5" />{{ blockedNotice }}
        </p>
      }

      <div class="mt-6">
        @if (failed()) {
          <app-state-panel
            class="!min-h-[24rem]"
            icon="alert"
            heading="No se pudo cargar el catálogo"
          >
            {{ errorMessage() }}
            <button actions appButton type="button" variant="secondary" (click)="reload()">
              <app-icon name="refresh" [size]="18" />Reintentar
            </button>
          </app-state-panel>
        } @else if (menu() === null) {
          <div
            class="animate-pulse rounded-card border border-line bg-card p-4"
            aria-busy="true"
            aria-label="Cargando catálogo"
          >
            @for (n of skeletons; track n) {
              <div class="flex items-center gap-6 border-b border-line py-4 last:border-b-0">
                <div class="h-8 flex-1 rounded-full bg-neutral-soft"></div>
                <div class="h-4 w-24 rounded-full bg-neutral-soft"></div>
                <div class="h-4 w-20 rounded-full bg-neutral-soft"></div>
                <div class="h-6 w-24 rounded-full bg-neutral-soft"></div>
              </div>
            }
          </div>
        } @else if (isEmpty()) {
          <app-state-panel class="!min-h-[24rem]" icon="book" heading="Aún no hay productos">
            Cuando se cree el primero aparecerá aquí.
            @if (writes().editar) {
              <button actions appButton type="button" variant="primary" (click)="startProducto()">
                <app-icon name="plus" [size]="18" />Nuevo producto
              </button>
            }
          </app-state-panel>
        } @else {
          <div class="lg:flex lg:items-start lg:gap-6">
            <nav class="lg:w-[280px] lg:shrink-0" aria-label="Categorías">
              <p class="hidden text-xs font-semibold uppercase tracking-wider text-muted lg:mb-3 lg:block">
                Categorías
              </p>
              <ul
                class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0"
              >
                @for (entry of entries(); track entry.id) {
                  <li class="shrink-0">
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-3 rounded-full border px-3.5 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:rounded-control lg:py-3"
                      [class]="
                        entry.id === selected()
                          ? 'border-line bg-card font-medium text-ink'
                          : 'border-line text-muted hover:bg-card lg:border-transparent' +
                            (entry.deshabilitada ? ' opacity-70' : '')
                      "
                      [attr.aria-pressed]="entry.id === selected()"
                      (click)="select(entry.id)"
                    >
                      <span class="flex flex-col">
                        <span class="whitespace-nowrap">{{ entry.nombre }}</span>
                        @if (entry.deshabilitada) {
                          <span class="text-xs font-normal text-subtle">Deshabilitada</span>
                        }
                      </span>
                      <span class="font-mono text-xs text-subtle">{{ entry.count }}</span>
                    </button>
                  </li>
                }
              </ul>
            </nav>

            <div class="mt-2 min-w-0 flex-1 lg:mt-0">
              <div class="overflow-hidden rounded-card border border-line bg-card">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[36rem] border-collapse text-left text-sm">
                    <caption class="sr-only">
                      Productos del catálogo
                    </caption>
                    <thead>
                      <tr class="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                        <th scope="col" class="px-4 py-3">Producto</th>
                        <th scope="col" class="px-4 py-3">Categoría</th>
                        <th scope="col" class="px-4 py-3 text-right">Precio</th>
                        <th scope="col" class="px-4 py-3">Estado</th>
                        @if (writes().editar) {
                          <th scope="col" class="w-12 px-4 py-3"><span class="sr-only">Editar</span></th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of rows(); track row.producto.productoId) {
                        <tr class="border-b border-line last:border-b-0">
                          <th scope="row" class="max-w-[22rem] px-4 py-3 font-normal">
                            <span class="block truncate text-base font-medium">{{ row.producto.nombre }}</span>
                            @if (row.producto.descripcion) {
                              <span class="mt-0.5 block truncate text-muted">{{ row.producto.descripcion }}</span>
                            }
                          </th>
                          <td class="px-4 py-3 text-muted">{{ row.categoria }}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-right font-mono">{{ row.precio }}</td>
                          <td class="px-4 py-3">
                            @if (writes().disponibilidad) {
                              <button
                                type="button"
                                class="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait"
                                [attr.aria-label]="row.toggleLabel"
                                [disabled]="row.busy"
                                (click)="toggleEstado(row.producto)"
                              >
                                <app-badge [variant]="row.variant">
                                  @if (row.busy) {
                                    <app-icon name="spinner" [size]="12" class="animate-spin" />
                                  }{{ row.estado }}
                                </app-badge>
                              </button>
                            } @else {
                              <app-badge [variant]="row.variant">{{ row.estado }}</app-badge>
                            }
                          </td>
                          @if (writes().editar) {
                            <td class="px-4 py-3 text-right">
                              <button
                                type="button"
                                class="rounded-control p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                [attr.aria-label]="'Editar ' + row.producto.nombre"
                                (click)="startEditar(row.producto)"
                              >
                                <app-icon name="pencil" [size]="18" />
                              </button>
                            </td>
                          }
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="px-4 py-10 text-center text-muted">
                            Esta categoría aún no tiene productos.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <footer
                  class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
                >
                  <p class="text-sm text-muted" aria-live="polite">{{ range() }}</p>
                  @if (pages().length > 0) {
                    <nav class="flex items-center gap-1.5" aria-label="Paginación">
                      <button
                        type="button"
                        class="flex size-9 items-center justify-center rounded-control border border-line bg-card text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Página anterior"
                        [disabled]="pageIndex() === 0"
                        (click)="goTo(pageIndex() - 1)"
                      >
                        <app-icon name="chevronLeft" [size]="18" />
                      </button>
                      @for (p of pages(); track $index) {
                        @if (p === null) {
                          <span class="px-1 text-muted" aria-hidden="true">…</span>
                        } @else {
                          <button
                            type="button"
                            class="flex size-9 items-center justify-center rounded-control border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            [class]="
                              p === pageIndex()
                                ? 'border-ink bg-ink text-white'
                                : 'border-line bg-card text-ink hover:bg-surface'
                            "
                            [attr.aria-label]="'Página ' + (p + 1)"
                            [attr.aria-current]="p === pageIndex() ? 'page' : null"
                            (click)="goTo(p)"
                          >
                            {{ p + 1 }}
                          </button>
                        }
                      }
                      <button
                        type="button"
                        class="flex size-9 items-center justify-center rounded-control border border-line bg-card text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Página siguiente"
                        [disabled]="pageIndex() >= pageCount() - 1"
                        (click)="goTo(pageIndex() + 1)"
                      >
                        <app-icon name="chevronRight" [size]="18" />
                      </button>
                    </nav>
                  }
                </footer>
              </div>
            </div>
          </div>
        }
      </div>

      @if (productoForm(); as state) {
        <app-modal
          [form]="true"
          [heading]="state.mode === 'crear' ? 'Nuevo producto' : 'Editar producto'"
          (closed)="closeProducto()"
        >
          <app-producto-form
            [mode]="state.mode"
            [producto]="state.mode === 'editar' ? state.producto : null"
            [categorias]="categorias()"
            (saved)="onProductoSaved($event, state.mode)"
            (cancelled)="closeProducto()"
          />
        </app-modal>
      }
      @if (creatingCategoria()) {
        <app-modal [form]="true" heading="Nueva categoría" (closed)="closeCategoria()">
          <app-categoria-form (created)="onCategoriaCreated($event)" (cancelled)="closeCategoria()" />
        </app-modal>
      }
    </section>
  `,
})
export class CatalogoPage {
  private readonly api = inject(CatalogoApi);
  private readonly session = inject(SessionStore);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest: Subscription | null = null;

  protected readonly blockedNotice = blockedNotice;
  protected readonly skeletons = [1, 2, 3, 4, 5] as const;

  protected readonly menu = signal<Menu | null>(null);
  protected readonly failed = signal(false);
  protected readonly errorMessage = signal(DEFAULT_ERROR);
  protected readonly selected = signal<CategoriaSelection>('todas');
  private readonly page = signal(0);
  /** Product ids whose estado change is in flight: their toggle is locked. */
  private readonly busyIds = signal<ReadonlySet<number>>(new Set());

  /** Set by "Nuevo producto" / the pencil; the product modal is open while it is not null. */
  protected readonly productoForm = signal<ProductoFormState | null>(null);
  /** Set by "Nueva categoría"; the category modal is open while it is true. */
  protected readonly creatingCategoria = signal(false);

  protected readonly writes = computed(() => catalogoWrites(this.session.user()));
  protected readonly subtitle = computed(() => {
    const menu = this.menu();
    return menu === null ? null : summaryLabel(menu.productos, menu.categorias);
  });
  protected readonly categorias = computed(() => this.menu()?.categorias ?? []);
  protected readonly isEmpty = computed(() => (this.menu()?.productos.length ?? 0) === 0);
  protected readonly entries = computed(() => {
    const menu = this.menu();
    return menu === null ? [] : categoryEntries(menu.categorias, menu.productos);
  });

  private readonly filtered = computed(() => {
    const menu = this.menu();
    return menu === null ? [] : productosDe(menu.productos, this.selected(), menu.categorias);
  });
  protected readonly pageCount = computed(() =>
    totalPages(this.filtered().length, CATALOGO_TABLE_PAGE_SIZE),
  );
  /** The requested page clamped to the filtered list, so a shrinking menu never leaves an empty page behind. */
  protected readonly pageIndex = computed(() => Math.min(this.page(), this.pageCount() - 1));
  protected readonly range = computed(() =>
    rangeText(this.filtered().length, this.pageIndex(), CATALOGO_TABLE_PAGE_SIZE),
  );
  protected readonly pages = computed(() => pageNumbers(this.pageIndex(), this.pageCount()));

  protected readonly rows = computed<RowView[]>(() => {
    const menu = this.menu();
    if (menu === null) {
      return [];
    }
    const busy = this.busyIds();
    return pageSlice(this.filtered(), this.pageIndex(), CATALOGO_TABLE_PAGE_SIZE).map((producto) => ({
      producto,
      categoria: categoriaNombre(producto, menu.categorias),
      precio: formatPrecio(producto.precio),
      estado: estadoProductoLabel(producto.estado),
      variant: estadoProductoVariant(producto.estado),
      toggleLabel: estadoToggleLabel(producto.estado),
      busy: busy.has(producto.productoId),
    }));
  });

  constructor() {
    this.reload();
  }

  /** Loads the whole menu again, behind the skeleton (first load and "Reintentar"). */
  reload(): void {
    this.menu.set(null);
    this.failed.set(false);
    this.fetch();
  }

  /** Replaces the product with the same id, or appends it when it is new (called after create/edit). */
  upsertProducto(producto: Producto): void {
    this.menu.update((menu) => {
      if (menu === null) {
        return menu;
      }
      const exists = menu.productos.some((p) => p.productoId === producto.productoId);
      return {
        ...menu,
        productos: exists
          ? menu.productos.map((p) => (p.productoId === producto.productoId ? producto : p))
          : [...menu.productos, producto],
      };
    });
  }

  /** Appends a freshly created category (called after create). */
  addCategoria(categoria: Categoria): void {
    this.menu.update((menu) => (menu === null ? menu : { ...menu, categorias: [...menu.categorias, categoria] }));
  }

  protected select(id: CategoriaSelection): void {
    this.selected.set(id);
    this.page.set(0);
  }

  protected goTo(page: number): void {
    if (page >= 0 && page < this.pageCount()) {
      this.page.set(page);
    }
  }

  protected startProducto(): void {
    this.productoForm.set({ mode: 'crear' });
  }

  protected startEditar(producto: Producto): void {
    this.productoForm.set({ mode: 'editar', producto });
  }

  protected startCategoria(): void {
    this.creatingCategoria.set(true);
  }

  protected closeProducto(): void {
    this.productoForm.set(null);
  }

  protected closeCategoria(): void {
    this.creatingCategoria.set(false);
  }

  protected onProductoSaved(producto: Producto, mode: 'crear' | 'editar'): void {
    this.upsertProducto(producto);
    this.closeProducto();
    this.toasts.show('OK', productoGuardadoMessage(producto, mode), 'success');
  }

  protected onCategoriaCreated(categoria: Categoria): void {
    this.addCategoria(categoria);
    this.closeCategoria();
    this.toasts.show('OK', categoriaCreadaMessage(categoria), 'success');
  }
  protected toggleEstado(producto: Producto): void {
    const id = producto.productoId;
    if (this.busyIds().has(id)) {
      return;
    }
    this.setBusy(id, true);
    this.api
      .cambiarEstadoProducto(id, toggledEstado(producto.estado))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.setBusy(id, false);
          this.upsertProducto(updated);
          this.toasts.show('OK', estadoChangedMessage(updated, updated.estado), 'success');
        },
        error: (error: unknown) => {
          this.setBusy(id, false);
          if (error instanceof HttpErrorResponse) {
            this.toasts.show(error.status, readApiError(error.error)?.message ?? TOGGLE_ERROR);
            if (shouldReloadAfterRejection(error.status)) {
              // The row is most likely stale (deleted or already changed): refresh quietly, keeping the table on screen.
              this.fetch();
            }
          } else {
            this.toasts.show('Error', TOGGLE_ERROR);
          }
        },
      });
  }

  private setBusy(id: number, busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  /** Requests the menu; a newer request drops the one in flight. A failure only shows the error panel when there is no menu to keep. */
  private fetch(): void {
    this.loadRequest?.unsubscribe();
    this.loadRequest = forkJoin({
      categorias: this.api.todasLasCategorias(),
      productos: this.api.todosLosProductos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (menu) => {
          this.menu.set(menu);
          // A category that no longer exists cannot stay selected.
          const selected = this.selected();
          if (typeof selected === 'number' && !menu.categorias.some((c) => c.categoriaId === selected)) {
            this.selected.set('todas');
          }
        },
        error: (error: unknown) => {
          if (this.menu() === null) {
            this.errorMessage.set(messageOf(error));
            this.failed.set(true);
          } else {
            this.toasts.show(
              error instanceof HttpErrorResponse ? error.status : 'Error',
              messageOf(error),
            );
          }
        },
      });
  }
}

/** The backend `message` as is (its 4xx messages already come in Spanish), else a generic hint. */
function messageOf(error: unknown): string {
  return (
    (error instanceof HttpErrorResponse ? readApiError(error.error)?.message : undefined) ??
    DEFAULT_ERROR
  );
}
