import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { RestauranteApi } from '../restaurante/data/restaurante.api';
import { MesasApi } from './data/mesas.api';
import {
  FiltroEstadoMesa,
  actualizadoHace,
  conteoMesas,
  filtrarPorEstado,
  mesasBlockedNotice,
  mesasPermisos,
} from './domain/mesas.rules';
import { MesaCardComponent } from './mesa-card.component';
import { Mesa } from './mesas.types';

const DEFAULT_ERROR = 'Revisa tu conexión e inténtalo de nuevo.';

const FILTROS: readonly { filtro: FiltroEstadoMesa; label: string; icon: IconName }[] = [
  { filtro: 'TODAS', label: 'Todas', icon: 'grid' },
  { filtro: 'LIBRES', label: 'Libres', icon: 'checkCircle' },
  { filtro: 'OCUPADAS', label: 'Ocupadas', icon: 'users' },
];

/** The restaurant tables: active grid with filters and manual refresh, Orchestration only: the logic lives in mesas.rules. */
@Component({
  selector: 'app-mesas',
  imports: [ButtonComponent, IconComponent, MesaCardComponent, StatePanelComponent],
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
          Cuando el administrador cree las mesas del salón, aparecerán acá.
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
            @for (mesa of visibles(); track mesa.mesaId) {
              <li><app-mesa-card [mesa]="mesa" class="h-full" /></li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class MesasPage {
  private readonly api = inject(MesasApi);
  private readonly session = inject(SessionStore);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly blockedNotice = mesasBlockedNotice;
  protected readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  protected readonly permisos = computed(() => mesasPermisos(this.session.user()));
  protected readonly filtro = signal<FiltroEstadoMesa>('TODAS');

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
  protected readonly visibles = computed(() => filtrarPorEstado(this.activas() ?? [], this.filtro()));
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
