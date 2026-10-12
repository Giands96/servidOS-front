import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isTenantWriteBlocked, subscriptionLapsedRoute } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

/**
 * For write routes: a blocked tenant (restaurant INACTIVO, no subscription or vencida,
 * per GET /auth/me) is sent to the paywall (admin) or the suspended notice. It decides
 * from the session user without any request: this is UI convenience only, the backend
 * remains authoritative and still answers 402 on writes.
 */
export const subscriptionGuard: CanActivateFn = () => {
  const user = inject(SessionStore).user();
  return isTenantWriteBlocked(user) ? inject(Router).parseUrl(subscriptionLapsedRoute(user)) : true;
};
