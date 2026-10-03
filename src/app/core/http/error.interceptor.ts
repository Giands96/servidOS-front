import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { subscriptionLapsedRoute } from '../auth/domain/permissions.rules';
import { SessionStore } from '../auth/session.store';
import { API_BASE } from './api.config';

/** 402 -> paywall (admin) or suspended notice; every error is rethrown so callers can show `message`. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) {
    return next(req);
  }
  const store = inject(SessionStore);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 402) {
        void router.navigate([subscriptionLapsedRoute(store.user())]);
      }
      return throwError(() => error);
    }),
  );
};
