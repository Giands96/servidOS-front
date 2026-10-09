import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IMessage, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { BehaviorSubject, Subject, filter } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { aMe } from '../../../../testing/builders';
import {
  COCINA_STOMP,
  CocinaLive,
  KitchenStompClient,
  brokerUrl,
  parseCocinaEvent,
} from './cocina-live';

class FakeStomp implements KitchenStompClient {
  config: RxStompConfig = {};
  readonly calls: string[] = [];
  readonly watched: string[] = [];
  readonly state$ = new BehaviorSubject<RxStompState>(RxStompState.CLOSED);
  readonly connectionState$ = this.state$.asObservable();
  readonly connected$ = this.state$.pipe(filter((s) => s === RxStompState.OPEN));
  readonly topic$ = new Subject<IMessage>();

  configure(config: RxStompConfig): void {
    this.config = { ...this.config, ...config };
  }
  /** When set, deactivate() stays pending until finishDeactivate() is called. */
  holdDeactivate = false;
  private deactivating: (() => void) | null = null;

  activate(): void {
    // stompjs refuses to activate while a deactivation is still in progress.
    if (this.deactivating) {
      throw new Error('Still DEACTIVATING, can not activate now');
    }
    this.calls.push('activate');
  }
  deactivate(): Promise<void> {
    this.calls.push('deactivate');
    if (!this.holdDeactivate) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.deactivating = () => {
        this.deactivating = null;
        resolve();
      };
    });
  }
  finishDeactivate(): void {
    this.deactivating?.();
  }
  watch(destination: string) {
    this.watched.push(destination);
    return this.topic$.asObservable();
  }

  /** What stompjs does on every (re)connection attempt: beforeConnect, then CONNECTING, then OPEN. */
  async connect(): Promise<void> {
    await this.config.beforeConnect?.(this as never);
    this.state$.next(RxStompState.CONNECTING);
    this.state$.next(RxStompState.OPEN);
  }
  drop(): void {
    this.state$.next(RxStompState.CLOSED);
  }
}

const message = (body: string) => ({ body }) as IMessage;
const settle = async () => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('CocinaLive', () => {
  let fake: FakeStomp;
  let session: SessionStore;
  let live: CocinaLive;

  beforeEach(() => {
    fake = new FakeStomp();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COCINA_STOMP, useValue: fake },
      ],
    });
    session = TestBed.inject(SessionStore);
    session.setUser(aMe({ restauranteId: 7, rol: 'COCINERO' }));
    session.setToken('token-1');
    live = TestBed.inject(CocinaLive);
  });

  it('configures the socket URL without credentials and a 3 s reconnect delay', async () => {
    live.start();
    await settle();
    expect(fake.config.brokerURL).toMatch(/^wss?:\/\/[^/]+\/ws$/);
    expect(fake.config.brokerURL).not.toContain('token');
    expect(fake.config.reconnectDelay).toBe(3000);
  });

  it('activates once on start, even if start is called twice', async () => {
    live.start();
    live.start();
    await settle();
    expect(fake.calls).toEqual(['activate']);
    expect(live.status()).toBe('connecting');
  });

  it('sends the bearer token in the CONNECT headers', async () => {
    live.start();
    await settle();
    await fake.connect();
    expect(fake.config.connectHeaders).toEqual({ Authorization: 'Bearer token-1' });
  });

  it('reads a fresh token on every connection attempt', async () => {
    live.start();
    await settle();
    session.setToken('token-2');
    await fake.connect(); // reconnect attempt before the effect had a chance to run
    expect(fake.config.connectHeaders).toEqual({ Authorization: 'Bearer token-2' });
  });

  it('does not activate until a token is available, then activates', async () => {
    session.setToken(null);
    live.start();
    await settle();
    expect(fake.calls).toEqual([]);
    session.setToken('token-1');
    await settle();
    expect(fake.calls).toEqual(['activate']);
  });

  it('does not activate for a session without restaurant (platform users)', async () => {
    session.setUser(aMe({ restauranteId: null, rol: 'SUPERADMIN' }));
    live.start();
    await settle();
    expect(fake.calls).toEqual([]);
  });

  it('reconnects (deactivate then activate) when the token changes to a new value', async () => {
    live.start();
    await settle();
    session.setToken('token-2');
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate', 'activate']);
  });

  it('stops without reconnecting when the token becomes null', async () => {
    live.start();
    await settle();
    await fake.connect();
    session.setToken(null);
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate']);
    expect(live.status()).toBe('disconnected');
  });

  it('stop deactivates, reports disconnected and ignores later token changes', async () => {
    live.start();
    await settle();
    live.stop();
    session.setToken('token-2');
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate']);
    expect(live.status()).toBe('disconnected');
  });

  it('can be started again after stop', async () => {
    live.start();
    await settle();
    live.stop();
    await settle();
    live.start();
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate', 'activate']);
  });

  it('waits for a pending deactivation before activating again (fast stop then start)', async () => {
    live.start();
    await settle();
    fake.holdDeactivate = true;
    live.stop();
    live.start();
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate']);

    fake.finishDeactivate();
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate', 'activate']);
  });

  it('waits for a pending deactivation when the token goes null and then to a new value', async () => {
    live.start();
    await settle();
    fake.holdDeactivate = true;
    session.setToken(null);
    await settle();
    session.setToken('token-2');
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate']);

    fake.finishDeactivate();
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate', 'activate']);
    await fake.connect();
    expect(fake.config.connectHeaders).toEqual({ Authorization: 'Bearer token-2' });
  });

  it('does not activate after a pending deactivation if it was stopped again meanwhile', async () => {
    live.start();
    await settle();
    fake.holdDeactivate = true;
    live.stop();
    live.start();
    live.stop();
    fake.finishDeactivate();
    await settle();
    expect(fake.calls).toEqual(['activate', 'deactivate']);
    expect(live.status()).toBe('disconnected');
  });

  it('tracks connection status: connected on open, disconnected on drop, connected again on retry', async () => {
    live.start();
    await settle();
    await fake.connect();
    expect(live.status()).toBe('connected');
    fake.drop();
    expect(live.status()).toBe('disconnected');
    await fake.connect();
    expect(live.status()).toBe('connected');
  });

  it('emits connected$ on every (re)connection so the board can resync', async () => {
    let count = 0;
    live.connected$.subscribe(() => count++);
    live.start();
    await settle();
    await fake.connect();
    fake.drop();
    await fake.connect();
    expect(count).toBe(2);
  });

  it('watches the topic of the session restaurant and parses events', () => {
    const received: unknown[] = [];
    live.events$.subscribe((e) => received.push(e));
    expect(fake.watched).toEqual(['/topic/restaurantes/7/cocina']);
    fake.topic$.next(
      message('{"pedidoId":5,"estadoAnterior":"EN_PREPARACION","estadoNuevo":"LISTO"}'),
    );
    expect(received).toEqual([
      { pedidoId: 5, estadoAnterior: 'EN_PREPARACION', estadoNuevo: 'LISTO' },
    ]);
  });

  it('ignores malformed messages instead of erroring the stream', () => {
    const received: unknown[] = [];
    live.events$.subscribe((e) => received.push(e));
    fake.topic$.next(message('not json'));
    fake.topic$.next(message('{"pedidoId":"x"}'));
    fake.topic$.next(message('{"pedidoId":6,"estadoAnterior":"LISTO","estadoNuevo":"ENTREGADO"}'));
    expect(received).toHaveLength(1);
  });
});

describe('brokerUrl', () => {
  it.each([
    ['http:', 'localhost:4200', 'ws://localhost:4200/ws'],
    ['https:', 'app.example.test', 'wss://app.example.test/ws'],
  ])('%s %s -> %s', (protocol, host, expected) => {
    expect(brokerUrl({ protocol, host })).toBe(expected);
  });
});

describe('parseCocinaEvent', () => {
  it('returns null for non-objects, missing fields and unknown states', () => {
    expect(parseCocinaEvent('null')).toBeNull();
    expect(parseCocinaEvent('[]')).toBeNull();
    expect(
      parseCocinaEvent('{"pedidoId":1,"estadoAnterior":"X","estadoNuevo":"LISTO"}'),
    ).toBeNull();
    expect(parseCocinaEvent('{"pedidoId":1,"estadoNuevo":"LISTO"}')).toBeNull();
  });
});
