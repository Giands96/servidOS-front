import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, Subscription, catchError, map, of, switchMap } from 'rxjs';
import { can } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { Page } from '../../core/http/api.types';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { ModalComponent, ModalTone } from '../../shared/ui/modal/modal.component';
import { StatePanelComponent } from '../../shared/ui/state-panel/state-panel.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { shouldReloadAfterRejection } from '../pedidos/domain/pedidos.rules';
import { formatDate } from '../restaurante/domain/subscription.rules';
import { CrearRestauranteFormComponent } from './crear-restaurante-form.component';
import { PlataformaApi } from './data/plataforma.api';
import { restauranteCreadoMessage } from './domain/crear-restaurante.rules';
import {
  ActionCopy,
  PanelActionKind,
  actionSuccessMessage,
  cambiarPlanCopy,
  canConfirmAction,
  defaultRenovarPlanId,
  estadoCopy,
  limaToday,
  nextSort,
  pageNumbers,
  panelActions,
  planChoiceOptions,
  planLabel,
  planOptionLabel,
  rangeLabel,
  renovarCopy,
  renovarPlanIdToSend,
  restauranteEstadoLabel,
  sortLabel,
  suscripcionView,
  totalLabel,
} from './domain/plataforma.rules';
import {
  OrdenRestaurantes,
  Plan,
  Restaurante,
  RestauranteCreado,
  RestauranteDashboard,
  SuscripcionPlataforma,
} from './plataforma.types';

const PAGE_SIZE = 10;
const EM_DASH = '—';
const DEFAULT_ERROR = 'Revisa tu conexión e inténtalo de nuevo.';
const ACTION_ERROR = 'No se pudo completar la operación';

type Outcome = { ok: true; page: Page<RestauranteDashboard> } | { ok: false; message: string };

interface LoadRequest {
  page: number;
  sort: OrdenRestaurantes;
}

interface RowView {
  restaurante: RestauranteDashboard;
  plan: string;
  suscripcion: string;
  variant: BadgeVariant | null;
  vence: string;
  suspendido: boolean;
  selected: boolean;
}

interface PanelView {
  restaurante: RestauranteDashboard;
  estado: string;
  direccion: string;
  plan: string;
  /** null when the restaurant has no subscription. */
  suscripcion: {
    label: string;
    variant: BadgeVariant | null;
    id: number;
    inicio: string;
    fin: string;
  } | null;
}

/** Owner actions the signed-in user may run on the open panel; `estado` is null when hidden. */
interface ActionsView {
  renovar: boolean;
  cambiarPlan: boolean;
  estado: { label: string; destructive: boolean } | null;
}

/** The confirmation modal that is open: which action and the row it was opened for. */
interface ActionModal {
  kind: PanelActionKind;
  restaurante: RestauranteDashboard;
}

interface PlanOptionView {
  planId: number;
  label: string;
}

interface ActionModalView {
  kind: PanelActionKind;
  copy: ActionCopy;
  tone: ModalTone;
  icon: IconName;
  destructive: boolean;
  /** Which plan select to show; null for the estado action. */
  planSelect: { options: PlanOptionView[]; placeholder: string | null } | null;
  canConfirm: boolean;
}

/** SUPERADMIN restaurants list with a detail panel and the owner actions. Orchestration only: the logic lives in plataforma.rules. */
@Component({
  selector: 'app-restaurantes',
  imports: [
    BadgeComponent,
    ButtonComponent,
    CrearRestauranteFormComponent,
    IconComponent,
    ModalComponent,
    StatePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-screen bg-surface p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Restaurantes</h1>
          @if (subtitle(); as text) {
            <p class="mt-1 text-sm text-muted">{{ text }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            appButton
            type="button"
            variant="secondary"
            [disabled]="loading()"
            (click)="toggleSort()"
          >
            <app-icon name="sort" [size]="18" />{{ sortText() }}
          </button>
          @if (canCreate()) {
            <button appButton type="button" variant="primary" (click)="startCreate()">
              <app-icon name="plus" [size]="18" />Crear restaurante
            </button>
          }
        </div>
      </header>

      <div class="mt-6 lg:flex lg:items-start lg:gap-6">
        <div class="min-w-0 flex-1">
          @if (failed()) {
            <app-state-panel
              class="!min-h-[24rem]"
              icon="alert"
              heading="No se pudieron cargar los restaurantes"
            >
              {{ errorMessage() }}
              <button actions appButton type="button" variant="secondary" (click)="reload()">
                <app-icon name="refresh" [size]="18" />Reintentar
              </button>
            </app-state-panel>
          } @else if (data() === null) {
            <div
              class="animate-pulse rounded-card border border-line bg-card p-4"
              aria-busy="true"
              aria-label="Cargando restaurantes"
            >
              @for (n of skeletons; track n) {
                <div class="flex items-center gap-6 border-b border-line py-4 last:border-b-0">
                  <div class="h-8 flex-1 rounded-full bg-neutral-soft"></div>
                  <div class="h-4 w-20 rounded-full bg-neutral-soft"></div>
                  <div class="h-6 w-24 rounded-full bg-neutral-soft"></div>
                  <div class="h-4 w-24 rounded-full bg-neutral-soft"></div>
                </div>
              }
            </div>
          } @else if (rows().length === 0) {
            <app-state-panel class="!min-h-[24rem]" icon="inbox" heading="Aún no hay restaurantes">
              Cuando se cree el primero aparecerá aquí.
            </app-state-panel>
          } @else {
            <div
              class="overflow-hidden rounded-card border border-line bg-card transition-opacity"
              [class.opacity-60]="loading()"
              [attr.aria-busy]="loading()"
            >
              <div class="overflow-x-auto">
                <table class="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <caption class="sr-only">
                    Restaurantes de la plataforma
                  </caption>
                  <thead>
                    <tr class="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" class="px-4 py-3">Restaurante</th>
                      <th scope="col" class="px-4 py-3">Plan</th>
                      <th scope="col" class="px-4 py-3">Suscripción</th>
                      <th scope="col" class="px-4 py-3">Vence</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of rows(); track row.restaurante.restauranteId) {
                      <tr
                        class="cursor-pointer border-b border-line transition-colors last:border-b-0"
                        [class]="row.selected ? 'bg-brand-soft' : 'hover:bg-surface'"
                        (click)="select(row.restaurante.restauranteId)"
                      >
                        <th scope="row" class="px-4 py-3 font-normal">
                          <button
                            type="button"
                            class="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                            [attr.aria-pressed]="row.selected"
                          >
                            <span class="flex flex-wrap items-center gap-2">
                              <span class="text-base">{{ row.restaurante.nombre }}</span>
                              @if (row.suspendido) {
                                <app-badge variant="danger">Suspendido</app-badge>
                              }
                            </span>
                            <span class="mt-0.5 block font-mono text-xs text-muted">{{ row.restaurante.slug }}</span>
                          </button>
                        </th>
                        <td class="px-4 py-3">{{ row.plan }}</td>
                        <td class="px-4 py-3">
                          @if (row.variant; as variant) {
                            <app-badge [variant]="variant">{{ row.suscripcion }}</app-badge>
                          } @else {
                            <span class="italic text-muted">{{ row.suscripcion }}</span>
                          }
                        </td>
                        <td class="whitespace-nowrap px-4 py-3 font-mono text-muted">{{ row.vence }}</td>
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
                      [disabled]="!canPrev() || loading()"
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
                          [disabled]="loading()"
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
                      [disabled]="!canNext() || loading()"
                      (click)="goTo(pageIndex() + 1)"
                    >
                      <app-icon name="chevronRight" [size]="18" />
                    </button>
                  </nav>
                }
              </footer>
            </div>
          }
        </div>

        @if (panel(); as view) {
          <aside
            class="fixed inset-0 z-40 overflow-y-auto bg-card lg:static lg:inset-auto lg:z-auto lg:w-[470px] lg:shrink-0 lg:overflow-visible lg:rounded-card lg:border lg:border-line"
            aria-label="Detalle del restaurante"
          >
            <header class="flex items-start justify-between gap-4 border-b border-line p-6">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted">Restaurante</p>
                <h2 class="mt-2 break-words text-2xl font-bold tracking-tight">
                  {{ view.restaurante.nombre }}
                </h2>
                <p class="mt-1 break-all font-mono text-sm text-muted">{{ view.restaurante.slug }}</p>
              </div>
              <button
                type="button"
                class="rounded-control p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label="Cerrar"
                (click)="closePanel()"
              >
                <app-icon name="x" [size]="22" />
              </button>
            </header>

            <section class="border-b border-line p-6" aria-labelledby="panel-datos">
              <h3 id="panel-datos" class="text-xs font-semibold uppercase tracking-wider text-muted">Datos</h3>
              <dl class="mt-4 space-y-3 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Estado</dt>
                  <dd>{{ view.estado }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">Dirección</dt>
                  <dd class="text-right">{{ view.direccion }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-muted">ID</dt>
                  <dd class="font-mono">{{ view.restaurante.restauranteId }}</dd>
                </div>
              </dl>
            </section>

            <section class="p-6" aria-labelledby="panel-suscripcion">
              <h3 id="panel-suscripcion" class="text-xs font-semibold uppercase tracking-wider text-muted">
                Suscripción
              </h3>
              @if (view.suscripcion; as s) {
                <div class="mt-4 flex items-center justify-between gap-4">
                  <p class="text-2xl font-bold tracking-tight">{{ view.plan }}</p>
                  @if (s.variant; as variant) {
                    <app-badge [variant]="variant">{{ s.label }}</app-badge>
                  }
                </div>
                <dl class="mt-4 space-y-3 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-muted">ID suscripción</dt>
                    <dd class="font-mono">{{ s.id }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-muted">Inicio</dt>
                    <dd class="font-mono">{{ s.inicio }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-muted">Fin</dt>
                    <dd class="font-mono">{{ s.fin }}</dd>
                  </div>
                </dl>
              } @else {
                <p class="mt-4 italic text-muted">Sin suscripción</p>
              }
            </section>

            <div class="border-t border-line p-6" data-slot="panel-actions">
              @if (actions(); as acts) {
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">Acciones</h3>
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  @if (acts.renovar) {
                    <button
                      appButton
                      type="button"
                      variant="primary"
                      [disabled]="loading()"
                      (click)="openAction('renovar')"
                    >
                      <app-icon name="refresh" [size]="18" />Renovar suscripción
                    </button>
                  }
                  @if (acts.cambiarPlan) {
                    <button
                      appButton
                      type="button"
                      variant="secondary"
                      [disabled]="loading()"
                      (click)="openAction('plan')"
                    >
                      Cambiar plan
                    </button>
                  }
                  @if (acts.estado; as estado) {
                    <button
                      appButton
                      type="button"
                      [variant]="estado.destructive ? 'destructive' : 'secondary'"
                      [disabled]="loading()"
                      (click)="openAction('estado')"
                    >
                      {{ estado.label }}
                    </button>
                  }
                </div>
              }
            </div>
          </aside>
        }
      </div>

      @if (creating()) {
        <app-modal heading="Crear restaurante" [form]="true" (closed)="stopCreate()">
          <app-crear-restaurante-form (created)="onCreated($event)" (cancelled)="stopCreate()" />
        </app-modal>
      }

      @if (modal(); as m) {
        <app-modal [heading]="m.copy.heading" [tone]="m.tone">
          <app-icon icon [name]="m.icon" [size]="24" />
          {{ m.copy.body }}
          @if (m.planSelect; as select) {
            <div class="mt-4">
              <label class="mb-1.5 block text-sm font-medium text-ink" for="panel-action-plan">Plan</label>
              @if (planesFailed()) {
                <div
                  class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger bg-danger-soft px-3.5 py-3 text-sm text-danger"
                  role="alert"
                >
                  <span class="flex items-center gap-1.5">
                    <app-icon name="alert" [size]="14" />No se pudieron cargar los planes
                  </span>
                  <button
                    appButton
                    type="button"
                    variant="secondary"
                    [disabled]="acting()"
                    (click)="loadPlanes()"
                  >
                    <app-icon name="refresh" [size]="18" />Reintentar
                  </button>
                </div>
              } @else {
                <select
                  id="panel-action-plan"
                  name="planId"
                  class="w-full rounded-control border border-line bg-card px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-ink disabled:bg-surface disabled:text-muted"
                  [disabled]="planes() === null || acting()"
                  (change)="selectPlan($event)"
                >
                  @if (planes() === null) {
                    <option value="">Cargando planes…</option>
                  } @else if (select.placeholder; as placeholder) {
                    <option value="" [selected]="chosenPlanId() === null">{{ placeholder }}</option>
                  }
                  @for (option of select.options; track option.planId) {
                    <option [value]="option.planId" [selected]="option.planId === chosenPlanId()">
                      {{ option.label }}
                    </option>
                  }
                </select>
                @if (planes() !== null && select.options.length === 0) {
                  <p class="mt-1.5 text-xs text-muted">No hay otros planes disponibles.</p>
                }
              }
            </div>
          }
          <button footer appButton type="button" variant="secondary" [disabled]="acting()" (click)="closeAction()">
            Cancelar
          </button>
          <button
            footer
            appButton
            type="button"
            [variant]="m.destructive ? 'destructive' : 'primary'"
            [disabled]="acting() || !m.canConfirm"
            (click)="confirmAction()"
          >
            @if (acting()) {
              <app-icon name="spinner" [size]="18" class="animate-spin" />
            }{{ m.copy.confirm }}
          </button>
        </app-modal>
      }
    </section>
  `,
})
export class RestaurantesPage {
  private readonly api = inject(PlataformaApi);
  private readonly session = inject(SessionStore);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private planesRequest: Subscription | null = null;
  private readonly requests$ = new Subject<LoadRequest>();

  private readonly selectedId = signal<number | null>(null);
  /** "Today" in Lima, taken once per load so every row of a page is judged against the same day. */
  private readonly today = signal(limaToday(new Date()));
  /** Kept across loads so the header does not flicker while a page loads. */
  private readonly totalElements = signal<number | null>(null);

  protected readonly errorMessage = signal(DEFAULT_ERROR);
  protected readonly skeletons = [1, 2, 3, 4, 5] as const;
  protected readonly sort = signal<OrdenRestaurantes>('nombre,asc');
  protected readonly pageIndex = signal(0);
  protected readonly data = signal<Page<RestauranteDashboard> | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  /** Set by "Crear restaurante"; the create modal is open while it is true. */
  protected readonly creating = signal(false);

  // Owner-action modal: one state for the three actions.
  private readonly actionModal = signal<ActionModal | null>(null);
  /** Plans for the select of the open modal; null while loading. */
  protected readonly planes = signal<readonly Plan[] | null>(null);
  protected readonly planesFailed = signal(false);
  protected readonly chosenPlanId = signal<number | null>(null);
  /** True while the confirmed action is in flight: the modal can be neither closed nor confirmed again. */
  protected readonly acting = signal(false);

  protected readonly canCreate = computed(() =>
    can(this.session.user(), 'plataforma.restaurantes.crear'),
  );
  protected readonly sortText = computed(() => sortLabel(this.sort()));
  protected readonly subtitle = computed(() => {
    const total = this.totalElements();
    return total === null ? null : totalLabel(total);
  });

  protected readonly rows = computed<RowView[]>(() => {
    const today = this.today();
    const selectedId = this.selectedId();
    return (this.data()?.content ?? []).map((restaurante) => {
      const view = suscripcionView(restaurante.suscripcion, today);
      return {
        restaurante,
        plan: planLabel(restaurante.suscripcion),
        suscripcion: view.label,
        variant: view.variant,
        vence: view.vence,
        suspendido: restaurante.estado === 'INACTIVO',
        selected: restaurante.restauranteId === selectedId,
      };
    });
  });

  protected readonly panel = computed<PanelView | null>(() => {
    const selectedId = this.selectedId();
    const restaurante = this.data()?.content.find((r) => r.restauranteId === selectedId);
    if (restaurante === undefined) {
      return null;
    }
    const s = restaurante.suscripcion;
    const view = suscripcionView(s, this.today());
    return {
      restaurante,
      estado: restauranteEstadoLabel(restaurante.estado),
      direccion: restaurante.direccion?.trim() || EM_DASH,
      plan: planLabel(s),
      suscripcion:
        s === null
          ? null
          : {
              label: view.label,
              variant: view.variant,
              id: s.suscripcionId,
              inicio: formatDate(s.fechaInicio),
              fin: view.vence,
            },
    };
  });

  protected readonly actions = computed<ActionsView | null>(() => {
    const view = this.panel();
    const user = this.session.user();
    const manage = can(user, 'plataforma.suscripcion.gestionar');
    const manageEstado = can(user, 'plataforma.restaurantes.estado');
    if (view === null || (!manage && !manageEstado)) {
      return null;
    }
    const available = panelActions(view.restaurante, this.today());
    return {
      renovar: manage,
      cambiarPlan: manage && available.cambiarPlan,
      estado: manageEstado
        ? { label: available.estado.label, destructive: available.estado.target === 'INACTIVO' }
        : null,
    };
  });

  protected readonly modal = computed<ActionModalView | null>(() => {
    const open = this.actionModal();
    if (open === null) {
      return null;
    }
    const { kind, restaurante } = open;
    const today = this.today();
    const planes = this.planes() ?? [];
    const base = { kind, canConfirm: canConfirmAction(kind, restaurante, this.chosenPlanId()) };
    switch (kind) {
      case 'renovar':
        return {
          ...base,
          copy: renovarCopy(restaurante),
          tone: 'brand',
          icon: 'refresh',
          destructive: false,
          planSelect: { options: planOptionViews('renovar', restaurante, planes), placeholder: null },
        };
      case 'plan':
        return {
          ...base,
          copy: cambiarPlanCopy(restaurante),
          tone: 'brand',
          icon: 'wallet',
          destructive: false,
          planSelect: {
            options: planOptionViews('plan', restaurante, planes),
            placeholder: 'Elige un plan',
          },
        };
      case 'estado': {
        const suspend = panelActions(restaurante, today).estado.target === 'INACTIVO';
        return {
          ...base,
          copy: estadoCopy(restaurante, today),
          tone: suspend ? 'danger' : 'brand',
          icon: suspend ? 'ban' : 'checkCircle',
          destructive: suspend,
          planSelect: null,
        };
      }
    }
  });

  protected readonly range = computed(() => {
    const page = this.data();
    return page === null ? '' : rangeLabel(page);
  });
  protected readonly pages = computed(() => {
    const page = this.data();
    return page === null ? [] : pageNumbers(page.number, page.totalPages);
  });
  protected readonly canPrev = computed(() => this.pageIndex() > 0);
  protected readonly canNext = computed(() => {
    const page = this.data();
    return page !== null && this.pageIndex() < page.totalPages - 1;
  });

  constructor() {
    // switchMap drops the previous in-flight request, so a slow answer can never overwrite a newer one.
    this.requests$
      .pipe(
        switchMap(
          ({ page, sort }): Observable<Outcome> =>
            this.api.listar({ page, size: PAGE_SIZE, sort }).pipe(
              map((result): Outcome => ({ ok: true, page: result })),
              catchError((error: unknown) => of<Outcome>({ ok: false, message: messageOf(error) })),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.settle(outcome));

    this.load(0);
  }

  protected toggleSort(): void {
    this.sort.set(nextSort(this.sort()));
    this.load(0);
  }

  protected goTo(page: number): void {
    const total = this.data()?.totalPages ?? 0;
    if (page >= 0 && page < total && page !== this.pageIndex()) {
      this.load(page);
    }
  }

  protected reload(): void {
    this.load(this.pageIndex());
  }

  protected select(restauranteId: number): void {
    this.selectedId.set(restauranteId);
  }

  protected closePanel(): void {
    this.selectedId.set(null);
  }

  /** Opens the confirmation of an owner action for the selected row; plan selects load the plans fresh. */
  protected openAction(kind: PanelActionKind): void {
    const restaurante = this.panel()?.restaurante;
    if (restaurante === undefined || this.loading() || this.acting()) {
      return;
    }
    this.chosenPlanId.set(null);
    this.actionModal.set({ kind, restaurante });
    if (kind === 'estado') {
      this.planes.set(null);
      this.planesFailed.set(false);
    } else {
      this.loadPlanes();
    }
  }

  protected closeAction(): void {
    if (this.acting()) {
      return;
    }
    this.planesRequest?.unsubscribe();
    this.actionModal.set(null);
    this.chosenPlanId.set(null);
  }

  protected loadPlanes(): void {
    this.planesRequest?.unsubscribe();
    this.planesFailed.set(false);
    this.planes.set(null);
    this.planesRequest = this.api
      .planes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (planes) => {
          this.planes.set(planes);
          const open = this.actionModal();
          if (open?.kind === 'renovar') {
            this.chosenPlanId.set(defaultRenovarPlanId(open.restaurante, planes));
          }
        },
        error: () => this.planesFailed.set(true),
      });
  }

  protected selectPlan(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.chosenPlanId.set(value === '' ? null : Number(value));
  }

  protected confirmAction(): void {
    const open = this.actionModal();
    const chosen = this.chosenPlanId();
    if (open === null || this.acting() || !canConfirmAction(open.kind, open.restaurante, chosen)) {
      return;
    }
    const { kind, restaurante } = open;
    const id = restaurante.restauranteId;
    let request: Observable<SuscripcionPlataforma | Restaurante>;
    if (kind === 'renovar') {
      request = this.api.renovar(id, renovarPlanIdToSend(restaurante, chosen));
    } else if (kind === 'plan') {
      // canConfirmAction guarantees a chosen plan for this action.
      request = this.api.cambiarPlan(id, chosen as number);
    } else {
      request = this.api.cambiarEstado(id, restaurante.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
    }
    this.acting.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.acting.set(false);
        this.closeAction();
        // Reload before the toast: nothing that builds the message may skip the reload.
        this.load(this.pageIndex(), true);
        this.toasts.show('OK', actionSuccessMessage(kind, restaurante, result), 'success');
      },
      error: (error: unknown) => {
        // The modal stays open so the owner can retry or cancel; a 4xx most likely means the row is stale.
        this.acting.set(false);
        if (error instanceof HttpErrorResponse) {
          this.toasts.show(error.status, readApiError(error.error)?.message ?? ACTION_ERROR);
          if (shouldReloadAfterRejection(error.status)) {
            this.load(this.pageIndex(), true);
          }
        } else {
          this.toasts.show('Error', ACTION_ERROR);
        }
      },
    });
  }

  protected startCreate(): void {
    this.creating.set(true);
  }

  protected stopCreate(): void {
    this.creating.set(false);
  }

  /** Closes the modal, confirms with a toast and reloads from the first page so the new restaurant is counted. */
  protected onCreated(restaurante: RestauranteCreado): void {
    this.creating.set(false);
    this.toasts.show('OK', restauranteCreadoMessage(restaurante), 'success');
    this.load(0);
  }

  /** `keepSelection` is for the reload after an owner action: the rows and the open panel stay while it loads. */
  private load(page: number, keepSelection = false): void {
    this.pageIndex.set(page);
    if (!keepSelection) {
      this.selectedId.set(null);
      this.data.set(null);
    }
    this.failed.set(false);
    this.loading.set(true);
    this.requests$.next({ page, sort: this.sort() });
  }

  private settle(outcome: Outcome): void {
    this.loading.set(false);
    if (!outcome.ok) {
      this.errorMessage.set(outcome.message);
      this.failed.set(true);
      this.data.set(null);
      return;
    }
    this.today.set(limaToday(new Date()));
    this.pageIndex.set(outcome.page.number);
    this.totalElements.set(outcome.page.totalElements);
    this.data.set(outcome.page);
  }
}

function planOptionViews(
  kind: 'renovar' | 'plan',
  restaurante: RestauranteDashboard,
  planes: readonly Plan[],
): PlanOptionView[] {
  return planChoiceOptions(kind, restaurante, planes).map((plan) => ({
    planId: plan.planId,
    label: planOptionLabel(plan),
  }));
}

/** The backend `message` as is (its 400/4xx messages already come in Spanish), else a generic hint. */
function messageOf(error: unknown): string {
  return (
    (error instanceof HttpErrorResponse ? readApiError(error.error)?.message : undefined) ??
    DEFAULT_ERROR
  );
}
