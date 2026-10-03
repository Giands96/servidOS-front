import { aMe } from '../../../../testing/builders';
import { Rol } from '../auth.types';
import { homeLabel, initialsOf, navFor, roleLabel } from './navigation.rules';
import { can, homeFor } from './permissions.rules';

const tenant = (rol: Rol) => aMe({ rol, restauranteId: 7 });
const platform = (rol: Rol) => aMe({ rol, restauranteId: null });

const routesOf = (user: ReturnType<typeof aMe>) => navFor(user).map((item) => item.route);

describe('navFor', () => {
  it.each([
    ['ADMINISTRADOR', ['/pedidos/nuevo', '/cocina', '/caja', '/catalogo', '/usuarios', '/restaurante']],
    ['RECEPCION', ['/pedidos/nuevo', '/cocina', '/catalogo', '/restaurante']],
    ['COCINERO', ['/cocina', '/catalogo', '/restaurante']],
    ['MESERO', ['/catalogo', '/restaurante']],
    ['CAJERO', ['/catalogo', '/restaurante']],
    ['REPARTIDOR', ['/catalogo', '/restaurante']],
  ] as const)('tenant %s sees %j', (rol, expected) => {
    expect(routesOf(tenant(rol))).toEqual(expected);
  });

  it.each([
    ['SUPERADMIN', ['/plataforma/restaurantes']],
    ['ADMIN', ['/plataforma/restaurantes/nuevo']],
    ['MODERADOR', []],
  ] as const)('platform %s sees %j', (rol, expected) => {
    expect(routesOf(platform(rol))).toEqual(expected);
  });

  it('is empty for an anonymous session', () => {
    expect(navFor(null)).toEqual([]);
  });

  it('uses the design labels', () => {
    expect(navFor(tenant('ADMINISTRADOR')).map((i) => i.label)).toEqual([
      'Pedidos',
      'Cocina',
      'Caja',
      'Catálogo',
      'Usuarios',
      'Restaurante y plan',
    ]);
  });

  it.each(['ADMINISTRADOR', 'RECEPCION', 'COCINERO', 'MESERO'] as const)(
    'every item of %s passes can() for its own action',
    (rol) => {
      const user = tenant(rol);
      expect(navFor(user).every((item) => can(user, item.action))).toBe(true);
    },
  );
});

describe('homeLabel', () => {
  it.each([
    [tenant('RECEPCION'), 'Pedidos'],
    [tenant('COCINERO'), 'Cocina'],
    [tenant('ADMINISTRADOR'), 'Pedidos'],
    [platform('SUPERADMIN'), 'Restaurantes'],
    [platform('ADMIN'), 'Crear restaurante'],
  ])('labels the home of %j as %s', (user, expected) => {
    expect(homeLabel(user)).toBe(expected);
  });

  it('is null when the role has no home module', () => {
    expect(homeFor(tenant('MESERO'))).toBe('/sin-modulos');
    expect(homeLabel(tenant('MESERO'))).toBeNull();
    expect(homeLabel(null)).toBeNull();
  });
});

describe('roleLabel', () => {
  it.each([
    ['ADMINISTRADOR', 'Administrador'],
    ['RECEPCION', 'Recepción'],
    ['COCINERO', 'Cocinero'],
    ['SUPERADMIN', 'Superadmin'],
    ['MODERADOR', 'Moderador'],
  ] as const)('%s -> %s', (rol, label) => {
    expect(roleLabel(rol)).toBe(label);
  });
});

describe('initialsOf', () => {
  it.each([
    ['María Ríos', 'MR'],
    ['Equipo ServidOS', 'ES'],
    ['  jorge   quispe  perez ', 'JQ'],
    ['Cher', 'C'],
    ['', '?'],
  ])('%j -> %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
