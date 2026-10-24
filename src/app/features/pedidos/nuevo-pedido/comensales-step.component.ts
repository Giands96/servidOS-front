import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import {
  MesaCard,
  clampComensales,
  puedeRestarComensal,
  puedeSumarComensal,
} from '../domain/nuevo-pedido-local.rules';

/**
 * Step 2 of the Local flow: how many guests sit at the free table. Dumb: it emits the new (already
 * clamped) number and the confirmation. On phones "Confirmar" is a fixed bottom bar, on `lg` it sits in the card.
 */
@Component({
  selector: 'app-comensales-step',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto mt-10 max-w-md">
      <div class="rounded-card border border-line bg-card p-6 text-center sm:p-8">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"
        >
          <app-icon name="check" [size]="12" />Libre
        </span>
        <h2 class="mt-3 text-2xl font-bold tracking-tight">
          Mesa {{ mesa().numero }} · capacidad {{ mesa().capacidad }}
        </h2>
        <p class="mt-1 text-sm text-muted">¿Cuántos comensales?</p>

        <div class="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            class="flex size-14 items-center justify-center rounded-full border border-line bg-card hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-card"
            aria-label="Quitar un comensal"
            [disabled]="!puedeRestar()"
            (click)="cambiar.emit(clamp(comensales() - 1))"
          >
            <app-icon name="minus" [size]="24" />
          </button>
          <p class="min-w-24 whitespace-nowrap font-mono" aria-live="polite">
            <span class="text-5xl font-bold">{{ comensales() }}</span>
            <span class="text-xl text-muted"> / {{ mesa().capacidad }}</span>
          </p>
          <button
            type="button"
            class="flex size-14 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-neutral-soft disabled:text-subtle"
            aria-label="Agregar un comensal"
            [disabled]="!puedeSumar()"
            (click)="cambiar.emit(clamp(comensales() + 1))"
          >
            <app-icon name="plus" [size]="24" />
          </button>
        </div>

        <p class="mt-4 text-xs text-muted">
          Mínimo 1 · máximo {{ mesa().capacidad }} (capacidad de la mesa)
        </p>

        <!-- appButton sets its own display, so the phone-only hiding lives on a wrapper. -->
        <div class="mt-6 hidden lg:block">
          <button appButton type="button" variant="primary" [block]="true" (click)="confirmar.emit()">
            <app-icon name="check" [size]="18" />Confirmar
          </button>
        </div>
      </div>
    </div>

    <!-- Phones and tablets: spacer so the fixed bar never covers the card, then the bar itself. -->
    <div class="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true"></div>
    <div
      class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:hidden"
    >
      <button appButton type="button" variant="primary" [block]="true" (click)="confirmar.emit()">
        <app-icon name="check" [size]="18" />Confirmar
      </button>
    </div>
  `,
})
export class ComensalesStepComponent {
  readonly mesa = input.required<MesaCard>();
  readonly comensales = input.required<number>();

  readonly cambiar = output<number>();
  readonly confirmar = output<void>();

  protected puedeRestar(): boolean {
    return puedeRestarComensal(this.comensales());
  }

  protected puedeSumar(): boolean {
    return puedeSumarComensal(this.comensales(), this.mesa().capacidad);
  }

  protected clamp(value: number): number {
    return clampComensales(value, this.mesa().capacidad);
  }
}
