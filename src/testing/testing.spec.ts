import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aMe, anApiError } from './builders';
import { expectApi } from './mock-api';

describe('testing helpers', () => {
  it('aMe returns defaults and applies overrides', () => {
    expect(aMe()).toMatchObject({ rol: 'ADMINISTRADOR', restauranteId: 7, email: 'user@example.test' });
    expect(aMe({ rol: 'MESERO' }).rol).toBe('MESERO');
  });

  it('anApiError builds the envelope', () => {
    expect(anApiError(402, 'Subscription required')).toMatchObject({
      status: '402 Payment Required',
      message: 'Subscription required',
    });
  });

  it.each([
    [400, '400 Bad Request'],
    [401, '401 Unauthorized'],
    [403, '403 Forbidden'],
    [404, '404 Not Found'],
    [409, '409 Conflict'],
    [422, '422 Unprocessable Entity'],
    [429, '429 Too Many Requests'],
    [500, '500'],
  ])('anApiError formats status %i as %s', (code, expected) => {
    expect(anApiError(code, 'x').status).toBe(expected);
  });

  it('expectApi prefixes API_BASE', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    http.get('/api/v1/auth/me').subscribe();
    expectApi(ctrl, 'GET', '/auth/me').flush(aMe());
    ctrl.verify();
  });
});
