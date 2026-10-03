import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { roleLabel } from '../../core/auth/domain/navigation.rules';
import { SessionStore } from '../../core/auth/session.store';
import { StatePanelComponent } from '../ui/state-panel/state-panel.component';

@Component({
  selector: 'app-sin-modulos',
  imports: [StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-state-panel icon="inbox" heading="Sin módulos habilitados">
      Tu rol{{ role() ? ' (' + role() + ')' : '' }} todavía no tiene módulos habilitados. Pídele al administrador de tu
      restaurante que revise tu acceso.
    </app-state-panel>
  `,
})
export class SinModulosPage {
  private readonly session = inject(SessionStore);
  protected readonly role = computed(() => {
    const rol = this.session.rol();
    return rol ? roleLabel(rol) : '';
  });
}
