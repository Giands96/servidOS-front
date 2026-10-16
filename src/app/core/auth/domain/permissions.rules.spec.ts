import { aMe } from '../../../../testing/builders';
import { MeResponse, PlatformRol, ResumenSuscripcion, RestauranteRol, Rol } from '../auth.types';
import {
  Action,
  can,
  canGrantPlatformRol,
  grantableRestauranteRoles,
  homeFor,
  isTenantWriteBlocked,
  scopeOf,
  subscriptionLapsedRoute,
} from './permissions.rules';

const PLATFORM: PlatformRol[] = ['SUPERADMIN', 'ADMIN', 'MODERADOR'];
const RESTAURANTE: RestauranteRol[] = [
  'ADMINISTRADOR',
  'RECEPCION',
  'COCINERO',
  'MESERO',
  'CAJERO',
  'REPARTIDOR',
];

const ACTIONS: Action[] = [
  'plataforma.restaurantes.ver',
  'plataforma.restaurantes.crear',
  'plataforma.suscripcion.gestionar',
  'plataforma.restaurantes.estado',
  'restaurante.ver',
  'restaurante.suscripcion.gestionar',
  'catalogo.ver',
  'catalogo.editar',
  'catalogo.disponibilidad',
  'pedidos.gestionar',
  'pagos.registrar',
  'pagos.reembolsar',
  'usuarios.gestionar',
  'cocina.ver',
  'cocina.listo',
];

/** Allowed roles per action (FRONTEND_CONTEXT sections 3, 7, 9 and 'Flujo - Recepcion Cocina' role matrix). */
const ALLOWED: Record<Action, Rol[]> = {
  'plataforma.restaurantes.ver': ['SUPERADMIN'],
  'plataforma.restaurantes.crear': ['SUPERADMIN', 'ADMIN'],
  'plataforma.suscripcion.gestionar': ['SUPERADMIN'],
  'plataforma.restaurantes.estado': ['SUPERADMIN'],
  'restaurante.ver': RESTAURANTE,
  'restaurante.suscripcion.gestionar': ['ADMINISTRADOR'],
  'catalogo.ver': RESTAURANTE,
  'catalogo.editar': ['ADMINISTRADOR'],
  'catalogo.disponibilidad': ['ADMINISTRADOR', 'COCINERO'],
  'pedidos.gestionar': ['ADMINISTRADOR', 'RECEPCION'],
  'pagos.registrar': ['ADMINISTRADOR'],
  'pagos.reembolsar': ['ADMINISTRADOR', 'RECEPCION'],
  'usuarios.gestionar': ['ADMINISTRADOR'],
  'cocina.ver': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
  'cocina.listo': ['ADMINISTRADOR', 'RECEPCION', 'COCINERO'],
};

const userFor = (rol: Rol): Pick<MeResponse, 'rol' | 'restauranteId'> => ({
  rol,
  restauranteId: PLATFORM.includes(rol as PlatformRol) ? null : 7,
});

describe('can (role x action)', () => {
  const cases = [...PLATFORM, ...RESTAURANTE].flatMap((rol) =>
    ACTIONS.map((action) => [rol, action, ALLOWED[action].includes(rol)] as const),
  );

  it.each(cases)('%s / %s -> %s', (rol, action, expected) => {
    expect(can(userFor(rol), action)).toBe(expected);
  });

  it('denies everything for a null user', () => {
    for (const action of ACTIONS) {
      expect(can(null, action)).toBe(false);
    }
  });

  it('denies restaurante actions when a restaurante rol has no tenant (scope mismatch)', () => {
    expect(can({ rol: 'ADMINISTRADOR', restauranteId: null }, 'pedidos.gestionar')).toBe(false);
  });

  it('denies plataforma actions when a platform rol carries a tenant', () => {
    expect(can({ rol: 'SUPERADMIN', restauranteId: 7 }, 'plataforma.restaurantes.ver')).toBe(false);
  });
});

describe('scopeOf', () => {
  it('is plataforma iff restauranteId is null', () => {
    expect(scopeOf({ restauranteId: null })).toBe('plataforma');
    expect(scopeOf({ restauranteId: 7 })).toBe('restaurante');
  });
});

describe('grantableRestauranteRoles', () => {
  it('lists every restaurante rol except ADMINISTRADOR', () => {
    expect(grantableRestauranteRoles()).toEqual(['RECEPCION', 'COCINERO', 'MESERO', 'CAJERO', 'REPARTIDOR']);
  });
});

describe('canGrantPlatformRol', () => {
  it.each([
    ['SUPERADMIN', 'ADMIN', true],
    ['SUPERADMIN', 'MODERADOR', true],
    ['SUPERADMIN', 'SUPERADMIN', false],
    ['ADMIN', 'MODERADOR', true],
    ['ADMIN', 'ADMIN', false],
    ['ADMIN', 'SUPERADMIN', false],
    ['MODERADOR', 'MODERADOR', false],
    ['MODERADOR', 'ADMIN', false],
    ['MODERADOR', 'SUPERADMIN', false],
  ] as const)('%s granting %s -> %s', (actor, target, expected) => {
    expect(canGrantPlatformRol(actor, target)).toBe(expected);
  });
});

describe('homeFor', () => {
  it.each([
    ['SUPERADMIN', '/plataforma/restaurantes'],
    ['ADMIN', '/plataforma/restaurantes/nuevo'],
    ['MODERADOR', '/sin-modulos'],
    ['ADMINISTRADOR', '/pedidos'],
    ['RECEPCION', '/pedidos'],
    ['COCINERO', '/cocina'],
    ['MESERO', '/sin-modulos'],
    ['CAJERO', '/sin-modulos'],
    ['REPARTIDOR', '/sin-modulos'],
  ] as const)('%s -> %s', (rol, expected) => {
    expect(homeFor(userFor(rol))).toBe(expected);
  });

  it('falls back to /login for a null user', () => {
    expect(homeFor(null)).toBe('/login');
  });
});

describe('subscriptionLapsedRoute', () => {
  it.each([
    ['ADMINISTRADOR', '/paywall'],
    ['RECEPCION', '/suspendido'],
    ['MESERO', '/suspendido'],
  ] as const)('%s -> %s', (rol, expected) => {
    expect(subscriptionLapsedRoute(userFor(rol))).toBe(expected);
  });

  it('sends a null user to /suspendido', () => {
    expect(subscriptionLapsedRoute(null)).toBe('/suspendido');
  });
});

describe('isTenantWriteBlocked', () => {
  const subscription = (overrides: Partial<ResumenSuscripcion> = {}): ResumenSuscripcion => ({
    ...aMe().suscripcion!,
    ...overrides,
  });

  it.each([
    ['healthy tenant (ACTIVO + ACTIVA)', aMe(), false],
    ['restaurant INACTIVO', aMe({ restauranteEstado: 'INACTIVO' }), true],
    ['no subscription', aMe({ suscripcion: null }), true],
    ['ACTIVA vencida', aMe({ suscripcion: subscription({ estado: 'ACTIVA', vencida: true }) }), true],
    ['CANCELADA vencida', aMe({ suscripcion: subscription({ estado: 'CANCELADA', vencida: true }) }), true],
    [
      'CANCELADA not vencida (operates until fechaFin)',
      aMe({ suscripcion: subscription({ estado: 'CANCELADA', vencida: false }) }),
      false,
    ],
    [
      'INACTIVO wins over a healthy subscription',
      aMe({ restauranteEstado: 'INACTIVO', suscripcion: subscription() }),
      true,
    ],
    [
      'platform session (no tenant, even with null estado/suscripcion)',
      aMe({ rol: 'SUPERADMIN', restauranteId: null, restauranteEstado: null, suscripcion: null }),
      false,
    ],
  ] as const)('%s -> blocked: %s', (_name, user, expected) => {
    expect(isTenantWriteBlocked(user)).toBe(expected);
  });

  it('does not block a null user (authGuard owns anonymous sessions)', () => {
    expect(isTenantWriteBlocked(null)).toBe(false);
  });

  it('fails open when /auth/me omits suscripcion (unknown is not "no subscription")', () => {
    const { suscripcion: _omitted, ...withoutSubscription } = aMe();
    expect(isTenantWriteBlocked(withoutSubscription as ReturnType<typeof aMe>)).toBe(false);
  });
});
