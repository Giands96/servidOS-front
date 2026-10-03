import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { homeFor } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

/** For /login: signed-in users go to their home instead. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(SessionStore).user();
  return user === null || inject(Router).parseUrl(homeFor(user));
};
