import { MeResponse, PlatformRol, RestauranteRol, Rol } from '../auth.types';

export type Scope = 'plataforma' | 'restaurante';

/** Derived from FRONTEND_CONTEXT sections 3, 5, 7 and 9 plus the 'Flujo - Recepcion Cocina' role matrix. */
export type Action =
  | 'plataforma.restaurantes.ver'
  | 'plataforma.restaurantes.crear'
  | 'restaurante.ver'
  | 'restaurante.suscripcion.gestionar'
  | 'catalogo.ver'
  | 'catalogo.editar'
  | 'catalogo.disponibilidad'
  | 'pedidos.gestionar'
  | 'pagos.registrar'
  | 'pagos.reembolsar'
  | 'usuarios.gestionar'
  | 'cocina.ver'
  | 'cocina.listo';

type Actor = Pick<MeResponse, 'rol' | 'restauranteId'>;

const PLATFORM_ROLES: readonly PlatformRol[] = ['SUPERADMIN', 'ADMIN', 'MODERADOR'];
const RESTAURANTE_ROLES: readonly RestauranteRol[] = [
  'ADMINISTRADOR',
  'RECEPCION',
  'COCINERO',
  'MESERO',
  'CAJERO',
  'REPARTIDOR',
];

const PLATFORM_ACTIONS: Partial<Record<Action, readonly PlatformRol[]>> = {
  'plataforma.restaurantes.ver': ['SUPERADMIN'],
  'plataforma.restaurantes.crear': ['SUPERADMIN', 'ADMIN'],
};

const RESTAURANTE_ACTIONS: Partial<Record<Action, readonly RestauranteRol[]>> = {
  'restaurante.ver': RESTAURANTE_ROLES,
  'catalogo.ver': RESTAURANTE_ROLES,
  'restaurante.suscripcion.gestionar': ['ADMINISTRADOR'],
  'catalogo.editar': ['ADMINISTRADOR'],
  'catalogo.disponibilidad': ['ADMINISTRADOR', 'COCINERO'],
  'pedidos.gestionar': ['ADMINISTRADOR', 'RECEPCION'],
  'pagos.registrar': ['ADMINISTRADOR'],
  'pagos.reembolsar': ['ADMINISTRADOR', 'RECEPCION'],
  'usuarios.gestionar': ['ADMINISTRADOR'],
  'cocina.ver': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
  'cocina.listo': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
};

const isPlatformRol = (rol: Rol): rol is PlatformRol => (PLATFORM_ROLES as readonly string[]).includes(rol);
const isRestauranteRol = (rol: Rol): rol is RestauranteRol =>
  (RESTAURANTE_ROLES as readonly string[]).includes(rol);

export function scopeOf(user: Pick<MeResponse, 'restauranteId'>): Scope {
  return user.restauranteId === null ? 'plataforma' : 'restaurante';
}

/**
 * UI-only permission check; the backend stays authoritative.
 * Platform roles never get restaurante actions and vice versa; the rol must
 * also match the session scope (platform iff restauranteId is null).
 */
export function can(user: Actor | null, action: Action): boolean {
  if (user === null) {
    return false;
  }
  const scope = scopeOf(user);
  if (scope === 'plataforma' && isPlatformRol(user.rol)) {
    return PLATFORM_ACTIONS[action]?.includes(user.rol) ?? false;
  }
  if (scope === 'restaurante' && isRestauranteRol(user.rol)) {
    return RESTAURANTE_ACTIONS[action]?.includes(user.rol) ?? false;
  }
  return false;
}

/** ADMINISTRADOR can never be granted via PATCH /usuarios/{id}/rol. */
export function grantableRestauranteRoles(): RestauranteRol[] {
  return RESTAURANTE_ROLES.filter((rol) => rol !== 'ADMINISTRADOR');
}

/** Strict hierarchy SUPERADMIN > ADMIN > MODERADOR: cannot grant equal or higher. */
export function canGrantPlatformRol(actor: PlatformRol, target: PlatformRol): boolean {
  return PLATFORM_ROLES.indexOf(actor) < PLATFORM_ROLES.indexOf(target);
}

/** Landing route after login/redirect for the given session. */
export function homeFor(user: Actor | null): string {
  if (user === null) {
    return '/login';
  }
  if (user.rol === 'SUPERADMIN' && can(user, 'plataforma.restaurantes.ver')) {
    return '/plataforma/restaurantes';
  }
  if (can(user, 'plataforma.restaurantes.crear')) {
    return '/plataforma/restaurantes/nuevo';
  }
  if (can(user, 'pedidos.gestionar')) {
    return '/pedidos/nuevo';
  }
  if (can(user, 'cocina.ver')) {
    return '/cocina';
  }
  return '/sin-modulos';
}

/** Single destination for a lapsed subscription (HTTP 402 or CANCELADA): admins can renew, others see a notice. */
export function subscriptionLapsedRoute(user: Actor | null): '/paywall' | '/suspendido' {
  return can(user, 'restaurante.suscripcion.gestionar') ? '/paywall' : '/suspendido';
}
