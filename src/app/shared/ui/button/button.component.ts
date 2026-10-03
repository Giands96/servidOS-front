import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong disabled:hover:bg-brand',
  secondary: 'border border-line bg-card text-ink hover:bg-surface',
  destructive: 'bg-danger text-white hover:bg-danger-strong',
  ghost: 'text-muted hover:text-ink',
};

/** Apply to native elements: `<button appButton variant="secondary">`. */
@Component({
  selector: 'button[appButton], a[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: '<ng-content />',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly block = input(false);

  protected readonly classes = computed(
    () => `${BASE} ${VARIANTS[this.variant()]}${this.block() ? ' w-full' : ''}`,
  );
}
