import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { API_BASE } from './api.config';

const AUTH_PATH = `${API_BASE}/auth/`;
const TOKENLESS_PATHS = [`${API_BASE}/auth/login`, `${API_BASE}/auth/refresh`];

const withBearer = <T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/** Adds the Bearer token to API calls and, on 401, refreshes once and retries once. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) {
    return next(req);
  }
  const store = inject(SessionStore);
  const router = inject(Router);

  const sentWith = store.accessToken();
  const authed = TOKENLESS_PATHS.includes(req.url) ? req : withBearer(req, sentWith);

  const expire = (error: unknown) => {
    store.clear();
    void router.navigate(['/login'], { queryParams: { expired: 1 } });
    return throwError(() => error);
  };

  return next(authed).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || req.url.startsWith(AUTH_PATH)) {
        return throwError(() => error);
      }
      // Another request may already have renewed the token: reuse it instead of rotating again.
      const current = store.accessToken();
      const token$ = current !== null && current !== sentWith ? Promise.resolve(current) : store.ensureRefreshed();
      return from(token$).pipe(
        catchError(() => expire(error)),
        switchMap((token) =>
          next(withBearer(req, token)).pipe(
            catchError((retryError: unknown) =>
              retryError instanceof HttpErrorResponse && retryError.status === 401
                ? expire(retryError)
                : throwError(() => retryError),
            ),
          ),
        ),
      );
    }),
  );
};
