import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { FormatoExport } from './reportes.types';

/**
 * "Exportar" button with its menu (Excel / PDF). Presentational: it only reports the chosen format; the page runs
 * the download. Closes on a choice, Escape or a click outside, like the avatar menu of the top bar.
 */
@Component({
  selector: 'app-export-menu',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <button
      #trigger
      appButton
      variant="secondary"
      type="button"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [disabled]="busy()"
      (click)="toggle()"
    >
      <app-icon [name]="busy() ? 'spinner' : 'download'" [size]="16" [class.animate-spin]="busy()" />
      {{ busy() ? 'Exportando…' : 'Exportar' }}
    </button>
    @if (open()) {
      <div class="absolute right-0 top-full z-30 mt-2 w-72 rounded-card border border-line bg-card p-2 text-ink shadow-modal">
        <div class="px-2 py-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-subtle">Exportar lo que ves</p>
          <p class="mt-1 text-xs leading-snug text-muted">{{ line() }}</p>
        </div>
        <div role="menu" aria-label="Formato de exportación" class="mt-1 flex flex-col gap-1">
          <button
            #firstItem
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
            (click)="choose('XLSX')"
          >
            <span class="flex size-8 items-center justify-center rounded-control bg-ok-soft text-ok"><app-icon name="fileSpreadsheet" [size]="16" /></span>
            Excel <span class="font-mono text-xs font-normal text-subtle">.xlsx</span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
            (click)="choose('PDF')"
          >
            <span class="flex size-8 items-center justify-center rounded-control bg-danger-soft text-danger"><app-icon name="fileText" [size]="16" /></span>
            PDF <span class="font-mono text-xs font-normal text-subtle">.pdf</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class ExportMenuComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly firstItem = viewChild<ElementRef<HTMLElement>>('firstItem');

  /** What the file will contain, "Ventas · 19 – 25 oct 2026". */
  readonly line = input.required<string>();
  /** A download is running: the button spins and cannot be pressed again. */
  readonly busy = input(false);
  readonly exportar = output<FormatoExport>();

  protected readonly open = signal(false);

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    // The item only exists once the menu has rendered.
    afterNextRender(() => this.firstItem()?.nativeElement.focus(), { injector: this.injector });
  }

  protected choose(formato: FormatoExport): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
    this.exportar.emit(formato);
  }

  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
      this.trigger().nativeElement.focus();
    }
  }

  protected onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
