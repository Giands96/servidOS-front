import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import {
  AlertaTiempo,
  FiltroMesas,
  MesaCard,
  conteoFiltros,
  filtrarMesas,
} from '../domain/nuevo-pedido-local.rules';
import { formatMoney } from '../domain/pedidos.rules';

export type EstadoMesaPicker = 'cargando' | 'listo' | 'error';

interface FiltroView {
  filtro: FiltroMesas;
  label: string;
  count: number;
}

interface MesaView {
  card: MesaCard;
  libre: boolean;
  consumido: string;
  chipClass: string;
  ariaLabel: string;
}

const FILTROS: readonly { filtro: FiltroMesas; label: string }[] = [
  { filtro: 'TODAS', label: 'Todas' },
  { filtro: 'LIBRES', label: 'Libres' },
  { filtro: 'OCUPADAS', label: 'Ocupadas' },
];

const CHIP_CLASS: Record<AlertaTiempo, string> = {
  normal: 'bg-white/10 text-white',
  atencion: 'bg-warn-soft text-warn',
  critica: 'bg-danger-soft text-danger',
};

const LEYENDA = [
  { label: '< 30 min', dot: 'bg-neutral' },
  { label: '30-60 min', dot: 'bg-warn' },
  { label: '> 60 min', dot: 'bg-danger' },
] as const;

/** Step 1 of the Local flow: filter bar, time legend and the grid of tables. Dumb: state in, events out. */
@Component({
  selector: 'app-mesa-picker',
  imports: [ButtonComponent, IconComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado() === 'error') {
      <app-state-panel class="!min-h-[24rem]" icon="alert" heading="No pudimos cargar las mesas">
        {{ mensajeError() || 'Revisa tu conexión e inténtalo de nuevo.' }}
        <button actions appButton type="button" variant="secondary" (click)="reintentar.emit()">
          <app-icon name="refresh" [size]="18" />Reintentar
        </button>
      </app-state-panel>
    } @else if (estado() === 'listo' && cards().length === 0) {
      <app-state-panel class="!min-h-[24rem]" icon="armchair" heading="Todavía no hay mesas creadas">
        Para tomar pedidos en Local, primero crea las mesas del salón. Mientras tanto puedes registrar
        el pedido como Delivery o Recojo.
        <button actions appButton type="button" variant="secondary" (click)="cambiarTipo.emit()">
          <app-icon name="arrowLeft" [size]="16" />Cambiar tipo de pedido
        </button>
      </app-state-panel>
    } @else {
      <div class="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="group" aria-label="Filtrar mesas" class="flex flex-wrap gap-2">
          @for (item of filtros(); track item.filtro) {
            <button
              type="button"
              class="rounded-control border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
              [class]="
                item.filtro === filtro()
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-card text-ink hover:bg-surface'
              "
              [attr.aria-pressed]="item.filtro === filtro()"
              [disabled]="cargando()"
              (click)="cambiarFiltro.emit(item.filtro)"
            >
              {{ item.label }} @if (!cargando()) {<span class="font-mono">{{ item.count }}</span>}
            </button>
          }
        </div>
        <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>Tiempo abierta</span>
          @for (item of leyenda; track item.label) {
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-full" [class]="item.dot" aria-hidden="true"></span>
              {{ item.label }}
            </span>
          }
        </p>
      </div>

      @if (cargando()) {
        <div
          class="mt-4 grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4"
          aria-busy="true"
          aria-label="Cargando las mesas"
        >
          @for (n of skeletons; track n) {
            <div class="h-36 rounded-card border border-line bg-card"></div>
          }
        </div>
      } @else if (vistas().length === 0) {
        <p class="mt-6 rounded-card border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
          No hay mesas {{ filtro() === 'LIBRES' ? 'libres' : 'ocupadas' }} ahora.
        </p>
      } @else {
        <ul
          class="mt-4 grid grid-cols-2 gap-4 p-1 lg:max-h-[calc(100dvh-16rem)] lg:grid-cols-4 lg:overflow-y-auto"
          aria-label="Mesas"
        >
          @for (vista of vistas(); track vista.card.mesaId) {
            <li>
              <button
                type="button"
                class="touch-lg flex h-full min-h-36 w-full flex-col gap-3 rounded-card border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                [class]="
                  vista.libre
                    ? 'border-line bg-card text-ink hover:border-brand'
                    : 'border-ink bg-ink text-white hover:border-brand'
                "
                [attr.aria-label]="vista.ariaLabel"
                (click)="elegir.emit(vista.card)"
              >
                <span class="flex items-start justify-between gap-2">
                  <span>
                    <span
                      class="block text-xs font-semibold uppercase tracking-wide"
                      [class]="vista.libre ? 'text-muted' : 'text-ink-muted'"
                    >
                      Mesa
                    </span>
                    <span class="block font-mono text-3xl font-bold leading-tight">
                      {{ vista.card.numero }}
                    </span>
                  </span>
                  @if (vista.libre) {
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"
                    >
                      <app-icon name="check" [size]="12" />Libre
                    </span>
                  } @else {
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
                    >
                      <app-icon name="users" [size]="12" />Ocupada
                    </span>
                  }
                </span>

                @if (vista.libre) {
                  <span class="mt-auto flex items-center justify-between gap-2 text-sm text-muted">
                    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <app-icon name="armchair" [size]="16" />Capacidad {{ vista.card.capacidad }}
                    </span>
                    <app-icon class="text-brand" name="arrowRight" [size]="18" />
                  </span>
                } @else {
                  <span class="flex items-center justify-between gap-2 text-sm">
                    <span class="inline-flex items-center gap-1.5 text-ink-muted">
                      <app-icon name="users" [size]="16" />{{ vista.card.ocupacion }}
                    </span>
                    @if (vista.card.minutosAbierta !== null) {
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
                        [class]="vista.chipClass"
                      >
                        <app-icon name="timer" [size]="12" />{{ vista.card.minutosAbierta }} min
                      </span>
                    }
                  </span>
                  <span class="mt-auto flex items-baseline justify-between gap-2 border-t border-ink-line pt-3">
                    <span class="text-xs text-ink-muted">Consumido</span>
                    <span class="whitespace-nowrap font-mono text-sm font-semibold">{{ vista.consumido }}</span>
                  </span>
                }
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class MesaPickerComponent {
  readonly cards = input.required<readonly MesaCard[]>();
  readonly filtro = input<FiltroMesas>('TODAS');
  readonly estado = input<EstadoMesaPicker>('cargando');
  /** Backend message shown under the error heading, when there is one. */
  readonly mensajeError = input('');

  readonly elegir = output<MesaCard>();
  readonly cambiarFiltro = output<FiltroMesas>();
  readonly reintentar = output<void>();
  readonly cambiarTipo = output<void>();

  protected readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  protected readonly leyenda = LEYENDA;

  protected readonly cargando = computed(() => this.estado() === 'cargando');

  protected readonly filtros = computed<FiltroView[]>(() => {
    const conteo = conteoFiltros(this.cards());
    return FILTROS.map((item) => ({ ...item, count: conteo[item.filtro] }));
  });

  protected readonly vistas = computed<MesaView[]>(() =>
    filtrarMesas(this.cards(), this.filtro()).map((card) => {
      const libre = card.estado === 'LIBRE';
      const consumido = card.consumido === null ? '' : formatMoney(card.consumido);
      return {
        card,
        libre,
        consumido,
        chipClass: CHIP_CLASS[card.alerta ?? 'normal'],
        ariaLabel: libre ? ariaLibre(card) : ariaOcupada(card, consumido),
      };
    }),
  );
}

function ariaLibre(card: MesaCard): string {
  return `Mesa ${card.numero}, libre, capacidad ${card.capacidad}`;
}

function ariaOcupada(card: MesaCard, consumido: string): string {
  const parts = [`Mesa ${card.numero}`, 'ocupada'];
  if (card.comensales !== null) {
    parts.push(`${card.comensales} de ${card.capacidad} comensales`);
  }
  if (card.minutosAbierta !== null) {
    parts.push(`${card.minutosAbierta} minutos`);
  }
  parts.push(`consumido ${consumido}`);
  return parts.join(', ');
}
