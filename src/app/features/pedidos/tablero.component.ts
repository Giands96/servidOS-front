import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragStart,
  CdkDropList,
  DragDropModule,
  DragStartDelay,
} from '@angular/cdk/drag-drop';
import { Observable, Subject, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PedidosApi } from './data/pedidos.api';
import {
  cancelCopy,
  failedLoadView,
  isRowBusy,
  shouldReloadAfterRejection,
  tipoIcon,
} from './domain/pedidos.rules';
import {
  BOARD_COLUMNS,
  BoardColumn,
  CLOSED_COLUMNS,
  CardView,
  ColumnDropState,
  ColumnHeader,
  MoveMenu,
  MoveMenuItem,
  TipoFiltro,
  canDrop,
  cardView,
  closedColumnHint,
  closedCountQuery,
  columnDropState,
  columnHeader,
  columnQuery,
  filterByTipo,
  groupByColumn,
  menuPlacement,
  moveMenu,
  moveRequest,
  moveSuccessMessage,
  nextEnabledIndex,
  shouldCloseOnResize,
  tipoFilterChips,
} from './domain/tablero.rules';
import { EstadoPedido, Pedido, PedidoListado } from './pedidos.types';

interface BoardData {
  /** Active orders of the four board columns. */
  pedidos: PedidoListado[];
  /** Today's totals of the collapsed columns. */
  entregados: number;
  cancelados: number;
}

type Outcome = { ok: true; board: BoardData } | { ok: false; error: unknown; sameView: boolean };

interface CardVm {
  pedido: PedidoListado;
  view: CardView;
  icon: IconName | null;
  busy: boolean;
}

interface ColumnVm {
  estado: BoardColumn;
  header: ColumnHeader;
  cards: CardVm[];
}

interface ClosedVm {
  estado: EstadoPedido;
  label: string;
  icon: IconName;
  count: number;
}

interface MenuState {
  pedido: PedidoListado;
  top: number;
  left: number;
  trigger: HTMLElement;
}

const DOT: Record<BadgeVariant, string> = {
  ok: 'bg-ok',
  info: 'bg-info',
  warn: 'bg-warn',
  flow: 'bg-flow',
  danger: 'bg-danger',
  neutral: 'bg-neutral',
};

const MENU_WIDTH = 288;
const MENU_HEADING_HEIGHT = 44;
const MENU_ITEM_HEIGHT = 52;
/**
 * Board height: the viewport minus what sits above it (top bar below `lg`, page header and filter chips). The header
 * wraps on narrow screens, so the offset shrinks at each breakpoint; measured at 375, 640, 768 and 1280 px.
 */
const BOARD_HEIGHT =
  'h-[calc(100dvh-25.5rem)] min-h-[24rem] sm:h-[calc(100dvh-20.5rem)] md:h-[calc(100dvh-17.5rem)] lg:h-[calc(100dvh-15rem)] lg:min-h-[26rem]';
/** Open columns: most of the viewport on phones (a peek of the next one), fixed width from `sm`. */
const OPEN_COLUMN = 'min-w-[85%] sm:min-w-72';
const ALL_ESTADOS: readonly EstadoPedido[] = [...BOARD_COLUMNS, ...CLOSED_COLUMNS];
const REFRESH_MS = 60_000;

const MENU_ICON: Record<MoveMenuItem['direction'], IconName> = {
  forward: 'arrowRight',
  back: 'arrowLeft',
  done: 'check',
  cancel: 'ban',
};

/**
 * Orders board: one column per active estado plus two collapsed ones (Entregado, Cancelado) that act as drop zones.
 * Cards move by drag & drop, by their primary button and by the "⋯" menu, always along the contract's transitions
 * (rules in `tablero.rules`). Orchestration only: it loads its own data and reloads after every move.
 */
@Component({
  selector: 'app-tablero',
  imports: [DragDropModule, ButtonComponent, IconComponent, ModalComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu(true)',
    '(window:resize)': 'onResize()',
  },
  template: `
    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo">
      @for (chip of chips(); track chip.filtro) {
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          [class]="
            chip.filtro === filtro()
              ? 'border-ink bg-ink text-white'
              : 'border-line bg-card text-ink hover:bg-surface'
          "
          [attr.aria-pressed]="chip.filtro === filtro()"
          (click)="filtro.set(chip.filtro)"
        >
          @if (chipIcon(chip.filtro); as icon) {
            <app-icon [name]="icon" [size]="16" />
          }
          {{ chip.label }}
          <span class="font-mono text-xs opacity-70">{{ chip.count }}</span>
        </button>
      }
    </div>

    @if (failed()) {
      <app-state-panel class="!min-h-[24rem]" icon="alert" heading="No se pudo cargar el tablero">
        {{ errorMessage() }}
        <button actions appButton type="button" variant="secondary" (click)="reload()">
          <app-icon name="refresh" [size]="18" />Reintentar
        </button>
      </app-state-panel>
    } @else if (board() === null) {
      <div
        class="mt-4 flex gap-3 overflow-hidden"
        [class]="boardHeight"
        aria-busy="true"
        aria-label="Cargando el tablero"
      >
        @for (n of skeletons; track n) {
          <div
            class="flex flex-1 animate-pulse flex-col gap-3 rounded-card bg-neutral-soft p-3"
            [class]="openColumn"
          >
            <div class="h-5 w-32 rounded-full bg-card"></div>
            <div class="h-28 rounded-card bg-card"></div>
            <div class="h-28 rounded-card bg-card"></div>
          </div>
        }
        <div class="w-32 shrink-0 animate-pulse rounded-card bg-neutral-soft"></div>
        <div class="w-32 shrink-0 animate-pulse rounded-card bg-neutral-soft"></div>
      </div>
    } @else {
      <div
        cdkDropListGroup
        class="mt-4 flex gap-3 overflow-x-auto pb-2 transition-opacity"
        [class]="boardHeight + (dragging() === null ? ' snap-x snap-proximity lg:snap-none' : '')"
        [class.opacity-70]="loading()"
        [attr.aria-busy]="loading()"
      >
        @for (col of columns(); track col.estado) {
          @let state = dropStates()[col.estado];
          <section
            cdkDropList
            cdkDropListSortingDisabled
            class="min-h-0 flex-1 snap-start overflow-y-auto rounded-card border p-3 transition-colors"
            [class]="openColumn + ' ' + zoneClass(col.estado, state)"
            [cdkDropListData]="col.estado"
            [cdkDropListEnterPredicate]="canEnter"
            [attr.aria-label]="col.header.label"
            (cdkDropListDropped)="onDrop($event)"
          >
            <header class="sticky -top-3 z-10 -mx-3 -mt-3 mb-2 bg-inherit px-3 pb-2 pt-3">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full" [class]="dot(col.header.dot)"></span>
                <h2 class="font-semibold">{{ col.header.label }}</h2>
                <span class="rounded-full bg-card px-2 py-0.5 text-xs font-semibold">
                  {{ col.header.count }}
                </span>
                @if (state.kind === 'locked') {
                  <app-icon name="lock" [size]="16" class="ml-auto text-muted" />
                }
              </div>
              @if (state.kind === 'locked' && state.reason) {
                <p class="mt-1 text-xs text-muted">{{ state.reason }}</p>
              }
            </header>

            <div class="flex flex-col gap-2">
              @for (card of col.cards; track card.pedido.pedidoId) {
                <article
                  cdkDrag
                  tabindex="0"
                  role="group"
                  class="relative select-none rounded-card border border-line bg-card p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  [class]="card.busy ? 'cursor-progress' : 'cursor-grab active:cursor-grabbing'"
                  [cdkDragData]="card.pedido"
                  [cdkDragDisabled]="card.busy"
                  [cdkDragStartDelay]="startDelay"
                  [cdkDragPreviewClass]="previewClass"
                  [attr.aria-label]="card.view.titulo + ' ' + card.view.numero"
                  [attr.aria-busy]="card.busy"
                  (cdkDragStarted)="onDragStarted($event)"
                  (cdkDragEnded)="dragging.set(null)"
                >
                  <div
                    *cdkDragPlaceholder
                    class="flex min-h-32 items-center justify-center rounded-card border-2 border-dashed border-line bg-surface p-3 text-center text-sm text-muted"
                  >
                    {{ card.view.titulo }} · moviendo…
                  </div>

                  <div class="flex items-start justify-between gap-2">
                    <p class="flex items-center gap-2 font-semibold">
                      @if (card.icon) {
                        <app-icon [name]="card.icon" [size]="18" class="text-muted" />
                      }{{ card.view.titulo }}
                    </p>
                    <span class="font-mono text-xs text-muted">{{ card.view.numero }}</span>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-neutral-soft px-2.5 py-1 font-mono text-xs text-neutral"
                    >
                      <app-icon name="clock" [size]="14" />{{ card.view.minutos }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1.5"
                      [class]="card.view.pagado ? 'text-ok' : 'text-muted'"
                    >
                      @if (card.view.pagado) {
                        <app-icon name="check" [size]="14" />
                      }
                      {{ card.view.pago }}{{ card.view.pagado ? ' ' : ' · ' }}{{ card.view.total }}
                    </span>
                  </div>

                  @if (card.view.observacion; as observacion) {
                    <p class="mt-2 line-clamp-2 text-sm text-muted">{{ observacion }}</p>
                  }

                  <div class="mt-3 flex items-center gap-2">
                    @if (card.view.primary; as primary) {
                      <button
                        appButton
                        type="button"
                        variant="secondary"
                        class="!flex-1 !px-3 !py-2"
                        [disabled]="card.busy"
                        (click)="onPrimary(card.pedido)"
                      >
                        {{ primary.label }}<app-icon name="arrowRight" [size]="16" />
                      </button>
                    } @else {
                      <span class="flex-1"></span>
                    }
                    <button
                      appButton
                      type="button"
                      variant="secondary"
                      class="!px-2.5 !py-2"
                      aria-haspopup="menu"
                      [disabled]="card.busy"
                      [attr.aria-expanded]="menu()?.pedido?.pedidoId === card.pedido.pedidoId"
                      [attr.aria-label]="'Más acciones para ' + card.view.titulo"
                      (click)="openMenu(card.pedido, $event)"
                    >
                      <app-icon name="ellipsis" [size]="18" />
                    </button>
                  </div>

                  @if (card.busy) {
                    <div
                      class="absolute inset-0 flex items-center justify-center rounded-card bg-card/70"
                      role="status"
                      aria-label="Moviendo pedido"
                    >
                      <app-icon name="spinner" [size]="22" class="animate-spin text-muted" />
                    </div>
                  }
                </article>
              } @empty {
                <p class="py-6 text-center text-sm text-subtle">Sin pedidos</p>
              }
            </div>
          </section>
        }

        @for (col of closed(); track col.estado) {
          @let state = dropStates()[col.estado];
          <section
            cdkDropList
            cdkDropListSortingDisabled
            class="flex min-h-0 w-32 shrink-0 flex-col items-center gap-2 rounded-card border p-3 text-center transition-colors"
            [class]="zoneClass(col.estado, state)"
            [cdkDropListData]="col.estado"
            [cdkDropListEnterPredicate]="canEnter"
            [attr.aria-label]="col.label"
            (cdkDropListDropped)="onDrop($event)"
          >
            <app-icon
              [name]="state.kind === 'locked' ? 'lock' : col.icon"
              [size]="22"
              [class]="col.estado === 'CANCELADO' ? 'text-danger' : 'text-muted'"
            />
            <h2 class="text-sm font-semibold">{{ col.label }}</h2>
            <span class="rounded-full bg-card px-2 py-0.5 font-mono text-xs font-semibold">
              {{ col.count }}
            </span>
            <p class="text-xs text-muted">{{ hint(col.estado, state) }}</p>
          </section>
        }
      </div>
    }

    @if (menuView(); as view) {
      <div class="fixed inset-0 z-30" aria-hidden="true" (click)="closeMenu()"></div>
      <div
        role="menu"
        class="fixed z-30 w-72 max-w-[calc(100vw-1rem)] rounded-card border border-line bg-card p-2 shadow-modal"
        [attr.aria-label]="view.menu.heading"
        [style.top.px]="view.top"
        [style.left.px]="view.left"
        (keydown)="onMenuKey($event, view.menu)"
      >
        <p class="px-3 py-2 text-xs font-semibold text-muted">{{ view.menu.heading }}</p>
        @for (item of view.menu.items; track item.estado) {
          @if (item.direction === 'cancel') {
            <hr class="my-1 border-line" />
          }
          <button
            #menuItem
            type="button"
            role="menuitem"
            tabindex="-1"
            class="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand"
            [class]="itemClass(item)"
            [attr.aria-disabled]="!item.allowed"
            (click)="chooseMove(view.pedido, item)"
          >
            <app-icon [name]="menuIcon(item)" [size]="18" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium">{{ item.label }}</span>
              @if (item.sublabel) {
                <span class="block text-xs text-muted">{{ item.sublabel }}</span>
              }
            </span>
            @if (item.next) {
              <span class="rounded-md bg-ok px-2 py-0.5 text-xs font-semibold text-white">Siguiente</span>
            }
          </button>
        }
      </div>
    }

    @if (cancelView(); as copy) {
      <app-modal [heading]="copy.heading" tone="danger">
        <app-icon icon name="x" [size]="24" />
        {{ copy.message }}
        <button footer appButton type="button" variant="secondary" (click)="dismissCancel()">Volver</button>
        <button footer appButton type="button" variant="destructive" (click)="confirmCancel()">
          Cancelar pedido
        </button>
      </app-modal>
    }
  `,
})
export class TableroComponent {
  private readonly api = inject(PedidosApi);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly requests$ = new Subject<{ sameView: boolean }>();

  private readonly now = signal(new Date());
  private readonly inFlight = signal<ReadonlySet<number>>(new Set());
  /** Cards whose move was applied and that wait for the board reload to show their new column. */
  private readonly awaitingReload = signal<ReadonlySet<number>>(new Set());
  private readonly cancelTarget = signal<PedidoListado | null>(null);
  private lastWidth = this.document.defaultView?.innerWidth ?? 0;
  private readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');

  protected readonly skeletons = [1, 2, 3, 4] as const;
  protected readonly boardHeight = BOARD_HEIGHT;
  protected readonly openColumn = OPEN_COLUMN;
  protected readonly startDelay: DragStartDelay = { touch: 150, mouse: 0 };
  protected readonly previewClass = ['rotate-2', 'shadow-modal', 'opacity-95'];
  protected readonly board = signal<BoardData | null>(null);
  protected readonly failed = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly filtro = signal<TipoFiltro>('TODOS');
  protected readonly dragging = signal<PedidoListado | null>(null);
  protected readonly menu = signal<MenuState | null>(null);

  /** True while the board is being (re)loaded; the page reads it for its "Actualizar" button. */
  readonly loading = signal(true);

  protected readonly chips = computed(() => tipoFilterChips(this.board()?.pedidos ?? []));

  protected readonly columns = computed<ColumnVm[]>(() => {
    const now = this.now();
    const inFlight = this.inFlight();
    const awaitingReload = this.awaitingReload();
    const groups = groupByColumn(filterByTipo(this.board()?.pedidos ?? [], this.filtro()));
    return BOARD_COLUMNS.map((estado) => ({
      estado,
      header: columnHeader(estado, groups[estado].length),
      cards: groups[estado].map((pedido) => ({
        pedido,
        view: cardView(pedido, now),
        icon: tipoIcon(pedido.tipoPedido),
        busy: isRowBusy(pedido.pedidoId, inFlight, awaitingReload),
      })),
    }));
  });

  protected readonly closed = computed<ClosedVm[]>(() => {
    const board = this.board();
    return [
      {
        estado: 'ENTREGADO',
        label: columnHeader('ENTREGADO', 0).label,
        icon: 'checkCircle',
        count: board?.entregados ?? 0,
      },
      {
        estado: 'CANCELADO',
        label: columnHeader('CANCELADO', 0).label,
        icon: 'ban',
        count: board?.cancelados ?? 0,
      },
    ];
  });

  protected readonly dropStates = computed(() => {
    const dragged = this.dragging();
    return Object.fromEntries(
      ALL_ESTADOS.map((estado) => [estado, columnDropState(dragged, estado)]),
    ) as Record<EstadoPedido, ColumnDropState>;
  });

  protected readonly menuView = computed(() => {
    const state = this.menu();
    return state === null ? null : { ...state, menu: moveMenu(state.pedido) };
  });

  protected readonly cancelView = computed(() => {
    const target = this.cancelTarget();
    return target === null ? null : cancelCopy(target);
  });

  /** Only the dragged order's own column and the columns the contract allows accept the drop. */
  protected readonly canEnter = (
    drag: CdkDrag<PedidoListado>,
    drop: CdkDropList<EstadoPedido>,
  ): boolean => drag.data.estado === drop.data || canDrop(drag.data, drop.data);

  constructor() {
    // switchMap drops the previous in-flight load, so a slow answer can never overwrite a newer one.
    this.requests$
      .pipe(
        switchMap(
          (request): Observable<Outcome> =>
            this.fetch(new Date()).pipe(
              map((board): Outcome => ({ ok: true, board })),
              catchError((error: unknown) =>
                of<Outcome>({ ok: false, error, sameView: request.sameView }),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.settle(outcome));

    // Minutes on the cards advance without a request.
    const timer = setInterval(() => this.now.set(new Date()), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    this.reload();
  }

  /** Reloads the board without blanking it (the page's "Actualizar"). */
  reload(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.requests$.next({ sameView: this.board() !== null });
  }

  protected chipIcon(filtro: TipoFiltro): IconName | null {
    return filtro === 'TODOS' ? null : tipoIcon(filtro);
  }

  protected dot(variant: BadgeVariant): string {
    return DOT[variant];
  }

  protected hint(estado: EstadoPedido, state: ColumnDropState): string {
    return closedColumnHint(estado, state);
  }

  protected menuIcon(item: MoveMenuItem): IconName {
    return item.allowed ? MENU_ICON[item.direction] : 'lock';
  }

  protected itemClass(item: MoveMenuItem): string {
    if (!item.allowed) {
      return 'cursor-not-allowed text-subtle';
    }
    if (item.direction === 'cancel') {
      return 'text-danger hover:bg-danger-soft focus-visible:bg-danger-soft';
    }
    return item.next
      ? 'bg-ok-soft hover:bg-ok-soft'
      : 'hover:bg-surface focus-visible:bg-surface';
  }

  /** Look of a column: neutral at rest, highlighted when it accepts the dragged order, locked when it refuses it. */
  protected zoneClass(estado: EstadoPedido, state: ColumnDropState): string {
    switch (state.kind) {
      case 'allowed':
        return estado === 'CANCELADO'
          ? 'border-danger bg-danger-soft ring-2 ring-danger'
          : 'border-ok bg-ok-soft ring-2 ring-ok';
      case 'locked':
        return 'border-dashed border-line bg-surface text-subtle';
      default:
        return 'border-transparent bg-neutral-soft';
    }
  }

  // -------------------------------------------------------------------------------------------- moves

  protected onDragStarted(event: CdkDragStart<PedidoListado>): void {
    this.closeMenu();
    this.dragging.set(event.source.data);
  }

  // `any`: the column lists are typed per template (BoardColumn / EstadoPedido) and the event type is invariant.
  protected onDrop(event: CdkDragDrop<any, any, PedidoListado>): void {
    this.dragging.set(null);
    if (event.previousContainer === event.container) {
      return;
    }
    this.requestMove(event.item.data, event.container.data as EstadoPedido);
  }

  protected onPrimary(pedido: PedidoListado): void {
    const target = cardView(pedido, this.now()).primary?.estado;
    if (target !== undefined) {
      this.requestMove(pedido, target);
    }
  }

  protected chooseMove(pedido: PedidoListado, item: MoveMenuItem): void {
    if (!item.allowed) {
      return;
    }
    this.closeMenu();
    this.requestMove(pedido, item.estado);
  }

  protected dismissCancel(): void {
    this.cancelTarget.set(null);
  }

  protected confirmCancel(): void {
    const target = this.cancelTarget();
    this.cancelTarget.set(null);
    if (target !== null) {
      this.move(target, 'CANCELADO');
    }
  }

  /** Cancelling asks for confirmation (like the list); any other move goes straight to the API. */
  private requestMove(pedido: PedidoListado, target: EstadoPedido): void {
    if (this.isBusy(pedido.pedidoId) || !canDrop(pedido, target)) {
      return;
    }
    if (target === 'CANCELADO') {
      this.cancelTarget.set(pedido);
      return;
    }
    this.move(pedido, target);
  }

  private move(pedido: PedidoListado, target: EstadoPedido): void {
    if (this.isBusy(pedido.pedidoId) || !canDrop(pedido, target)) {
      return;
    }
    const request = moveRequest(pedido, target);
    this.run(
      pedido.pedidoId,
      request.kind === 'confirmar'
        ? this.api.confirmar(pedido.pedidoId)
        : this.api.cambiarEstado(pedido.pedidoId, request.estado),
      moveSuccessMessage(pedido, target),
    );
  }

  // --------------------------------------------------------------------------------------------- menu

  protected openMenu(pedido: PedidoListado, event: Event): void {
    const trigger = event.currentTarget as HTMLElement;
    const items = moveMenu(pedido).items;
    const view = this.document.defaultView;
    const position = menuPlacement(
      trigger.getBoundingClientRect(),
      { width: MENU_WIDTH, height: MENU_HEADING_HEIGHT + MENU_ITEM_HEIGHT * items.length },
      { width: view?.innerWidth ?? 1024, height: view?.innerHeight ?? 768 },
    );
    this.menu.set({ pedido, ...position, trigger });
    afterNextRender(() => this.focusItem(nextEnabledIndex(items, -1, 1)), { injector: this.injector });
  }

  /** Mobile browsers fire `resize` on every URL-bar change; the menu only closes when the width really changed. */
  protected onResize(): void {
    const width = this.document.defaultView?.innerWidth ?? this.lastWidth;
    const close = shouldCloseOnResize(this.lastWidth, width);
    this.lastWidth = width;
    if (close) {
      this.closeMenu();
    }
  }

  protected closeMenu(restoreFocus = false): void {
    const state = this.menu();
    if (state === null) {
      return;
    }
    this.menu.set(null);
    if (restoreFocus) {
      state.trigger.focus();
    }
  }

  protected onMenuKey(event: KeyboardEvent, menu: MoveMenu): void {
    const current = this.menuItems().findIndex((item) => item.nativeElement === this.document.activeElement);
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = nextEnabledIndex(menu.items, current, 1);
        break;
      case 'ArrowUp':
        next = nextEnabledIndex(menu.items, current, -1);
        break;
      case 'Home':
        next = nextEnabledIndex(menu.items, -1, 1);
        break;
      case 'End':
        next = nextEnabledIndex(menu.items, -1, -1);
        break;
      case 'Tab':
        // Leaves the menu: focus continues from the page.
        this.closeMenu();
        return;
    }
    if (next !== null) {
      event.preventDefault();
      this.focusItem(next);
    }
  }

  private focusItem(index: number): void {
    this.menuItems()[index]?.nativeElement.focus();
  }

  // -------------------------------------------------------------------------------------------- loading

  private fetch(now: Date): Observable<BoardData> {
    return forkJoin([
      forkJoin(BOARD_COLUMNS.map((column) => this.api.listar(columnQuery(column)))),
      this.api.listar(closedCountQuery('ENTREGADO', now)),
      this.api.listar(closedCountQuery('CANCELADO', now)),
    ]).pipe(
      map(([columns, entregados, cancelados]) => ({
        pedidos: columns.flatMap((page) => page.content),
        entregados: entregados.totalElements,
        cancelados: cancelados.totalElements,
      })),
    );
  }

  private settle(outcome: Outcome): void {
    this.releaseReloaded();
    this.closeMenu();
    this.loading.set(false);
    if (!outcome.ok) {
      const hadData = this.board() !== null;
      if (failedLoadView({ hadData, sameView: outcome.sameView }) === 'keep-rows') {
        // A failed reload keeps the board on screen; the toast reports the error.
        this.fail(outcome.error);
      } else {
        this.board.set(null);
        this.failed.set(true);
        this.errorMessage.set(this.messageOf(outcome.error));
      }
      return;
    }
    this.board.set(outcome.board);
    this.now.set(new Date());
  }

  /**
   * Runs one move. The card stays locked (spinner) until the request answers and, when it was applied, until the
   * reload it triggers answers too: releasing it earlier would show the old column as clickable.
   */
  private run(pedidoId: number, request: Observable<Pedido>, successMessage: string): void {
    this.setInFlight(pedidoId, true);
    request.pipe(takeUntilDestroyed(this.injector.get(DestroyRef))).subscribe({
      next: () => {
        // Order matters: hand the lock over to awaitingReload before releasing the in-flight one.
        this.holdUntilReload(pedidoId);
        this.setInFlight(pedidoId, false);
        // Reload before the toast: nothing that builds the message may skip the reload that releases the lock.
        this.reload();
        this.toasts.show('OK', successMessage, 'success');
      },
      error: (error: unknown) => {
        // A 4xx most likely means the card is stale: show the message and reload so the board converges.
        const reload = error instanceof HttpErrorResponse && shouldReloadAfterRejection(error.status);
        if (reload) {
          this.holdUntilReload(pedidoId);
        }
        this.setInFlight(pedidoId, false);
        if (reload) {
          this.reload();
        }
        this.fail(error);
      },
    });
  }

  private isBusy(pedidoId: number): boolean {
    return isRowBusy(pedidoId, this.inFlight(), this.awaitingReload());
  }

  private holdUntilReload(pedidoId: number): void {
    this.awaitingReload.update((set) => new Set(set).add(pedidoId));
  }

  /** The latest board request answered (switchMap keeps only the newest), so every applied card is up to date. */
  private releaseReloaded(): void {
    if (this.awaitingReload().size > 0) {
      this.awaitingReload.set(new Set());
    }
  }

  private setInFlight(pedidoId: number, on: boolean): void {
    this.inFlight.update((set) => {
      const next = new Set(set);
      if (on) {
        next.add(pedidoId);
      } else {
        next.delete(pedidoId);
      }
      return next;
    });
  }

  /** The backend `message` as-is (400 messages already come in Spanish). */
  private messageOf(error: unknown): string {
    return error instanceof HttpErrorResponse
      ? (readApiError(error.error)?.message ?? 'No se pudo completar la operación')
      : 'No se pudo completar la operación';
  }

  private fail(error: unknown): void {
    this.toasts.show(error instanceof HttpErrorResponse ? error.status : 'Error', this.messageOf(error));
  }
}
