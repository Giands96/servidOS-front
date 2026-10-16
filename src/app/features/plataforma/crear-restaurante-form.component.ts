import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
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
  CrearRestauranteErrors,
  CrearRestauranteField,
  CrearStep,
  canAdvance,
  emptyCrearDraft,
  fieldErrorsFromResponse,
  firstStepWithErrors,
  stepErrors,
  toCrearRequest,
  validateCrearDraft,
} from './domain/crear-restaurante.rules';
import { planOptionLabel } from './domain/plataforma.rules';
import { Plan, RestauranteCreado } from './plataforma.types';

const CREATE_ERROR = 'No se pudo crear el restaurante';

const STEP_LABEL: Readonly<Record<CrearStep, string>> = {
  restaurante: 'Paso 1 de 2 · Restaurante',
  administrador: 'Paso 2 de 2 · Administrador',
};

/**
 * Create-restaurant form (no modal chrome): shared by the list modal and the standalone ADMIN page.
 * Two steps (restaurant, then its owner account) over ONE backend request sent at the end. Orchestration only:
 * validation, the step split and the request body live in `crear-restaurante.rules`.
 * Field errors appear after the first attempt of their step, like the new-order form. A field the backend rejected
 * shows the backend message until that field changes, and the form moves to the step that holds it. The owner
 * password lives only in this component's signals: it is cleared after a successful create and never reaches a
 * toast, a log or the console. Moving between steps never clears values.
 */
@Component({
  selector: 'app-crear-restaurante-form',
  imports: [ButtonComponent, IconComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form novalidate aria-label="Crear restaurante" (submit)="submit($event)">
      <div class="px-6 pt-5">
        <p class="text-xs font-medium text-muted" aria-live="polite">{{ stepLabel() }}</p>
        <div class="mt-2 flex gap-2" aria-hidden="true">
          <span class="h-1 flex-1 rounded-full bg-brand"></span>
          <span
            class="h-1 flex-1 rounded-full"
            [class.bg-brand]="step() === 'administrador'"
            [class.bg-line]="step() === 'restaurante'"
          ></span>
        </div>
      </div>

      <div class="space-y-4 p-6">
        @if (step() === 'restaurante') {
          <app-text-field
            label="Nombre"
            name="nombre"
            autocomplete="off"
            [required]="true"
            [disabled]="submitting()"
            [error]="messages().nombre ?? null"
            [(value)]="nombre"
          />
          <app-text-field
            label="Slug"
            name="slug"
            autocomplete="off"
            [mono]="true"
            [required]="true"
            [disabled]="submitting()"
            [error]="messages().slug ?? null"
            [(value)]="slug"
          />
          <app-text-field
            label="Dirección"
            name="direccion"
            autocomplete="off"
            [disabled]="submitting()"
            [error]="messages().direccion ?? null"
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
                [class.border-line]="!messages().planId"
                [class.border-danger]="messages().planId"
                [disabled]="planes() === null || submitting()"
                [attr.aria-invalid]="messages().planId ? 'true' : null"
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
              @if (messages().planId; as message) {
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
                  [error]="messages().demoDias ?? null"
                  [(value)]="demoDias"
                />
              </div>
            }
          </div>
        } @else {
          <section class="space-y-4" aria-labelledby="crear-restaurante-admin-heading">
            <div>
              <h3 id="crear-restaurante-admin-heading" class="text-sm font-semibold text-ink">
                Administrador del restaurante
              </h3>
              <p class="mt-1 text-xs text-muted">Con estos datos el dueño inicia sesión en su restaurante.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <app-text-field
                label="Nombre"
                name="adminNombre"
                autocomplete="off"
                [required]="true"
                [disabled]="submitting()"
                [error]="messages().adminNombre ?? null"
                [(value)]="adminNombre"
              />
              <app-text-field
                label="Apellido"
                name="adminApellido"
                autocomplete="off"
                [required]="true"
                [disabled]="submitting()"
                [error]="messages().adminApellido ?? null"
                [(value)]="adminApellido"
              />
            </div>
            <app-text-field
              label="Email"
              name="adminEmail"
              type="email"
              autocomplete="off"
              [required]="true"
              [disabled]="submitting()"
              [error]="messages().adminEmail ?? null"
              [(value)]="adminEmail"
            />
            <app-text-field
              label="Contraseña"
              name="adminPassword"
              type="password"
              autocomplete="new-password"
              hint="Entre 8 y 72 caracteres"
              [required]="true"
              [disabled]="submitting()"
              [error]="messages().adminPassword ?? null"
              [(value)]="adminPassword"
            />
            <app-text-field
              label="Confirmar contraseña"
              name="adminPasswordConfirm"
              type="password"
              autocomplete="new-password"
              [required]="true"
              [disabled]="submitting()"
              [error]="messages().adminPasswordConfirm ?? null"
              [(value)]="adminPasswordConfirm"
            />
          </section>
        }
      </div>

      <footer class="flex items-center justify-end gap-3 border-t border-line bg-surface/60 px-6 py-4">
        @if (step() === 'restaurante') {
          <button appButton type="button" variant="secondary" (click)="cancelled.emit()">Cancelar</button>
          <button appButton type="submit" variant="primary" [disabled]="planes() === null">
            Siguiente<app-icon name="arrowRight" [size]="18" />
          </button>
        } @else {
          <button appButton type="button" variant="secondary" [disabled]="submitting()" (click)="back()">
            Atrás
          </button>
          <button appButton type="submit" variant="primary" [disabled]="submitting()">
            @if (submitting()) {
              <app-icon name="spinner" [size]="18" class="animate-spin" />
            } @else {
              <app-icon name="check" [size]="18" />
            }Crear restaurante
          </button>
        }
      </footer>
    </form>
  `,
})
export class CrearRestauranteFormComponent {
  private readonly api = inject(PlataformaApi);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Emitted with the created restaurant and its owner (201). */
  readonly created = output<RestauranteCreado>();
  readonly cancelled = output<void>();

  protected readonly planes = signal<readonly Plan[] | null>(null);
  protected readonly planesFailed = signal(false);

  protected readonly step = signal<CrearStep>('restaurante');
  protected readonly stepLabel = computed(() => STEP_LABEL[this.step()]);

  // The draft, one signal per field so each text field can two-way bind its own.
  private readonly blank = emptyCrearDraft(null);
  protected readonly nombre = signal(this.blank.nombre);
  protected readonly slug = signal(this.blank.slug);
  protected readonly direccion = signal(this.blank.direccion);
  protected readonly planId = signal<number | null>(this.blank.planId);
  protected readonly demo = signal(this.blank.demo);
  protected readonly demoDias = signal(this.blank.demoDias);
  protected readonly adminNombre = signal(this.blank.adminNombre);
  protected readonly adminApellido = signal(this.blank.adminApellido);
  protected readonly adminEmail = signal(this.blank.adminEmail);
  protected readonly adminPassword = signal(this.blank.adminPassword);
  protected readonly adminPasswordConfirm = signal(this.blank.adminPasswordConfirm);

  /** Steps whose local validation errors are already visible (set by Siguiente / Crear restaurante). */
  private readonly attempted = signal<ReadonlySet<CrearStep>>(new Set());
  protected readonly submitting = signal(false);
  /** Fields the backend rejected, with the message and the value that was sent: shown until that field changes. */
  private readonly rejected = signal<Partial<Record<CrearRestauranteField, { sent: string; message: string }>>>({});

  private readonly draft = computed<CrearRestauranteDraft>(() => ({
    nombre: this.nombre(),
    slug: this.slug(),
    direccion: this.direccion(),
    planId: this.planId(),
    demo: this.demo(),
    demoDias: this.demoDias(),
    adminNombre: this.adminNombre(),
    adminApellido: this.adminApellido(),
    adminEmail: this.adminEmail(),
    adminPassword: this.adminPassword(),
    adminPasswordConfirm: this.adminPasswordConfirm(),
  }));

  private readonly errors = computed(() => {
    const all = validateCrearDraft(this.draft());
    const visible: CrearRestauranteErrors = {};
    for (const step of this.attempted()) {
      Object.assign(visible, stepErrors(all, step));
    }
    return visible;
  });
  /** What each field shows: its own validation error first, else the backend rejection while the value is unchanged. */
  protected readonly messages = computed<CrearRestauranteErrors>(() => {
    const draft = this.draft();
    const messages: CrearRestauranteErrors = {};
    for (const [field, rejection] of Object.entries(this.rejected()) as [
      CrearRestauranteField,
      { sent: string; message: string },
    ][]) {
      if (String(draft[field]) === rejection.sent) {
        messages[field] = rejection.message;
      }
    }
    return { ...messages, ...this.errors() };
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

  /** Back to the restaurant step: keeps every value and validates nothing. */
  protected back(): void {
    if (!this.submitting()) {
      this.goTo('restaurante');
    }
  }

  /** Enter on step 1 behaves like Siguiente; on step 2 it creates. */
  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    if (this.step() === 'restaurante') {
      this.next();
    } else {
      this.create();
    }
  }

  /** Marks step 1 as attempted and advances only when it is valid. */
  private next(): void {
    this.markAttempted('restaurante');
    if (canAdvance(this.draft())) {
      this.goTo('administrador');
    }
  }

  private create(): void {
    this.markAttempted('administrador');
    const draft = this.draft();
    const errors = validateCrearDraft(draft);
    if (Object.keys(errors).length > 0) {
      // Step 1 cannot normally be invalid here (Siguiente checked it); if it is, take the user back to it.
      const failing = firstStepWithErrors(errors);
      if (failing !== null && failing !== this.step()) {
        this.markAttempted(failing);
        this.goTo(failing);
      }
      return;
    }
    this.submitting.set(true);
    this.api
      .crear(toCrearRequest(draft))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurante) => {
          this.submitting.set(false);
          this.clearPasswords();
          this.created.emit(restaurante);
        },
        error: (error: unknown) => {
          // The draft stays as typed so the user can fix it and try again.
          this.submitting.set(false);
          this.fail(error);
        },
      });
  }

  private markAttempted(step: CrearStep): void {
    this.attempted.update((steps) => new Set(steps).add(step));
  }

  /** Switches step and focuses the first field of the new one. Values are never cleared. */
  private goTo(step: CrearStep): void {
    if (this.step() === step) {
      return;
    }
    this.step.set(step);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled])')?.focus(),
      { injector: this.injector },
    );
  }

  /** Drops the owner password from memory once it is no longer needed. */
  private clearPasswords(): void {
    this.adminPassword.set('');
    this.adminPasswordConfirm.set('');
  }

  /** Field rejections go under their fields (switching to their step); anything else is the backend `message` in a toast. */
  private fail(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toasts.show('Error', CREATE_ERROR);
      return;
    }
    const message = readApiError(error.error)?.message ?? null;
    const fieldErrors = fieldErrorsFromResponse(error.status, message);
    const fields = Object.entries(fieldErrors) as [CrearRestauranteField, string][];
    if (fields.length === 0) {
      this.toasts.show(error.status, message ?? CREATE_ERROR);
      return;
    }
    const draft = this.draft();
    const rejected: Partial<Record<CrearRestauranteField, { sent: string; message: string }>> = {};
    for (const [field, fieldMessage] of fields) {
      rejected[field] = { sent: String(draft[field]), message: fieldMessage };
    }
    this.rejected.set(rejected);
    const target = firstStepWithErrors(fieldErrors);
    if (target !== null) {
      this.goTo(target);
    }
  }
}
