import { aMe } from '../../../../testing/builders';
import { Rol } from '../auth.types';
import { Routes } from '@angular/router';
import { routes } from '../../../app.routes';
import { homeLabel, initialsOf, navEntriesFrom, navFor, roleLabel } from './navigation.rules';
import { can, homeFor } from './permissions.rules';

const entries = navEntriesFrom(routes);

const tenant = (rol: Rol) => aMe({ rol, restauranteId: 7 });
const platform = (rol: Rol) => aMe({ rol, restauranteId: null });

const routesOf = (user: ReturnType<typeof aMe>) => navFor(user, entries).map((item) => item.route);

describe('navEntriesFrom', () => {
  it('builds absolute paths from nested children and keeps declaration order', () => {
    const config: Routes = [
      { path: 'login' },
      {
        path: '',
        children: [
          { path: 'b', data: { action: 'cocina.ver', nav: { label: 'B', icon: 'flame' } } },
          {
            path: 'plataforma',
            children: [
              {
                path: 'restaurantes',
                data: { action: 'plataforma.restaurantes.ver', nav: { label: 'R', icon: 'building' } },
              },
            ],
          },
          { path: 'a/nuevo', data: { action: 'catalogo.ver', nav: { label: 'A', icon: 'book' } } },
        ],
      },
    ];
    expect(navEntriesFrom(config).map((e) => [e.route, e.label, e.action])).toEqual([
      ['/b', 'B', 'cocina.ver'],
      ['/plataforma/restaurantes', 'R', 'plataforma.restaurantes.ver'],
      ['/a/nuevo', 'A', 'catalogo.ver'],
    ]);
  });

  it('ignores routes without data.nav', () => {
    const config: Routes = [{ path: 'x', data: { action: 'cocina.ver' } }, { path: 'y', data: { title: 'Y' } }, { path: 'z' }];
    expect(navEntriesFrom(config)).toEqual([]);
  });

  it('fails closed: a nav entry without an action is never listed', () => {
    const config: Routes = [{ path: 'x', data: { nav: { label: 'X', icon: 'book' } } }];
    expect(navEntriesFrom(config)).toEqual([]);
  });
});

describe('navFor', () => {
  it.each([
    ['ADMINISTRADOR', ['/pedidos/nuevo', '/cocina', '/caja', '/catalogo', '/usuarios', '/restaurante']],
    ['RECEPCION', ['/pedidos/nuevo', '/cocina', '/catalogo']],
    ['COCINERO', ['/cocina', '/catalogo']],
    ['MESERO', ['/catalogo']],
    ['CAJERO', ['/catalogo']],
    ['REPARTIDOR', ['/catalogo']],
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
    expect(navFor(null, entries)).toEqual([]);
  });

  it('uses the design labels', () => {
    expect(navFor(tenant('ADMINISTRADOR'), entries).map((i) => i.label)).toEqual([
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
      expect(navFor(user, entries).every((item) => can(user, item.action))).toBe(true);
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
    expect(homeLabel(user, entries)).toBe(expected);
  });

  it('is null when the role has no home module', () => {
    expect(homeFor(tenant('MESERO'))).toBe('/sin-modulos');
    expect(homeLabel(tenant('MESERO'), entries)).toBeNull();
    expect(homeLabel(null, entries)).toBeNull();
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
