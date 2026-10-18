import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IMessage, RxStomp, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { EMPTY, Observable, defer, filter, map } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { CocinaEvent, EstadoPedido } from '../cocina.types';

/** Estado de conexión que ve la UI. Mientras es 'connecting'/'disconnected' los eventos no llegan. */
export type LiveStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * El "contrato mínimo" de RxStomp que necesita el tablero. No dependemos de la clase real, solo de
 * estos cinco métodos/propiedades: por eso en los tests se inyecta un objeto falso que los implementa
 * y nunca se abre un socket de verdad.
 */
export interface KitchenStompClient {
  configure(config: RxStompConfig): void;
  activate(): void;
  deactivate(): Promise<void>;
  readonly connectionState$: Observable<RxStompState>;
  readonly connected$: Observable<unknown>;
  watch(destination: string): Observable<IMessage>;
}

/**
 * Token de inyección que entrega el cliente STOMP. En producción la factory crea un RxStomp real;
 * en los tests se reemplaza por `{ provide: COCINA_STOMP, useValue: fake }`. Esta es la costura
 * (seam) que hace testeable toda la conexión sin red. Las dependencias se piden SIEMPRE por acá.
 */
export const COCINA_STOMP = new InjectionToken<KitchenStompClient>('COCINA_STOMP', {
  providedIn: 'root',
  factory: () => new RxStomp(),
});

/** Cada cuánto reintenta reconectar stompjs si el socket se cae (en milisegundos). */
export const RECONNECT_DELAY_MS = 3000;

/** Lista blanca de estados válidos del pedido; cualquier otro valor se descarta al parsear. */
const ESTADOS: readonly EstadoPedido[] = [
  'PENDIENTE',
  'EN_PREPARACION',
  'LISTO',
  'EN_ENTREGA',
  'ENTREGADO',
  'CANCELADO',
];

/**
 * URL del broker: un único `/ws` en el MISMO origen que la SPA (el proxy lo reenvía al backend).
 * Fijate que `ws`/`wss` se decide según el protocolo de la página: si la app va por HTTPS, el socket
 * también debe ir cifrado o el navegador lo bloquea. El token NO viaja acá: en la URL quedaría en
 * logs e historial. Va en los headers del frame CONNECT (ver `beforeConnect`).
 */
export function brokerUrl(location: Pick<Location, 'protocol' | 'host'>): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/** Guard de tipo: valida contra la lista blanca de estados (no se confía en strings arbitrarios). */
const isEstado = (value: unknown): value is EstadoPedido => ESTADOS.includes(value as EstadoPedido);

/**
 * Parsea el body de un mensaje del topic. El socket entrega texto crudo y puede ser cualquier cosa
 * (un ping, un cambio de contrato, basura). Nunca se confía en la forma: si no es JSON válido o no
 * trae `pedidoId` + estados conocidos, devuelve null y el mensaje se descarta aguas arriba.
 */
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
 * Conexión en vivo al topic de cocina. Ciclo de vida completo del socket:
 *
 * 1. `configure()` deja fijados la URL y la política de reconexión una sola vez.
 * 2. `beforeConnect` corre ANTES de cada intento (incluidas las reconexiones) y es donde se mete el
 *    token fresco. Como el backend valida el token solo en el CONNECT, una reconexión con el token
 *    viejo fallaría: por eso el token se recalcula acá y no al construir el cliente.
 * 3. El `effect()` del constructor observa `running` + token + restauranteId y llama a `sync()`:
 *    cuando cambia el token se recicla la conexión; cuando desaparece (logout) o no hay restaurante,
 *    se cierra.
 * 4. `connected$` y `events$` los consumen las páginas; acá solo se administra la conexión.
 */
@Injectable({ providedIn: 'root' })
export class CocinaLive {
  private readonly client = inject(COCINA_STOMP);
  private readonly session = inject(SessionStore);

  private readonly running = signal(false);
  private readonly _status = signal<LiveStatus>('disconnected');
  /**
   * Token con el que está activa la conexión actual; null cuando está inactiva.
   * Es la referencia contra la que `sync()` decide si hay que reconectar o no.
   */
  private activeToken: string | null = null;
  /**
   * Contador de intenciones de conexión: cada `sync()` lo incrementa. Al resolverse una
   * desactivación asíncrona solo se reactiva si esta "generación" sigue siendo la última. Evita el
   * bug clásico de una reconexión que llega tarde y pisa a la nueva.
   */
  private generation = 0;
  /**
   * `deactivate()` de stompjs es asíncrono. Se guarda la promesa pendiente porque `activate()` no
   * puede correr mientras una desactivación siga en curso (stompjs lanza error).
   */
  private deactivation: Promise<void> | null = null;

  readonly status = this._status.asReadonly();
  /**
   * Emite en CADA (re)conexión. Es la clave del modelo: mientras el socket está caído, los mensajes
   * publicados se pierden (el topic no guarda historial). Por eso el consumidor no puede confiar en
   * los eventos para reconstruir el estado: al recibir esto debe RECARGAR por HTTP.
   */
  readonly connected$: Observable<void> = this.client.connected$.pipe(map(() => undefined));
  /**
   * Eventos del topic del restaurante de la sesión. El `restauranteId` se resuelve de forma diferida
   * (`defer`): hasta que no hay sesión no se suscribe a nada (EMPTY). Los mensajes mal formados se
   * filtran. Es un canal SOLO LECTURA: acá nunca se envía nada.
   */
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
      // Corre antes de CADA intento de conexión: así las reconexiones posteriores a un refresh de
      // token llevan el token nuevo, sin recrear el cliente.
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
    // Puente reactivo: cada vez que cambia `running`, el token o el restaurante, se re-evalúa si el
    // socket debe estar abierto. `untracked` evita registrar las señales que lee `sync()` como
    // dependencias del effect (no queremos re-dispararlo por efectos secundarios).
    effect(() => {
      const running = this.running();
      const token = this.session.accessToken();
      const hasRestaurant = this.session.user()?.restauranteId != null;
      untracked(() => this.sync(running && hasRestaurant ? token : null));
    });
  }

  /** La página pide "quiero estar conectado"; la decisión real la toma el effect según la sesión. */
  start(): void {
    this.running.set(true);
  }

  /** Corta el pedido y cierra el socket ya mismo (no espera al effect). */
  stop(): void {
    this.running.set(false);
    this.sync(null);
  }

  /**
   * Alinea el socket con el token deseado (null = desconectado). Es idempotente: si el token pedido
   * es el mismo que el activo, no hace nada. Cuando cambia, primero desactiva lo viejo y luego activa
   * lo nuevo, respetando la desactivación en curso (ver `deactivation`).
   */
  private sync(wanted: string | null): void {
    if (wanted === this.activeToken) {
      return;
    }
    const generation = ++this.generation;
    const wasActive = this.activeToken !== null;
    this.activeToken = wanted;
    this._status.set(wanted === null ? 'disconnected' : 'connecting');
    if (wasActive) {
      this.trackDeactivation(this.client.deactivate());
    }
    if (wanted === null) {
      return;
    }
    // stompjs lanza error si `activate()` corre mientras una desactivación sigue en curso: se espera
    // a que termine y, solo si seguimos siendo la última intención (misma generación), se activa.
    if (this.deactivation) {
      void this.deactivation.then(() => {
        if (generation === this.generation) {
          this.client.activate();
        }
      });
    } else {
      this.client.activate();
    }
  }

  /** Guarda la desactivación en curso y la limpia al terminar, sin pisar una más nueva. */
  private trackDeactivation(pending: Promise<void>): void {
    const settled: Promise<void> = pending
      .catch(() => undefined)
      .then(() => {
        if (this.deactivation === settled) {
          this.deactivation = null;
        }
      });
    this.deactivation = settled;
  }

  /**
   * Traduce los estados internos de stompjs al `status` de la UI. Solo importan mientras HAY una
   * conexión deseada (`activeToken !== null`): si se está cerrando a propósito, el CLOSED no debe
   * pintarse como "desconectado" rojo.
   */
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
