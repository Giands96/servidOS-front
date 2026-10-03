import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Action, can } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

export const roleGuard =
  (action: Action): CanActivateFn =>
  () =>
    can(inject(SessionStore).user(), action) || inject(Router).parseUrl('/sin-permiso');
