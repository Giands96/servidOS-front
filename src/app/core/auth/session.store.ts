import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './data/auth.api';
import { LoginRequest, MeResponse } from './auth.types';
import { scopeOf } from './domain/permissions.rules';

/** In-memory session. The access token must never touch web storage. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AuthApi);

  readonly accessToken = signal<string | null>(null);
  readonly user = signal<MeResponse | null>(null);

  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly scope = computed(() => {
    const user = this.user();
    return user === null ? null : scopeOf(user);
  });
  readonly rol = computed(() => this.user()?.rol ?? null);

  private refreshInFlight: Promise<string> | null = null;

  setToken(token: string | null): void {
    this.accessToken.set(token);
  }

  setUser(user: MeResponse | null): void {
    this.user.set(user);
  }

  clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  async login(credentials: LoginRequest): Promise<void> {
    const { accessToken } = await firstValueFrom(this.api.login(credentials));
    this.setToken(accessToken);
    this.setUser(await firstValueFrom(this.api.me()));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // Local session must end even if the server call fails.
    } finally {
      this.clear();
    }
  }

  /** Single-flight: concurrent callers share one POST /auth/refresh. */
  ensureRefreshed(): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    this.refreshInFlight = (async () => {
      try {
        const { accessToken } = await firstValueFrom(this.api.refresh());
        this.setToken(accessToken);
        return accessToken;
      } catch (error) {
        this.clear();
        throw error;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  /** Restores the session from the refresh cookie; stays anonymous on any failure. */
  async hydrate(): Promise<void> {
    try {
      await this.ensureRefreshed();
      this.setUser(await firstValueFrom(this.api.me()));
    } catch {
      this.clear();
    }
  }
}
