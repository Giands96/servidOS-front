import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  concat,
  forkJoin,
  ignoreElements,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { MesasApi } from '../mesas/data/mesas.api';
import { CatalogoApi } from '../catalogo/data/catalogo.api';
import { Categoria, Producto } from '../catalogo/catalogo.types';
import { PedidosApi } from './data/pedidos.api';
import {
  BorradorPedido,
  LineaPedido,
  addProducto,
  canAdd,
  cantidadDe,
  categoryTabs,
  decrement,
  emptyDraft,
  increment,
  isDraftEmpty,
  isValidDraft,
  pedidoCreadoMessage,
  productosDeCategoria,
  resumenItems,
  setLineaObservacion,
  subtotalLinea,
  toRequest,
  totalReferencial,
  visibleErrors,
} from './domain/nuevo-pedido.rules';
import {
  FiltroMesas,
  MAX_PAGE_SIZE,
  MesaCard,
  PasoNuevoPedido,
  clampComensales,
  mesaCards,
  ocupacionAlCrear,
  paginasRestantes,
  pasoAnteriorDisponible,
  pasoTrasMesa,
  pasoTrasTipo,
  pasosDisponibles,
  resumenMesa,
  tipoPasoLabel,
  tipoPasoResumen,
} from './domain/nuevo-pedido-local.rules';
import { formatMoney, tipoIcon } from './domain/pedidos.rules';
import { CuentaMesaApi } from '../mesas/data/cuenta-mesa.api';
import { CuentaMesa } from '../mesas/mesas.types';
import { ComensalesStepComponent } from './nuevo-pedido/comensales-step.component';
import { EstadoMesaDetalle, MesaDetalleComponent } from './nuevo-pedido/mesa-detalle.component';
import { EstadoMesaPicker, MesaPickerComponent } from './nuevo-pedido/mesa-picker.component';
import { ProgresoLocalComponent } from './nuevo-pedido/progreso-local.component';
import { TipoPedidoStepComponent } from './nuevo-pedido/tipo-pedido-step.component';
import { Pedido, TipoPedido } from './pedidos.types';

/** `ocupar` failed (usually: the table was taken meanwhile); `cause` is the original HTTP error. */
class MesaNoDisponible extends Error {
  constructor(override readonly cause: unknown) {
    super('Mesa no disponible');
  }
}

interface Menu {
  categorias: Categoria[];
  productos: Producto[];
}

interface ProductCard {
  producto: Producto;
  price: string;
  /** Units of this product already in the order (0 shows "Agregar" instead of the stepper). */
  cantidad: number;
  available: boolean;
  showImage: boolean;
}

interface LineView {
  linea: LineaPedido;
  subtotal: string;
  noteOpen: boolean;
}

/**
 * New order: the live menu on the left (category tabs + product grid) and the order being built on the right.
 * Orchestration only: every decision (cart operations, validation, filtering) lives in `nuevo-pedido.rules`.
 */
@Component({
  selector: 'app-nuevo-pedido',
  imports: [
    RouterLink,
    ButtonComponent,
    ComensalesStepComponent,
    IconComponent,
    MesaDetalleComponent,
    MesaPickerComponent,
    ModalComponent,
    ProgresoLocalComponent,
    StatePanelComponent,
    TipoPedidoStepComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex-1 min-h-dvh bg-surface p-4 sm:p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav aria-label="Ruta de navegación" class="flex items-center gap-2 text-sm text-muted">
            <a routerLink="/pedidos" class="hover:text-ink">Pedidos</a>
            <span aria-hidden="true">›</span>
            @if (paso() === 'TIPO') {
              <span class="text-ink" aria-current="page">Nuevo pedido</span>
            } @else {
              <span>Nuevo pedido</span>
              <span aria-hidden="true">›</span>
              <span class="text-ink" aria-current="page">{{ tipoLabel() }}</span>
            }
          </nav>
          <h1 class="mt-2 text-3xl font-bold tracking-tight">Nuevo pedido</h1>
        </div>
        @if (paso() !== 'TIPO') {
          <div class="flex flex-wrap items-center gap-4">
            <button appButton type="button" variant="secondary" (click)="atras()">
              <app-icon name="arrowLeft" [size]="16" />Atrás
            </button>
            @if (tipoPedido() === 'MESA') {
              <app-progreso-local [paso]="paso()" />
            }
          </div>
        }
      </header>

      @if (paso() === 'TIPO') {
        <app-tipo-pedido-step (elegir)="elegirTipo($event)" />
      } @else if (paso() === 'MESA') {
        <app-mesa-picker
          [cards]="mesasCards()"
          [filtro]="filtroMesas()"
          [estado]="estadoMesas()"
          [mensajeError]="errorMesas()"
          (elegir)="elegirMesa($event)"
          (cambiarFiltro)="filtroMesas.set($event)"
          (reintentar)="cargarMesas()"
          (cambiarTipo)="cambiarTipo()"
        />
        @if (detalleMesa(); as mesa) {
          <app-mesa-detalle
            [mesa]="mesa"
            [cuenta]="cuentaDetalle()"
            [estado]="estadoDetalle()"
            [mensajeError]="errorDetalle()"
            (cerrar)="cerrarDetalle()"
            (reintentar)="cargarCuenta(mesa)"
            (agregarRonda)="agregarRonda(mesa)"
          />
        }
      } @else if (paso() === 'COMENSALES') {
        @if (mesaElegida(); as mesa) {
          <app-comensales-step
            [mesa]="mesa"
            [comensales]="comensales()"
            (cambiar)="cambiarComensales($event)"
            (confirmar)="irA('PRODUCTOS')"
          />
        }
      } @else if (failed()) {
        <app-state-panel
          class="!min-h-[24rem]"
          icon="alert"
          heading="No se pudo cargar el menú"
        >
          Revisa tu conexión e inténtalo de nuevo.
          <button actions appButton type="button" variant="secondary" (click)="loadMenu()">
            <app-icon name="refresh" [size]="18" />Reintentar
          </button>
        </app-state-panel>
      } @else if (menu() === null) {
        <div
          class="mt-6 grid animate-pulse items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]"
          aria-busy="true"
          aria-label="Cargando el menú"
        >
          <div>
            <div class="flex gap-2">
              @for (n of skeletonTabs; track n) {
                <div class="h-12 w-28 rounded-card bg-neutral-soft"></div>
              }
            </div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (n of skeletonCards; track n) {
                <div class="h-64 rounded-card border border-line bg-card"></div>
              }
            </div>
          </div>
          <div class="h-96 rounded-card border border-line bg-card"></div>
        </div>
      } @else if (menu()!.productos.length === 0) {
        <app-state-panel
          class="!min-h-[24rem]"
          icon="inbox"
          heading="Todavía no hay productos en el catálogo"
        >
          Cuando se registren productos podrás armar pedidos desde aquí.
        </app-state-panel>
      } @else {
        <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Categorías del menú">
              @for (tab of tabs(); track tab.categoriaId) {
                <button
                  type="button"
                  class="shrink-0 rounded-card border px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  [class]="
                    tab.categoriaId === categoriaId()
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-card text-ink hover:bg-surface'
                  "
                  [attr.aria-current]="tab.categoriaId === categoriaId() ? 'true' : null"
                  (click)="selectCategoria(tab.categoriaId)"
                >
                  {{ tab.label }}
                </button>
              }
            </nav>

            @if (cards().length === 0) {
              <p class="mt-6 rounded-card border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
                No hay productos en esta categoría.
              </p>
            } @else {
              <ul class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                @for (card of cards(); track card.producto.productoId) {
                  <li
                    class="flex flex-col overflow-hidden rounded-card border bg-card"
                    [class]="card.cantidad > 0 ? 'border-brand ring-1 ring-brand' : 'border-line'"
                  >
                    <div class="relative aspect-[2/1] bg-neutral-soft">
                      @if (card.showImage) {
                        <img
                          class="size-full object-cover"
                          loading="lazy"
                          [src]="card.producto.imagenUrl"
                          [alt]="card.producto.nombre"
                          [class.opacity-60]="!card.available"
                          (error)="imageFailed(card.producto.productoId)"
                        />
                      } @else {
                        <div class="flex size-full items-center justify-center text-subtle">
                          <app-icon name="utensils" [size]="32" />
                        </div>
                      }
                      @if (card.cantidad > 0) {
                        <span
                          class="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
                          aria-hidden="true"
                        >
                          {{ card.cantidad }}
                        </span>
                      }
                    </div>
                    <div class="flex flex-1 flex-col gap-3 p-4">
                      <div class="flex items-start justify-between gap-3">
                        <p class="font-medium leading-snug" [class.text-muted]="!card.available">
                          {{ card.producto.nombre }}
                        </p>
                        <p class="whitespace-nowrap font-mono text-sm text-muted">{{ card.price }}</p>
                      </div>
                      <div class="mt-auto">
                        @if (!card.available) {
                          <button
                            appButton
                            type="button"
                            variant="secondary"
                            [block]="true"
                            class="!bg-neutral-soft !text-subtle"
                            disabled
                          >
                            <app-icon name="ban" [size]="18" />No disponible
                          </button>
                        } @else if (card.cantidad === 0) {
                          <button
                            appButton
                            type="button"
                            variant="secondary"
                            [block]="true"
                            [attr.aria-label]="'Agregar ' + card.producto.nombre + ' al pedido'"
                            (click)="agregar(card.producto)"
                          >
                            <app-icon name="plus" [size]="18" />Agregar
                          </button>
                        } @else {
                          <div class="flex items-stretch overflow-hidden rounded-control bg-brand-soft text-brand">
                            <button
                              type="button"
                              class="flex w-12 items-center justify-center py-2.5 hover:bg-brand/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                              [attr.aria-label]="'Quitar uno de ' + card.producto.nombre"
                              (click)="quitar(card.producto.productoId)"
                            >
                              <app-icon name="minus" [size]="18" />
                            </button>
                            <span
                              class="flex flex-1 items-center justify-center font-mono font-semibold"
                              aria-live="polite"
                            >
                              {{ card.cantidad }}
                            </span>
                            <button
                              type="button"
                              class="flex w-12 items-center justify-center bg-brand py-2.5 text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                              [attr.aria-label]="'Agregar uno de ' + card.producto.nombre"
                              (click)="sumar(card.producto.productoId)"
                            >
                              <app-icon name="plus" [size]="18" />
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>

          <form
            #cart
            class="scroll-mt-32 rounded-card border lg:scroll-mt-4 border-line bg-card lg:sticky lg:top-6"
            aria-label="Pedido en curso"
            novalidate
            (submit)="submit($event)"
          >
            <div class="min-w-0 p-5">
              <div class="flex items-center gap-3">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-card bg-brand-soft text-brand"
                >
                  @if (tipoIconName(); as icon) {
                    <app-icon [name]="icon" [size]="20" />
                  }
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ tipoLabel() }}
                  </p>
                  @if (tipoResumen(); as resumenTipo) {
                    <p class="text-sm">{{ resumenTipo }}</p>
                  }
                </div>
                <button
                  type="button"
                  class="text-sm font-semibold text-brand hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  (click)="cambiarResumen()"
                >
                  Cambiar
                </button>
              </div>

              @if (errors().mesaId; as message) {
                <p class="mt-3 flex items-center gap-1.5 text-xs text-danger" role="alert">
                  <app-icon name="alert" [size]="14" />{{ message }}
                </p>
              }
            </div>

            <section class="border-t border-line p-5" aria-labelledby="nuevo-pedido-items">
              <div class="flex items-baseline justify-between gap-3">
                <h2
                  #cartHeading
                  id="nuevo-pedido-items"
                  tabindex="-1"
                  class="text-sm font-medium outline-none"
                >
                  Ítems
                </h2>
                <p class="text-xs text-muted" aria-live="polite">{{ resumen() }}</p>
              </div>

              @if (errors().items; as message) {
                <p class="mt-3 flex items-center gap-1.5 text-xs text-danger" role="alert">
                  <app-icon name="alert" [size]="14" />{{ message }}
                </p>
              }

              @if (lines().length === 0) {
                <p class="mt-3 text-sm text-muted">Aún no agregaste productos.</p>
              } @else {
                <ul class="mt-3 space-y-4">
                  @for (line of lines(); track line.linea.productoId) {
                    <li>
                      <div class="flex items-center justify-between gap-3">
                        <p class="min-w-0 flex-1 text-sm">{{ line.linea.nombre }}</p>
                        <div class="flex items-stretch overflow-hidden rounded-control border border-line">
                          <button
                            type="button"
                            class="flex w-9 items-center justify-center py-2 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                            [attr.aria-label]="'Quitar uno de ' + line.linea.nombre"
                            (click)="quitar(line.linea.productoId)"
                          >
                            <app-icon name="minus" [size]="16" />
                          </button>
                          <span
                            class="flex w-8 items-center justify-center font-mono text-sm font-semibold"
                            aria-live="polite"
                          >
                            {{ line.linea.cantidad }}
                          </span>
                          <button
                            type="button"
                            class="flex w-9 items-center justify-center py-2 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                            [attr.aria-label]="'Agregar uno de ' + line.linea.nombre"
                            (click)="sumar(line.linea.productoId)"
                          >
                            <app-icon name="plus" [size]="16" />
                          </button>
                        </div>
                        <p class="w-20 whitespace-nowrap text-right font-mono text-sm text-muted">
                          {{ line.subtotal }}
                        </p>
                      </div>
                      @if (line.noteOpen) {
                        <label class="sr-only" [for]="'nuevo-pedido-nota-' + line.linea.productoId">
                          Observación de {{ line.linea.nombre }}
                        </label>
                        <input
                          type="text"
                          autocomplete="off"
                          placeholder="Ej. sin ají"
                          class="mt-2 w-full rounded-control border border-line bg-card px-3 py-2 text-base text-ink sm:text-sm outline-none placeholder:text-subtle focus:border-ink"
                          [id]="'nuevo-pedido-nota-' + line.linea.productoId"
                          [value]="line.linea.observacion"
                          (input)="setNota(line.linea.productoId, valueOf($event))"
                        />
                      } @else {
                        <button
                          type="button"
                          class="mt-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          [attr.aria-label]="'Agregar observación a ' + line.linea.nombre"
                          (click)="openNota(line.linea.productoId)"
                        >
                          <app-icon name="plus" [size]="14" />Agregar observación
                        </button>
                      }
                    </li>
                  }
                </ul>
              }
            </section>

            <div class="border-t border-line p-5">
              <label class="block text-sm font-medium" for="nuevo-pedido-observacion">
                Observación del pedido (opcional)
              </label>
              <textarea
                id="nuevo-pedido-observacion"
                name="observacion"
                rows="3"
                placeholder="Ej. alergias, preferencias de la mesa…"
                class="mt-2 w-full resize-y rounded-control border border-line bg-card px-3.5 py-3 text-base text-ink sm:text-sm outline-none placeholder:text-subtle focus:border-ink"
                [value]="observacion()"
                (input)="observacion.set(valueOf($event))"
              ></textarea>
            </div>

            <div class="border-t border-line p-5">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <p class="text-sm text-muted">Total referencial</p>
                  <p class="text-xs text-subtle">El total final lo calcula el sistema</p>
                </div>
                <p class="whitespace-nowrap font-mono text-2xl font-bold" aria-live="polite">{{ total() }}</p>
              </div>
              <div class="mt-4 flex gap-3">
                <button
                  appButton
                  type="button"
                  variant="secondary"
                  [disabled]="discardDisabled()"
                  (click)="askDiscard()"
                >
                  Descartar
                </button>
                <button
                  appButton
                  type="submit"
                  variant="primary"
                  class="flex-1"
                  [disabled]="submitting()"
                >
                  @if (submitting()) {
                    <app-icon name="spinner" [size]="18" class="animate-spin" />
                  } @else {
                    <app-icon name="check" [size]="18" />
                  }Crear pedido
                </button>
              </div>
            </div>
          </form>
        </div>

        @if (hasItems()) {
          <!-- Spacer so the fixed bar never covers the cart buttons. -->
          <div class="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true"></div>
          <div
            class="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:hidden"
          >
            <div class="min-w-0">
              <p class="text-xs text-muted">{{ resumen() }}</p>
              <p class="font-mono text-lg font-bold">{{ total() }}</p>
            </div>
            <button appButton type="button" variant="primary" (click)="verPedido(cart, cartHeading)">
              Ver pedido
            </button>
          </div>
        }
      }

      @if (confirmingDiscard()) {
        <app-modal heading="¿Descartar el pedido?" tone="danger">
          <app-icon icon name="x" [size]="24" />
          Se quitarán los productos y los datos que ingresaste. Esta acción no se puede deshacer.
          <button footer appButton type="button" variant="secondary" (click)="dismissDiscard()">
            Volver
          </button>
          <button footer appButton type="button" variant="destructive" (click)="confirmDiscard()">
            Descartar pedido
          </button>
        </app-modal>
      }
    </section>
  `,
})
export class NuevoPedidoPage {
  private readonly catalogo = inject(CatalogoApi);
  private readonly pedidos = inject(PedidosApi);
  private readonly mesas = inject(MesasApi);
  private readonly cuentas = inject(CuentaMesaApi);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly skeletonTabs = [1, 2, 3, 4] as const;
  protected readonly skeletonCards = [1, 2, 3, 4, 5, 6] as const;

  protected readonly menu = signal<Menu | null>(null);
  protected readonly failed = signal(false);
  protected readonly categoriaId = signal<number | null>(null);
  private readonly failedImages = signal<ReadonlySet<number>>(new Set());

  // The draft, one signal per field so typing in a text field does not recompute the product grid.
  protected readonly tipoPedido = signal<TipoPedido>('MESA');
  /** Current step of the flow; the page keeps it (no router state yet). */
  protected readonly paso = signal<PasoNuevoPedido>('TIPO');
  /** Table picked in the MESA step; the draft `mesaId` and the guests limit come from it. */
  protected readonly mesaElegida = signal<MesaCard | null>(null);
  /** Guests of a LIBRE table, chosen in the COMENSALES step (1 until the user changes it). */
  protected readonly comensales = signal(1);
  protected readonly observacion = signal('');
  protected readonly lineas = signal<readonly LineaPedido[]>([]);
  /** Lines whose observation input was opened by the user (a line with text always shows it). */
  private readonly openNotes = signal<ReadonlySet<number>>(new Set());

  // Mesa picker: tables + unpaid orders, loaded every time the MESA step is entered.
  protected readonly mesasCards = signal<readonly MesaCard[]>([]);
  protected readonly filtroMesas = signal<FiltroMesas>('TODAS');
  protected readonly estadoMesas = signal<EstadoMesaPicker>('cargando');
  protected readonly errorMesas = signal('');

  // Bill detail of an OCUPADA table, open over the picker (page state on top of the MESA step).
  protected readonly detalleMesa = signal<MesaCard | null>(null);
  protected readonly cuentaDetalle = signal<CuentaMesa | null>(null);
  protected readonly estadoDetalle = signal<EstadoMesaDetalle>('cargando');
  protected readonly errorDetalle = signal('');

  /** The bill load in flight, cancelled when the detail closes or another table opens. */
  private cuentaSub: Subscription | null = null;

  /** The table load in flight, cancelled when a newer one starts or the user leaves the MESA step. */
  private mesasSub: Subscription | null = null;

  private readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly confirmingDiscard = signal(false);

  private readonly draft = computed<BorradorPedido>(() => ({
    tipoPedido: this.tipoPedido(),
    mesaId: this.mesaElegida()?.mesaId ?? null,
    observacion: this.observacion(),
    lineas: this.lineas(),
  }));

  protected readonly errors = computed(() => visibleErrors(this.draft(), this.submitAttempted()));
  protected readonly discardDisabled = computed(
    () => this.submitting() || isDraftEmpty(this.draft()),
  );
  protected readonly tipoLabel = computed(() => tipoPasoLabel(this.tipoPedido()));
  /** Second line of the cart summary: the type description, or "Mesa 5 · 2 comensales" for Local. */
  protected readonly tipoResumen = computed(() => {
    const mesa = this.mesaElegida();
    return this.tipoPedido() === 'MESA'
      ? mesa === null
        ? null
        : resumenMesa(mesa, this.comensales())
      : tipoPasoResumen(this.tipoPedido());
  });
  protected readonly tipoIconName = computed(() => tipoIcon(this.tipoPedido()));
  protected readonly total = computed(() => formatMoney(totalReferencial(this.lineas())));
  protected readonly resumen = computed(() => resumenItems(this.lineas()));
  protected readonly hasItems = computed(() => this.lineas().length > 0);

  protected readonly tabs = computed(() => categoryTabs(this.menu()?.categorias ?? []));

  protected readonly cards = computed<ProductCard[]>(() => {
    const lineas = this.lineas();
    const failedImages = this.failedImages();
    return productosDeCategoria(this.menu()?.productos ?? [], this.categoriaId()).map(
      (producto) => ({
        producto,
        price: formatMoney(producto.precio),
        cantidad: cantidadDe(lineas, producto.productoId),
        available: canAdd(producto),
        showImage:
          (producto.imagenUrl?.trim() ?? '') !== '' && !failedImages.has(producto.productoId),
      }),
    );
  });

  protected readonly lines = computed<LineView[]>(() => {
    const openNotes = this.openNotes();
    return this.lineas().map((linea) => ({
      linea,
      subtotal: formatMoney(subtotalLinea(linea)),
      noteOpen: linea.observacion !== '' || openNotes.has(linea.productoId),
    }));
  });

  constructor() {
    this.loadMenu();
    // Every step is a "new screen": start at the top instead of keeping the previous scroll position.
    effect(() => {
      this.paso();
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0 });
      }
    });
  }

  /** Tables and every page of the unpaid orders in parallel; any failure shows the picker's error state. */
  protected cargarMesas(): void {
    this.cancelarCargaMesas();
    this.estadoMesas.set('cargando');
    this.errorMesas.set('');
    this.mesasSub = forkJoin({
      mesas: this.mesas.listar(),
      pendientes: this.pedidos.listar({ porCobrar: true, page: 0, size: MAX_PAGE_SIZE }).pipe(
        switchMap((first) => {
          const restantes = paginasRestantes(first);
          // forkJoin([]) completes without emitting, so a single page must not go through it.
          if (restantes.length === 0) {
            return of(first.content);
          }
          return forkJoin(
            restantes.map((page) => this.pedidos.listar({ porCobrar: true, page, size: MAX_PAGE_SIZE })),
          ).pipe(map((rest) => [first, ...rest].flatMap((page) => page.content)));
        }),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ mesas, pendientes }) => {
          this.mesasCards.set(mesaCards(mesas, pendientes, new Date()));
          this.estadoMesas.set('listo');
        },
        error: (error: unknown) => {
          this.errorMesas.set(
            error instanceof HttpErrorResponse ? (readApiError(error.error)?.message ?? '') : '',
          );
          this.estadoMesas.set('error');
        },
      });
  }

  /** A late response must not overwrite state once the step changed or a newer load started. */
  private cancelarCargaMesas(): void {
    this.mesasSub?.unsubscribe();
    this.mesasSub = null;
  }

  /** The only way to change step: leaving MESA cancels a table load still in flight and closes the detail. */
  protected irA(paso: PasoNuevoPedido): void {
    if (paso !== 'MESA') {
      this.cancelarCargaMesas();
      this.cerrarDetalle();
    }
    this.paso.set(paso);
  }

  protected elegirMesa(card: MesaCard): void {
    const siguiente = pasoTrasMesa(card);
    if (siguiente === null) {
      // OCUPADA: its bill opens over the picker; the table is only chosen by "Agregar ronda".
      this.abrirDetalle(card);
      return;
    }
    this.mesaElegida.set(card);
    this.comensales.set(1);
    this.irA(siguiente);
  }

  private abrirDetalle(card: MesaCard): void {
    this.detalleMesa.set(card);
    this.cargarCuenta(card);
  }

  /** Loads the bill of `card`; a late answer of a closed or replaced detail never reaches the state. */
  protected cargarCuenta(card: MesaCard): void {
    this.cancelarCargaCuenta();
    this.cuentaDetalle.set(null);
    this.errorDetalle.set('');
    this.estadoDetalle.set('cargando');
    this.cuentaSub = this.cuentas
      .obtener(card.mesaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuenta) => {
          this.cuentaDetalle.set(cuenta);
          this.estadoDetalle.set('listo');
        },
        error: (error: unknown) => {
          this.errorDetalle.set(
            error instanceof HttpErrorResponse ? (readApiError(error.error)?.message ?? '') : '',
          );
          this.estadoDetalle.set('error');
        },
      });
  }

  private cancelarCargaCuenta(): void {
    this.cuentaSub?.unsubscribe();
    this.cuentaSub = null;
  }

  protected cerrarDetalle(): void {
    this.cancelarCargaCuenta();
    this.detalleMesa.set(null);
    this.cuentaDetalle.set(null);
  }

  /** Another round for the occupied table: products with the table fixed, no guests step. */
  protected agregarRonda(card: MesaCard): void {
    this.mesaElegida.set(card);
    this.comensales.set(1);
    this.irA('PRODUCTOS');
  }

  protected cambiarComensales(value: number): void {
    const mesa = this.mesaElegida();
    if (mesa !== null) {
      this.comensales.set(clampComensales(value, mesa.capacidad));
    }
  }

  /** Categories and the whole product list in parallel; any failure shows the error panel, never a partial menu. */
  protected loadMenu(): void {
    this.failed.set(false);
    this.menu.set(null);
    forkJoin({
      categorias: this.catalogo.todasLasCategorias(),
      productos: this.catalogo.todosLosProductos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (menu) => {
          this.categoriaId.set(null);
          this.menu.set(menu);
        },
        error: (error: unknown) => {
          this.failed.set(true);
          this.fail(error);
        },
      });
  }

  /** Phones and tablets: brings the order into view and moves focus to its heading. */
  protected verPedido(cart: HTMLElement, heading: HTMLElement): void {
    if (typeof cart.scrollIntoView === 'function') {
      cart.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    heading.focus({ preventScroll: true });
  }

  protected selectCategoria(categoriaId: number | null): void {
    this.categoriaId.set(categoriaId);
  }

  protected imageFailed(productoId: number): void {
    this.failedImages.update((set) => new Set(set).add(productoId));
  }

  protected elegirTipo(tipo: TipoPedido): void {
    this.tipoPedido.set(tipo);
    this.mesaElegida.set(null);
    this.comensales.set(1);
    const paso = pasoTrasTipo(tipo);
    if (paso === 'MESA') {
      this.cargarMesas();
    }
    this.irA(paso);
  }

  /** "Atrás" keeps the cart lines and the guests; an OCUPADA table has no COMENSALES step to return to. */
  protected atras(): void {
    const paso =
      pasoAnteriorDisponible(
        this.paso(),
        this.tipoPedido(),
        pasosDisponibles(this.mesaElegida()),
      ) ?? 'TIPO';
    if (paso === 'MESA') {
      this.cargarMesas();
    }
    this.irA(paso);
  }

  protected cambiarTipo(): void {
    this.irA('TIPO');
  }

  /** "Cambiar" of the cart summary: Local returns to the table picker, the others to the type step. Lines stay. */
  protected cambiarResumen(): void {
    if (this.tipoPedido() === 'MESA') {
      this.cargarMesas();
      this.irA('MESA');
    } else {
      this.cambiarTipo();
    }
  }

  protected agregar(producto: Producto): void {
    this.lineas.update((lineas) => addProducto(lineas, producto));
  }

  protected sumar(productoId: number): void {
    this.lineas.update((lineas) => increment(lineas, productoId));
  }

  protected quitar(productoId: number): void {
    this.lineas.update((lineas) => decrement(lineas, productoId));
  }

  protected openNota(productoId: number): void {
    this.openNotes.update((set) => new Set(set).add(productoId));
  }

  protected setNota(productoId: number, observacion: string): void {
    this.lineas.update((lineas) => setLineaObservacion(lineas, productoId, observacion));
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    this.submitAttempted.set(true);
    const draft = this.draft();
    if (!isValidDraft(draft)) {
      return;
    }
    this.submitting.set(true);
    this.crearPedido(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pedido) => {
          this.toasts.show('OK', pedidoCreadoMessage(pedido.pedidoId), 'success');
          // The draft is cleared first: if the navigation were slow, a second click could not create the order twice.
          this.resetDraft();
          void this.router.navigate(['/pedidos']).finally(() => this.submitting.set(false));
        },
        error: (error: unknown) => {
          // The draft stays as typed so the user can fix it and try again.
          this.submitting.set(false);
          if (error instanceof MesaNoDisponible) {
            // Someone took the table meanwhile: back to a fresh picker, keeping the cart lines.
            this.fail(error.cause);
            this.mesaElegida.set(null);
            this.irA('MESA');
            this.cargarMesas();
            return;
          }
          this.fail(error);
        },
      });
  }

  /**
   * A local order on a free table first records its guests (`ocupar`), then creates the order. If the order
   * fails, the table is freed again (best effort) so it is not left occupied without orders.
   */
  private crearPedido(draft: BorradorPedido): Observable<Pedido> {
    const request = toRequest(draft);
    const ocupacion = ocupacionAlCrear(draft.tipoPedido, this.mesaElegida(), this.comensales());
    if (ocupacion === null) {
      return this.pedidos.crear(request);
    }
    return this.mesas.ocupar(ocupacion.mesaId, ocupacion.comensales).pipe(
      catchError((error: unknown) => throwError(() => new MesaNoDisponible(error))),
      switchMap(() =>
        this.pedidos.crear(request).pipe(
          catchError((error: unknown) =>
            concat(
              this.mesas.liberar(ocupacion.mesaId).pipe(
                ignoreElements(),
                catchError(() => EMPTY),
              ),
              throwError(() => error),
            ),
          ),
        ),
      ),
    );
  }

  protected askDiscard(): void {
    if (!this.discardDisabled()) {
      this.confirmingDiscard.set(true);
    }
  }

  protected dismissDiscard(): void {
    this.confirmingDiscard.set(false);
  }

  protected confirmDiscard(): void {
    this.confirmingDiscard.set(false);
    this.resetDraft();
    this.irA('TIPO');
  }

  private resetDraft(): void {
    const blank = emptyDraft();
    this.tipoPedido.set(blank.tipoPedido);
    this.mesaElegida.set(null);
    this.comensales.set(1);
    this.observacion.set(blank.observacion);
    this.lineas.set(blank.lineas);
    this.openNotes.set(new Set());
    this.submitAttempted.set(false);
  }

  /** Shows the backend `message` as-is (400 comes in Spanish, 422 as "campo: mensaje"). */
  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.toasts.show(
        error.status,
        readApiError(error.error)?.message ?? 'No se pudo completar la operación',
      );
    } else {
      this.toasts.show('Error', 'No se pudo completar la operación');
    }
  }
}
