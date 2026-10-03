import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SuscripcionApi } from '../data/suscripcion.api';
import { can } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

/**
 * For write routes: a CANCELADA tenant is sent to the paywall (admin) or the
 * suspended notice. On request error it fails open: this is UI convenience only,
 * the backend remains authoritative and still answers 402 on writes.
 */
export const subscriptionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = inject(SessionStore).user();
  return inject(SuscripcionApi)
    .actual()
    .pipe(
      map((s) =>
        s.estado === 'CANCELADA'
          ? router.parseUrl(can(user, 'restaurante.suscripcion.gestionar') ? '/paywall' : '/suspendido')
          : true,
      ),
      catchError(() => of(true)),
    );
};
