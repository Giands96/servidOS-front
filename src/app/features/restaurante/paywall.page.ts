import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Suscripcion } from '../../core/auth/data/suscripcion.api';
import { homeFor } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { RestauranteApi } from './data/restaurante.api';
import { estadoLabel, estadoVariant, formatPeriod } from './domain/subscription.rules';

/** 402 destination for ADMINISTRADOR: shows the last subscription and lets them renew it. */
@Component({
  selector: 'app-paywall',
  imports: [BadgeComponent, ButtonComponent, IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal heading="Renueva tu plan para seguir operando" tone="brand">
      <app-icon icon name="lock" [size]="24" />
      La suscripción de tu restaurante está cancelada. Puedes consultar la información, pero no crear pedidos, registrar
      pagos ni editar el catálogo.
      @if (suscripcion(); as s) {
        <dl class="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-muted">Plan</dt>
            <dd class="mt-1 font-semibold text-ink">Plan {{ s.planId }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Estado</dt>
            <dd class="mt-1"><app-badge [variant]="variant(s)">{{ label(s) }}</app-badge></dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Último periodo</dt>
            <dd class="mt-1 font-mono font-semibold text-ink">{{ period(s) }}</dd>
          </div>
        </dl>
      }
      <button footer appButton type="button" variant="ghost" (click)="continueReadOnly()">Seguir en solo lectura</button>
      <button footer appButton type="button" variant="primary" [disabled]="renewing()" (click)="renew()">
        <app-icon name="refresh" [size]="18" />Renovar suscripción
      </button>
    </app-modal>
  `,
})
export class PaywallPage {
  private readonly api = inject(RestauranteApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly renewing = signal(false);

  constructor() {
    this.api
      .suscripcion()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) => this.suscripcion.set(s),
        error: (e: unknown) => this.fail(e),
      });
  }

  protected label = (s: Suscripcion) => estadoLabel(s.estado);
  protected variant = (s: Suscripcion) => estadoVariant(s.estado);
  protected period = (s: Suscripcion) => formatPeriod(s.fechaInicio, s.fechaFin);

  protected continueReadOnly(): void {
    void this.router.navigateByUrl(homeFor(this.session.user()));
  }

  protected renew(): void {
    if (this.renewing()) {
      return;
    }
    this.renewing.set(true);
    this.api.renovar().subscribe({
      next: () => {
        this.toasts.show('200', 'Suscripción renovada', 'success');
        void this.router.navigateByUrl(homeFor(this.session.user()));
      },
      error: (e: unknown) => {
        this.renewing.set(false);
        this.fail(e);
      },
    });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.toasts.show(error.status, readApiError(error.error)?.message ?? 'No se pudo completar la operación');
    } else {
      this.toasts.show('Error', 'No se pudo completar la operación');
    }
  }
}
