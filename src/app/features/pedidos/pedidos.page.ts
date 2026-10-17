import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { can } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { Page } from '../../core/http/api.types';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PedidosApi } from './data/pedidos.api';
import {
  ESTADO_TABS,
  PedidoAction,
  cancelCopy,
  canCancel,
  cobrarLabel,
  emptyHeading,
  estadoLabel,
  estadoPagoLabel,
  estadoVariant,
  failedLoadView,
  formatCreatedAt,
  formatMoney,
  formatOrderNumber,
  fallbackPage,
  isCobrable,
  isRowBusy,
  observacionText,
  pagerView,
  primaryAction,
  shouldReloadAfterRejection,
  tipoIcon,
  tipoLabel,
  transitionMessage,
} from './domain/pedidos.rules';
import { Vista, parseVista } from './domain/tablero.rules';
import { TableroComponent } from './tablero.component';
import { EstadoPedido, Pedido, PedidoListado, PedidosQuery } from './pedidos.types';

const PAGE_SIZE = 20;

type Outcome =
  | { ok: true; page: Page<PedidoListado> }
  | { ok: false; error: unknown; sameView: boolean };

interface LoadRequest {
  estado: EstadoPedido | null;
  page: number;
  /** True for a reload of the view already on screen (same tab and page), false when the view itself changes. */
  sameView: boolean;
}

interface RowView {
  pedido: PedidoListado;
  number: string;
  time: string;
  tipo: string;
  icon: IconName | null;
  observacion: string;
  total: string;
  estado: string;
  variant: BadgeVariant;
  pago: string;
  /** Label of the "Cobrar" shortcut, or null when the row is not chargeable by this user. */
  cobrar: string | null;
  action: PedidoAction | null;
  cancelable: boolean;
  busy: boolean;
}

/** Orders list: estado tabs, paged rows (newest first) and the row actions the contract allows. Orchestration only. */
@Component({
  selector: 'app-pedidos',
  imports: [
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    ModalComponent,
    StatePanelComponent,
    TableroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-screen bg-surface p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-bold tracking-tight">Pedidos</h1>
        <div class="flex flex-wrap items-center gap-3">
          <button
            appButton
            type="button"
            variant="secondary"
            [disabled]="refreshing()"
            (click)="reloadActive()"
          >
            <app-icon name="refresh" [size]="18" [class.animate-spin]="refreshing()" />Actualizar
          </button>
          <div
            class="inline-flex rounded-control border border-line bg-neutral-soft p-0.5"
            role="group"
            aria-label="Vista de pedidos"
          >
            @for (option of vistas; track option.vista) {
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                [class]="
                  option.vista === vista()
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                "
                [attr.aria-pressed]="option.vista === vista()"
                (click)="selectVista(option.vista)"
              >
                <app-icon [name]="option.icon" [size]="16" />{{ option.label }}
              </button>
            }
          </div>
          <a appButton variant="primary" routerLink="/pedidos/nuevo">
            <app-icon name="plus" [size]="18" />Nuevo pedido
          </a>
        </div>
      </header>

      @if (vista() === 'tablero') {
        <app-tablero class="mt-6 block" />
      } @else {
      <nav class="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Filtrar por estado">
        @for (tab of tabs; track tab.label) {
          <button
            type="button"
            class="-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            [class]="
              tab.estado === estado()
                ? 'border-ink font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            "
            [attr.aria-current]="tab.estado === estado() ? 'true' : null"
            (click)="selectEstado(tab.estado)"
          >
            {{ tab.label }}
          </button>
        }
      </nav>

      <div class="mt-6">
        @if (failed()) {
          <app-state-panel
            class="!min-h-[24rem]"
            icon="alert"
            heading="No se pudieron cargar los pedidos"
          >
            Revisa tu conexión e inténtalo de nuevo.
            <button actions appButton type="button" variant="secondary" (click)="refresh()">
              <app-icon name="refresh" [size]="18" />Reintentar
            </button>
          </app-state-panel>
        } @else if (data() === null) {
          <div
            class="animate-pulse rounded-card border border-line bg-card p-4"
            aria-busy="true"
            aria-label="Cargando pedidos"
          >
            @for (n of skeletons; track n) {
              <div class="flex items-center gap-6 border-b border-line py-4 last:border-b-0">
                <div class="h-4 w-16 rounded-full bg-neutral-soft"></div>
                <div class="h-4 w-24 rounded-full bg-neutral-soft"></div>
                <div class="h-4 flex-1 rounded-full bg-neutral-soft"></div>
                <div class="h-6 w-28 rounded-full bg-neutral-soft"></div>
              </div>
            }
          </div>
        } @else if (rows().length === 0) {
          <app-state-panel class="!min-h-[24rem]" icon="inbox" [heading]="emptyText()">
            Cuando haya pedidos en esta vista aparecerán aquí.
          </app-state-panel>
        } @else {
          <div
            class="overflow-x-auto rounded-card border border-line bg-card transition-opacity"
            [class.opacity-60]="loading()"
            [attr.aria-busy]="loading()"
          >
            <table class="w-full min-w-[56rem] border-collapse text-left text-sm">
              <caption class="sr-only">
                Pedidos, del más reciente al más antiguo
              </caption>
              <thead>
                <tr class="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" class="px-4 py-3">Pedido</th>
                  <th scope="col" class="px-4 py-3">Hora</th>
                  <th scope="col" class="px-4 py-3">Tipo</th>
                  <th scope="col" class="px-4 py-3">Observación</th>
                  <th scope="col" class="px-4 py-3 text-right">Total</th>
                  <th scope="col" class="px-4 py-3">Estado</th>
                  <th scope="col" class="px-4 py-3">Pago</th>
                  <th scope="col" class="px-4 py-3"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.pedido.pedidoId) {
                  <tr class="border-b border-line last:border-b-0">
                    <th scope="row" class="px-4 py-3 font-mono font-bold">{{ row.number }}</th>
                    <td class="px-4 py-3 font-mono text-muted">{{ row.time }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-2">
                        @if (row.icon) {
                          <app-icon [name]="row.icon" [size]="16" class="text-muted" />
                        }{{ row.tipo }}
                      </span>
                    </td>
                    <td class="max-w-64 truncate px-4 py-3 text-muted" [attr.title]="row.observacion">
                      {{ row.observacion }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 text-right font-mono">{{ row.total }}</td>
                    <td class="px-4 py-3">
                      <app-badge [variant]="row.variant">{{ row.estado }}</app-badge>
                    </td>
                    <td class="px-4 py-3 text-muted">
                      @if (row.cobrar; as label) {
                        <a
                          routerLink="/caja"
                          [queryParams]="{ pedido: row.pedido.pedidoId }"
                          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-neutral-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <app-icon name="wallet" [size]="14" />{{ label }}
                        </a>
                      } @else {
                        {{ row.pago }}
                      }
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        @if (row.action; as action) {
                          <button
                            appButton
                            type="button"
                            variant="primary"
                            class="!px-3 !py-1.5"
                            [disabled]="row.busy"
                            (click)="advance(row.pedido)"
                          >
                            @if (row.busy) {
                              <app-icon name="spinner" [size]="16" class="animate-spin" />
                            }{{ action.label }}
                          </button>
                        }
                        @if (row.cancelable) {
                          <button
                            appButton
                            type="button"
                            variant="secondary"
                            class="!px-3 !py-1.5 !text-danger"
                            [disabled]="row.busy"
                            (click)="askCancel(row.pedido)"
                          >
                            Cancelar
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (pager(); as view) {
            @if (view.visible) {
              <div class="mt-4 flex items-center justify-end gap-3">
                <button
                  appButton
                  type="button"
                  variant="secondary"
                  [disabled]="!view.canPrev || loading()"
                  (click)="previousPage()"
                >
                  Anterior
                </button>
                <p class="text-sm text-muted" aria-live="polite">{{ view.text }}</p>
                <button
                  appButton
                  type="button"
                  variant="secondary"
                  [disabled]="!view.canNext || loading()"
                  (click)="nextPage()"
                >
                  Siguiente
                </button>
              </div>
            }
          }
        }
      </div>
      }

      @if (cancelView(); as copy) {
        <app-modal [heading]="copy.heading" tone="danger">
          <app-icon icon name="x" [size]="24" />
          {{ copy.message }}
          <button footer appButton type="button" variant="secondary" (click)="dismissCancel()">
            Volver
          </button>
          <button footer appButton type="button" variant="destructive" (click)="confirmCancel()">
            Cancelar pedido
          </button>
        </app-modal>
      }
    </section>
  `,
})
export class PedidosPage {
  private readonly api = inject(PedidosApi);
  private readonly toasts = inject(ToastService);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly requests$ = new Subject<LoadRequest>();
  private readonly tablero = viewChild(TableroComponent);
  private listRequested = false;

  private readonly pageIndex = signal(0);
  private readonly now = signal(new Date());
  private readonly inFlight = signal<ReadonlySet<number>>(new Set());
  /** Rows whose transition was applied and that wait for the list reload to show their new estado. */
  private readonly awaitingReload = signal<ReadonlySet<number>>(new Set());
  private readonly cancelTarget = signal<PedidoListado | null>(null);

  protected readonly vistas: readonly { vista: Vista; label: string; icon: IconName }[] = [
    { vista: 'tablero', label: 'Tablero', icon: 'columns' },
    { vista: 'lista', label: 'Lista', icon: 'list' },
  ];
  /** The view lives in the URL (`?vista=lista`), so it survives a reload and the back button. */
  protected readonly vista = toSignal(
    this.route.queryParamMap.pipe(map((params) => parseVista(params.get('vista')))),
    { initialValue: parseVista(this.route.snapshot.queryParamMap.get('vista')) },
  );
  protected readonly tabs = ESTADO_TABS;
  protected readonly skeletons = [1, 2, 3, 4, 5] as const;
  protected readonly estado = signal<EstadoPedido | null>(null);
  protected readonly data = signal<Page<PedidoListado> | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly emptyText = computed(() => emptyHeading(this.estado()));
  protected readonly pager = computed(() => {
    const page = this.data();
    return page === null ? null : pagerView(page);
  });
  /** "Actualizar" spins while the active view is loading. */
  protected readonly refreshing = computed(() =>
    this.vista() === 'tablero' ? (this.tablero()?.loading() ?? false) : this.loading(),
  );
  protected readonly cancelView = computed(() => {
    const target = this.cancelTarget();
    return target === null ? null : cancelCopy(target);
  });

  protected readonly rows = computed<RowView[]>(() => {
    const now = this.now();
    const inFlight = this.inFlight();
    const awaitingReload = this.awaitingReload();
    const mayCharge = can(this.session.user(), 'pagos.registrar');
    return (this.data()?.content ?? []).map((pedido) => ({
      pedido,
      number: formatOrderNumber(pedido.pedidoId),
      time: formatCreatedAt(pedido.createdAt, now),
      tipo: tipoLabel(pedido),
      icon: tipoIcon(pedido.tipoPedido),
      observacion: observacionText(pedido.observacion),
      total: formatMoney(pedido.total),
      estado: estadoLabel(pedido.estado),
      variant: estadoVariant(pedido.estado),
      pago: estadoPagoLabel(pedido.estadoPago),
      cobrar: mayCharge && isCobrable(pedido) ? cobrarLabel(pedido.total) : null,
      action: primaryAction(pedido),
      cancelable: canCancel(pedido),
      busy: isRowBusy(pedido.pedidoId, inFlight, awaitingReload),
    }));
  });

  constructor() {
    // switchMap drops the previous in-flight request, so a slow answer can never overwrite a newer one.
    this.requests$
      .pipe(
        switchMap(
          (request): Observable<Outcome> =>
            this.api.listar(this.toQuery(request)).pipe(
              map((page): Outcome => ({ ok: true, page })),
              catchError((error: unknown) =>
                of<Outcome>({ ok: false, error, sameView: request.sameView }),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.settle(outcome));

    // The list loads the first time it is shown (the board, the default view, does not need its request) and
    // refreshes, keeping its tab and page, every time the user comes back to it.
    effect(() => {
      if (this.vista() !== 'lista') {
        return;
      }
      untracked(() => {
        if (this.listRequested) {
          this.refresh();
        } else {
          this.listRequested = true;
          this.load(null, 0, true);
        }
      });
    });
  }

  protected selectVista(vista: Vista): void {
    if (vista !== this.vista()) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { vista: vista === 'lista' ? 'lista' : null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /** Reloads whichever view is on screen. */
  protected reloadActive(): void {
    if (this.vista() === 'tablero') {
      this.tablero()?.reload();
    } else {
      this.refresh();
    }
  }

  protected selectEstado(estado: EstadoPedido | null): void {
    if (estado === this.estado() && !this.failed()) {
      return;
    }
    this.load(estado, 0, true);
  }

  /** Reloads the current view (same tab and page) without blanking the rows. */
  protected refresh(): void {
    this.load(this.estado(), this.pageIndex(), false);
  }

  protected previousPage(): void {
    if (this.pager()?.canPrev) {
      this.load(this.estado(), this.pageIndex() - 1, true);
    }
  }

  protected nextPage(): void {
    if (this.pager()?.canNext) {
      this.load(this.estado(), this.pageIndex() + 1, true);
    }
  }

  protected advance(pedido: PedidoListado): void {
    const action = primaryAction(pedido);
    if (action === null || this.isBusy(pedido.pedidoId)) {
      return;
    }
    this.run(
      pedido.pedidoId,
      action.viaConfirmar
        ? this.api.confirmar(pedido.pedidoId)
        : this.api.cambiarEstado(pedido.pedidoId, action.estado),
    );
  }

  protected askCancel(pedido: PedidoListado): void {
    if (!this.isBusy(pedido.pedidoId)) {
      this.cancelTarget.set(pedido);
    }
  }

  protected dismissCancel(): void {
    this.cancelTarget.set(null);
  }

  protected confirmCancel(): void {
    const target = this.cancelTarget();
    this.cancelTarget.set(null);
    if (target === null || this.isBusy(target.pedidoId)) {
      return;
    }
    this.run(target.pedidoId, this.api.cambiarEstado(target.pedidoId, 'CANCELADO'));
  }

  /** `clear` blanks the rows (skeleton) when the view itself changes; a reload of the same view keeps them. */
  private load(estado: EstadoPedido | null, page: number, clear: boolean): void {
    this.estado.set(estado);
    this.pageIndex.set(page);
    if (clear) {
      this.data.set(null);
    }
    this.failed.set(false);
    this.loading.set(true);
    this.requests$.next({ estado, page, sameView: !clear });
  }

  private toQuery({ estado, page }: LoadRequest): PedidosQuery {
    return { page, size: PAGE_SIZE, ...(estado === null ? {} : { estado }) };
  }

  private settle(outcome: Outcome): void {
    if (!outcome.ok) {
      this.releaseReloaded();
      this.loading.set(false);
      const kept = this.data();
      if (failedLoadView({ hadData: kept !== null, sameView: outcome.sameView }) === 'keep-rows') {
        // A failed reload of the same view leaves the loaded rows visible; the toast reports the error.
        this.pageIndex.set(kept?.number ?? 0);
      } else {
        this.failed.set(true);
        this.data.set(null);
      }
      this.fail(outcome.error);
      return;
    }
    const fallback = fallbackPage(outcome.page);
    if (fallback !== null) {
      // The last row of the last page left this view: ask for the new last page instead of showing an empty one.
      this.load(this.estado(), fallback, false);
      return;
    }
    this.releaseReloaded();
    this.data.set(outcome.page);
    this.pageIndex.set(outcome.page.number);
    this.now.set(new Date());
    this.loading.set(false);
  }

  /**
   * Runs one row transition. The row stays locked until the transition answers and, when it was applied, until the
   * reload it triggers answers too: releasing it earlier would leave the old estado clickable for the whole reload.
   */
  private run(pedidoId: number, request: Observable<Pedido>): void {
    this.setInFlight(pedidoId, true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pedido) => {
        // Order matters: hand the lock over to awaitingReload before releasing the in-flight one.
        this.holdUntilReload(pedidoId);
        this.setInFlight(pedidoId, false);
        // Reload before the toast: nothing that builds the message may skip the reload that releases the lock.
        this.refresh();
        this.toasts.show('OK', transitionMessage(pedido.pedidoId, pedido.estado), 'success');
      },
      error: (error: unknown) => {
        // A 4xx most likely means the row is stale: show the message and reload so the list converges.
        const reload = error instanceof HttpErrorResponse && shouldReloadAfterRejection(error.status);
        if (reload) {
          this.holdUntilReload(pedidoId);
        }
        this.setInFlight(pedidoId, false);
        if (reload) {
          this.refresh();
        }
        this.fail(error);
      },
    });
  }

  private isBusy(pedidoId: number): boolean {
    return isRowBusy(pedidoId, this.inFlight(), this.awaitingReload());
  }

  /** Keeps the row locked until the next list answer (see `releaseReloaded`). */
  private holdUntilReload(pedidoId: number): void {
    this.awaitingReload.update((set) => new Set(set).add(pedidoId));
  }

  /** The latest list request answered (switchMap keeps only the newest), so every applied row is now up to date. */
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

  /** Shows the backend `message` as-is (400 messages already come in Spanish). */
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
