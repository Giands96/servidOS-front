import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'ok' | 'info' | 'warn' | 'flow' | 'danger' | 'neutral';

const VARIANTS: Record<BadgeVariant, string> = {
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  flow: 'bg-flow-soft text-flow',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-neutral',
};

/** Status pill with a leading dot (activa, pendiente, cancelada...). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: '<span class="size-1.5 rounded-full bg-current"></span><ng-content />',
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');

  protected readonly classes = computed(
    () => `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[this.variant()]}`,
  );
}
