/**
 * How the console knows what the container is doing, and when a press is done.
 *
 * Not a subscription. Railway has one, and it works — for an account token, and
 * only for changes to a deployment's `status`. A project token is refused at
 * subscribe time, and a stop changes only the instances, so the one transition
 * this console exists to show is the one the stream never carries. Both
 * measured — `_research/2026-09-14-experiment-stop-and-start.md`. `D-API-7`.
 *
 * So: one poller per process, whatever the number of viewers. 30 s at rest,
 * 2 s while an operation is in flight.
 *
 * The harder half of this file is not the cadence, it is deciding when an
 * operation has finished. Four things conspire against the obvious answer:
 *
 *   1. Railway still reports the old state for a second or two after a press,
 *      so "the state is terminal" is true immediately and means nothing.
 *   2. "The state changed" is no better: a replica count or a URL appearing is
 *      a change that has nothing to do with the press.
 *   3. A read that began before the press lands after it, carrying pre-press
 *      data that looks exactly like an answer.
 *   4. A start must be told from the *previous* deployment's leftovers, which
 *      differ from the new one only by id.
 *
 * Hence: operations are claimed and owned, reads carry a sequence and an epoch,
 * and resolution is checked against the operation's own target — never against
 * terminality, and never against mere difference.
 */

import {
  isOperationInFlight,
  type Operation,
  type OperationStatus,
  type OperationTransition,
} from '@repo/contracts';

import { deriveContainerState, sameState, type ContainerState, type ContainerView } from './state';
import type { ContainerReader } from './provider';

export const IDLE_INTERVAL_MS = 30_000;
export const IN_FLIGHT_INTERVAL_MS = 2_000;
/** After this long without a resolving state, stop expecting one. */
export const IN_FLIGHT_TIMEOUT_MS = 90_000;
/**
 * A single read may not outlive this. Distinct from the operation deadline:
 * that one frees the *guard*, this one frees the *loop*. Without it an adapter
 * that never settles stops polling altogether, and the console would sit on a
 * state it can no longer refresh while reporting nothing wrong.
 */
export const READ_TIMEOUT_MS = 15_000;

export type Transition = OperationTransition;
export type Listener = (state: ContainerState) => void;
export type OperationListener = (operation: Operation | null) => void;
/** Every way an operation can end. `in-flight` is the one status it cannot be. */
export type Resolution = Exclude<OperationStatus, 'in-flight'>;
/**
 * What a *verb* may conclude on its own. `indeterminate` is deliberately absent:
 * a verb that does not know whether it took effect has not ended anything, and
 * saying so must not free the guard. It is reported, not finished.
 */
export type VerbResolution = Extract<Resolution, 'refused'>;

export interface PollerOptions {
  /**
   * The read half of the port, deliberately. The poller cannot issue a
   * mutation because it was never handed one.
   */
  provider: ContainerReader;
  /** Injected in tests. */
  onReadError?: (error: unknown) => void;
  now?: () => number;
  /** Injected in tests; the default is fine everywhere else. */
  newId?: () => string;
}

class ReadTimeout extends Error {
  constructor() {
    super('read exceeded its deadline');
    this.name = 'ReadTimeout';
  }
}

/**
 * Does this state finish that operation?
 *
 * Returns the resolution, or `null` for "not yet". The asymmetry between the
 * two transitions is real rather than an oversight: a stop is finished when the
 * container is down, and `down` carries no deployment id to check. A start is
 * finished only when *its own* deployment is up, which is why it waits for the
 * target before it will resolve at all.
 */
export function resolutionFor(
  operation: Operation,
  state: ContainerState,
): Extract<Resolution, 'succeeded' | 'failed'> | null {
  if (operation.transition === 'down') {
    return state.phase === 'down' ? 'succeeded' : null;
  }

  // A start with no target yet cannot be told from the previous deployment's
  // leftovers, so it declines to guess. The verb reports the target within a
  // moment, and the deadline covers the case where it never does.
  if (operation.target === undefined) return null;
  if (!('deploymentId' in state) || state.deploymentId !== operation.target) return null;

  if (state.phase === 'up' || state.phase === 'sleeping') return 'succeeded';
  if (state.phase === 'failed') return 'failed';
  return null;
}

export class Poller {
  #provider: ContainerReader;
  #onReadError: (error: unknown) => void;
  #now: () => number;
  #newId: () => string;

  #listeners = new Set<Listener>();
  #operationListeners = new Set<OperationListener>();

  #current: ContainerState | undefined;
  #operation: Operation | null = null;
  /**
   * Set when the verb failed without saying whether it took effect. It does not
   * release the guard — that is the entire point — it only decides how the
   * deadline will name the outcome when it arrives.
   */
  #ambiguous = false;

  #timer: ReturnType<typeof setTimeout> | undefined;
  #deadline: ReturnType<typeof setTimeout> | undefined;
  #running = false;
  #reads = 0;

  /** Bumped on every claim. A read that captured an older value predates it. */
  #epoch = 0;
  /** Bumped on every read. Orders results that outlive their deadline. */
  #sequence = 0;
  #appliedSequence = 0;
  /** The read in flight, shared so two callers never become two reads. */
  #pending: Promise<ContainerState | undefined> | undefined;

  constructor(options: PollerOptions) {
    this.#provider = options.provider;
    this.#onReadError = options.onReadError ?? (() => {});
    this.#now = options.now ?? Date.now;
    this.#newId = options.newId ?? (() => `op_${globalThis.crypto.randomUUID()}`);
  }

  /** The last state actually observed, or undefined before the first read. */
  current(): ContainerState | undefined {
    return this.#current;
  }

  /** The current or most recent operation. Its status says whether it is live. */
  operation(): Operation | null {
    return this.#operation;
  }

  /** True while an operation holds the guard. */
  busy(): boolean {
    return isOperationInFlight(this.#operation);
  }

  /** Reads performed. Used by the budget tests, and nothing else. */
  reads(): number {
    return this.#reads;
  }

  /**
   * Take the guard, or refuse. Synchronous from test to set — there is no
   * `await` between the two, which is the whole reason two simultaneous presses
   * cannot both pass. Returns the operation, or `null` when one is in flight.
   */
  claim(transition: Transition): Operation | null {
    if (this.busy()) return null;

    this.#epoch += 1;
    this.#ambiguous = false;
    this.#operation = {
      id: this.#newId(),
      transition,
      status: 'in-flight',
      since: this.#now(),
    };

    this.#armDeadline(this.#operation.id);
    this.#emitOperation();
    this.#reschedule(0);
    return this.#operation;
  }

  /**
   * Name the deployment a start is waiting for. Ignored unless `id` still owns
   * the guard, so a verb answering after its own operation ended cannot retarget
   * somebody else's.
   */
  setTarget(id: string, deploymentId: string): void {
    if (this.#operation === null || this.#operation.id !== id) return;
    if (!isOperationInFlight(this.#operation)) return;
    this.#operation = { ...this.#operation, target: deploymentId };
    this.#emitOperation();
  }

  /**
   * End the operation `id`. A no-op unless that operation still owns the guard:
   * without the check, a call that hung past its deadline could come back and
   * release the guard belonging to the press that replaced it.
   */
  finish(id: string, status: Resolution): void {
    if (this.#operation === null || this.#operation.id !== id) return;
    if (!isOperationInFlight(this.#operation)) return;

    this.#clearDeadline();
    this.#operation = { ...this.#operation, status };
    this.#emitOperation();
    this.#reschedule(this.#interval());
  }

  /**
   * The verb failed in a way that does not say whether it took effect — a
   * network error, an abort, a deadline. The guard is **kept**: the mutations
   * are not idempotent, so letting the user press again while the first press
   * may still be running is the one outcome worse than waiting.
   *
   * The poller carries on looking. If the container arrives where the press was
   * aiming, this resolves as a success like any other; if it never does, the
   * deadline reports `indeterminate` rather than `timed-out`.
   */
  reportIndeterminate(id: string): void {
    if (this.#operation === null || this.#operation.id !== id) return;
    if (!isOperationInFlight(this.#operation)) return;
    this.#ambiguous = true;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    if (this.#current !== undefined) listener(this.#current);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Operation status, replayed on subscribe exactly as state is. A browser that
   * reconnects mid-press learns that the press is still running, which is the
   * only thing that stops its button flickering back to enabled.
   */
  subscribeOperation(listener: OperationListener): () => void {
    this.#operationListeners.add(listener);
    listener(this.#operation);
    return () => this.#operationListeners.delete(listener);
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
    this.#clearDeadline();
  }

  /**
   * One read, derived and emitted on change. Two callers arriving together get
   * one read and the same answer: a browser asking for first paint while the
   * loop is mid-read must not cost a second request (`V-26a`).
   */
  pollOnce(): Promise<ContainerState | undefined> {
    if (this.#pending !== undefined) return this.#pending;
    this.#pending = this.#read().finally(() => {
      this.#pending = undefined;
    });
    return this.#pending;
  }

  async #read(): Promise<ContainerState | undefined> {
    this.#reads += 1;
    this.#sequence += 1;
    const sequence = this.#sequence;
    const epoch = this.#epoch;

    let view: ContainerView;
    try {
      view = await this.#withDeadline((signal) => this.#provider.read(signal));
    } catch (error) {
      // A failed read changes nothing: the last known state stands, no event is
      // emitted, and the next tick proceeds. Losing contact is not the same as
      // the container being down.
      this.#onReadError(error);
      return this.#current;
    }

    // A read that outlived its deadline may still resolve, long after a later
    // one has been applied. Applying it would walk the screen backwards.
    if (sequence < this.#appliedSequence) return this.#current;
    this.#appliedSequence = sequence;

    const next = deriveContainerState(view);

    // Sequencing orders reads against each other; it says nothing about a read
    // that began before the press. That one is the newest there is, and its
    // stale epoch is the only thing that stops it answering for the press.
    const operation = this.#operation;
    if (operation !== null && isOperationInFlight(operation) && epoch === this.#epoch) {
      const resolution = resolutionFor(operation, next);
      if (resolution !== null) this.finish(operation.id, resolution);
    }

    if (!sameState(this.#current, next)) {
      this.#current = next;
      for (const listener of this.#listeners) listener(next);
    }
    return next;
  }

  /**
   * Races the read against its own clock. The `signal` is passed through for an
   * adapter that honours it, but the race is what guarantees the loop recovers:
   * a provider that ignores the signal and never settles leaves an orphaned
   * promise, not a stalled poller. The orphan is discarded by sequence.
   */
  async #withDeadline<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const expiry = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ReadTimeout());
      }, READ_TIMEOUT_MS);
    });

    try {
      return await Promise.race([work(controller.signal), expiry]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /**
   * The operation's own timer, owing nothing to the read loop. Evaluating the
   * deadline after `await pollOnce()` — as this file once did — means a read
   * that never settles is also a guard that never releases.
   */
  #armDeadline(id: string): void {
    this.#clearDeadline();
    this.#deadline = setTimeout(() => {
      // A press whose verb came back ambiguous did not merely run out of time:
      // it ran out of time *and* nobody ever established what it did. Say the
      // second thing, which is the one the reader needs.
      this.finish(id, this.#ambiguous ? 'indeterminate' : 'timed-out');
    }, IN_FLIGHT_TIMEOUT_MS);
    this.#deadline.unref?.();
  }

  #clearDeadline(): void {
    if (this.#deadline !== undefined) clearTimeout(this.#deadline);
    this.#deadline = undefined;
  }

  #emitOperation(): void {
    for (const listener of this.#operationListeners) listener(this.#operation);
  }

  #interval(): number {
    return this.busy() ? IN_FLIGHT_INTERVAL_MS : IDLE_INTERVAL_MS;
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
