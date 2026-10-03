import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aMe, FAKE_ACCESS_TOKEN } from '../../../testing/builders';
import { expectApi } from '../../../testing/mock-api';
import { HYDRATE_TIMEOUT_MS, SessionStore, isAuthRejection } from './session.store';

describe('SessionStore', () => {
  let store: SessionStore;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(SessionStore);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    ctrl.verify();
    vi.restoreAllMocks();
  });

  it('starts anonymous', () => {
    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.scope()).toBeNull();
    expect(store.rol()).toBeNull();
  });

  it('derives isAuthenticated, scope and rol from the user', () => {
    store.setToken(FAKE_ACCESS_TOKEN);
    store.setUser(aMe({ rol: 'SUPERADMIN', restauranteId: null }));
    expect(store.isAuthenticated()).toBe(true);
    expect(store.scope()).toBe('plataforma');
    expect(store.rol()).toBe('SUPERADMIN');
    store.setUser(aMe());
    expect(store.scope()).toBe('restaurante');
  });

  it('clear resets token and user', () => {
    store.setToken(FAKE_ACCESS_TOKEN);
    store.setUser(aMe());
    store.clear();
    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
  });

  it('login stores the token then loads the user', async () => {
    const done = store.login({ email: 'a@b.test', password: 'secret-pass' });
    expectApi(ctrl, 'POST', '/auth/login').flush({ accessToken: FAKE_ACCESS_TOKEN });
    await vi.waitFor(() => expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN));
    expectApi(ctrl, 'GET', '/auth/me').flush(aMe());
    await done;
    expect(store.user()).toEqual(aMe());
  });

  it('login is atomic: a failing me() clears the token and rejects', async () => {
    const done = store.login({ email: 'a@b.test', password: 'secret-pass' });
    const assertion = expect(done).rejects.toBeDefined();
    expectApi(ctrl, 'POST', '/auth/login').flush({ accessToken: FAKE_ACCESS_TOKEN });
    await vi.waitFor(() => expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN));
    expectApi(ctrl, 'GET', '/auth/me').flush('boom', { status: 500, statusText: 'Server Error' });
    await assertion;
    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
  });

  it('logout clears the session even when the api fails', async () => {
    store.setToken(FAKE_ACCESS_TOKEN);
    store.setUser(aMe());
    const done = store.logout();
    expectApi(ctrl, 'POST', '/auth/logout').flush('boom', { status: 500, statusText: 'Server Error' });
    await done;
    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
  });

  describe('ensureRefreshed', () => {
    it('is single-flight: concurrent calls share one POST /auth/refresh', async () => {
      const calls = [store.ensureRefreshed(), store.ensureRefreshed(), store.ensureRefreshed()];
      expectApi(ctrl, 'POST', '/auth/refresh').flush({ accessToken: 'fake-new-token' });
      await expect(Promise.all(calls)).resolves.toEqual(['fake-new-token', 'fake-new-token', 'fake-new-token']);
      expect(store.accessToken()).toBe('fake-new-token');
    });

    it('clears the session and rejects on failure, then allows a new flight', async () => {
      store.setToken(FAKE_ACCESS_TOKEN);
      store.setUser(aMe());
      const assertion = expect(store.ensureRefreshed()).rejects.toBeDefined();
      expectApi(ctrl, 'POST', '/auth/refresh').flush('no', { status: 401, statusText: 'Unauthorized' });
      await assertion;
      expect(store.accessToken()).toBeNull();
      expect(store.user()).toBeNull();

      const next = store.ensureRefreshed();
      expectApi(ctrl, 'POST', '/auth/refresh').flush({ accessToken: 'fake-new-token' });
      await expect(next).resolves.toBe('fake-new-token');
    });
  });

  describe('ensureRefreshed failures', () => {
    it.each([401, 403])('clears the session when the refresh is rejected with %s', async (status) => {
      store.setToken(FAKE_ACCESS_TOKEN);
      store.setUser(aMe());
      const assertion = expect(store.ensureRefreshed()).rejects.toMatchObject({ status });
      expectApi(ctrl, 'POST', '/auth/refresh').flush('no', { status, statusText: 'Rejected' });
      await assertion;
      expect(store.accessToken()).toBeNull();
      expect(store.user()).toBeNull();
    });

    it.each([429, 500, 503])('keeps the session on transient failure (%s) and rejects', async (status) => {
      store.setToken(FAKE_ACCESS_TOKEN);
      store.setUser(aMe());
      const assertion = expect(store.ensureRefreshed()).rejects.toMatchObject({ status });
      expectApi(ctrl, 'POST', '/auth/refresh').flush('x', { status, statusText: 'x' });
      await assertion;
      expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN);
      expect(store.user()).toEqual(aMe());
    });

    it('keeps the session on a network error (status 0)', async () => {
      store.setToken(FAKE_ACCESS_TOKEN);
      store.setUser(aMe());
      const assertion = expect(store.ensureRefreshed()).rejects.toMatchObject({ status: 0 });
      expectApi(ctrl, 'POST', '/auth/refresh').error(new ProgressEvent('error'));
      await assertion;
      expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN);
      expect(store.user()).toEqual(aMe());
    });

    it('isAuthRejection is true only for 401 and 403', () => {
      expect([0, 401, 403, 429, 500, 503].map(isAuthRejection)).toEqual([false, true, true, false, false, false]);
    });
  });

  describe('hydrate', () => {
    it('refreshes then loads the user', async () => {
      const done = store.hydrate();
      expectApi(ctrl, 'POST', '/auth/refresh').flush({ accessToken: FAKE_ACCESS_TOKEN });
      await vi.waitFor(() => expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN));
      expectApi(ctrl, 'GET', '/auth/me').flush(aMe());
      await done;
      expect(store.user()).toEqual(aMe());
    });

    it('resolves anonymous when refresh fails', async () => {
      const done = store.hydrate();
      expectApi(ctrl, 'POST', '/auth/refresh').flush('no', { status: 401, statusText: 'Unauthorized' });
      await expect(done).resolves.toBeUndefined();
      expect(store.isAuthenticated()).toBe(false);
    });

    describe('timeout', () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it('resolves anonymous after HYDRATE_TIMEOUT_MS and ignores a late refresh', async () => {
        const done = store.hydrate();
        const pending = expectApi(ctrl, 'POST', '/auth/refresh');
        await vi.advanceTimersByTimeAsync(HYDRATE_TIMEOUT_MS);
        await expect(done).resolves.toBeUndefined();
        expect(store.user()).toBeNull();

        pending.flush({ accessToken: FAKE_ACCESS_TOKEN });
        await vi.advanceTimersByTimeAsync(0);
        ctrl.expectNone((r) => r.url.endsWith('/auth/me'));
        expect(store.accessToken()).toBeNull();
        expect(store.user()).toBeNull();
      });
    });

    it('resolves anonymous when me fails', async () => {
      const done = store.hydrate();
      expectApi(ctrl, 'POST', '/auth/refresh').flush({ accessToken: FAKE_ACCESS_TOKEN });
      await vi.waitFor(() => expect(store.accessToken()).toBe(FAKE_ACCESS_TOKEN));
      expectApi(ctrl, 'GET', '/auth/me').flush('no', { status: 500, statusText: 'Server Error' });
      await expect(done).resolves.toBeUndefined();
      expect(store.accessToken()).toBeNull();
      expect(store.user()).toBeNull();
    });
  });

  it('never touches web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    store.setToken(FAKE_ACCESS_TOKEN);
    store.setUser(aMe());
    store.clear();
    const done = store.ensureRefreshed();
    expectApi(ctrl, 'POST', '/auth/refresh').flush({ accessToken: FAKE_ACCESS_TOKEN });
    await done;
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });
});
