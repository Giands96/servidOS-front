import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { MesaCard, mesaCards } from '../pedidos/domain/nuevo-pedido-local.rules';
import { EstadoMesaDetalle, MesaDetalleComponent } from '../pedidos/nuevo-pedido/mesa-detalle.component';
import { RestauranteApi } from '../restaurante/data/restaurante.api';
import { CuentaMesaApi } from './data/cuenta-mesa.api';
import { MesasApi } from './data/mesas.api';
import {
  FiltroEstadoMesa,
  accionesMesa,
  actualizadoHace,
  conteoMesas,
  falloLiberar,
  filtrarPorEstado,
  mesasBlockedNotice,
  mesaGuardadaMessage,
  mesaLiberadaMessage,
  mesaOcupadaMessage,
  mesasPermisos,
  ocupacionLabel,
  upsertMesa,
} from './domain/mesas.rules';
import { MesaCardComponent } from './mesa-card.component';
import { MesaFormComponent } from './mesa-form.component';
import { OcuparMesaComponent } from './ocupar-mesa.component';
import { CuentaMesa, Mesa } from './mesas.types';

const DEFAULT_ERROR = 'Revisa tu conexión e inténtalo de nuevo.';

/** "Ver cuenta" (decision 3): the read-only bill of a table, reusing the Nuevo pedido detail panel. */
interface DetalleCuenta {
  mesa: Mesa;
  card: MesaCard;
  estado: EstadoMesaDetalle;
  cuenta: CuentaMesa | null;
  error: string;
}

type Liberar = { mesa: Mesa; fase: 'confirmar' } | { mesa: Mesa; fase: 'abiertos'; mensaje: string };

const FILTROS: readonly { filtro: FiltroEstadoMesa; label: string; icon: IconName }[] = [
  { filtro: 'TODAS', label: 'Todas', icon: 'grid' },
  { filtro: 'LIBRES', label: 'Libres', icon: 'checkCircle' },
  { filtro: 'OCUPADAS', label: 'Ocupadas', icon: 'users' },
];

/** The restaurant tables: active grid with filters and manual refresh, Orchestration only: the logic lives in mesas.rules. */
@Component({
  selector: 'app-mesas',
  imports: [
    ButtonComponent,
    IconComponent,
    MesaCardComponent,
    MesaDetalleComponent,
    MesaFormComponent,
    ModalComponent,
    OcuparMesaComponent,
    StatePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex-1 min-h-dvh bg-surface p-4 sm:p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Mesas</h1>
          <p class="mt-1 text-sm text-muted">{{ subtitle() }}</p>
        </div>
        @if (permisos().soloLectura) {
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-muted"
          >
            <app-icon name="lock" [size]="14" />Solo lectura
          </span>
        }
        @if (permisos().gestionar) {
          <button appButton type="button" variant="primary" (click)="form.set({ mesa: null })">
            <app-icon name="plus" [size]="18" />Nueva mesa
          </button>
        }
      </header>

      @if (permisos().bloqueado) {
        <p
          class="mt-4 flex items-start gap-2 rounded-control border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn"
          role="status"
        >
          <app-icon name="lock" [size]="16" class="mt-0.5" />{{ blockedNotice }}
        </p>
      }

      @if (failed()) {
        <app-state-panel class="mt-6 !min-h-[24rem]" icon="alert" heading="No pudimos cargar las mesas">
          {{ errorMessage() }}
          <button actions appButton type="button" variant="secondary" (click)="reload()">
            <app-icon name="refresh" [size]="18" />Reintentar
          </button>
        </app-state-panel>
      } @else if (activas()?.length === 0) {
        <app-state-panel class="mt-6 !min-h-[24rem]" icon="armchair" heading="Todavía no hay mesas creadas">
          {{
            permisos().gestionar
              ? 'Crea las mesas del salón para ocuparlas y tomar pedidos en Local.'
              : 'Cuando el administrador cree las mesas del salón, aparecerán acá.'
          }}
          <div actions class="empty:hidden">
            @if (permisos().gestionar) {
              <button appButton type="button" variant="primary" (click)="form.set({ mesa: null })">
                <app-icon name="plus" [size]="18" />Nueva mesa
              </button>
            }
          </div>
        </app-state-panel>
      } @else {
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filtrar mesas" class="inline-flex rounded-control bg-neutral-soft p-1">
            @for (item of filtros(); track item.filtro) {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                [class]="item.filtro === filtro() ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'"
                [attr.aria-pressed]="item.filtro === filtro()"
                [disabled]="activas() === null"
                (click)="filtro.set(item.filtro)"
              >
                <app-icon [name]="item.icon" [size]="14" />{{ item.label }}
                @if (item.count !== null) {
                  <span class="font-mono text-xs text-muted">{{ item.count }}</span>
                }
              </button>
            }
          </div>
          <div class="flex items-center gap-3">
            @if (actualizado()) {
              <span class="inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
                <app-icon name="clock" [size]="14" />{{ actualizado() }}
              </span>
            }
            <button appButton type="button" variant="secondary" [disabled]="refreshing()" (click)="refresh()">
              <app-icon [name]="refreshing() ? 'spinner' : 'refresh'" [size]="16" />Actualizar
            </button>
          </div>
        </div>

        @if (activas() === null) {
          <div
            class="mt-4 grid animate-pulse grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            aria-busy="true"
            aria-label="Cargando las mesas"
          >
            @for (n of skeletons; track n) {
              <div class="h-36 rounded-card border border-line bg-card"></div>
            }
          </div>
        } @else if (visibles().length === 0) {
          <p class="mt-6 rounded-card border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No hay mesas {{ filtro() === 'LIBRES' ? 'libres' : 'ocupadas' }} ahora.
          </p>
        } @else {
          <ul class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" aria-label="Mesas">
            @for (vista of visibles(); track vista.mesa.mesaId) {
              @let mesa = vista.mesa;
              <li>
                <app-mesa-card [mesa]="mesa" class="h-full">
                  <div actions class="mt-4 flex items-center gap-2 empty:hidden">
                    @if (vista.acciones.ocupar) {
                      <button appButton type="button" variant="primary" class="flex-1" (click)="ocupar.set(mesa)">
                        <app-icon name="users" [size]="16" />Ocupar
                      </button>
                    }
                    @if (vista.acciones.liberar) {
                      <button
                        appButton
                        type="button"
                        variant="secondary"
                        class="flex-1"
                        (click)="liberar.set({ mesa, fase: 'confirmar' })"
                      >
                        <app-icon name="logout" [size]="16" />Liberar
                      </button>
                    }
                    @if (vista.acciones.editar) {
                      <button
                        type="button"
                        class="inline-flex size-9 items-center justify-center rounded-control border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        [class]="mesa.estado === 'LIBRE' ? 'border-line text-ink hover:bg-surface' : 'border-ink-line text-white hover:bg-white/10'"
                        [attr.aria-label]="'Editar mesa ' + mesa.numero"
                        (click)="form.set({ mesa })"
                      >
                        <app-icon name="pencil" [size]="16" />
                      </button>
                    }
                  </div>
                </app-mesa-card>
              </li>
            }
          </ul>
        }
      }
      @if (ocupar(); as mesa) {
        <app-ocupar-mesa
          [mesa]="mesa"
          (ocupada)="onOcupada($event.mesa, $event.comensales)"
          (fallo)="onFalloOcupar($event)"
          (cancelled)="ocupar.set(null)"
        />
      }
      @if (liberar(); as state) {
        @if (state.fase === 'confirmar') {
          <app-modal [heading]="'¿Liberar la mesa ' + state.mesa.numero + '?'">
            <app-icon icon name="logout" [size]="22" />
            La mesa pasará a LIBRE y quedará disponible para nuevos comensales.
            <dl class="mt-4 space-y-2 rounded-control border border-line bg-surface px-4 py-3 text-ink">
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Estado actual</dt>
                <dd class="font-semibold">Ocupada</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Comensales</dt>
                <dd class="font-mono font-semibold">{{ ocupacion(state.mesa) }}</dd>
              </div>
            </dl>
            <div footer class="ml-auto flex gap-3">
              <button appButton type="button" variant="secondary" [disabled]="liberando()" (click)="liberar.set(null)">
                Cancelar
              </button>
              <button appButton type="button" variant="primary" [disabled]="liberando()" (click)="confirmarLiberar(state.mesa)">
                <app-icon [name]="liberando() ? 'spinner' : 'logout'" [size]="18" [class.animate-spin]="liberando()" />Liberar mesa
              </button>
            </div>
          </app-modal>
        } @else {
          <app-modal [heading]="'No se pudo liberar la mesa ' + state.mesa.numero">
            <app-icon icon name="banknote" [size]="22" />
            La mesa sigue OCUPADA.
            <p
              class="mt-4 flex items-start gap-2 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-danger"
              role="alert"
            >
              <app-icon name="alert" [size]="16" class="mt-0.5" />{{ state.mensaje }}
            </p>
            <div class="mt-3 flex items-start gap-2 rounded-control bg-neutral-soft px-3.5 py-3 text-ink">
              <app-icon name="clock" [size]="16" class="mt-0.5" />
              <div>
                <p class="font-semibold">¿Qué pasa ahora?</p>
                <p class="text-muted">
                  La mesa se libera sola cuando se cobra y se entrega su último pedido. No hace falta liberarla a mano.
                </p>
              </div>
            </div>
            <div footer class="ml-auto flex gap-3">
              <button appButton type="button" variant="secondary" (click)="verCuenta(state.mesa)">
                <app-icon name="receipt" [size]="18" />Ver cuenta
              </button>
              <button appButton type="button" variant="primary" (click)="liberar.set(null)">Entendido</button>
            </div>
          </app-modal>
        }
      }
      @if (cuenta(); as detalle) {
        <app-mesa-detalle
          [mesa]="detalle.card"
          [cuenta]="detalle.cuenta"
          [estado]="detalle.estado"
          [mensajeError]="detalle.error"
          [soloLectura]="true"
          (cerrar)="cuenta.set(null)"
          (reintentar)="verCuenta(detalle.mesa)"
        />
      }
      @if (form(); as state) {
        <app-modal
          [form]="true"
          [heading]="state.mesa ? 'Editar mesa ' + state.mesa.numero : 'Nueva mesa'"
          (closed)="form.set(null)"
        >
          <app-mesa-form [mesa]="state.mesa" (saved)="onSaved($event, state.mesa ? 'editar' : 'crear')" (cancelled)="form.set(null)" />
        </app-modal>
      }
    </section>
  `,
})
export class MesasPage {
  private readonly api = inject(MesasApi);
  private readonly session = inject(SessionStore);
  private readonly toasts = inject(ToastService);
  private readonly cuentaApi = inject(CuentaMesaApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly blockedNotice = mesasBlockedNotice;
  protected readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  protected readonly permisos = computed(() => mesasPermisos(this.session.user()));
  protected readonly filtro = signal<FiltroEstadoMesa>('TODAS');
  /** Nueva / Editar mesa modal: open while not null; `mesa: null` creates. */
  protected readonly form = signal<{ mesa: Mesa | null } | null>(null);
  /** Ocupar modal for this table while not null. */
  protected readonly ocupar = signal<Mesa | null>(null);
  /** Liberar: the confirmation, then the "No se pudo liberar" dialog when the table still has open orders. */
  protected readonly liberar = signal<Liberar | null>(null);
  protected readonly liberando = signal(false);
  protected readonly cuenta = signal<DetalleCuenta | null>(null);
  protected readonly ocupacion = ocupacionLabel;

  protected readonly activas = signal<Mesa[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly errorMessage = signal(DEFAULT_ERROR);
  protected readonly refreshing = signal(false);
  private readonly restaurante = signal<string | null>(null);
  private readonly loadedAt = signal<Date | null>(null);
  private readonly now = signal(new Date());

  protected readonly subtitle = computed(() => {
    const nombre = this.restaurante();
    return nombre === null ? 'Mesas del salón' : `Mesas del salón de ${nombre}`;
  });
  protected readonly actualizado = computed(() => {
    const at = this.loadedAt();
    return at === null ? null : actualizadoHace(at, this.now());
  });
  protected readonly visibles = computed(() => {
    const permisos = this.permisos();
    return filtrarPorEstado(this.activas() ?? [], this.filtro()).map((mesa) => ({
      mesa,
      acciones: accionesMesa(mesa, permisos),
    }));
  });
  protected readonly filtros = computed(() => {
    const activas = this.activas();
    const conteo = activas === null ? null : conteoMesas(activas);
    return FILTROS.map((item) => ({ ...item, count: conteo === null ? null : conteo[item.filtro] }));
  });

  constructor() {
    inject(RestauranteApi)
      .actual()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (r) => this.restaurante.set(r.nombre), error: () => this.restaurante.set(null) });
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(new Date()));
    this.reload();
  }

  /** First load and "Reintentar": the grid goes back to the skeleton. */
  reload(): void {
    this.activas.set(null);
    this.failed.set(false);
    this.fetchActivas(false);
  }

  protected onSaved(mesa: Mesa, mode: 'crear' | 'editar'): void {
    this.activas.update((mesas) => upsertMesa(mesas ?? [], mesa));
    this.form.set(null);
    this.toasts.show('OK', mesaGuardadaMessage(mesa, mode), 'success');
  }

  protected onOcupada(mesa: Mesa, comensales: number): void {
    this.activas.update((mesas) => upsertMesa(mesas ?? [], mesa));
    this.ocupar.set(null);
    this.toasts.show('OK', mesaOcupadaMessage(mesa, comensales), 'success');
  }

  /** A rejected occupy (e.g. taken meanwhile): close, show the backend message and reload the grid. */
  protected onFalloOcupar(message: string): void {
    this.ocupar.set(null);
    this.toasts.show('Error', message);
    this.refresh();
  }

  protected confirmarLiberar(mesa: Mesa): void {
    if (this.liberando()) {
      return;
    }
    this.liberando.set(true);
    this.api
      .liberar(mesa.mesaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (libre) => {
          this.liberando.set(false);
          this.activas.update((mesas) => upsertMesa(mesas ?? [], libre));
          this.liberar.set(null);
          this.toasts.show('OK', mesaLiberadaMessage(libre), 'success');
        },
        error: (err: unknown) => {
          this.liberando.set(false);
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          const message = err instanceof HttpErrorResponse ? (readApiError(err.error)?.message ?? null) : null;
          if (falloLiberar(status, message) === 'pedidos-abiertos') {
            this.liberar.set({ mesa, fase: 'abiertos', mensaje: message ?? '' });
            return;
          }
          this.liberar.set(null);
          this.toasts.show(status || 'Error', message ?? DEFAULT_ERROR);
          this.refresh();
        },
      });
  }

  protected verCuenta(mesa: Mesa): void {
    this.liberar.set(null);
    this.cuenta.set({ mesa, card: mesaCards([mesa], [], new Date())[0], estado: 'cargando', cuenta: null, error: '' });
    this.cuentaApi
      .obtener(mesa.mesaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuenta) => this.cuenta.update((d) => (d === null ? d : { ...d, estado: 'listo', cuenta })),
        error: (err: unknown) =>
          this.cuenta.update((d) => (d === null ? d : { ...d, estado: 'error', error: messageOf(err) })),
      });
  }

  /** "Actualizar" (decision 4, manual only): keeps the grid on screen while it reloads. */
  protected refresh(): void {
    this.refreshing.set(true);
    this.fetchActivas(true);
  }

  private fetchActivas(keepGrid: boolean): void {
    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mesas) => {
          this.activas.set(mesas);
          this.loadedAt.set(new Date());
          this.now.set(new Date());
          this.refreshing.set(false);
        },
        error: (err: unknown) => {
          this.refreshing.set(false);
          if (keepGrid && this.activas() !== null) {
            this.toasts.show('Error', `No se pudieron actualizar las mesas. ${messageOf(err)}`);
            return;
          }
          this.errorMessage.set(messageOf(err));
          this.failed.set(true);
        },
      });
  }
}

function messageOf(err: unknown): string {
  return (err instanceof HttpErrorResponse && readApiError(err.error)?.message) || DEFAULT_ERROR;
}
