import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RestauranteApi } from '../../features/restaurante/data/restaurante.api';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { initialsOf, navEntriesFrom, navFor, roleLabel } from '../auth/domain/navigation.rules';
import { SessionStore } from '../auth/session.store';

/** Authenticated layout: role-filtered sidebar (no counters: no list endpoints exist yet) plus the page outlet. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col lg:flex-row">
      <aside class="flex shrink-0 flex-col bg-ink p-3 text-white lg:sticky lg:top-0 lg:h-screen lg:w-60">
        <div class="flex items-center gap-3 px-2 py-3">
          <span class="flex size-8 items-center justify-center rounded-control bg-brand"><app-icon name="chef" [size]="18" /></span>
          <span class="font-display text-lg font-semibold">ServidOS</span>
        </div>

        <div class="mt-3 rounded-card border border-ink-line px-3 py-2.5">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{{ tenantCaption() }}</p>
          <p class="mt-0.5 truncate text-sm font-medium">{{ tenantName() }}</p>
        </div>

        <nav class="mt-6 flex flex-1 flex-row flex-wrap gap-1 lg:flex-col lg:flex-nowrap" aria-label="Principal">
          @for (item of items(); track item.route) {
            <a
              class="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-ink-muted transition-colors hover:text-white"
              [routerLink]="item.route"
              routerLinkActive="bg-ink-soft !text-white"
            >
              <app-icon [name]="item.icon" />{{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-4 flex items-center gap-3 border-t border-ink-line px-2 pt-4">
          <span class="flex size-9 items-center justify-center rounded-full bg-ink-line text-xs font-semibold">{{ initials() }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ user()?.nombre }}</p>
            <p class="truncate text-xs text-ink-muted">{{ role() }}</p>
          </div>
          <button type="button" class="text-ink-muted hover:text-white" aria-label="Cerrar sesión" (click)="logout()">
            <app-icon name="logout" />
          </button>
        </div>
      </aside>

      <main class="min-w-0 flex-1"><router-outlet /></main>
    </div>
  `,
})
export class ShellLayout {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly user = this.session.user;
  private readonly entries = navEntriesFrom(this.router.config);
  protected readonly items = computed(() => navFor(this.user(), this.entries));
  protected readonly initials = computed(() => initialsOf(this.user()?.nombre ?? ''));
  protected readonly role = computed(() => {
    const rol = this.user()?.rol;
    return rol ? roleLabel(rol) : '';
  });

  protected readonly isPlatform = computed(() => this.session.scope() === 'plataforma');
  protected readonly tenantCaption = computed(() => (this.isPlatform() ? 'Nivel' : 'Restaurante'));
  private readonly restaurante = signal<string | null>(null);
  protected readonly tenantName = computed(() =>
    this.isPlatform() ? 'Plataforma' : (this.restaurante() ?? 'Mi restaurante'),
  );

  constructor() {
    if (this.session.scope() === 'restaurante') {
      inject(RestauranteApi)
        .actual()
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (r) => this.restaurante.set(r.nombre),
          error: () => this.restaurante.set(null),
        });
    }
  }

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigateByUrl('/login');
  }
}
