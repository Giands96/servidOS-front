import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

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
 *
 * Two layouts: the default confirmation one (icon tile + heading + muted text) and `form`, a header row with a
 * close button (`closed` output) over an unpadded body that the projected form lays out itself (it brings its own
 * footer, so the `[footer]` slot is hidden when empty).
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed inset-0 z-40 flex items-center justify-center bg-ink/55 p-4' },
  template: `
    <div
      class="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-modal bg-card shadow-modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
    >
      @if (form()) {
        <div class="flex items-center justify-between gap-4 border-b border-line px-4 py-5 sm:px-6">
          <h2 class="text-xl font-bold tracking-tight" [id]="titleId">{{ heading() }}</h2>
          <button
            type="button"
            class="rounded-control p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Cerrar"
            (click)="closed.emit()"
          >
            <app-icon name="x" [size]="22" />
          </button>
        </div>
      }
      <div [class]="form() ? 'min-h-0 overflow-y-auto' : 'p-6'">
        @if (!form()) {
          <div class="mb-4 flex size-12 items-center justify-center rounded-card" [class]="tileClass()">
            <ng-content select="[icon]" />
          </div>
          <h2 class="text-2xl font-bold tracking-tight" [id]="titleId">{{ heading() }}</h2>
        }
        <div [class]="form() ? '' : 'mt-2 text-sm leading-relaxed text-muted'"><ng-content /></div>
      </div>
      <div
        class="flex flex-wrap items-center gap-3 border-t border-line bg-surface/60 px-4 py-4 sm:px-6 empty:hidden"
        [class]="form() ? 'justify-end' : 'justify-between'"
      >
        <ng-content select="[footer]" />
      </div>
    </div>
  `,
})
export class ModalComponent {
  protected readonly titleId = `app-modal-title-${nextId++}`;

  readonly heading = input.required<string>();
  readonly tone = input<ModalTone>('neutral');
  /** Form layout: header row with a close button instead of the icon tile. */
  readonly form = input(false);
  /** Emitted by the close button of the `form` layout. */
  readonly closed = output<void>();

  protected readonly tileClass = computed(() => TILE[this.tone()]);
}
