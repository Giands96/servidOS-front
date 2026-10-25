import { MeResponse, PlatformRol, RestauranteRol, Rol } from '../auth.types';

export type Scope = 'plataforma' | 'restaurante';

/** Derived from FRONTEND_CONTEXT sections 3, 5, 7 and 9 plus the 'Flujo - Recepcion Cocina' role matrix. */
export type Action =
  | 'plataforma.restaurantes.ver'
  | 'plataforma.restaurantes.crear'
  | 'plataforma.suscripcion.gestionar'
  | 'plataforma.restaurantes.estado'
  | 'restaurante.ver'
  | 'restaurante.suscripcion.gestionar'
  | 'catalogo.ver'
  | 'catalogo.editar'
  | 'catalogo.disponibilidad'
  | 'pedidos.gestionar'
  | 'pagos.registrar'
  | 'pagos.reembolsar'
  | 'usuarios.gestionar'
  | 'reportes.ver'
  | 'cocina.ver'
  | 'cocina.listo'
  | 'mesas.ver'
  | 'mesas.operar'
  | 'mesas.gestionar';

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
  'plataforma.suscripcion.gestionar': ['SUPERADMIN'],
  'plataforma.restaurantes.estado': ['SUPERADMIN'],
};

const RESTAURANTE_ACTIONS: Partial<Record<Action, readonly RestauranteRol[]>> = {
  'restaurante.ver': RESTAURANTE_ROLES,
  'catalogo.ver': RESTAURANTE_ROLES,
  'restaurante.suscripcion.gestionar': ['ADMINISTRADOR'],
  'catalogo.editar': ['ADMINISTRADOR'],
  'catalogo.disponibilidad': ['ADMINISTRADOR', 'COCINERO'],
  'pedidos.gestionar': ['ADMINISTRADOR', 'RECEPCION'],
  'pagos.registrar': ['ADMINISTRADOR', 'RECEPCION', 'CAJERO'],
  'pagos.reembolsar': ['ADMINISTRADOR', 'RECEPCION'],
  'usuarios.gestionar': ['ADMINISTRADOR'],
  'reportes.ver': ['ADMINISTRADOR'],
  'cocina.ver': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
  'cocina.listo': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
  // Mirror of MesaController: everyone who works the floor reads, the floor staff seats/frees, the admin manages.
  'mesas.ver': ['ADMINISTRADOR', 'RECEPCION', 'CAJERO', 'MESERO'],
  'mesas.operar': ['ADMINISTRADOR', 'RECEPCION', 'MESERO'],
  'mesas.gestionar': ['ADMINISTRADOR'],
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
  // The orders list, not /pedidos/nuevo: the list has no subscriptionGuard, so a blocked tenant can always land here.
  if (can(user, 'pedidos.gestionar')) {
    return '/pedidos';
  }
  if (can(user, 'cocina.ver')) {
    return '/cocina';
  }
  if (can(user, 'pagos.registrar')) {
    return '/caja';
  }
  // The waiter's floor: only roles without orders, kitchen or till reach this line (MESERO).
  if (can(user, 'mesas.operar')) {
    return '/mesas';
  }
  return '/sin-modulos';
}

/** Single destination for a lapsed subscription (HTTP 402 or a blocked tenant): admins can renew, others see a notice. */
export function subscriptionLapsedRoute(user: Actor | null): '/paywall' | '/suspendido' {
  return can(user, 'restaurante.suscripcion.gestionar') ? '/paywall' : '/suspendido';
}

/**
 * Contract section 5: a tenant is blocked for writes when its restaurant is INACTIVO,
 * it has no subscription, or the subscription is vencida. A CANCELADA subscription that
 * is not vencida does NOT block (the restaurant operates until fechaFin inclusive).
 * UI shortcut only: HTTP 402 stays the source of truth.
 * Platform sessions (restauranteId null) and a null user are never blocked here; anonymous
 * sessions are handled by authGuard and the backend remains authoritative.
 */
export function isTenantWriteBlocked(
  user: Pick<MeResponse, 'restauranteId' | 'restauranteEstado' | 'suscripcion'> | null,
): boolean {
  if (user === null || scopeOf(user) === 'plataforma') {
    return false;
  }
  // `?.`: a response without the field (unknown) fails open instead of throwing inside the guard.
  return user.restauranteEstado === 'INACTIVO' || user.suscripcion === null || user.suscripcion?.vencida === true;
}
