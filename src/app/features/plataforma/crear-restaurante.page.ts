import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { CrearRestauranteFormComponent } from './crear-restaurante-form.component';
import { restauranteCreadoMessage } from './domain/crear-restaurante.rules';
import { Restaurante } from './plataforma.types';

/**
 * Standalone create-restaurant screen for the platform ADMIN (who cannot see the list). After a creation or a
 * cancel the form is re-created, which resets its draft.
 */
@Component({
  selector: 'app-crear-restaurante-page',
  imports: [CrearRestauranteFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-screen bg-surface p-6">
      <header>
        <h1 class="text-3xl font-bold tracking-tight">Crear restaurante</h1>
        <p class="mt-1 text-sm text-muted">
          Registra un restaurante en la plataforma. El usuario administrador del restaurante se crea aparte.
        </p>
      </header>

      <div class="mt-6 max-w-xl overflow-hidden rounded-card border border-line bg-card">
        @for (key of [formKey()]; track key) {
          <app-crear-restaurante-form (created)="onCreated($event)" (cancelled)="reset()" />
        }
      </div>
    </section>
  `,
})
export class CrearRestaurantePage {
  private readonly toasts = inject(ToastService);

  /** Changing the key re-creates the form with a blank draft. */
  protected readonly formKey = signal(0);

  protected onCreated(restaurante: Restaurante): void {
    this.toasts.show('OK', restauranteCreadoMessage(restaurante.nombre), 'success');
    this.reset();
  }

  protected reset(): void {
    this.formKey.update((key) => key + 1);
  }
}
