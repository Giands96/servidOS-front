import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PasoNuevoPedido, progresoLocal } from '../domain/nuevo-pedido-local.rules';

/** "1 Mesa — 2 Comensales — 3 Productos" indicator of the Local flow. Dumb: renders `progresoLocal(paso)`. */
@Component({
  selector: 'app-progreso-local',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="flex items-center gap-2 text-sm" aria-label="Progreso del pedido">
      @for (item of items(); track item.paso; let i = $index; let last = $last) {
        <li class="flex items-center gap-2" [attr.aria-current]="item.state === 'current' ? 'step' : null">
          <span
            class="flex size-6 items-center justify-center rounded-full text-xs font-semibold"
            [class]="
              item.state === 'current'
                ? 'bg-brand text-white'
                : item.state === 'done'
                  ? 'bg-ink text-white'
                  : 'border border-line text-muted'
            "
          >
            @if (item.state === 'done') {
              <app-icon name="check" [size]="14" />
              <span class="sr-only">Completado:</span>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span [class]="item.state === 'todo' ? 'text-muted' : 'font-medium text-ink'">
            {{ item.label }}
          </span>
          @if (!last) {
            <span class="h-px w-4 bg-line sm:w-6" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
  `,
})
export class ProgresoLocalComponent {
  readonly paso = input.required<PasoNuevoPedido>();

  protected readonly items = computed(() => progresoLocal(this.paso()));
}
