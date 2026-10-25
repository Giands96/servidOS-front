import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { Mesa } from './mesas.types';

/** "Dadas de baja" table (design "Dadas de baja (Admin) · Error al reactivar"). Dumb: rows in, `reactivar` out. */
@Component({
  selector: 'app-mesas-inactivas',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="flex items-center gap-2 text-xs text-muted">
      <app-icon name="clock" [size]="14" />Las mesas dadas de baja no aparecen en la vista principal. Su historial de pedidos se
      conserva.
    </p>
    <div class="mt-3 overflow-x-auto rounded-card border border-line bg-card">
      <table class="w-full text-left text-sm">
        <thead class="text-xs font-semibold uppercase tracking-wide text-muted">
          <tr class="border-b border-line">
            <th scope="col" class="px-4 py-3">Mesa</th>
            <th scope="col" class="px-4 py-3">Capacidad</th>
            <th scope="col" class="px-4 py-3">Estado</th>
            @if (puedeReactivar()) {
              <th scope="col" class="px-4 py-3 text-right">Acción</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (mesa of mesas(); track mesa.mesaId) {
            @let error = errores()[mesa.mesaId];
            <tr class="border-b border-line last:border-b-0" [class.bg-danger-soft]="error">
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-3 font-medium">
                  <span
                    class="inline-flex size-8 items-center justify-center rounded-control border border-line bg-surface font-mono"
                  >
                    {{ mesa.numero }}
                  </span>
                  Mesa {{ mesa.numero }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted">
                <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <app-icon name="armchair" [size]="16" />{{ mesa.capacidad }} asientos
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-neutral-soft px-2.5 py-1 text-xs font-medium text-muted"
                >
                  <app-icon name="inbox" [size]="12" />Dada de baja
                </span>
                @if (error) {
                  <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" role="alert">
                    <app-icon name="alert" [size]="14" />{{ error }}
                  </p>
                }
              </td>
              @if (puedeReactivar()) {
                <td class="px-4 py-3 text-right">
                  <button
                    appButton
                    type="button"
                    variant="secondary"
                    [disabled]="ocupadoId() !== null"
                    [attr.aria-label]="'Reactivar mesa ' + mesa.numero"
                    (click)="reactivar.emit(mesa)"
                  >
                    <app-icon
                      [name]="ocupadoId() === mesa.mesaId ? 'spinner' : 'refresh'"
                      [size]="16"
                      [class.animate-spin]="ocupadoId() === mesa.mesaId"
                    />Reactivar
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MesasInactivasComponent {
  readonly mesas = input.required<readonly Mesa[]>();
  /** Reactivation is a write: off while the tenant is blocked (the tab stays readable). */
  readonly puedeReactivar = input(false);
  /** Table whose reactivation is in flight; every button waits for it. */
  readonly ocupadoId = input<number | null>(null);
  /** Last rejection per table, shown under its estado (design). */
  readonly errores = input<Readonly<Record<number, string>>>({});

  readonly reactivar = output<Mesa>();
}
