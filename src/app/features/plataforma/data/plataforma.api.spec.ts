import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  aPage,
  aPlan,
  aRestaurante,
  aRestauranteCreado,
  aRestauranteDashboard,
  aSuscripcionPlataforma,
} from '../../../../testing/builders';
import { expectApi } from '../../../../testing/mock-api';
import { CrearRestauranteRequest } from '../plataforma.types';
import { PlataformaApi } from './plataforma.api';

describe('PlataformaApi', () => {
  let api: PlataformaApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PlataformaApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  describe('listar', () => {
    it('GETs /restaurantes with page, size and sort and returns the page', () => {
      const page = aPage([aRestauranteDashboard({ restauranteId: 1 }), aRestauranteDashboard({ restauranteId: 2 })]);
      let result: unknown;
      api.listar({ page: 1, size: 10, sort: 'nombre,desc' }).subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'GET', '/restaurantes');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.get('sort')).toBe('nombre,desc');
      req.flush(page);
      expect(result).toEqual(page);
    });

    it('sends no sort param when none is given', () => {
      api.listar({ page: 0, size: 10 }).subscribe();
      const { params } = expectApi(ctrl, 'GET', '/restaurantes').request;
      expect(params.has('sort')).toBe(false);
      expect(params.get('page')).toBe('0');
    });
  });

  describe('crear', () => {
    it('POSTs the request as is (owner included) to /restaurantes and returns the created restaurant with its owner', () => {
      const request: CrearRestauranteRequest = {
        slug: 'la-cevicheria',
        nombre: 'La Cevichería',
        direccion: 'Av. Brasil 123',
        planId: 1,
        demo: true,
        demoDias: 7,
        administrador: {
          nombre: 'Rosa',
          apellido: 'Quispe',
          email: 'rosa@cevicheria.test',
          password: 'secreto123',
        },
      };
      const restaurante = aRestauranteCreado();
      let result: unknown;
      api.crear(request).subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'POST', '/restaurantes');
      expect(req.request.body).toEqual(request);
      req.flush(restaurante, { status: 201, statusText: 'Created' });
      expect(result).toEqual(restaurante);
    });

    it('propagates a backend error (e.g. 400 duplicate slug)', () => {
      let error: unknown;
      api
        .crear({
          slug: 'la-cevicheria',
          nombre: 'La Cevichería',
          planId: 1,
          administrador: { nombre: 'Rosa', apellido: 'Quispe', email: 'rosa@cevicheria.test', password: 'secreto123' },
        })
        .subscribe({ error: (e) => (error = e) });
      expectApi(ctrl, 'POST', '/restaurantes').flush(
        { message: 'El slug ya existe' },
        { status: 400, statusText: 'Bad Request' },
      );
      expect((error as HttpErrorResponse).status).toBe(400);
      expect((error as HttpErrorResponse).error.message).toBe('El slug ya existe');
    });
  });

  it('detalle GETs /restaurantes/{id} and returns the restaurant', () => {
    const restaurante = aRestaurante({ restauranteId: 12 });
    let result: unknown;
    api.detalle(12).subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/restaurantes/12').flush(restaurante);
    expect(result).toEqual(restaurante);
  });

  it('suscripcion GETs /restaurantes/{id}/suscripcion and returns the subscription', () => {
    const suscripcion = aSuscripcionPlataforma({ restauranteId: 12 });
    let result: unknown;
    api.suscripcion(12).subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/restaurantes/12/suscripcion').flush(suscripcion);
    expect(result).toEqual(suscripcion);
  });

  describe('renovar', () => {
    it('POSTs { planId } to /restaurantes/{id}/suscripcion/renovar when a plan is given', () => {
      const suscripcion = aSuscripcionPlataforma({ planId: 2 });
      let result: unknown;
      api.renovar(12, 2).subscribe((r) => (result = r));
      const req = expectApi(ctrl, 'POST', '/restaurantes/12/suscripcion/renovar');
      expect(req.request.body).toEqual({ planId: 2 });
      req.flush(suscripcion);
      expect(result).toEqual(suscripcion);
    });

    it('POSTs an empty body when no plan is given', () => {
      api.renovar(12).subscribe();
      expect(expectApi(ctrl, 'POST', '/restaurantes/12/suscripcion/renovar').request.body).toEqual({});
    });
  });

  it('cambiarEstado PATCHes { estado } to /restaurantes/{id}/estado and returns the restaurant', () => {
    const restaurante = aRestaurante({ estado: 'INACTIVO' });
    let result: unknown;
    api.cambiarEstado(12, 'INACTIVO').subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'PATCH', '/restaurantes/12/estado');
    expect(req.request.body).toEqual({ estado: 'INACTIVO' });
    req.flush(restaurante);
    expect(result).toEqual(restaurante);
  });

  it('cambiarPlan PATCHes { nuevoPlanId } to /restaurantes/{id}/plan and returns the subscription', () => {
    const suscripcion = aSuscripcionPlataforma({ planId: 3 });
    let result: unknown;
    api.cambiarPlan(12, 3).subscribe((r) => (result = r));
    const req = expectApi(ctrl, 'PATCH', '/restaurantes/12/plan');
    expect(req.request.body).toEqual({ nuevoPlanId: 3 });
    req.flush(suscripcion);
    expect(result).toEqual(suscripcion);
  });

  it('planes GETs /planes and returns the list', () => {
    const planes = [aPlan(), aPlan({ planId: 2, nombre: 'Premium', precio: 59.9 })];
    let result: unknown;
    api.planes().subscribe((r) => (result = r));
    expectApi(ctrl, 'GET', '/planes').flush(planes);
    expect(result).toEqual(planes);
  });
});
