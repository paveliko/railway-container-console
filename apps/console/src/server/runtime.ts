/**
 * The process's one piece of state: the configuration, the provider, and the
 * single poller every viewer is served from.
 *
 * One poller per process, not per browser. `subscribe` replays the last state
 * to a new listener, so a tab that connects, reconnects or refreshes costs no
 * Railway request (`V-26`, `V-26a`).
 *
 * Built lazily so a route can be exercised in a test without a boot, and so the
 * first failure of a misconfigured console is a message naming the variable
 * rather than an import-time crash with a stack.
 */

import { Poller, type ContainerProvider, type Transition } from '@repo/container-core';
import type { Operation } from '@repo/contracts';
import { createRailwayProvider } from '@repo/railway-client';

import { configFromEnv, type Config } from './config';
import { TransitionInFlight } from './errors';

export interface Runtime {
  config: Config;
  /** The write half. The poller is handed only the read half, on purpose. */
  provider: ContainerProvider;
  poller: Poller;
  /** One disposer per open stream, so shutdown can end them all. */
  streams: Set<() => void>;
}

let runtime: Runtime | undefined;

export function getRuntime(): Runtime {
  if (runtime === undefined) {
    const config = configFromEnv(process.env);
    const provider = createRailwayProvider(config.credential, config.target);
    const poller = new Poller({
      provider,
      onReadError: (error) => console.error('[poller]', error),
    });
    poller.start();
    runtime = { config, provider, poller, streams: new Set() };
  }
  return runtime;
}

export function disposeRuntime(): void {
  if (runtime === undefined) return;
  runtime.poller.stop();
  for (const dispose of [...runtime.streams]) dispose();
  runtime.streams.clear();
  runtime = undefined;
}

/** Test seam. Never called in production. */
export function setRuntime(next: Runtime | undefined): void {
  runtime = next;
}

/**
 * Take the guard, or refuse.
 *
 * The check and the set happen in one synchronous step inside `Poller.claim`.
 * That is the whole reason two presses arriving in the same tick cannot both
 * proceed: there is no `await` between reading the guard and taking it, so
 * there is no window for the second to slip through. A version of this that
 * awaited the mutation before marking the guard would let both reach Railway,
 * and the mutations are not idempotent.
 */
export function claim(transition: Transition): Operation {
  const operation = getRuntime().poller.claim(transition);
  if (operation === null) throw new TransitionInFlight();
  return operation;
}
