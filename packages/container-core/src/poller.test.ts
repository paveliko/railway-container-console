import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Operation } from '@repo/contracts';

import {
  IDLE_INTERVAL_MS,
  IN_FLIGHT_INTERVAL_MS,
  IN_FLIGHT_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  Poller,
} from './poller';
import type { ContainerState, ContainerView } from './state';

const UP: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep', status: 'SUCCESS', deploymentStopped: false,
    instances: [{ id: 'i', status: 'RUNNING' }],
  },
};
const UP_SCALED: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep', status: 'SUCCESS', deploymentStopped: false,
    instances: [{ id: 'i', status: 'RUNNING' }, { id: 'j', status: 'RUNNING' }],
  },
};
const UP_OTHER: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'other', status: 'SUCCESS', deploymentStopped: false,
    instances: [{ id: 'i', status: 'RUNNING' }],
  },
};
const STOPPED: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep', status: 'SUCCESS', deploymentStopped: true,
    instances: [{ id: 'i', status: 'EXITED' }],
  },
};
const NEVER: ContainerView = { hasEverDeployed: false, latestDeployment: null };
const STARTING: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: { id: 'dep2', status: 'DEPLOYING', deploymentStopped: true, instances: [] },
};
const FAILED: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: { id: 'dep', status: 'CRASHED', deploymentStopped: false, instances: [] },
};
const WEIRD: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: { id: 'dep', status: 'SKIPPED', deploymentStopped: false, instances: [] },
};

function pollerOver(views: ContainerView[] | (() => Promise<ContainerView>)) {
  const reads: number[] = [];
  const read = typeof views === 'function'
    ? views
    : async () => {
        const index = Math.min(reads.length, views.length - 1);
        reads.push(index);
        return views[index]!;
      };
  let n = 0;
  const poller = new Poller({
    provider: { read },
    onReadError: () => {},
    newId: () => `op_${(n += 1)}`,
  });
  return { poller, reads };
}

/** Drives the poller by hand so a test can place a read either side of a claim. */
function manualPoller() {
  let resolveRead: ((view: ContainerView) => void) | undefined;
  const pending: ((view: ContainerView) => void)[] = [];
  const poller = new Poller({
    provider: {
      read: () =>
        new Promise<ContainerView>((resolve) => {
          resolveRead = resolve;
          pending.push(resolve);
        }),
    },
    onReadError: () => {},
    newId: () => 'op_manual',
  });
  return { poller, pending, latest: () => resolveRead };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('cadence — V-22, V-23', () => {
  it('reads once per 30 s while idle', async () => {
    const { poller } = pollerOver([UP]);
    poller.start();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    poller.stop();
    expect(poller.reads()).toBeGreaterThanOrEqual(20);
    expect(poller.reads()).toBeLessThanOrEqual(22);
  });

  it('speeds up to 2 s while an operation is in flight, and slows down once it lands', async () => {
    let current: ContainerView = STARTING;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const operation = poller.claim('up')!;
    poller.setTarget(operation.id, 'dep');
    const before = poller.reads();
    await vi.advanceTimersByTimeAsync(10 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.reads() - before).toBeGreaterThanOrEqual(9);

    current = UP; // the target deployment arrives
    await vi.advanceTimersByTimeAsync(IN_FLIGHT_INTERVAL_MS);
    expect(poller.busy()).toBe(false);
    expect(poller.operation()?.status).toBe('succeeded');

    const afterLanding = poller.reads();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS - 1);
    expect(poller.reads() - afterLanding).toBeLessThanOrEqual(1);
    poller.stop();
  });

  it('releases the guard after 90 s even if nothing resolving arrives', async () => {
    const { poller } = pollerOver(async () => STARTING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;
    expect(poller.busy()).toBe(true);

    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS + IN_FLIGHT_INTERVAL_MS);
    expect(poller.busy()).toBe(false);
    expect(poller.operation()).toMatchObject({ id: operation.id, status: 'timed-out' });
    poller.stop();
  });
});

describe('emission — V-24, V-25, V-26, V-26a', () => {
  it('emits once for two identical reads', async () => {
    const seen: ContainerState[] = [];
    const { poller } = pollerOver([UP, UP, UP]);
    poller.subscribe((s) => seen.push(s));
    poller.start();
    await vi.advanceTimersByTimeAsync(3 * IDLE_INTERVAL_MS);
    poller.stop();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ phase: 'up' });
  });

  it('emits again when the state really changes', async () => {
    const seen: ContainerState[] = [];
    const { poller } = pollerOver([UP, STOPPED]);
    poller.subscribe((s) => seen.push(s));
    poller.start();
    await vi.advanceTimersByTimeAsync(2 * IDLE_INTERVAL_MS);
    poller.stop();
    expect(seen.map((s) => s.phase)).toEqual(['up', 'down']);
  });

  it('a failed read changes nothing and does not stop the poller', async () => {
    const seen: ContainerState[] = [];
    let fail = false;
    const errors: unknown[] = [];
    const poller = new Poller({
      provider: { read: async () => { if (fail) throw new Error('network'); return UP; } },
      onReadError: (e) => errors.push(e),
    });
    poller.subscribe((s) => seen.push(s));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toHaveLength(1);

    fail = true;
    await vi.advanceTimersByTimeAsync(2 * IDLE_INTERVAL_MS);
    expect(seen).toHaveLength(1);
    expect(poller.current()).toMatchObject({ phase: 'up' });
    expect(errors.length).toBeGreaterThan(0);

    fail = false;
    const readsBefore = poller.reads();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS);
    expect(poller.reads()).toBeGreaterThan(readsBefore);
    poller.stop();
  });

  it('a subscriber gets the current state immediately, without a read', async () => {
    const { poller } = pollerOver([UP]);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const readsBefore = poller.reads();

    const seen: ContainerState[] = [];
    poller.subscribe((s) => seen.push(s));
    expect(seen).toHaveLength(1);
    expect(poller.reads()).toBe(readsBefore);
    poller.stop();
  });

  it('the read count does not depend on how many clients are listening', async () => {
    const counts: number[] = [];
    for (const clients of [0, 1, 5]) {
      const { poller } = pollerOver([UP, STOPPED, UP]);
      for (let i = 0; i < clients; i += 1) poller.subscribe(() => {});
      poller.start();
      await vi.advanceTimersByTimeAsync(3 * IDLE_INTERVAL_MS);
      poller.stop();
      counts.push(poller.reads());
    }
    expect(new Set(counts).size).toBe(1);
  });

  it('unsubscribing stops delivery', async () => {
    const seen: ContainerState[] = [];
    const { poller } = pollerOver([UP, STOPPED]);
    const unsubscribe = poller.subscribe((s) => seen.push(s));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    unsubscribe();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS);
    expect(seen).toHaveLength(1);
    poller.stop();
  });
});

// ---------------------------------------------------------------------------
// The operation lifecycle. Every case here is one a previous design got wrong.
// ---------------------------------------------------------------------------

describe('operation lifecycle', () => {
  it('1 — two simultaneous claims: one wins, the other is refused', async () => {
    const { poller } = pollerOver([UP]);
    const results = await Promise.all([
      Promise.resolve().then(() => poller.claim('up')),
      Promise.resolve().then(() => poller.claim('up')),
    ]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);
  });

  it('2 — Stop does not resolve on a replica change, only on down', async () => {
    let current: ContainerView = UP;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.claim('down');

    current = UP_SCALED; // a real change, and nothing to do with the press
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.busy()).toBe(true);
    expect(poller.current()).toMatchObject({ phase: 'up', replicas: 2 });

    current = STOPPED;
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.busy()).toBe(false);
    expect(poller.operation()?.status).toBe('succeeded');
    poller.stop();
  });

  it('3 — Start does not resolve on a down-to-down reason change', async () => {
    let current: ContainerView = NEVER;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;
    poller.setTarget(operation.id, 'dep');

    current = STOPPED; // down/never-deployed -> down/stopped
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.busy()).toBe(true);
    poller.stop();
  });

  it('4 — an unknown phase is shown at once but does not end the operation', async () => {
    const { poller } = pollerOver(async () => WEIRD);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;
    poller.setTarget(operation.id, 'dep');

    await vi.advanceTimersByTimeAsync(5 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.current()?.phase).toBe('unknown');
    expect(poller.busy()).toBe(true);

    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS);
    expect(poller.operation()?.status).toBe('timed-out');
    poller.stop();
  });

  it('5 — a read begun before the claim cannot end the operation', async () => {
    const { poller, pending } = manualPoller();
    void poller.pollOnce();                 // begins while the container is up
    const operation = poller.claim('down')!; // press lands while it is in flight
    expect(poller.busy()).toBe(true);

    pending[0]!(STOPPED);                    // pre-press data that looks like an answer
    await vi.advanceTimersByTimeAsync(0);

    expect(poller.current()).toMatchObject({ phase: 'down' });
    expect(poller.busy()).toBe(true);        // shown, but it did not answer for the press
    expect(poller.operation()?.id).toBe(operation.id);
    poller.stop();
  });

  it('6 — a read that outlived its deadline cannot walk the state backwards', async () => {
    const { poller, pending } = manualPoller();
    const first = poller.pollOnce();
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1); // first read times out
    await expect(first).resolves.toBeUndefined();

    void poller.pollOnce();
    pending[1]!(STOPPED);                    // the second read lands
    await vi.advanceTimersByTimeAsync(0);
    expect(poller.current()).toMatchObject({ phase: 'down' });

    pending[0]!(UP);                         // the orphan finally answers
    await vi.advanceTimersByTimeAsync(0);
    expect(poller.current()).toMatchObject({ phase: 'down' }); // not rolled back
    poller.stop();
  });

  it('7 — a late failure from a timed-out operation cannot release its successor', async () => {
    const { poller } = pollerOver(async () => STARTING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const a = poller.claim('up')!;
    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS + 1);
    expect(poller.operation()?.status).toBe('timed-out');

    const b = poller.claim('down')!;
    expect(b.id).not.toBe(a.id);

    poller.finish(a.id, 'refused');           // A comes back at last
    expect(poller.busy()).toBe(true);         // B still holds the guard
    expect(poller.operation()?.id).toBe(b.id);
    poller.stop();
  });

  it('8 — a read that never settles still times out, and polling resumes', async () => {
    let settle = false;
    const errors: unknown[] = [];
    const poller = new Poller({
      provider: {
        read: () =>
          settle
            ? Promise.resolve(STOPPED)
            : new Promise<ContainerView>(() => {}), // never settles, ignores the signal
      },
      onReadError: (e) => errors.push(e),
      newId: () => 'op_8',
    });
    const seen: (Operation | null)[] = [];
    poller.subscribeOperation((o) => seen.push(o));
    poller.start();
    const operation = poller.claim('down')!;

    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1);
    expect(errors.length).toBeGreaterThan(0);          // the read was abandoned

    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS);
    expect(seen.at(-1)).toMatchObject({ id: operation.id, status: 'timed-out' });

    settle = true;                                     // the provider recovers
    const before = poller.reads();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS + READ_TIMEOUT_MS);
    expect(poller.reads()).toBeGreaterThan(before);     // not wedged
    expect(poller.current()).toMatchObject({ phase: 'down' });
    poller.stop();
  });

  it('9 — an indeterminate verb holds the guard to the deadline', async () => {
    let current: ContainerView = UP;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('down')!;

    poller.reportIndeterminate(operation.id);
    expect(poller.busy()).toBe(true);        // the press may still be running

    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS + 1);
    expect(poller.busy()).toBe(false);
    expect(poller.operation()?.status).toBe('indeterminate'); // not 'timed-out'
    poller.stop();
  });

  it('9b — an ambiguous verb still resolves as success if the container arrives', async () => {
    let current: ContainerView = UP;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('down')!;
    poller.reportIndeterminate(operation.id);

    current = STOPPED;                        // it had taken effect after all
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.operation()).toMatchObject({ id: operation.id, status: 'succeeded' });
    poller.stop();
  });

  it('9c — a definite refusal frees the guard at once', async () => {
    const { poller } = pollerOver(async () => UP);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('down')!;

    poller.finish(operation.id, 'refused');   // Railway said no, which is knowledge
    expect(poller.busy()).toBe(false);
    expect(poller.operation()?.status).toBe('refused');
    poller.stop();
  });

  it('10 — a late subscriber is told the operation is still running', async () => {
    const { poller } = pollerOver(async () => STARTING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;

    const seen: (Operation | null)[] = [];
    poller.subscribeOperation((o) => seen.push(o)); // reconnects mid-press
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: operation.id, status: 'in-flight' });
    poller.stop();
  });

  it('11 — Start does not resolve on a different deployment', async () => {
    let current: ContainerView = STARTING;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;
    poller.setTarget(operation.id, 'dep2');

    current = UP_OTHER; // a different deployment is up
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.current()).toMatchObject({ phase: 'up', deploymentId: 'other' });
    expect(poller.busy()).toBe(true);
    poller.stop();
  });

  it('12 — a crashed target resolves as failed, not succeeded', async () => {
    let current: ContainerView = STARTING;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;
    poller.setTarget(operation.id, 'dep');

    current = FAILED;
    await vi.advanceTimersByTimeAsync(2 * IN_FLIGHT_INTERVAL_MS);
    expect(poller.operation()).toMatchObject({ id: operation.id, status: 'failed' });
    expect(poller.busy()).toBe(false);
    poller.stop();
  });
});
