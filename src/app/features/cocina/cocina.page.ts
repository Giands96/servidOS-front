import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, forkJoin, switchMap, timer } from 'rxjs';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { CocinaEvent, ColaPedido, TipoPedido } from './cocina.types';
import { CocinaLive, LiveStatus } from './data/cocina-live';
import { CocinaApi } from './data/cocina.api';
import {
  Urgency,
  applyKitchenEvent,
  elapsedMinutes,
  formatClock,
  formatOrderNumber,
  minutesSince,
  queueSummary,
  sortByArrival,
  sortListos,
  tipoLabel,
  urgencyOf,
} from './domain/cocina.rules';

/** Re-evaluates the elapsed-minutes timers; minute resolution does not need a faster tick. */
const TICK_MS = 30_000;

const TIPO_ICON: Record<TipoPedido, IconName> = {
  MESA: 'utensils',
  DELIVERY: 'bike',
  RECOJO: 'bag',
};

const CARD_BORDER: Record<Urgency, string> = {
  'en-tiempo': 'border-line',
  atencion: 'border-warn',
  critico: 'border-danger',
};

const TIMER_CHIP: Record<Urgency, string> = {
  'en-tiempo': 'bg-neutral-soft text-neutral',
  atencion: 'bg-warn-soft text-warn',
  critico: 'bg-danger-soft text-danger',
};

const DOT: Record<LiveStatus, string> = {
  connected: 'bg-ok',
  connecting: 'bg-subtle',
  disconnected: 'bg-danger',
};

interface CardView {
  order: ColaPedido;
  number: string;
  tipo: string;
  icon: IconName;
  minutes: number;
  border: string;
  chip: string;
  marking: boolean;
}

/** Kitchen board: orders in preparation by arrival, "Listos para salir" panel, live updates over STOMP. */
@Component({
  selector: 'app-cocina',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:fullscreenchange)': 'syncFullscreen()' },
  template: `
    <section #board class="min-h-screen bg-surface p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Cocina</h1>
          <p class="mt-1 text-sm text-muted">Cola por orden de llegada · {{ summary() }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <p
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs"
            [class]="
              status() === 'disconnected'
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-card text-muted'
            "
            role="status"
          >
            <span class="size-2 rounded-full" [class]="dot()"></span>{{ pill() }}
          </p>
          @if (fullscreenSupported) {
            <button
              appButton
              type="button"
              variant="secondary"
              [attr.aria-pressed]="fullscreen()"
              (click)="toggleFullscreen()"
            >
              <app-icon name="expand" [size]="18" />Pantalla completa
            </button>
          }
        </div>
      </header>

      <div class="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        @if (loading()) {
          <div
            class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-busy="true"
            aria-label="Cargando pedidos"
          >
            @for (n of skeletons; track n) {
              <div class="min-h-80 animate-pulse rounded-card border-2 border-line bg-card p-4">
                <div class="h-7 w-24 rounded-full bg-neutral-soft"></div>
                <div class="mt-3 h-4 w-16 rounded-full bg-neutral-soft"></div>
                <div class="mt-6 h-4 w-3/4 rounded-full bg-neutral-soft"></div>
                <div class="mt-3 h-4 w-1/2 rounded-full bg-neutral-soft"></div>
              </div>
            }
          </div>
        } @else if (cards().length === 0) {
          <div
            class="flex min-h-80 flex-col items-center justify-center rounded-card border border-line bg-card px-6 py-10 text-center"
          >
            <span
              class="flex size-16 items-center justify-center rounded-modal border border-line bg-surface text-muted"
            >
              <app-icon name="flame" [size]="28" />
            </span>
            <h2 class="mt-5 text-xl font-bold tracking-tight">No hay pedidos en preparación</h2>
            <p class="mt-2 max-w-sm text-sm text-muted">
              Los pedidos confirmados aparecerán aquí por orden de llegada.
            </p>
          </div>
        } @else {
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (card of cards(); track card.order.pedidoId) {
              <article
                class="flex min-h-80 flex-col rounded-card border-2 bg-card p-4"
                [class]="card.border"
              >
                <div class="flex items-start justify-between gap-2">
                  <h2 class="font-mono text-2xl font-bold">{{ card.number }}</h2>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-sm font-semibold"
                    [class]="card.chip"
                  >
                    <app-icon name="timer" [size]="16" />{{ card.minutes }} min
                  </span>
                </div>
                <p class="mt-1 flex items-center gap-2 text-sm text-muted">
                  <app-icon [name]="card.icon" [size]="16" />{{ card.tipo }}
                </p>

                <ul class="mt-4 flex flex-col gap-3">
                  @for (item of card.order.items; track item.detalleId) {
                    <li class="flex gap-3">
                      <span class="w-4 shrink-0 font-semibold text-brand">{{ item.cantidad }}</span>
                      <div>
                        <p class="font-medium text-ink">{{ item.nombreProducto }}</p>
                        @if (item.observacion) {
                          <p class="text-sm text-warn">{{ item.observacion }}</p>
                        }
                      </div>
                    </li>
                  }
                </ul>

                @if (card.order.observacion) {
                  <p
                    class="mt-4 flex items-start gap-2 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn"
                  >
                    <app-icon name="triangleAlert" [size]="16" class="mt-0.5" />{{
                      card.order.observacion
                    }}
                  </p>
                }

                <button
                  type="button"
                  class="mt-auto flex w-full items-center justify-center gap-2 rounded-control px-4 py-3.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed"
                  [class]="card.marking ? 'bg-ok' : 'bg-ink hover:bg-ink-soft'"
                  [disabled]="card.marking"
                  (click)="markListo(card.order.pedidoId)"
                >
                  @if (card.marking) {
                    <app-icon name="spinner" [size]="18" class="animate-spin" />Marcando…
                  } @else {
                    <app-icon name="check" [size]="18" />Marcar listo
                  }
                </button>
              </article>
            }
          </div>
        }

        <aside
          class="flex min-h-80 flex-col rounded-card border border-line bg-card p-4 xl:min-h-[calc(100vh-10rem)]"
        >
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 text-base font-bold">
              <app-icon name="checkCircle" [size]="20" class="text-ok" />Listos para salir
            </h2>
            <span
              class="rounded-full bg-ok-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-ok"
              >{{ ready().length }}</span
            >
          </div>
          <ul class="mt-4 flex flex-col gap-3">
            @for (row of ready(); track row.id) {
              <li class="flex items-center justify-between gap-3 rounded-card bg-ok-soft px-4 py-3">
                <div>
                  <p class="font-mono text-base font-bold">{{ row.number }}</p>
                  <p class="text-sm text-muted">{{ row.tipo }}</p>
                </div>
                @if (row.ago) {
                  <p class="text-sm text-ok">{{ row.ago }}</p>
                }
              </li>
            }
          </ul>
          <p class="mt-auto pt-6 text-xs text-muted">
            Sale de la cola al marcarse LISTO. Sala y caja lo ven en Pedidos.
          </p>
        </aside>
      </div>
    </section>
  `,
})
export class CocinaPage {
  private readonly api = inject(CocinaApi);
  private readonly live = inject(CocinaLive);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);
  private readonly board = viewChild.required<ElementRef<HTMLElement>>('board');

  private readonly cola = signal<readonly ColaPedido[]>([]);
  private readonly listos = signal<readonly ColaPedido[]>([]);
  private readonly colaLoaded = signal(false);
  private readonly listosLoaded = signal(false);
  private readonly now = signal(new Date());
  private readonly lastSync = signal<Date | null>(null);
  /** Local epoch ms at which this session saw each order become LISTO; the backend sends no such timestamp. */
  private readonly listoAt = signal<Readonly<Record<number, number>>>({});
  private readonly marking = signal<ReadonlySet<number>>(new Set());
  private readonly reloadCola$ = new Subject<void>();
  private readonly reloadListos$ = new Subject<void>();

  protected readonly status = this.live.status;
  protected readonly fullscreen = signal(false);
  protected readonly fullscreenSupported = this.doc.fullscreenEnabled === true;
  protected readonly skeletons = [1, 2, 3] as const;

  protected readonly loading = computed(() => !(this.colaLoaded() && this.listosLoaded()));
  protected readonly summary = computed(() => queueSummary(this.cola().length));
  protected readonly dot = computed(() => DOT[this.status()]);
  protected readonly pill = computed(() => {
    switch (this.status()) {
      case 'connected': {
        const synced = this.lastSync();
        return synced ? `En vivo · ${formatClock(synced)}` : 'En vivo';
      }
      case 'disconnected':
        return 'Sin conexión · reintentando';
      case 'connecting':
        return 'Conectando…';
    }
  });

  protected readonly cards = computed<CardView[]>(() => {
    const now = this.now();
    const marking = this.marking();
    return sortByArrival(this.cola()).map((order) => {
      const minutes = elapsedMinutes(order.createdAt, now);
      const urgency = urgencyOf(minutes);
      return {
        order,
        number: formatOrderNumber(order.pedidoId),
        tipo: tipoLabel(order),
        icon: TIPO_ICON[order.tipoPedido],
        minutes,
        border: CARD_BORDER[urgency],
        chip: TIMER_CHIP[urgency],
        marking: marking.has(order.pedidoId),
      };
    });
  });

  protected readonly ready = computed(() => {
    const now = this.now();
    const listoAt = this.listoAt();
    return sortListos(this.listos(), listoAt).map((order) => {
      const at = listoAt[order.pedidoId];
      return {
        id: order.pedidoId,
        number: formatOrderNumber(order.pedidoId),
        tipo: tipoLabel(order),
        ago: at === undefined ? null : `hace ${minutesSince(at, now)} min`,
      };
    });
  });

  constructor() {
    this.reloadCola$
      .pipe(
        switchMap(() => this.api.cola().pipe(catchError((e: unknown) => this.fail(e)))),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.setCola(list));
    this.reloadListos$
      .pipe(
        switchMap(() => this.api.listos().pipe(catchError((e: unknown) => this.fail(e)))),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.listos.set(list);
        this.listosLoaded.set(true);
      });

    this.live.connected$.pipe(takeUntilDestroyed()).subscribe(() => this.reloadAll());
    this.live.events$.pipe(takeUntilDestroyed()).subscribe((event) => this.apply(event));
    timer(TICK_MS, TICK_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(new Date()));

    // Initial HTTP load, so the board works even if the socket never connects.
    this.reloadAll();
    this.live.start();
    this.destroyRef.onDestroy(() => this.live.stop());
  }

  protected markListo(pedidoId: number): void {
    if (this.marking().has(pedidoId)) {
      return;
    }
    this.marking.update((set) => new Set(set).add(pedidoId));
    this.api
      .marcarListo(pedidoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.unmark(pedidoId);
          this.apply({ pedidoId, estadoAnterior: 'EN_PREPARACION', estadoNuevo: 'LISTO' });
        },
        error: (e: unknown) => {
          this.unmark(pedidoId);
          this.fail(e);
          this.reloadCola$.next();
        },
      });
  }

  protected toggleFullscreen(): void {
    if (this.doc.fullscreenElement) {
      void this.doc.exitFullscreen();
    } else {
      void this.board().nativeElement.requestFullscreen();
    }
  }

  protected syncFullscreen(): void {
    this.fullscreen.set(this.doc.fullscreenElement !== null);
  }

  private reloadAll(): void {
    this.reloadCola$.next();
    this.reloadListos$.next();
  }

  private setCola(list: readonly ColaPedido[]): void {
    this.cola.set(list);
    this.colaLoaded.set(true);
    this.now.set(new Date());
    this.lastSync.set(new Date());
  }

  private apply(event: CocinaEvent): void {
    const wasReady = this.listos().some((p) => p.pedidoId === event.pedidoId);
    const { board, refetch } = applyKitchenEvent(
      { cola: this.cola(), listos: this.listos() },
      event,
    );
    this.cola.set(board.cola);
    this.listos.set(board.listos);
    this.lastSync.set(new Date());
    if (event.estadoNuevo === 'LISTO' && !wasReady) {
      this.listoAt.update((times) => ({ ...times, [event.pedidoId]: Date.now() }));
    }
    if (refetch === 'cola') {
      this.reloadCola$.next();
    } else if (refetch === 'listos') {
      this.reloadListos$.next();
    }
  }

  private unmark(pedidoId: number): void {
    this.marking.update((set) => {
      const next = new Set(set);
      next.delete(pedidoId);
      return next;
    });
  }

  /** Shows the backend `message` as-is; also unblocks the skeleton so a failed first load is not a spinner forever. */
  private fail(error: unknown): typeof EMPTY {
    if (error instanceof HttpErrorResponse) {
      this.toasts.show(
        error.status,
        readApiError(error.error)?.message ?? 'No se pudo completar la operación',
      );
    } else {
      this.toasts.show('Error', 'No se pudo completar la operación');
    }
    this.colaLoaded.set(true);
    this.listosLoaded.set(true);
    return EMPTY;
  }
}
