import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PedidosApi } from '../pedidos/data/pedidos.api';
import { formatMoney, formatOrderNumber, shouldReloadAfterRejection } from '../pedidos/domain/pedidos.rules';
import { PedidoListado } from '../pedidos/pedidos.types';
import { PagosApi } from './data/pagos.api';
import {
  CobroDraft,
  CobroErrors,
  CobroField,
  METODOS_PAGO,
  PAGO_ERROR,
  cobroHeading,
  emptyCobroDraft,
  pagoRegistradoMessage,
  pagoRejection,
  parseMonto,
  parsePedidoParam,
  porCobrarCard,
  porCobrarHeading,
  quickAmounts,
  reconcilePaid,
  referenciaHint,
  rejectionKey,
  submitLabel,
  toRegistrarPagoRequest,
  ultimoPagoLabel,
  validateCobro,
  vueltoPreview,
} from './domain/caja.rules';
import { MetodoPago } from './pagos.types';

const DEFAULT_ERROR = 'Revisa tu conexión e inténtalo de nuevo.';
/** Largest page the backend accepts: the cashier works from one screenful. */
const LIST_SIZE = 100;

/** Text colour of the estado line on each card, by badge variant (full class names so Tailwind keeps them). */
const ESTADO_TEXT: Readonly<Record<BadgeVariant, string>> = {
  ok: 'text-ok',
  info: 'text-info',
  warn: 'text-warn',
  flow: 'text-flow',
  danger: 'text-danger',
  neutral: 'text-muted',
};

interface Rejection {
  sent: string;
  message: string;
}

/**
 * The cashier: orders waiting to be charged on the left, the charge form of the selected one on the right.
 * Orchestration only: validation, the request body, quick amounts and every label live in `caja.rules`.
 * Field errors appear once the field has text or after the first submit attempt; a field the backend rejected shows
 * the backend message until that field changes. The form restarts (cash, empty) whenever the selected order changes.
 */
@Component({
  selector: 'app-caja',
  imports: [ButtonComponent, IconComponent, StatePanelComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-screen bg-surface p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Caja</h1>
          <p class="mt-1 text-sm text-muted">Cobra los pedidos pendientes de pago</p>
        </div>
        <button
          appButton
          type="button"
          variant="secondary"
          [disabled]="pedidos() === null || refreshing()"
          (click)="refresh()"
        >
          <app-icon name="refresh" [size]="18" [class.animate-spin]="refreshing()" />Actualizar
        </button>
      </header>

      <div class="mt-6">
        @if (failed()) {
          <app-state-panel class="!min-h-[24rem]" icon="alert" heading="No se pudo cargar la caja">
            {{ errorMessage() }}
            <button actions appButton type="button" variant="secondary" (click)="reload()">
              <app-icon name="refresh" [size]="18" />Reintentar
            </button>
          </app-state-panel>
        } @else if (pedidos() === null) {
          <div
            class="animate-pulse lg:flex lg:items-start lg:gap-6"
            aria-busy="true"
            aria-label="Cargando pedidos por cobrar"
          >
            <div class="space-y-2 lg:w-[26rem] lg:shrink-0">
              @for (n of skeletons; track n) {
                <div class="h-[4.5rem] rounded-card border border-line bg-card"></div>
              }
            </div>
            <div class="mt-4 h-[32rem] flex-1 rounded-card border border-line bg-card lg:mt-0"></div>
          </div>
        } @else if (pedidos()!.length === 0) {
          <app-state-panel class="!min-h-[24rem]" icon="wallet" heading="No hay pedidos por cobrar">
            Cuando un pedido quede pendiente de pago aparecerá aquí.
          </app-state-panel>
        } @else {
          <div class="lg:flex lg:items-start lg:gap-6">
            <div class="lg:w-[26rem] lg:shrink-0">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted" aria-live="polite">
                {{ heading() }}
              </p>
              <ul class="space-y-2" aria-label="Pedidos por cobrar">
                @for (card of cards(); track card.pedidoId) {
                  <li>
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-card border bg-card px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait"
                      [class]="
                        card.pedidoId === selectedId()
                          ? 'border-ink ring-1 ring-ink'
                          : 'border-line hover:bg-surface'
                      "
                      [attr.aria-pressed]="card.pedidoId === selectedId()"
                      [disabled]="submitting()"
                      (click)="select(card.pedidoId)"
                    >
                      <span
                        class="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-muted"
                      >
                        @if (card.icon; as icon) {
                          <app-icon [name]="icon" [size]="20" />
                        }
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-base font-medium">{{ card.numero }} · {{ card.titulo }}</span>
                        <span class="block text-sm" [class]="card.estadoClass">{{ card.estado }}</span>
                      </span>
                      <span class="whitespace-nowrap font-mono text-base font-semibold">{{ card.total }}</span>
                    </button>
                  </li>
                }
              </ul>
            </div>

            @if (selected(); as pedido) {
              <form
                novalidate
                class="mt-6 flex min-h-[32rem] min-w-0 flex-1 flex-col rounded-card border border-line bg-card lg:mt-0"
                [attr.aria-label]="cobroTitle()"
                (submit)="submit($event)"
              >
                <div class="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-6">
                  <div class="min-w-0">
                    <h2 class="text-sm text-muted">{{ cobroTitle() }}</h2>
                    @if (observacion(); as text) {
                      <p class="mt-1 text-base text-ink">{{ text }}</p>
                    }
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-muted">Total a cobrar</p>
                    <p class="font-mono text-4xl font-bold tracking-tight">{{ totalText() }}</p>
                  </div>
                </div>

                <div class="flex-1 space-y-6 px-6 py-6">
                  <div>
                    <p id="caja-metodo-label" class="mb-2 text-sm font-medium text-ink">Método de pago</p>
                    <div
                      class="grid gap-3 sm:grid-cols-3"
                      role="radiogroup"
                      aria-labelledby="caja-metodo-label"
                    >
                      @for (option of metodos; track option.metodo) {
                        <button
                          type="button"
                          role="radio"
                          class="flex items-center gap-2.5 rounded-control border px-4 py-3.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait"
                          [class]="
                            option.metodo === metodo()
                              ? 'border-brand bg-brand-soft text-brand'
                              : 'border-line bg-card text-ink hover:bg-surface'
                          "
                          [attr.aria-checked]="option.metodo === metodo()"
                          [attr.tabindex]="option.metodo === metodo() ? 0 : -1"
                          [disabled]="submitting()"
                          (click)="setMetodo(option.metodo)"
                          (keydown)="onMetodoKey($event, option.metodo)"
                        >
                          <app-icon [name]="option.icon" [size]="20" />{{ option.label }}
                        </button>
                      }
                    </div>
                    @if (messages().metodo; as message) {
                      <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" role="alert">
                        <app-icon name="alert" [size]="14" />{{ message }}
                      </p>
                    }
                  </div>

                  @if (esEfectivo()) {
                    <div class="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <app-text-field
                        label="Monto entregado"
                        name="montoEntregado"
                        autocomplete="off"
                        inputmode="decimal"
                        placeholder="S/ 0.00"
                        [mono]="true"
                        [disabled]="submitting()"
                        [error]="messages().montoEntregado ?? null"
                        [(value)]="montoEntregado"
                      />
                      @if (vuelto(); as change) {
                        <div
                          class="flex min-h-[2.875rem] items-center justify-between gap-3 rounded-control bg-ok-soft px-4 py-3 text-ok sm:mt-[1.625rem]"
                          role="status"
                        >
                          <span class="text-sm font-medium">Vuelto</span>
                          <span class="font-mono text-lg font-semibold">{{ change }}</span>
                        </div>
                      }
                    </div>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Montos rápidos">
                      @for (chip of chips(); track chip.label) {
                        <button
                          type="button"
                          class="rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait"
                          [class]="
                            chip.active
                              ? 'border-ink bg-ink text-white'
                              : 'border-line bg-neutral-soft text-ink hover:bg-line'
                          "
                          [attr.aria-pressed]="chip.active"
                          [disabled]="submitting()"
                          (click)="fillMonto(chip.monto)"
                        >
                          {{ chip.label }}
                        </button>
                      }
                    </div>
                  } @else {
                    <app-text-field
                      label="N.º de voucher u operación"
                      name="referencia"
                      autocomplete="off"
                      [hint]="referenciaHint"
                      [mono]="true"
                      [disabled]="submitting()"
                      [error]="messages().referencia ?? null"
                      [(value)]="referencia"
                    />
                  }
                </div>

                <footer
                  class="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-surface/60 px-6 py-4"
                >
                  <p class="flex min-w-0 items-center gap-2 text-sm text-muted">
                    @if (lastPago(); as text) {
                      <app-icon name="clock" [size]="16" />{{ text }}
                    }
                  </p>
                  <button
                    appButton
                    type="submit"
                    variant="primary"
                    [disabled]="!canSubmit()"
                  >
                    @if (submitting()) {
                      <app-icon name="spinner" [size]="18" class="animate-spin" />
                    } @else {
                      <app-icon name="check" [size]="18" />
                    }{{ submitText() }}
                  </button>
                </footer>
              </form>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class CajaPage {
  private readonly pedidosApi = inject(PedidosApi);
  private readonly pagosApi = inject(PagosApi);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest: Subscription | null = null;
  /** `?pedido=` as it arrived; consumed by the first successful load. */
  private requestedId = parsePedidoParam(this.route.snapshot.queryParamMap.get('pedido'));
  /** Orders charged in this page session; kept out of "Por cobrar" while the server still lists them. */
  private paidIds = new Set<number>();
  /** Last list as the server sent it, before the paid orders are hidden. */
  private server: { content: readonly PedidoListado[]; total: number } = { content: [], total: 0 };

  protected readonly metodos = METODOS_PAGO;
  protected readonly referenciaHint = referenciaHint;
  protected readonly skeletons = [1, 2, 3, 4] as const;

  protected readonly pedidos = signal<readonly PedidoListado[] | null>(null);
  private readonly totalElements = signal(0);
  protected readonly failed = signal(false);
  protected readonly errorMessage = signal(DEFAULT_ERROR);
  /** A reload over rows that are already on screen (Actualizar, after a payment or a rejection). */
  protected readonly refreshing = signal(false);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly lastPago = signal<string | null>(null);

  // The draft, one signal per field so the text fields can two-way bind their own.
  private readonly blank = emptyCobroDraft();
  protected readonly metodo = signal<MetodoPago | null>(this.blank.metodo);
  protected readonly montoEntregado = signal(this.blank.montoEntregado);
  protected readonly referencia = signal(this.blank.referencia);
  /** Set by the first submit attempt: from then on every validation error is visible. */
  private readonly attempted = signal(false);
  /** Fields the backend rejected, with the value that was sent: shown until that field changes. */
  private readonly rejected = signal<Partial<Record<CobroField, Rejection>>>({});

  protected readonly selected = computed(
    () => this.pedidos()?.find((p) => p.pedidoId === this.selectedId()) ?? null,
  );
  protected readonly heading = computed(() => porCobrarHeading(this.totalElements()));
  protected readonly cards = computed(() =>
    (this.pedidos() ?? []).map((p) => {
      const card = porCobrarCard(p);
      return { ...card, estadoClass: ESTADO_TEXT[card.estadoVariant] };
    }),
  );
  protected readonly cobroTitle = computed(() => {
    const pedido = this.selected();
    return pedido === null ? '' : cobroHeading(pedido);
  });
  protected readonly observacion = computed(() => this.selected()?.observacion?.trim() || null);
  protected readonly totalText = computed(() => formatMoney(this.selected()?.total ?? 0));
  protected readonly submitText = computed(() => submitLabel(this.selected()?.total ?? 0));
  protected readonly esEfectivo = computed(() => this.metodo() === 'EFECTIVO');

  private readonly draft = computed<CobroDraft>(() => ({
    metodo: this.metodo(),
    montoEntregado: this.montoEntregado(),
    referencia: this.referencia(),
  }));
  private readonly validation = computed<CobroErrors>(() => {
    const pedido = this.selected();
    return pedido === null ? {} : validateCobro(this.draft(), pedido.total);
  });
  protected readonly canSubmit = computed(
    () =>
      this.selected() !== null &&
      !this.submitting() &&
      Object.keys(this.validation()).length === 0,
  );

  /** What each field shows: its validation error (once it has text or after a submit attempt), else a live backend rejection. */
  protected readonly messages = computed<CobroErrors>(() => {
    const draft = this.draft();
    const visible: CobroErrors = {};
    for (const [field, rejection] of Object.entries(this.rejected()) as [CobroField, Rejection][]) {
      if (rejectionKey(draft, field) === rejection.sent) {
        visible[field] = rejection.message;
      }
    }
    const touched = this.attempted();
    const validation = this.validation();
    for (const field of Object.keys(validation) as CobroField[]) {
      if (touched || rejectionKey(draft, field) !== '') {
        visible[field] = validation[field];
      }
    }
    return visible;
  });

  private readonly entregado = computed(() => parseMonto(this.montoEntregado()));
  protected readonly vuelto = computed(() => {
    const pedido = this.selected();
    if (pedido === null) {
      return null;
    }
    const change = vueltoPreview(pedido.total, this.entregado());
    return change === null ? null : formatMoney(change);
  });
  protected readonly chips = computed(() => {
    const pedido = this.selected();
    if (pedido === null) {
      return [];
    }
    const entregado = this.entregado();
    return quickAmounts(pedido.total).map((chip) => ({
      ...chip,
      active: entregado !== null && Math.round(entregado * 100) === Math.round(chip.monto * 100),
    }));
  });

  constructor() {
    this.reload();
  }

  /** Loads the list behind the skeleton (first load and "Reintentar"). */
  protected reload(): void {
    this.pedidos.set(null);
    this.failed.set(false);
    this.fetch();
  }

  /** Reloads keeping the current rows on screen. */
  protected refresh(): void {
    this.fetch();
  }

  protected select(id: number): void {
    if (this.submitting()) {
      return;
    }
    this.setSelected(id);
  }

  protected setMetodo(metodo: MetodoPago): void {
    this.metodo.set(metodo);
  }

  /** Arrow keys move the checked method (and the focus) around the radiogroup, wrapping at the ends. */
  protected onMetodoKey(event: KeyboardEvent, from: MetodoPago): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const index = METODOS_PAGO.findIndex((o) => o.metodo === from);
    const next = (index + step + METODOS_PAGO.length) % METODOS_PAGO.length;
    this.metodo.set(METODOS_PAGO[next].metodo);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  protected fillMonto(monto: number): void {
    this.montoEntregado.set(monto.toFixed(2));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const pedido = this.selected();
    if (pedido === null || this.submitting()) {
      return;
    }
    this.attempted.set(true);
    const draft = this.draft();
    if (Object.keys(validateCobro(draft, pedido.total)).length > 0) {
      return;
    }
    this.submitting.set(true);
    this.pagosApi
      .registrar(toRegistrarPagoRequest(pedido.pedidoId, draft, pedido.total))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pago) => {
          this.submitting.set(false);
          this.toasts.show('OK', pagoRegistradoMessage(pago, pedido), 'success');
          this.lastPago.set(ultimoPagoLabel(pago, pedido));
          // The order leaves the list right away (and the next card is selected) and stays out of every later
          // response, stale or not, until the server stops listing it; the reload confirms it.
          this.paidIds.add(pedido.pedidoId);
          this.applyServerList(this.server.content, this.server.total);
          this.fetch();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.fail(error, draft);
        },
      });
  }

  /**
   * `pagoRejection` decides where the backend message goes: under a visible field and/or in a toast, so no rejection
   * is silent. A 4xx also reloads: the order may be gone (the toast outlives that reload).
   */
  private fail(error: unknown, draft: CobroDraft): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toasts.show('Error', PAGO_ERROR);
      return;
    }
    const { fields, toast } = pagoRejection(error.status, readApiError(error.error)?.message ?? null, draft.metodo);
    const rejected: Partial<Record<CobroField, Rejection>> = {};
    for (const [field, message] of Object.entries(fields) as [CobroField, string][]) {
      rejected[field] = { sent: rejectionKey(draft, field), message };
    }
    this.rejected.set(rejected);
    if (toast !== null) {
      this.toasts.show(error.status, toast);
    }
    if (shouldReloadAfterRejection(error.status)) {
      this.fetch();
    }
  }

  /** Requests the list; a newer request drops the one in flight. A failure shows the error panel only when there are no rows to keep. */
  private fetch(): void {
    this.loadRequest?.unsubscribe();
    const keepingRows = this.pedidos() !== null;
    this.refreshing.set(keepingRows);
    this.loadRequest = this.pedidosApi
      .listar({ porCobrar: true, page: 0, size: LIST_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.refreshing.set(false);
          this.applyServerList(page.content, page.totalElements);
        },
        error: (error: unknown) => {
          this.refreshing.set(false);
          const message =
            (error instanceof HttpErrorResponse ? readApiError(error.error)?.message : undefined) ??
            DEFAULT_ERROR;
          if (this.pedidos() === null) {
            this.errorMessage.set(message);
            this.failed.set(true);
          } else {
            this.toasts.show(error instanceof HttpErrorResponse ? error.status : 'Error', message);
          }
        },
      });
  }

  /** Keeps the last server answer and shows it without the orders already charged in this session (`reconcilePaid`). */
  private applyServerList(content: readonly PedidoListado[], total: number): void {
    this.server = { content, total };
    const view = reconcilePaid(content, total, this.paidIds);
    this.paidIds = view.paid;
    this.applyList(view.rows, view.total);
  }

  /**
   * Shows the list and picks the selection: the `?pedido=` order on the first load, else the current one while it is
   * still listed, else the card that took its place (or the first one).
   */
  private applyList(list: readonly PedidoListado[], total: number): void {
    const previous = this.pedidos();
    const previousIndex = previous?.findIndex((p) => p.pedidoId === this.selectedId()) ?? -1;
    this.pedidos.set(list);
    this.totalElements.set(total);

    const requested = this.requestedId;
    this.requestedId = null;
    let next: number | null;
    if (requested !== null && list.some((p) => p.pedidoId === requested)) {
      next = requested;
    } else if (list.some((p) => p.pedidoId === this.selectedId())) {
      next = this.selectedId();
    } else {
      next = list.length === 0 ? null : list[Math.min(Math.max(previousIndex, 0), list.length - 1)].pedidoId;
      if (requested !== null) {
        this.toasts.show('Aviso', `El pedido ${formatOrderNumber(requested)} ya no está por cobrar`, 'info');
      }
    }
    this.setSelected(next);
  }

  /** Changes the selected order: the form restarts and `?pedido=` follows (replacing the history entry). */
  private setSelected(id: number | null): void {
    if (id !== this.selectedId()) {
      this.selectedId.set(id);
      const blank = emptyCobroDraft();
      this.metodo.set(blank.metodo);
      this.montoEntregado.set(blank.montoEntregado);
      this.referencia.set(blank.referencia);
      this.attempted.set(false);
      this.rejected.set({});
    }
    const current = parsePedidoParam(this.route.snapshot.queryParamMap.get('pedido'));
    if (current !== id) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { pedido: id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }
}
