import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { OPCIONES_TIPO } from '../domain/nuevo-pedido-local.rules';
import { tipoIcon } from '../domain/pedidos.rules';
import { TipoPedido } from '../pedidos.types';

/** Step 0 of the new order: three large options. Dumb: it only emits the chosen tipo. */
@Component({
  selector: 'app-tipo-pedido-step',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto mt-10 max-w-4xl text-center">
      <h2 class="text-2xl font-bold tracking-tight">¿Qué tipo de pedido es?</h2>
      <p class="mt-1 text-sm text-muted">Elige una opción para continuar</p>

      <ul class="mt-8 grid gap-4 text-left sm:grid-cols-3">
        @for (opcion of opciones; track opcion.tipoPedido) {
          <li>
            <button
              type="button"
              class="flex h-full w-full flex-col gap-4 rounded-card border border-line bg-card p-6 text-left transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              (click)="elegir.emit(opcion.tipoPedido)"
            >
              <span
                class="flex size-12 items-center justify-center rounded-card bg-brand-soft text-brand"
              >
                @if (opcion.icon; as icon) {
                  <app-icon [name]="icon" [size]="24" />
                }
              </span>
              <span>
                <span class="block text-lg font-semibold">{{ opcion.label }}</span>
                <span class="mt-1 block text-sm text-muted">{{ opcion.descripcion }}</span>
              </span>
              <span
                class="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted"
              >
                {{ opcion.pie }}
                <app-icon name="arrowRight" [size]="16" />
              </span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
})
export class TipoPedidoStepComponent {
  readonly elegir = output<TipoPedido>();

  protected readonly opciones = OPCIONES_TIPO.map((opcion) => ({
    ...opcion,
    icon: tipoIcon(opcion.tipoPedido),
  }));
}
