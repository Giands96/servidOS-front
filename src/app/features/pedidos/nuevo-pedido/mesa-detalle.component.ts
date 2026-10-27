import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CuentaMesa, PedidoCuenta } from '../../mesas/mesas.types';
import {
  AlertaTiempo,
  MesaCard,
  comensalesDetalleLabel,
  horaPedido,
  pedidosAbiertosLabel,
  seccionesCuenta,
} from '../domain/nuevo-pedido-local.rules';
import { estadoLabel, estadoVariant, formatMoney } from '../domain/pedidos.rules';

export type EstadoMesaDetalle = 'cargando' | 'listo' | 'error';

interface PedidoView {
  pedido: PedidoCuenta;
  /** "Ronda 2" for a MESA round; null for a takeaway. */
  titulo: string | null;
  hora: string;
  total: string;
  items: { nombre: string; cantidad: number; subtotal: string }[];
}

const CHIP_CLASS: Record<AlertaTiempo, string> = {
  normal: 'bg-neutral-soft text-neutral',
  atencion: 'bg-warn-soft text-warn',
  critica: 'bg-danger-soft text-danger',
};

/**
 * Bill of an occupied table, shown over the picker: a right side panel on `lg`, a bottom sheet below it.
 * Dumb: state in, events out. Escape and the backdrop close it; focus goes to the close button on open
 * and returns to the element that had it (the chosen table card) when the detail is destroyed.
 */
@Component({
  selector: 'app-mesa-detalle',
  imports: [BadgeComponent, ButtonComponent, IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" (click)="cerrar.emit()"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mesa-detalle-titulo"
      class="fixed inset-x-0 bottom-0 top-8 z-50 flex flex-col rounded-t-2xl border border-line bg-card shadow-xl lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[28rem] lg:rounded-none lg:border-y-0 lg:border-r-0"
    >
      <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line lg:hidden" aria-hidden="true"></div>

      <header class="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-3 lg:pt-5">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="mesa-detalle-titulo" class="text-2xl font-bold tracking-tight">
              Mesa {{ mesa().numero }}
            </h2>
            <span
              class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
            >
              <app-icon name="users" [size]="12" />Ocupada
            </span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
            @if (comensales(); as texto) {
              <span class="inline-flex items-center gap-1.5">
                <app-icon name="users" [size]="16" />{{ texto }}
              </span>
            }
            @if (mesa().minutosAbierta !== null) {
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
                [class]="chipClass()"
              >
                <app-icon name="timer" [size]="12" />{{ mesa().minutosAbierta }} min
              </span>
            }
          </div>
        </div>
        <button
          #cerrarBtn
          type="button"
          class="rounded-control p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Cerrar"
          (click)="cerrar.emit()"
        >
          <app-icon name="x" [size]="22" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        @if (estado() === 'cargando') {
          <div class="animate-pulse space-y-3" aria-busy="true" aria-label="Cargando la cuenta">
            <div class="h-4 w-32 rounded bg-neutral-soft"></div>
            @for (n of skeletons; track n) {
              <div class="h-32 rounded-card border border-line bg-card"></div>
            }
          </div>
        } @else if (estado() === 'error') {
          <div class="flex flex-col items-center gap-3 py-10 text-center" role="alert">
            <app-icon class="text-danger" name="alert" [size]="32" />
            <p class="font-medium">No pudimos cargar la cuenta</p>
            <p class="text-sm text-muted">
              {{ mensajeError() || 'Revisa tu conexión e inténtalo de nuevo.' }}
            </p>
            <button appButton type="button" variant="secondary" (click)="reintentar.emit()">
              <app-icon name="refresh" [size]="18" />Reintentar
            </button>
          </div>
        } @else if (cuenta() !== null) {
          @if (rondas().length === 0 && paraLlevar().length === 0) {
            <p class="py-6 text-center text-sm text-muted">
              Esta mesa no tiene pedidos pendientes de cobro.
            </p>
          } @else {
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">Pedidos abiertos</h3>
              <p class="text-xs text-muted">{{ cantidadLabel() }}</p>
            </div>
            @if (rondas().length > 0) {
              <ul class="mt-3 space-y-3">
                @for (ronda of rondas(); track ronda.pedido.pedidoId) {
                  <li class="rounded-card border border-line bg-card p-4">
                    <ng-container *ngTemplateOutlet="tarjeta; context: { $implicit: ronda }" />
                  </li>
                }
              </ul>
            }
            @if (paraLlevar().length > 0) {
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-muted"
                [class.mt-6]="rondas().length > 0"
              >
                Para llevar
              </h3>
              <ul class="mt-3 space-y-3">
                @for (llevar of paraLlevar(); track llevar.pedido.pedidoId) {
                  <li class="rounded-card border border-flow/40 bg-flow-soft/30 p-4">
                    <ng-container *ngTemplateOutlet="tarjeta; context: { $implicit: llevar }" />
                  </li>
                }
              </ul>
            }
          }
        }
      </div>

      <footer
        class="shrink-0 border-t border-line px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div class="flex items-baseline justify-between gap-3">
          <p class="text-sm text-muted">Total de la cuenta</p>
          <p class="whitespace-nowrap font-mono text-2xl font-bold" aria-live="polite">
            {{ totalCuenta() }}
          </p>
        </div>
        <!-- "Cobrar cuenta" stays hidden by product decision: charging a table bill belongs to Caja. -->
        @if (!soloLectura()) {
        <div class="mt-4 flex gap-3">
          <button appButton type="button" variant="secondary" (click)="nuevoParaLlevar.emit()">
            <app-icon name="bag" [size]="18" />Para llevar
          </button>
          <button
            appButton
            type="button"
            variant="primary"
            class="flex-1"
            (click)="agregarRonda.emit()"
          >
            <app-icon name="plus" [size]="18" />Agregar ronda
          </button>
        </div>
        }
      </footer>
    </div>

    <ng-template #tarjeta let-vista>
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-baseline gap-2">
          <p class="font-semibold">{{ vista.titulo ?? 'Para llevar' }}</p>
          <p class="font-mono text-xs text-muted">{{ vista.hora }}</p>
        </div>
        <app-badge [variant]="vista.variante">{{ vista.estado }}</app-badge>
      </div>
      @if (vista.titulo === null) {
        <p
          class="mt-2 inline-flex items-center gap-1 rounded-full bg-flow-soft px-2.5 py-1 text-xs font-semibold text-flow"
        >
          <app-icon name="bag" [size]="12" />Para llevar · Mesa {{ mesa().numero }}
        </p>
      }
      <ul class="mt-3 space-y-1.5 text-sm">
        @for (item of vista.items; track $index) {
          <li class="flex items-baseline justify-between gap-3">
            <span class="min-w-0">{{ item.cantidad }}× {{ item.nombre }}</span>
            <span class="whitespace-nowrap font-mono text-muted">{{ item.subtotal }}</span>
          </li>
        }
      </ul>
      <div class="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span class="text-sm text-muted">Total del pedido</span>
        <span class="whitespace-nowrap font-mono text-sm font-semibold">{{ vista.total }}</span>
      </div>
    </ng-template>
  `,
})
export class MesaDetalleComponent implements OnDestroy {
  readonly mesa = input.required<MesaCard>();
  readonly cuenta = input<CuentaMesa | null>(null);
  readonly estado = input<EstadoMesaDetalle>('cargando');
  /** Backend message shown under the error heading, when there is one. */
  readonly mensajeError = input('');
  /** Bill only (Mesas screen, "Ver cuenta"): hides "Para llevar" and "Agregar ronda". */
  readonly soloLectura = input(false);

  readonly cerrar = output<void>();
  readonly reintentar = output<void>();
  readonly agregarRonda = output<void>();
  /** Starts a takeaway billed with this table's account. */
  readonly nuevoParaLlevar = output<void>();

  protected readonly skeletons = [1, 2] as const;

  private readonly cerrarBtn = viewChild.required<ElementRef<HTMLButtonElement>>('cerrarBtn');
  /** Element that had focus when the detail opened (the chosen card); focus returns to it on close. */
  private readonly previousFocus =
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

  protected readonly comensales = computed(() => comensalesDetalleLabel(this.mesa()));
  protected readonly chipClass = computed(() => CHIP_CLASS[this.mesa().alerta ?? 'normal']);

  private readonly secciones = computed(() => {
    const cuenta = this.cuenta();
    return cuenta === null ? { rondas: [], paraLlevar: [] } : seccionesCuenta(cuenta);
  });

  protected readonly rondas = computed(() =>
    this.secciones().rondas.map((ronda) => vistaPedido(ronda.pedido, `Ronda ${ronda.numero}`)),
  );
  protected readonly paraLlevar = computed(() =>
    this.secciones().paraLlevar.map((pedido) => vistaPedido(pedido, null)),
  );
  protected readonly cantidadLabel = computed(() =>
    pedidosAbiertosLabel(this.rondas().length + this.paraLlevar().length),
  );
  protected readonly totalCuenta = computed(() => formatMoney(this.cuenta()?.total ?? 0));

  constructor() {
    afterNextRender(() => this.cerrarBtn().nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus?.();
  }
}

function vistaPedido(pedido: PedidoCuenta, titulo: string | null) {
  return {
    pedido,
    titulo,
    hora: horaPedido(pedido.createdAt),
    estado: estadoLabel(pedido.estado),
    variante: estadoVariant(pedido.estado),
    total: formatMoney(pedido.total),
    items: pedido.items.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      subtotal: formatMoney(item.subtotal),
    })),
  };
}
