import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

/** Centered full-page state (403, 404, empty...): icon tile, mono caption, title, text and an action slot. */
@Component({
  selector: 'app-state-panel',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-[70vh] items-center justify-center px-4 py-10' },
  template: `
    <div class="flex max-w-xl flex-col items-center text-center">
      <span class="flex size-16 items-center justify-center rounded-modal border border-line bg-card text-muted">
        <app-icon [name]="icon()" [size]="28" />
      </span>
      @if (caption()) {
        <p class="mt-5 font-mono text-xs uppercase tracking-widest text-subtle">{{ caption() }}</p>
      }
      <h1 class="mt-3 text-2xl font-bold tracking-tight">{{ heading() }}</h1>
      <p class="mt-3 text-sm leading-relaxed text-muted"><ng-content /></p>
      <div class="mt-6"><ng-content select="[actions]" /></div>
    </div>
  `,
})
export class StatePanelComponent {
  readonly icon = input.required<IconName>();
  readonly caption = input('');
  readonly heading = input.required<string>();
}
