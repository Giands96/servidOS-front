import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { MesasApi } from './data/mesas.api';
import {
  MesaDraft,
  MesaErrors,
  draftFromMesa,
  emptyMesaDraft,
  mesaFieldErrors,
  toGuardarMesaRequest,
  validateMesaDraft,
} from './domain/mesas.rules';
import { Mesa } from './mesas.types';

const SAVE_ERROR = 'No se pudo guardar la mesa. Revisa tu conexión e inténtalo de nuevo.';

/** What the backend rejected for the draft that was sent: field messages (422) or one banner message (400 and others). */
interface Rechazo {
  sent: MesaDraft;
  fields: MesaErrors;
  banner: string | null;
}

/**
 * Nueva / Editar mesa form (no modal chrome; design "Modal Nueva mesa · Errores de campo" and "Modal Editar mesa · Error de
 * negocio"). Client errors appear after the first submit; a backend rejection stays until the draft changes. Orchestration
 * only: validation, the request body and the error mapping live in `mesas.rules`.
 */
@Component({
  selector: 'app-mesa-form',
  imports: [ButtonComponent, IconComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form novalidate [attr.aria-label]="mesa() ? 'Editar mesa' : 'Nueva mesa'" (submit)="submit($event)">
      <div class="space-y-4 p-6">
        <p class="text-sm text-muted">
          {{ mesa() ? 'Cambiá el número o la cantidad de asientos.' : 'La mesa se crea LIBRE y aparece en la vista de mesas activas.' }}
        </p>
        @if (banner(); as message) {
          <div class="flex items-start gap-2 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
            <app-icon name="alert" [size]="16" class="mt-0.5" />
            <div>
              <p class="font-semibold">No se pudo guardar</p>
              <p>{{ message }}</p>
            </div>
          </div>
        }
        <div class="grid gap-4 sm:grid-cols-2">
          <app-text-field
            label="Número"
            name="numero"
            placeholder="Ej. 15"
            inputmode="numeric"
            autocomplete="off"
            hint="Único entre las mesas activas"
            [required]="true"
            [disabled]="submitting()"
            [error]="errors().numero ?? null"
            [invalid]="highlight().numero"
            [(value)]="numero"
          />
          <app-text-field
            label="Capacidad"
            name="capacidad"
            placeholder="Ej. 4"
            inputmode="numeric"
            autocomplete="off"
            [hint]="mesa() ? 'Asientos de la mesa' : 'Cantidad de asientos'"
            [required]="true"
            [disabled]="submitting()"
            [error]="errors().capacidad ?? null"
            [invalid]="highlight().capacidad"
            [(value)]="capacidad"
          />
        </div>
      </div>

      <footer class="flex items-center justify-end gap-3 border-t border-line bg-surface/60 px-6 py-4">
        <button appButton type="button" variant="secondary" [disabled]="submitting()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button appButton type="submit" variant="primary" [disabled]="submitting()">
          @if (submitting()) {
            <app-icon name="spinner" [size]="18" class="animate-spin" />
          } @else {
            <app-icon [name]="mesa() ? 'check' : 'plus'" [size]="18" />
          }{{ mesa() ? 'Guardar cambios' : 'Crear mesa' }}
        </button>
      </footer>
    </form>
  `,
})
export class MesaFormComponent implements OnInit {
  private readonly api = inject(MesasApi);
  private readonly destroyRef = inject(DestroyRef);

  /** The table being edited; null creates a new one. Read once, when the form opens. */
  readonly mesa = input<Mesa | null>(null);
  /** Emitted with the saved table (the backend answer). */
  readonly saved = output<Mesa>();
  readonly cancelled = output<void>();

  protected readonly numero = signal('');
  protected readonly capacidad = signal('');
  private readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  private readonly rechazo = signal<Rechazo | null>(null);

  private readonly draft = computed<MesaDraft>(() => ({ numero: this.numero(), capacidad: this.capacidad() }));
  /** The backend rejection, only while the draft is still the one that was sent. */
  private readonly vigente = computed(() => {
    const r = this.rechazo();
    const d = this.draft();
    return r !== null && r.sent.numero === d.numero && r.sent.capacidad === d.capacidad ? r : null;
  });

  protected readonly errors = computed<MesaErrors>(() => {
    const client = this.submitAttempted() ? validateMesaDraft(this.draft()) : {};
    const r = this.vigente();
    return { ...(r !== null && r.banner === null ? r.fields : {}), ...client };
  });
  protected readonly banner = computed(() => this.vigente()?.banner ?? null);
  /** A 400 tied to a field (duplicate number, capacity below the seated guests) highlights it under the banner. */
  protected readonly highlight = computed(() => {
    const r = this.vigente();
    const fields = r !== null && r.banner !== null ? r.fields : {};
    return { numero: fields.numero !== undefined, capacidad: fields.capacidad !== undefined };
  });

  ngOnInit(): void {
    const draft = this.mesa() === null ? emptyMesaDraft() : draftFromMesa(this.mesa()!);
    this.numero.set(draft.numero);
    this.capacidad.set(draft.capacidad);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    this.submitAttempted.set(true);
    const draft = this.draft();
    if (Object.keys(validateMesaDraft(draft)).length > 0) {
      return;
    }
    const mesa = this.mesa();
    const request = toGuardarMesaRequest(draft);
    this.submitting.set(true);
    (mesa === null ? this.api.crear(request) : this.api.actualizar(mesa.mesaId, request))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.submitting.set(false);
          this.saved.emit(saved);
        },
        error: (error: unknown) => {
          // The draft stays as typed so the user can fix it and try again.
          this.submitting.set(false);
          this.rechazo.set(rechazoDe(error, draft));
        },
      });
  }
}

function rechazoDe(error: unknown, sent: MesaDraft): Rechazo {
  if (!(error instanceof HttpErrorResponse)) {
    return { sent, fields: {}, banner: SAVE_ERROR };
  }
  const message = readApiError(error.error)?.message ?? null;
  const fields = mesaFieldErrors(error.status, message);
  if (error.status === 422 && Object.keys(fields).length > 0) {
    return { sent, fields, banner: null };
  }
  return { sent, fields, banner: message ?? SAVE_ERROR };
}
