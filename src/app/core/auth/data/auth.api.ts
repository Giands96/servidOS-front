import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../http/api.config';
import { LoginRequest, MeResponse, TokenResponse } from '../auth.types';

/** The backend rejects refresh without this header (CSRF guard). */
const CSRF_HEADERS = new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<TokenResponse> {
    // The refresh cookie is set by the response, so credentials must be enabled.
    return this.http.post<TokenResponse>(`${API_BASE}/auth/login`, credentials, { withCredentials: true });
  }

  refresh(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE}/auth/refresh`, null, {
      withCredentials: true,
      headers: CSRF_HEADERS,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE}/auth/logout`, null, {
      withCredentials: true,
      headers: CSRF_HEADERS,
    });
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API_BASE}/auth/me`);
  }
}
