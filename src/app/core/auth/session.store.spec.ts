import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { aMe, FAKE_ACCESS_TOKEN } from '../../../testing/builders';
import { expectApi } from '../../../testing/mock-api';
import { SessionStore } from './session.store';

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
