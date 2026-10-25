import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { MesasApi } from './data/mesas.api';
import { opcionesComensales, previewOcupar } from './domain/mesas.rules';
import { Mesa } from './mesas.types';

const OCUPAR_ERROR = 'No se pudo ocupar la mesa. Revisa tu conexión e inténtalo de nuevo.';

/** "Ocupar mesa N" (design "Modal Ocupar mesa"): guests chips 1..capacidad, preview, POST /mesas/{id}/ocupar. */
@Component({
  selector: 'app-ocupar-mesa',
  imports: [ButtonComponent, IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal tone="brand" [heading]="'Ocupar mesa ' + mesa().numero">
      <app-icon icon name="users" [size]="22" />
      Elige cuántas personas se sientan. La mesa tiene {{ mesa().capacidad }} asientos.
      <div class="mt-5 text-ink">
        <div class="flex items-baseline justify-between gap-3">
          <p id="comensales-label" class="text-sm font-medium">Comensales</p>
          <p class="text-xs text-muted">de 1 a {{ mesa().capacidad }}</p>
        </div>
        <div role="radiogroup" aria-labelledby="comensales-label" class="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
          @for (n of opciones(); track n) {
            <button
              type="button"
              role="radio"
              class="rounded-control border py-2.5 font-mono text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
              [class]="n === comensales() ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink hover:bg-surface'"
              [attr.aria-checked]="n === comensales()"
              [disabled]="submitting()"
              (click)="comensales.set(n)"
            >
              {{ n }}
            </button>
          }
        </div>
        <p class="mt-4 flex items-center gap-2 rounded-control bg-neutral-soft px-3 py-2.5 text-sm text-muted">
          <app-icon name="armchair" [size]="16" />{{ preview() }}
        </p>
      </div>
      <div footer class="ml-auto flex gap-3">
        <button appButton type="button" variant="secondary" [disabled]="submitting()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button appButton type="button" variant="primary" [disabled]="submitting()" (click)="ocupar()">
          <app-icon [name]="submitting() ? 'spinner' : 'users'" [size]="18" [class.animate-spin]="submitting()" />Ocupar mesa
        </button>
      </div>
    </app-modal>
  `,
})
export class OcuparMesaComponent {
  private readonly api = inject(MesasApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly mesa = input.required<Mesa>();
  /** Emitted with the occupied table (the backend answer) and the guests that were sent. */
  readonly ocupada = output<{ mesa: Mesa; comensales: number }>();
  /** The backend rejected it (e.g. the table was occupied meanwhile): the page shows the message and reloads. */
  readonly fallo = output<string>();
  readonly cancelled = output<void>();

  protected readonly comensales = signal(1);
  protected readonly submitting = signal(false);
  protected readonly opciones = computed(() => opcionesComensales(this.mesa().capacidad));
  protected readonly preview = computed(() => previewOcupar(this.mesa(), this.comensales()));

  protected ocupar(): void {
    if (this.submitting()) {
      return;
    }
    const comensales = this.comensales();
    this.submitting.set(true);
    this.api
      .ocupar(this.mesa().mesaId, comensales)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mesa) => {
          this.submitting.set(false);
          this.ocupada.emit({ mesa, comensales });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const message = error instanceof HttpErrorResponse ? readApiError(error.error)?.message : null;
          this.fallo.emit(message ?? OCUPAR_ERROR);
        },
      });
  }
}
