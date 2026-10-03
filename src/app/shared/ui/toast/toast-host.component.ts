import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from './toast.service';

/** Renders the ToastService queue as dark pills, bottom-center. Place once in the root component. */
@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4' },
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div
        class="pointer-events-auto flex max-w-lg items-start gap-3 rounded-card bg-ink px-4 py-3 text-sm text-white shadow-modal"
        [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
      >
        <app-icon
          [name]="toast.kind === 'error' ? 'alert' : 'clock'"
          [size]="18"
          [class]="toast.kind === 'error' ? 'text-brand' : 'text-ok-soft'"
        />
        <p class="flex-1">
          <span class="font-mono font-semibold">{{ toast.code }}</span>
          <span class="text-ink-muted"> · </span>{{ toast.message }}
        </p>
        <button type="button" class="text-ink-muted hover:text-white" aria-label="Cerrar" (click)="toasts.dismiss(toast.id)">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
