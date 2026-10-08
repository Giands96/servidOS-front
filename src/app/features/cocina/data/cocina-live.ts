import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IMessage, RxStomp, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { EMPTY, Observable, defer, filter, map } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { CocinaEvent, EstadoPedido } from '../cocina.types';

export type LiveStatus = 'connecting' | 'connected' | 'disconnected';

/** The slice of RxStomp the board needs; tests provide a fake through COCINA_STOMP. */
export interface KitchenStompClient {
  configure(config: RxStompConfig): void;
  activate(): void;
  deactivate(): Promise<void>;
  readonly connectionState$: Observable<RxStompState>;
  readonly connected$: Observable<unknown>;
  watch(destination: string): Observable<IMessage>;
}

export const COCINA_STOMP = new InjectionToken<KitchenStompClient>('COCINA_STOMP', {
  providedIn: 'root',
  factory: () => new RxStomp(),
});

export const RECONNECT_DELAY_MS = 3000;

const ESTADOS: readonly EstadoPedido[] = [
  'PENDIENTE',
  'EN_PREPARACION',
  'LISTO',
  'EN_ENTREGA',
  'ENTREGADO',
  'CANCELADO',
];

/** `/ws` on the same origin; the token never goes in the URL (it travels in the CONNECT headers). */
export function brokerUrl(location: Pick<Location, 'protocol' | 'host'>): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

const isEstado = (value: unknown): value is EstadoPedido => ESTADOS.includes(value as EstadoPedido);

/** Parses a topic message body; null when it is not a well-formed kitchen event. */
export function parseCocinaEvent(body: string): CocinaEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { pedidoId, estadoAnterior, estadoNuevo } = raw as Record<string, unknown>;
  if (typeof pedidoId !== 'number' || !isEstado(estadoAnterior) || !isEstado(estadoNuevo)) {
    return null;
  }
  return { pedidoId, estadoAnterior, estadoNuevo };
}

/**
 * Live connection to the kitchen topic. The token is validated only at CONNECT, so the socket is
 * recycled whenever the session token changes, and dropped when it disappears.
 */
@Injectable({ providedIn: 'root' })
export class CocinaLive {
  private readonly client = inject(COCINA_STOMP);
  private readonly session = inject(SessionStore);

  private readonly running = signal(false);
  private readonly _status = signal<LiveStatus>('disconnected');
  /** Token the current connection was activated with; null while inactive. */
  private activeToken: string | null = null;
  private generation = 0;

  readonly status = this._status.asReadonly();
  /** Emits on every (re)connection: messages are lost while disconnected, so consumers must resync. */
  readonly connected$: Observable<void> = this.client.connected$.pipe(map(() => undefined));
  /** Events of the session restaurant's topic; malformed messages are dropped. Read-only channel. */
  readonly events$: Observable<CocinaEvent> = defer(() => {
    const restauranteId = this.session.user()?.restauranteId;
    return restauranteId == null
      ? EMPTY
      : this.client.watch(`/topic/restaurantes/${restauranteId}/cocina`);
  }).pipe(
    map((message) => parseCocinaEvent(message.body)),
    filter((event): event is CocinaEvent => event !== null),
  );

  constructor() {
    this.client.configure({
      brokerURL: brokerUrl(inject(DOCUMENT).location),
      reconnectDelay: RECONNECT_DELAY_MS,
      // Runs before every connection attempt, so reconnects after a refresh carry the fresh token.
      beforeConnect: () => {
        const token = this.session.accessToken();
        this.client.configure({
          connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        });
      },
    });
    this.client.connectionState$
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.onState(state));
    effect(() => {
      const running = this.running();
      const token = this.session.accessToken();
      const hasRestaurant = this.session.user()?.restauranteId != null;
      untracked(() => this.sync(running && hasRestaurant ? token : null));
    });
  }

  start(): void {
    this.running.set(true);
  }

  stop(): void {
    this.running.set(false);
    this.sync(null);
  }

  /** Brings the socket in line with the wanted token: null = disconnected. */
  private sync(wanted: string | null): void {
    if (wanted === this.activeToken) {
      return;
    }
    const generation = ++this.generation;
    const wasActive = this.activeToken !== null;
    this.activeToken = wanted;
    this._status.set(wanted === null ? 'disconnected' : 'connecting');
    if (wasActive) {
      void this.client.deactivate().then(() => {
        if (generation === this.generation && wanted !== null) {
          this.client.activate();
        }
      });
    } else if (wanted !== null) {
      this.client.activate();
    }
  }

  private onState(state: RxStompState): void {
    const active = this.activeToken !== null;
    if (state === RxStompState.OPEN && active) {
      this._status.set('connected');
    } else if (state === RxStompState.CONNECTING && active) {
      this._status.set('connecting');
    } else if (state === RxStompState.CLOSED || state === RxStompState.CLOSING) {
      this._status.set('disconnected');
    }
  }
}
