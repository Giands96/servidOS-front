import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { homeFor } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { parseRetryAfter } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { countdownProgress, formatCountdown, loginErrorMessage, marksFields } from './domain/login.rules';

/** Used when a 429 arrives without a usable Retry-After header (the backend limit is per minute). */
const DEFAULT_RETRY_SECONDS = 60;

/** Orchestrates the login form; message/countdown rules live in domain/login.rules.ts. */
@Component({
  selector: 'app-login',
  imports: [ButtonComponent, IconComponent, ModalComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="grid min-h-screen lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <aside class="relative hidden flex-col justify-between overflow-hidden bg-ink p-8 text-white lg:flex">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgb(217_72_15/0.45),transparent_60%)]"
        ></div>
        <div class="relative flex items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-control bg-brand"><app-icon name="chef" /></span>
          <span class="text-xl font-semibold">ServidOS</span>
        </div>
        <div class="relative">
          <h2 class="max-w-md text-4xl font-bold leading-tight tracking-tight">Salón, cocina y caja en el mismo turno.</h2>
          <ul class="mt-8 space-y-3 text-sm text-white/80">
            <li class="flex items-center gap-3"><app-icon name="receipt" class="text-brand" />Pedidos de mesa, delivery y recojo</li>
            <li class="flex items-center gap-3"><app-icon name="flame" class="text-brand" />Cola de cocina que se actualiza sola</li>
            <li class="flex items-center gap-3"><app-icon name="wallet" class="text-brand" />Cobros en efectivo, tarjeta, Yape y Plin</li>
          </ul>
        </div>
        <p class="relative text-xs text-white/50">© 2026 ServidOS · Soporte: soporte&#64;servidos.pe</p>
      </aside>

      <section class="flex items-center justify-center px-4 py-10 sm:px-8">
        <div class="w-full max-w-md">
          <h1 class="text-3xl font-bold tracking-tight">Inicia sesión</h1>
          <p class="mt-2 text-sm text-muted">Usa el correo que te dio el administrador de tu restaurante.</p>

          @if (rateLimited()) {
            <div class="mt-6 rounded-card border border-warn/25 bg-warn-soft p-4 text-warn" role="alert">
              <p class="flex items-center gap-2 text-sm font-semibold">
                <app-icon name="hourglass" [size]="18" />Demasiados intentos de inicio de sesión
              </p>
              <p class="mt-2 text-sm">
                Por seguridad pausamos el acceso desde esta red. Podrás intentarlo de nuevo cuando termine la cuenta regresiva.
              </p>
              <div class="mt-3 h-1 overflow-hidden rounded-full bg-warn/15">
                <div class="h-full rounded-full bg-warn" [style.width.%]="progress() * 100"></div>
              </div>
            </div>
          } @else if (errorMessage()) {
            <div class="mt-6 flex items-center gap-2 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              <app-icon name="alert" [size]="18" />{{ errorMessage() }}
            </div>
          }

          <form class="mt-6 space-y-5" (submit)="submit($event)">
            <app-text-field
              label="Correo electrónico"
              name="email"
              type="email"
              autocomplete="username"
              [required]="true"
              [invalid]="fieldsInvalid()"
              [disabled]="rateLimited()"
              [(value)]="email"
            />
            <app-text-field
              label="Contraseña"
              name="password"
              type="password"
              autocomplete="current-password"
              [required]="true"
              [invalid]="fieldsInvalid()"
              [disabled]="rateLimited()"
              [(value)]="password"
            />
            <button appButton type="submit" variant="primary" [block]="true" [disabled]="rateLimited() || submitting()">
              @if (rateLimited()) {
                <app-icon name="timer" [size]="18" /><span class="font-mono">Reintentar en {{ countdownLabel() }}</span>
              } @else {
                Ingresar
              }
            </button>
          </form>

          <p class="mt-6 text-xs text-subtle">
            ¿Olvidaste tu contraseña? Pide al administrador de tu restaurante que la restablezca.
          </p>
        </div>
      </section>
    </main>

    @if (expired() && !noticeDismissed()) {
      <app-modal heading="Tu sesión expiró" tone="neutral">
        <app-icon icon name="clock" [size]="24" />
        No pudimos renovarla automáticamente. Inicia sesión otra vez para continuar; lo que no se guardó se perderá.
        <button footer appButton type="button" variant="primary" [block]="true" (click)="noticeDismissed.set(true)">
          <app-icon name="login" [size]="18" />Volver a iniciar sesión
        </button>
      </app-modal>
    }
  `,
})
export class LoginPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly expired = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('expired') === '1');
  protected readonly noticeDismissed = signal(false);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly fieldsInvalid = signal(false);

  private readonly retryTotal = signal(0);
  private readonly retryRemaining = signal(0);
  protected readonly rateLimited = computed(() => this.retryRemaining() > 0);
  protected readonly countdownLabel = computed(() => formatCountdown(this.retryRemaining()));
  protected readonly progress = computed(() => countdownProgress(this.retryRemaining(), this.retryTotal()));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting() || this.rateLimited()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.fieldsInvalid.set(false);
    try {
      await this.session.login({ email: this.email().trim(), password: this.password() });
      await this.router.navigateByUrl(homeFor(this.session.user()));
    } catch (error) {
      this.handleFailure(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private handleFailure(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : -1;
    const body = error instanceof HttpErrorResponse ? error.error : null;
    if (status === 429 && error instanceof HttpErrorResponse) {
      const seconds = parseRetryAfter(error.headers.get('Retry-After'), new Date()) ?? DEFAULT_RETRY_SECONDS;
      this.startCountdown(Math.max(1, seconds));
      return;
    }
    this.fieldsInvalid.set(marksFields(status));
    this.errorMessage.set(loginErrorMessage(status, body));
  }

  private startCountdown(seconds: number): void {
    this.stopTimer();
    const deadline = Date.now() + seconds * 1000;
    this.retryTotal.set(seconds);
    this.retryRemaining.set(seconds);
    this.timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.retryRemaining.set(remaining);
      if (remaining === 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
