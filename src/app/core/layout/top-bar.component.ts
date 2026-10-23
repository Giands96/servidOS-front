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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { NavItem } from '../auth/domain/navigation.rules';

/**
 * Chrome shown below `lg` (phones and tablets): brand, restaurant and user avatar on top, and a horizontally
 * scrollable row of pill links under them. Desktop keeps the sidebar, so the host is hidden from `lg`.
 * Purely presentational: the shell owns the session data and the logout.
 */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky top-0 z-20 block bg-ink text-white lg:hidden',
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
    '(window:resize)': 'updateFades()',
  },
  template: `
    <div class="flex items-center gap-3 px-4 pb-2.5 pt-3">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-control bg-brand"><app-icon name="chef" [size]="18" /></span>
      <div class="min-w-0 flex-1">
        <p class="font-display text-lg font-semibold leading-tight">ServidOS</p>
        <p class="truncate text-xs text-ink-muted">{{ tenantName() }}</p>
      </div>

      <div #userMenu class="relative">
        <button
          #avatar
          type="button"
          class="flex size-9 items-center justify-center rounded-full bg-ink-line text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Menú de usuario"
          aria-haspopup="menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()"
        >
          {{ initials() }}
        </button>
        @if (menuOpen()) {
          <div class="absolute right-0 top-full z-10 mt-2 w-56 rounded-card border border-line bg-card p-2 text-ink shadow-modal">
            <div class="px-2 py-1.5">
              <p class="truncate text-sm font-medium">{{ userName() }}</p>
              <p class="truncate text-xs text-muted">{{ role() }}</p>
            </div>
            <div role="menu" aria-label="Menú de usuario" class="mt-1 border-t border-line pt-1">
              <button
                #logoutItem
                type="button"
                role="menuitem"
                class="flex w-full items-center gap-2 rounded-control px-2 py-2 text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
                (click)="chooseLogout()"
              >
                <app-icon name="logout" [size]="16" />Cerrar sesión
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <div class="relative">
      <nav
        #strip
        aria-label="Principal"
        class="flex gap-2 overflow-x-auto overscroll-x-contain scroll-px-8 px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        (scroll)="updateFades()"
      >
        @for (item of items(); track item.route) {
          <a
            #pill
            class="flex shrink-0 items-center gap-2 rounded-full bg-ink-soft px-3.5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            [routerLink]="item.route"
            routerLinkActive="!bg-brand"
            (isActiveChange)="onPillActive($event, pill)"
          >
            <app-icon [name]="item.icon" [size]="16" />{{ item.label }}
          </a>
        }
      </nav>
      @if (fadeStart()) {
        <span class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-ink to-transparent" aria-hidden="true"></span>
      }
      @if (fadeEnd()) {
        <span class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-ink to-transparent" aria-hidden="true"></span>
      }
    </div>
  `,
})
export class TopBarComponent {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly userMenu = viewChild.required<ElementRef<HTMLElement>>('userMenu');
  private readonly avatar = viewChild.required<ElementRef<HTMLElement>>('avatar');
  private readonly logoutItem = viewChild<ElementRef<HTMLElement>>('logoutItem');
  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');

  readonly items = input.required<readonly NavItem[]>();
  readonly tenantName = input.required<string>();
  readonly initials = input.required<string>();
  readonly userName = input.required<string>();
  readonly role = input.required<string>();
  readonly logout = output<void>();

  protected readonly menuOpen = signal(false);
  /** Decorative edge fades: shown only on the side where more pills are hidden. */
  protected readonly fadeStart = signal(false);
  protected readonly fadeEnd = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenu());

    afterNextRender(() => this.updateFades());
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }
    this.menuOpen.set(true);
    // The item only exists once the menu has rendered.
    afterNextRender(() => this.logoutItem()?.nativeElement.focus(), { injector: this.injector });
  }

  protected onEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      this.avatar().nativeElement.focus();
    }
  }

  protected onDocumentClick(event: Event): void {
    if (this.menuOpen() && !this.userMenu().nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  protected chooseLogout(): void {
    this.closeMenu();
    this.logout.emit();
  }

  /** Keeps the pill of the current module visible inside the row; the row scrolls, never the page. */
  protected onPillActive(active: boolean, pill: HTMLElement): void {
    if (active && typeof pill.scrollIntoView === 'function') {
      pill.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  }

  protected updateFades(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.strip().nativeElement;
    // 1px tolerance: scrollLeft is fractional on high-DPI screens.
    this.fadeStart.set(scrollLeft > 1);
    this.fadeEnd.set(scrollLeft + clientWidth < scrollWidth - 1);
  }

  private closeMenu(): void {
    this.menuOpen.set(false);
  }
}
