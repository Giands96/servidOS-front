import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ModalTone = 'neutral' | 'brand' | 'danger';

const TILE: Record<ModalTone, string> = {
  neutral: 'bg-surface text-ink',
  brand: 'bg-brand-soft text-brand',
  danger: 'bg-danger-soft text-danger',
};

let nextId = 0;

/**
 * Centered modal shell. Slots: `[icon]` (inside the tile), default (body), `[footer]`.
 * The parent decides whether it is rendered (`@if`).
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed inset-0 z-40 flex items-center justify-center bg-ink/55 p-4' },
  template: `
    <div
      class="w-full max-w-xl overflow-hidden rounded-modal bg-card shadow-modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
    >
      <div class="p-6">
        <div class="mb-4 flex size-12 items-center justify-center rounded-card" [class]="tileClass()">
          <ng-content select="[icon]" />
        </div>
        <h2 class="text-2xl font-bold tracking-tight" [id]="titleId">{{ heading() }}</h2>
        <div class="mt-2 text-sm leading-relaxed text-muted"><ng-content /></div>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-line bg-surface/60 px-6 py-4">
        <ng-content select="[footer]" />
      </div>
    </div>
  `,
})
export class ModalComponent {
  protected readonly titleId = `app-modal-title-${nextId++}`;

  readonly heading = input.required<string>();
  readonly tone = input<ModalTone>('neutral');

  protected readonly tileClass = computed(() => TILE[this.tone()]);
}
