import type { Routes } from '@angular/router';
import { MeResponse, Rol } from '../auth.types';
import { Action, can, homeFor } from './permissions.rules';

export type NavIcon = 'receipt' | 'flame' | 'wallet' | 'book' | 'users' | 'store' | 'building' | 'plus';

export interface NavItem {
  label: string;
  route: string;
  icon: NavIcon;
  /** Permission required to see (and open) the item. */
  action: Action;
}

type Actor = Pick<MeResponse, 'rol' | 'restauranteId'>;

/**
 * Shape of the `data` of a module route: the single place where its permission is declared.
 * Angular types route data loosely (`Record<string, any>`), so routes build it through `routeAccess()`
 * to get compile-time checking of the action and the nav entry.
 */
export interface RouteAccess {
  /** Permission required to enter the route (read by routeActionGuard and by the sidebar). */
  action?: Action;
  /** Present when the route is listed in the sidebar. */
  nav?: { label: string; icon: NavIcon };
  title?: string;
}

export const routeAccess = (access: RouteAccess): RouteAccess => access;

/**
 * Sidebar entries derived from the route config, in declaration order (= sidebar order), with absolute
 * paths. Fails closed: a route with `data.nav` but no `data.action` is never listed.
 */
export function navEntriesFrom(routes: Routes): NavItem[] {
  const out: NavItem[] = [];
  const walk = (list: Routes, prefix: string) => {
    for (const route of list) {
      const path = [prefix, route.path].filter((segment) => segment !== undefined && segment !== '').join('/');
      const data = route.data as RouteAccess | undefined;
      if (data?.nav && data.action) {
        out.push({ label: data.nav.label, icon: data.nav.icon, route: '/' + path, action: data.action });
      }
      walk(route.children ?? [], path);
    }
  };
  walk(routes, '');
  return out;
}

/**
 * Sidebar entries for the session: the entries the role may enter (can()). "Crear restaurante" is only
 * listed on its own (ADMIN): the SUPERADMIN reaches it from the Restaurantes screen, as in the design.
 */
export function navFor(user: Actor | null, entries: readonly NavItem[]): NavItem[] {
  if (user === null) {
    return [];
  }
  const items = entries.filter((item) => can(user, item.action));
  const hasList = items.some((item) => item.action === 'plataforma.restaurantes.ver');
  return hasList ? items.filter((item) => item.action !== 'plataforma.restaurantes.crear') : items;
}

/** Label of the nav item that is the user's home (for "Ir a ..." buttons); null without a home module. */
export function homeLabel(user: Actor | null, entries: readonly NavItem[]): string | null {
  const home = homeFor(user);
  return entries.find((item) => item.route === home)?.label ?? null;
}

const ROLE_LABELS: Record<Rol, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  MODERADOR: 'Moderador',
  ADMINISTRADOR: 'Administrador',
  RECEPCION: 'Recepción',
  COCINERO: 'Cocinero',
  MESERO: 'Mesero',
  CAJERO: 'Cajero',
  REPARTIDOR: 'Repartidor',
};

export function roleLabel(rol: Rol): string {
  return ROLE_LABELS[rol];
}

/** Up to two initials for the avatar; '?' for an empty name. */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter((part) => part !== '')
    .slice(0, 2)
    .map((part) => part[0].toUpperCase());
  return letters.length > 0 ? letters.join('') : '?';
}
