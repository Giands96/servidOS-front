import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { homeLabel, roleLabel } from '../../core/auth/domain/navigation.rules';
import { homeFor } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { ButtonComponent } from '../ui/button/button.component';
import { StatePanelComponent } from '../ui/state-panel/state-panel.component';

@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink, ButtonComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-state-panel icon="shieldOff" caption="403 · SIN PERMISO" heading="No tienes permiso para ver esta sección">
      Tu rol es {{ role() }}. Esta sección es exclusiva de otro rol; pídele acceso al administrador de tu restaurante.
      <a actions appButton variant="secondary" [routerLink]="home()">{{ homeText() }}</a>
    </app-state-panel>
  `,
})
export class SinPermisoPage {
  private readonly session = inject(SessionStore);

  protected readonly role = computed(() => {
    const rol = this.session.rol();
    return rol ? roleLabel(rol) : '';
  });
  protected readonly home = computed(() => homeFor(this.session.user()));
  protected readonly homeText = computed(() => {
    const label = homeLabel(this.session.user());
    return label ? `Ir a ${label}` : 'Volver al inicio';
  });
}
