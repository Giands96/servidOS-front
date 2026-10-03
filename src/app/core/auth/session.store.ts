import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './data/auth.api';
import { LoginRequest, MeResponse } from './auth.types';
import { scopeOf } from './domain/permissions.rules';

export const HYDRATE_TIMEOUT_MS = 8000;

/** The refresh cookie was rejected or revoked (as opposed to a network/server hiccup). */
export const isAuthRejection = (status: number): boolean => status === 401 || status === 403;

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
  /** Bumped by clear(): results of operations started before it must not resurrect the session. */
  private epoch = 0;

  setToken(token: string | null): void {
    this.accessToken.set(token);
  }

  setUser(user: MeResponse | null): void {
    this.user.set(user);
  }

  clear(): void {
    this.epoch++;
    this.accessToken.set(null);
    this.user.set(null);
  }

  async login(credentials: LoginRequest): Promise<void> {
    const { accessToken } = await firstValueFrom(this.api.login(credentials));
    this.setToken(accessToken);
    try {
      this.setUser(await firstValueFrom(this.api.me()));
    } catch (error) {
      this.clear();
      throw error;
    }
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

  /**
   * Single-flight: concurrent callers share one POST /auth/refresh.
   * Only an auth rejection (401/403) ends the session; transient failures
   * (network, 5xx, 429, timeout) reject with the error but keep the session.
   */
  ensureRefreshed(): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const epoch = this.epoch;
    this.refreshInFlight = (async () => {
      try {
        const { accessToken } = await firstValueFrom(this.api.refresh());
        if (epoch !== this.epoch) {
          throw new Error('Session was cleared while refreshing');
        }
        this.setToken(accessToken);
        return accessToken;
      } catch (error) {
        if (error instanceof HttpErrorResponse && isAuthRejection(error.status)) {
          this.clear();
        }
        throw error;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  /**
   * Restores the session from the refresh cookie; stays anonymous on any failure
   * and gives up after HYDRATE_TIMEOUT_MS so the app always renders.
   */
  async hydrate(): Promise<void> {
    const epoch = this.epoch;
    const restore = async (): Promise<void> => {
      try {
        await this.ensureRefreshed();
        const user = await firstValueFrom(this.api.me());
        if (epoch === this.epoch) {
          this.setUser(user);
        }
      } catch {
        if (epoch === this.epoch) {
          this.clear();
        }
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), HYDRATE_TIMEOUT_MS);
    });
    try {
      if ((await Promise.race([restore(), timeout])) === 'timeout') {
        this.clear(); // bumps the epoch: late responses are ignored
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
