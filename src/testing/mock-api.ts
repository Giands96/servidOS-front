import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { API_BASE } from '../app/core/http/api.config';

/** Expects exactly one request to `API_BASE + path` with the given method. */
export function expectApi(ctrl: HttpTestingController, method: string, path: string): TestRequest {
  return ctrl.expectOne((req) => req.method === method && req.url === `${API_BASE}${path}`);
}
