import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { homeFor } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { ButtonComponent } from '../ui/button/button.component';
import { StatePanelComponent } from '../ui/state-panel/state-panel.component';

/** Non-admin view of a CANCELADA subscription: read-only, contact the administrator. */
@Component({
  selector: 'app-suspendido',
  imports: [RouterLink, ButtonComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-state-panel icon="lock" caption="SUSCRIPCIÓN CANCELADA" heading="Restaurante en modo solo lectura">
      Puedes consultar la información, pero no crear pedidos, registrar pagos ni editar el catálogo. Contacta al
      administrador de tu restaurante para renovar el plan.
      <a actions appButton variant="secondary" [routerLink]="home()">Seguir en solo lectura</a>
    </app-state-panel>
  `,
})
export class SuspendidoPage {
  private readonly session = inject(SessionStore);
  protected readonly home = computed(() => homeFor(this.session.user()));
}
