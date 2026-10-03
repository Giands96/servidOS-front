import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { homeFor } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

/** For the root path: sends the user to their home, or to /login when anonymous. */
export const homeRedirectGuard: CanActivateFn = () =>
  inject(Router).parseUrl(homeFor(inject(SessionStore).user()));
