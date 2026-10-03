import { ApiError } from '../api.types';

export type UiAction =
  | 'show-message'
  | 'refresh-then-login'
  | 'paywall'
  | 'forbidden'
  | 'not-found'
  | 'mark-fields'
  | 'wait-retry'
  | 'unknown';

/** Maps an HTTP status code to the UI reaction the app should take. */
export function toUiAction(status: number): UiAction {
  switch (status) {
    case 400:
    case 409:
      return 'show-message';
    case 401:
      return 'refresh-then-login';
    case 402:
      return 'paywall';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 422:
      return 'mark-fields';
    case 429:
      return 'wait-retry';
    default:
      return 'unknown';
  }
}

/**
 * Parses a Retry-After header (delta-seconds or HTTP-date) into seconds.
 * Returns null when absent or invalid, and 0 when the date is in the past.
 */
export function parseRetryAfter(header: string | null, now: Date): number | null {
  if (header === null) {
    return null;
  }
  const value = header.trim();
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  // Numeric-looking but not a non-negative integer ('1.5', '-3', '+5'): invalid, never a date.
  if (value !== '' && !Number.isNaN(Number(value))) {
    return null;
  }
  const target = Date.parse(value);
  if (Number.isNaN(target)) {
    return null;
  }
  return Math.max(0, Math.ceil((target - now.getTime()) / 1000));
}

/** Type guard for the backend error envelope; only `message` is verified. */
export function readApiError(body: unknown): ApiError | null {
  if (typeof body === 'object' && body !== null && typeof (body as { message?: unknown }).message === 'string') {
    return body as ApiError;
  }
  return null;
}
