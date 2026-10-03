import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/** Labelled text input with an error message. Two-way bind with `[(value)]`. */
@Component({
  selector: 'app-text-field',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label class="mb-1.5 block text-sm font-medium text-ink" [for]="id">{{ label() }}</label>
    <input
      class="w-full rounded-control border bg-card px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink disabled:bg-surface disabled:text-muted"
      [class.border-line]="!error()"
      [class.border-danger]="error()"
      [id]="id"
      [name]="name()"
      [type]="type()"
      [attr.autocomplete]="autocomplete()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [attr.aria-invalid]="error() ? 'true' : null"
      [attr.aria-describedby]="error() ? id + '-error' : null"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
    />
    @if (error()) {
      <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" [id]="id + '-error'" role="alert">
        <app-icon name="alert" [size]="14" />
        {{ error() }}
      </p>
    }
  `,
})
export class TextFieldComponent {
  protected readonly id = `app-field-${nextId++}`;

  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input<string | null>(null);
  readonly placeholder = input('');
  readonly error = input<string | null>(null);
  readonly disabled = input(false);
  readonly value = model('');
}
