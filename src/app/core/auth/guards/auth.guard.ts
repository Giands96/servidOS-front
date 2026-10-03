import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../session.store';

export const authGuard: CanActivateFn = () =>
  inject(SessionStore).isAuthenticated() || inject(Router).parseUrl('/login');
