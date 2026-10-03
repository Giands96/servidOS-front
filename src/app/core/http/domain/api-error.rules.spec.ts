import { parseRetryAfter, readApiError, toUiAction } from './api-error.rules';

describe('toUiAction', () => {
  it.each([
    [400, 'show-message'],
    [409, 'show-message'],
    [401, 'refresh-then-login'],
    [402, 'paywall'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [422, 'mark-fields'],
    [429, 'wait-retry'],
    [500, 'unknown'],
    [0, 'unknown'],
  ])('maps status %i to %s', (status, expected) => {
    expect(toUiAction(status)).toBe(expected);
  });
});

describe('parseRetryAfter', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('returns null for a null header', () => {
    expect(parseRetryAfter(null, now)).toBeNull();
  });

  it('parses delta-seconds', () => {
    expect(parseRetryAfter('30', now)).toBe(30);
  });

  it('parses an HTTP-date in the future', () => {
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:01:00 GMT', now)).toBe(60);
  });

  it('returns 0 for an HTTP-date in the past', () => {
    expect(parseRetryAfter('Wed, 31 Dec 2025 23:00:00 GMT', now)).toBe(0);
  });

  it('returns null for invalid input', () => {
    expect(parseRetryAfter('soon', now)).toBeNull();
    expect(parseRetryAfter('', now)).toBeNull();
  });
});

describe('readApiError', () => {
  const valid = {
    timestamp: '2026-01-01T00:00:00Z',
    status: 'BAD_REQUEST',
    message: 'Invalid input',
    path: '/api/v1/pedidos',
    traceID: 'trace-1',
  };

  it('returns the body when message is a string', () => {
    expect(readApiError(valid)).toEqual(valid);
  });

  it('returns null for non-objects and bodies without a string message', () => {
    expect(readApiError(null)).toBeNull();
    expect(readApiError('oops')).toBeNull();
    expect(readApiError({ message: 42 })).toBeNull();
    expect(readApiError({})).toBeNull();
  });
});
