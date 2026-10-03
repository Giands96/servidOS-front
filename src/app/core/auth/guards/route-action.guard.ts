import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RouteAccess } from '../domain/navigation.rules';
import { can } from '../domain/permissions.rules';
import { SessionStore } from '../session.store';

/**
 * Guards a route with the permission it declares in `data.action` (the same value the sidebar is derived
 * from). Fails closed: a route without an action is denied.
 */
export const routeActionGuard: CanActivateFn = (route) => {
  const action = (route.data as RouteAccess | undefined)?.action;
  if (action !== undefined && can(inject(SessionStore).user(), action)) {
    return true;
  }
  return inject(Router).parseUrl('/sin-permiso');
};
