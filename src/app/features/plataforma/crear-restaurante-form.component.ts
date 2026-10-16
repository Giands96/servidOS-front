import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PlataformaApi } from './data/plataforma.api';
import {
  CrearRestauranteDraft,
  emptyCrearDraft,
  slugError,
  toCrearRequest,
  validateCrearDraft,
} from './domain/crear-restaurante.rules';
import { planOptionLabel } from './domain/plataforma.rules';
import { Plan, Restaurante } from './plataforma.types';

const CREATE_ERROR = 'No se pudo crear el restaurante';

/**
 * Create-restaurant form (no modal chrome): shared by the list modal and the standalone ADMIN page.
 * Orchestration only: validation and the request body live in `crear-restaurante.rules`.
 * Field errors appear after the first submit attempt, like the new-order form.
 */
@Component({
  selector: 'app-crear-restaurante-form',
  imports: [ButtonComponent, IconComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form novalidate aria-label="Crear restaurante" (submit)="submit($event)">
      <div class="space-y-4 p-6">
        <app-text-field
          label="Nombre"
          name="nombre"
          autocomplete="off"
          [required]="true"
          [disabled]="submitting()"
          [error]="errors().nombre ?? null"
          [(value)]="nombre"
        />
        <app-text-field
          label="Slug"
          name="slug"
          autocomplete="off"
          [mono]="true"
          [required]="true"
          [disabled]="submitting()"
          [error]="slugMessage()"
          [(value)]="slug"
        />
        <app-text-field
          label="Dirección"
          name="direccion"
          autocomplete="off"
          [disabled]="submitting()"
          [error]="errors().direccion ?? null"
          [(value)]="direccion"
        />

        <div>
          <label class="mb-1.5 block text-sm font-medium text-ink" for="crear-restaurante-plan">Plan</label>
          @if (planesFailed()) {
            <div
              class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger bg-danger-soft px-3.5 py-3 text-sm text-danger"
              role="alert"
            >
              <span class="flex items-center gap-1.5">
                <app-icon name="alert" [size]="14" />No se pudieron cargar los planes
              </span>
              <button appButton type="button" variant="secondary" (click)="loadPlanes()">
                <app-icon name="refresh" [size]="18" />Reintentar
              </button>
            </div>
          } @else {
            <select
              id="crear-restaurante-plan"
              name="planId"
              class="w-full rounded-control border bg-card px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-ink disabled:bg-surface disabled:text-muted"
              [class.border-line]="!errors().planId"
              [class.border-danger]="errors().planId"
              [disabled]="planes() === null || submitting()"
              [attr.aria-invalid]="errors().planId ? 'true' : null"
              (change)="selectPlan($event)"
            >
              @if (planes() === null) {
                <option value="">Cargando planes…</option>
              }
              @for (option of planOptions(); track option.planId) {
                <option [value]="option.planId" [selected]="option.planId === planId()">
                  {{ option.label }}
                </option>
              }
            </select>
            @if (errors().planId; as message) {
              <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" role="alert">
                <app-icon name="alert" [size]="14" />{{ message }}
              </p>
            }
          }
        </div>

        <div class="rounded-card bg-surface p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p id="crear-restaurante-demo-label" class="text-sm font-medium text-ink">Cuenta demo</p>
              <p class="mt-1 text-xs text-muted">La suscripción dura los días que indiques (1 a 30).</p>
            </div>
            <button
              type="button"
              role="switch"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
              [class]="demo() ? 'bg-brand' : 'bg-subtle'"
              aria-labelledby="crear-restaurante-demo-label"
              [attr.aria-checked]="demo()"
              [disabled]="submitting()"
              (click)="toggleDemo()"
            >
              <span
                class="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform"
                [class.translate-x-5]="demo()"
                aria-hidden="true"
              ></span>
            </button>
          </div>
          @if (demo()) {
            <div class="mt-4 w-48">
              <app-text-field
                label="Días de demo"
                name="demoDias"
                autocomplete="off"
                inputmode="numeric"
                hint="Entre 1 y 30 días"
                [mono]="true"
                [disabled]="submitting()"
                [error]="errors().demoDias ?? null"
                [(value)]="demoDias"
              />
            </div>
          }
        </div>
      </div>

      <footer class="flex items-center justify-end gap-3 border-t border-line bg-surface/60 px-6 py-4">
        <button appButton type="button" variant="secondary" [disabled]="submitting()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button appButton type="submit" variant="primary" [disabled]="submitting() || planes() === null">
          @if (submitting()) {
            <app-icon name="spinner" [size]="18" class="animate-spin" />
          } @else {
            <app-icon name="check" [size]="18" />
          }Crear restaurante
        </button>
      </footer>
    </form>
  `,
})
export class CrearRestauranteFormComponent {
  private readonly api = inject(PlataformaApi);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted with the created restaurant (201). */
  readonly created = output<Restaurante>();
  readonly cancelled = output<void>();

  protected readonly planes = signal<readonly Plan[] | null>(null);
  protected readonly planesFailed = signal(false);

  // The draft, one signal per field so each text field can two-way bind its own.
  private readonly blank = emptyCrearDraft(null);
  protected readonly nombre = signal(this.blank.nombre);
  protected readonly slug = signal(this.blank.slug);
  protected readonly direccion = signal(this.blank.direccion);
  protected readonly planId = signal<number | null>(this.blank.planId);
  protected readonly demo = signal(this.blank.demo);
  protected readonly demoDias = signal(this.blank.demoDias);

  private readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  /** The slug the backend rejected, with its message: shown under the field until the slug text changes. */
  private readonly slugRejected = signal<{ slug: string; message: string } | null>(null);

  private readonly draft = computed<CrearRestauranteDraft>(() => ({
    nombre: this.nombre(),
    slug: this.slug(),
    direccion: this.direccion(),
    planId: this.planId(),
    demo: this.demo(),
    demoDias: this.demoDias(),
  }));

  protected readonly errors = computed(() =>
    this.submitAttempted() ? validateCrearDraft(this.draft()) : {},
  );
  protected readonly slugMessage = computed(() => {
    const rejected = this.slugRejected();
    const rejectedHere = rejected !== null && rejected.slug === this.slug().trim();
    return this.errors().slug ?? (rejectedHere ? rejected.message : null);
  });
  protected readonly planOptions = computed(() =>
    (this.planes() ?? []).map((plan) => ({ planId: plan.planId, label: planOptionLabel(plan) })),
  );

  constructor() {
    this.loadPlanes();
  }

  protected loadPlanes(): void {
    this.planesFailed.set(false);
    this.planes.set(null);
    this.api
      .planes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (planes) => {
          this.planes.set(planes);
          // Preselect the first plan (the backend lists them cheapest first) unless one is already chosen and offered.
          if (!planes.some((plan) => plan.planId === this.planId())) {
            this.planId.set(planes[0]?.planId ?? null);
          }
        },
        error: () => this.planesFailed.set(true),
      });
  }

  protected selectPlan(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.planId.set(value === '' ? null : Number(value));
  }

  protected toggleDemo(): void {
    this.demo.update((on) => !on);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    this.submitAttempted.set(true);
    const draft = this.draft();
    if (Object.keys(validateCrearDraft(draft)).length > 0) {
      return;
    }
    this.submitting.set(true);
    this.api
      .crear(toCrearRequest(draft))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurante) => {
          this.submitting.set(false);
          this.created.emit(restaurante);
        },
        error: (error: unknown) => {
          // The draft stays as typed so the user can fix it and try again.
          this.submitting.set(false);
          this.fail(error);
        },
      });
  }

  /** A slug rejection goes under the Slug field; anything else is the backend `message` as is in a toast. */
  private fail(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toasts.show('Error', CREATE_ERROR);
      return;
    }
    const message = readApiError(error.error)?.message ?? null;
    const rejected = slugError(error.status, message);
    if (rejected !== null) {
      this.slugRejected.set({ slug: this.slug().trim(), message: rejected });
      return;
    }
    this.toasts.show(error.status, message ?? CREATE_ERROR);
  }
}
