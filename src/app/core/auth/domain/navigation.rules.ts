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

/** Declaration order is the sidebar order (same as the design). */
const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Pedidos', route: '/pedidos/nuevo', icon: 'receipt', action: 'pedidos.gestionar' },
  { label: 'Cocina', route: '/cocina', icon: 'flame', action: 'cocina.ver' },
  { label: 'Caja', route: '/caja', icon: 'wallet', action: 'pagos.registrar' },
  { label: 'Catálogo', route: '/catalogo', icon: 'book', action: 'catalogo.ver' },
  { label: 'Usuarios', route: '/usuarios', icon: 'users', action: 'usuarios.gestionar' },
  // Plan/subscription management screen: tenant ADMINISTRADOR only (user decision 2026-10-03).
  { label: 'Restaurante y plan', route: '/restaurante', icon: 'store', action: 'restaurante.suscripcion.gestionar' },
  { label: 'Restaurantes', route: '/plataforma/restaurantes', icon: 'building', action: 'plataforma.restaurantes.ver' },
  {
    label: 'Crear restaurante',
    route: '/plataforma/restaurantes/nuevo',
    icon: 'plus',
    action: 'plataforma.restaurantes.crear',
  },
];

/**
 * Sidebar entries for the session, filtered by can(). "Crear restaurante" is only listed on its own
 * (ADMIN): the SUPERADMIN reaches it from the Restaurantes screen, as in the design.
 */
export function navFor(user: Actor | null): NavItem[] {
  if (user === null) {
    return [];
  }
  const items = NAV_ITEMS.filter((item) => can(user, item.action));
  const hasList = items.some((item) => item.action === 'plataforma.restaurantes.ver');
  return hasList ? items.filter((item) => item.action !== 'plataforma.restaurantes.crear') : items;
}

/** Label of the nav item that is the user's home (for "Ir a ..." buttons); null without a home module. */
export function homeLabel(user: Actor | null): string | null {
  const home = homeFor(user);
  return NAV_ITEMS.find((item) => item.route === home)?.label ?? null;
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
