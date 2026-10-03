import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { homeFor } from '../../core/auth/domain/permissions.rules';
import { SessionStore } from '../../core/auth/session.store';
import { ButtonComponent } from '../ui/button/button.component';
import { StatePanelComponent } from '../ui/state-panel/state-panel.component';

/** Also reachable anonymously (root wildcard), so it must not depend on a session. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-state-panel icon="search" caption="404 · NO ENCONTRADO" heading="Esta página no existe">
      La dirección que buscas no existe o fue movida.
      <a actions appButton variant="secondary" [routerLink]="home()">Volver al inicio</a>
    </app-state-panel>
  `,
})
export class NotFoundPage {
  private readonly session = inject(SessionStore);
  protected readonly home = computed(() => homeFor(this.session.user()));
}
