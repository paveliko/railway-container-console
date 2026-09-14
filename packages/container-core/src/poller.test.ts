import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IDLE_INTERVAL_MS,
  IN_FLIGHT_INTERVAL_MS,
  IN_FLIGHT_TIMEOUT_MS,
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
const STOPPED: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep', status: 'SUCCESS', deploymentStopped: true,
    instances: [{ id: 'i', status: 'EXITED' }],
  },
};
const STARTING: ContainerView = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep2', status: 'DEPLOYING', deploymentStopped: true, instances: [],
  },
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
  const poller = new Poller({ provider: { read }, onReadError: () => {} });
  return { poller, reads };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('cadence — V-22, V-23', () => {
  it('reads once per 30 s while idle', async () => {
    const { poller } = pollerOver([UP]);
    poller.start();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    poller.stop();
    // One immediate read on start, then one per idle interval.
    expect(poller.reads()).toBeGreaterThanOrEqual(20);
    expect(poller.reads()).toBeLessThanOrEqual(22);
  });

  it('speeds up to 2 s once a transition is in flight, and slows down after it lands', async () => {
    let current: ContainerView = STARTING;
    const { poller } = pollerOver(async () => current);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    poller.markInFlight('up');
    const before = poller.reads();
    await vi.advanceTimersByTimeAsync(10 * IN_FLIGHT_INTERVAL_MS);
    const during = poller.reads() - before;
    expect(during).toBeGreaterThanOrEqual(9);

    current = UP; // terminal phase arrives
    await vi.advanceTimersByTimeAsync(IN_FLIGHT_INTERVAL_MS);
    expect(poller.inFlight()).toBeNull();

    const afterLanding = poller.reads();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS - 1);
    expect(poller.reads() - afterLanding).toBeLessThanOrEqual(1);
    poller.stop();
  });

  it('releases the in-flight guard after 90 s even if nothing terminal arrives', async () => {
    const { poller } = pollerOver(async () => STARTING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.markInFlight('up');
    expect(poller.inFlight()).toBe('up');

    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS + IN_FLIGHT_INTERVAL_MS);
    expect(poller.inFlight()).toBeNull();
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
      provider: {
        read: async () => { if (fail) throw new Error('network'); return UP; },
      },
      onReadError: (e) => errors.push(e),
    });
    poller.subscribe((s) => seen.push(s));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toHaveLength(1);

    fail = true;
    await vi.advanceTimersByTimeAsync(2 * IDLE_INTERVAL_MS);
    expect(seen).toHaveLength(1);                    // no event
    expect(poller.current()).toMatchObject({ phase: 'up' }); // last known stands
    expect(errors.length).toBeGreaterThan(0);

    fail = false;
    const readsBefore = poller.reads();
    await vi.advanceTimersByTimeAsync(IDLE_INTERVAL_MS);
    expect(poller.reads()).toBeGreaterThan(readsBefore); // still polling
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
