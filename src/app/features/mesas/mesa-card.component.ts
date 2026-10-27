import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ocupacionLabel } from './domain/mesas.rules';
import { Mesa } from './mesas.types';

/** One table of the Mesas grid (design "Components — Mesas"). Dumb: actions are projected with `[actions]`. */
@Component({
  selector: 'app-mesa-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="touch-lg flex h-full flex-col rounded-card border p-4"
      [class]="libre() ? 'border-line bg-card text-ink' : 'border-ink bg-ink text-white'"
      [attr.aria-label]="ariaLabel()"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-wide"
            [class]="libre() ? 'text-muted' : 'text-ink-muted'"
          >
            Mesa
          </p>
          <p class="font-mono text-4xl font-bold leading-tight">{{ mesa().numero }}</p>
        </div>
        @if (libre()) {
          <span
            class="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"
          >
            <app-icon name="check" [size]="12" />Libre
          </span>
        } @else {
          <span
            class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
          >
            <app-icon name="users" [size]="12" />Ocupada
          </span>
        }
      </div>
      <p
        class="mt-4 flex items-center gap-2 border-t pt-3 text-xs"
        [class]="libre() ? 'border-line text-muted' : 'border-ink-line text-ink-muted'"
      >
        <app-icon name="armchair" [size]="16" />
        <span class="font-mono text-sm font-semibold" [class]="libre() ? 'text-ink' : 'text-white'">
          {{ mesa().comensales ?? '–' }}/{{ mesa().capacidad }}
        </span>
        comensales
      </p>
      <ng-content select="[actions]" />
    </article>
  `,
})
export class MesaCardComponent {
  readonly mesa = input.required<Mesa>();

  protected readonly libre = computed(() => this.mesa().estado === 'LIBRE');
  protected readonly ariaLabel = computed(() => {
    const m = this.mesa();
    return `Mesa ${m.numero}, ${this.libre() ? 'libre' : 'ocupada'}, ${ocupacionLabel(m)}`;
  });
}
