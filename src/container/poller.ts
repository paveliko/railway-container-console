/**
 * How the console knows what the container is doing.
 *
 * Not a subscription. Railway has one, and it works — for an account token,
 * and only for changes to a deployment's `status`. A project token is refused
 * at `subscribe`, and a `deploymentStop` changes only the instances, so the one
 * transition this console exists to show is the one the stream never carries.
 * Both measured — `_research/2026-09-14-experiment-stop-and-start.md`.
 *
 * So: one poller per process, whatever the number of viewers. 30 s at rest,
 * 2 s while a transition is in flight. 120 requests an hour against an observed
 * budget of 1 000. `decisions.md` D-API-7.
 */

import {
  deriveContainerState,
  isTerminal,
  sameState,
  type ContainerState,
  type ContainerView,
} from './state';

export const IDLE_INTERVAL_MS = 30_000;
export const IN_FLIGHT_INTERVAL_MS = 2_000;
/** After this long without a terminal phase, stop expecting one. */
export const IN_FLIGHT_TIMEOUT_MS = 90_000;

export type Transition = 'up' | 'down';
export type Listener = (state: ContainerState) => void;

export interface PollerOptions {
  read: () => Promise<ContainerView>;
  /** Injected in tests. */
  onReadError?: (error: unknown) => void;
  now?: () => number;
}

export class Poller {
  #read: () => Promise<ContainerView>;
  #onReadError: (error: unknown) => void;
  #now: () => number;

  #listeners = new Set<Listener>();
  #current: ContainerState | undefined;
  #inFlight: Transition | null = null;
  #inFlightSince = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #running = false;
  #reads = 0;

  constructor(options: PollerOptions) {
    this.#read = options.read;
    this.#onReadError = options.onReadError ?? (() => {});
    this.#now = options.now ?? Date.now;
  }

  /** The last state actually observed, or undefined before the first read. */
  current(): ContainerState | undefined {
    return this.#current;
  }

  /** Which transition, if any, the console is waiting on. */
  inFlight(): Transition | null {
    return this.#inFlight;
  }

  /** Reads performed. Used by the budget tests, and nothing else. */
  reads(): number {
    return this.#reads;
  }

  /**
   * Subscribing hands over the current state immediately when there is one, so
   * a browser that connects, reconnects or refreshes costs no Railway request.
   */
  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    if (this.#current !== undefined) listener(this.#current);
    return () => this.#listeners.delete(listener);
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    void this.#tick();
  }

  stop(): void {
    this.#running = false;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  /**
   * Called when a mutation has been accepted. Speeds the poller up and starts
   * the clock on `IN_FLIGHT_TIMEOUT_MS`, so a transition that never lands
   * cannot wedge the console: the guard releases and whatever state is really
   * there is shown.
   */
  markInFlight(transition: Transition): void {
    this.#inFlight = transition;
    this.#inFlightSince = this.#now();
    this.#reschedule(0);
  }

  clearInFlight(): void {
    this.#inFlight = null;
    this.#inFlightSince = 0;
  }

  /** One read, derive, emit on change. Exposed for tests and for the first paint. */
  async pollOnce(): Promise<ContainerState | undefined> {
    this.#reads += 1;
    let view: ContainerView;
    try {
      view = await this.#read();
    } catch (error) {
      // A failed read changes nothing: the last known state stands, no event is
      // emitted, and the next tick proceeds. Losing contact is not the same as
      // the container being down.
      this.#onReadError(error);
      return this.#current;
    }

    const next = deriveContainerState(view);
    if (this.#inFlight !== null && isTerminal(next)) this.clearInFlight();

    if (!sameState(this.#current, next)) {
      this.#current = next;
      for (const listener of this.#listeners) listener(next);
    }
    return next;
  }

  #interval(): number {
    if (this.#inFlight === null) return IDLE_INTERVAL_MS;
    if (this.#now() - this.#inFlightSince >= IN_FLIGHT_TIMEOUT_MS) {
      this.clearInFlight();
      return IDLE_INTERVAL_MS;
    }
    return IN_FLIGHT_INTERVAL_MS;
  }

  #reschedule(delayMs: number): void {
    if (!this.#running) return;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.#tick(), delayMs);
  }

  async #tick(): Promise<void> {
    if (!this.#running) return;
    await this.pollOnce();
    this.#reschedule(this.#interval());
  }
}
