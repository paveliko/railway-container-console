import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deriveContainerState,
  type ContainerState,
  type ContainerView,
  type DeploymentView,
} from './state';
import {
  DEPLOYMENT_INSTANCE_STATUSES,
  DEPLOYMENT_STATUSES,
  type DeploymentInstanceStatus,
  type DeploymentStatus,
} from '../railway/types';

function view(deployment: Partial<DeploymentView> | null, hasEverDeployed = true): ContainerView {
  if (deployment === null) return { hasEverDeployed, latestDeployment: null };
  return {
    hasEverDeployed,
    latestDeployment: {
      id: 'dep',
      status: 'SUCCESS',
      deploymentStopped: false,
      instances: [],
      ...deployment,
    },
  };
}

const running = (n = 1) =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}`, status: 'RUNNING' as const }));

describe('deriveContainerState — the table, row by row', () => {
  it('V-27: no deployment and none ever → down / never-deployed', () => {
    expect(deriveContainerState(view(null, false))).toEqual({
      phase: 'down',
      reason: 'never-deployed',
    });
  });

  it('V-27b: no deployment but there once was → down / removed', () => {
    expect(deriveContainerState(view(null, true))).toEqual({ phase: 'down', reason: 'removed' });
  });

  it('V-28: SUCCESS + stopped + EXITED → down / stopped (the shape really observed)', () => {
    expect(
      deriveContainerState(
        view({ deploymentStopped: true, instances: [{ id: 'i', status: 'EXITED' }] }),
      ),
    ).toEqual({ phase: 'down', reason: 'stopped' });
  });

  it('V-28b: STOPPED instances read the same way, though Railway never produced them', () => {
    expect(
      deriveContainerState(
        view({ deploymentStopped: false, instances: [{ id: 'i', status: 'STOPPED' }] }),
      ),
    ).toEqual({ phase: 'down', reason: 'stopped' });
  });

  it('V-29: SUCCESS + running → up with one replica', () => {
    expect(deriveContainerState(view({ instances: running(1) }))).toEqual({
      phase: 'up',
      deploymentId: 'dep',
      replicas: 1,
    });
  });

  it('V-29b: carries the deployment URL when there is one', () => {
    expect(deriveContainerState(view({ instances: running(1), url: 'https://x.up.railway.app' })))
      .toEqual({ phase: 'up', deploymentId: 'dep', replicas: 1, url: 'https://x.up.railway.app' });
  });

  it('V-30: counts the running replicas', () => {
    expect(deriveContainerState(view({ instances: running(2) }))).toMatchObject({ replicas: 2 });
  });

  it('V-31: every pre-running status → starting', () => {
    for (const status of ['QUEUED', 'WAITING', 'NEEDS_APPROVAL', 'BUILDING', 'DEPLOYING', 'INITIALIZING'] as const) {
      expect(deriveContainerState(view({ status }))).toEqual({
        phase: 'starting',
        deploymentId: 'dep',
        status,
      });
    }
  });

  it('V-32: FAILED and CRASHED → failed, keeping which', () => {
    for (const status of ['FAILED', 'CRASHED'] as const) {
      expect(deriveContainerState(view({ status }))).toEqual({
        phase: 'failed',
        deploymentId: 'dep',
        status,
      });
    }
  });

  it('V-33: SLEEPING → sleeping', () => {
    expect(deriveContainerState(view({ status: 'SLEEPING' }))).toEqual({
      phase: 'sleeping',
      deploymentId: 'dep',
    });
  });

  it('V-34: REMOVING → stopping, REMOVED → down / removed', () => {
    expect(deriveContainerState(view({ status: 'REMOVING' }))).toMatchObject({ phase: 'stopping' });
    expect(deriveContainerState(view({ status: 'REMOVED' }))).toEqual({
      phase: 'down',
      reason: 'removed',
    });
  });

  it('rows 10–11: instances mid-flight under a SUCCESS deployment', () => {
    expect(
      deriveContainerState(view({ instances: [{ id: 'i', status: 'REMOVING' }] })),
    ).toMatchObject({ phase: 'stopping' });
    for (const status of ['CREATED', 'INITIALIZING', 'RESTARTING'] as const) {
      expect(deriveContainerState(view({ instances: [{ id: 'i', status }] }))).toMatchObject({
        phase: 'starting',
      });
    }
  });
});

describe('deriveContainerState — honesty and totality', () => {
  it('V-35: never throws, for any status against any combination of instances', () => {
    const instanceSets: DeploymentInstanceStatus[][] = [[]];
    for (const a of DEPLOYMENT_INSTANCE_STATUSES) {
      instanceSets.push([a]);
      for (const b of DEPLOYMENT_INSTANCE_STATUSES) instanceSets.push([a, b]);
    }
    let checked = 0;
    for (const status of DEPLOYMENT_STATUSES) {
      for (const stopped of [true, false]) {
        for (const set of instanceSets) {
          const state = deriveContainerState(
            view({
              status,
              deploymentStopped: stopped,
              instances: set.map((s, i) => ({ id: `i${i}`, status: s })),
            }),
          );
          expect(state.phase).toBeTypeOf('string');
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(2000);
  });

  it('V-36: an unrecognised combination says what it saw, literally', () => {
    const state = deriveContainerState(
      view({ status: 'SKIPPED', instances: [{ id: 'i', status: 'CRASHED' }] }),
    );
    expect(state.phase).toBe('unknown');
    const observed = (state as { observed: string }).observed;
    expect(observed).toContain('SKIPPED');
    expect(observed).toContain('CRASHED');
  });

  it('V-37: never reports up while deploymentStopped is true', () => {
    for (const set of [running(1), running(3), [{ id: 'i', status: 'RUNNING' as const }]]) {
      const state = deriveContainerState(view({ deploymentStopped: true, instances: set }));
      expect(state.phase).not.toBe('up');
    }
  });

  it('V-37b: a deployment that has not started yet is starting, not down', () => {
    // The shape Railway really returns a second after serviceInstanceDeployV2:
    // deploymentStopped is true because nothing is running *yet*.
    expect(
      deriveContainerState(view({ status: 'DEPLOYING', deploymentStopped: true, instances: [] })),
    ).toEqual({ phase: 'starting', deploymentId: 'dep', status: 'DEPLOYING' });
  });

  it('V-37c: reading deploymentStopped first would be wrong four times out of seven', () => {
    // Every shape the experiment produced where the flag says "stopped" but the
    // container is not down. This is why rows 4–7 match on status first.
    const misleading: Partial<DeploymentView>[] = [
      { status: 'DEPLOYING', deploymentStopped: true, instances: [] },
      { status: 'DEPLOYING', deploymentStopped: true, instances: [{ id: 'i', status: 'INITIALIZING' }] },
      { status: 'DEPLOYING', deploymentStopped: true, instances: running(1) },
      { status: 'REMOVING', deploymentStopped: true, instances: running(1) },
    ];
    for (const deployment of misleading) {
      const state = deriveContainerState(view(deployment));
      expect(state.phase, JSON.stringify(deployment)).not.toBe('down');
    }
  });
});

describe('V-38: every shape the live experiment produced', () => {
  const DIR = 'openspec/_research/experiment-2026-09-14';

  /** Expected phase for each distinct shape recorded on 2026-09-14. */
  const EXPECTED: { status: DeploymentStatus; stopped: boolean; instances: string[]; phase: ContainerState['phase']; reason?: string }[] = [
    { status: 'SUCCESS', stopped: false, instances: ['RUNNING'], phase: 'up' },
    { status: 'SUCCESS', stopped: true, instances: ['EXITED'], phase: 'down', reason: 'stopped' },
    { status: 'REMOVED', stopped: true, instances: ['REMOVED'], phase: 'down', reason: 'removed' },
    { status: 'REMOVING', stopped: true, instances: ['RUNNING'], phase: 'stopping' },
    { status: 'DEPLOYING', stopped: true, instances: [], phase: 'starting' },
    { status: 'DEPLOYING', stopped: true, instances: ['INITIALIZING'], phase: 'starting' },
    { status: 'DEPLOYING', stopped: true, instances: ['RUNNING'], phase: 'starting' },
  ];

  function collectDeployments(): DeploymentView[] {
    const found: DeploymentView[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node !== 'object' || node === null) return;
      const record = node as Record<string, unknown>;
      if ('status' in record && 'deploymentStopped' in record && Array.isArray(record.instances)) {
        found.push(record as unknown as DeploymentView);
      }
      Object.values(record).forEach(walk);
    };
    for (const file of readdirSync(DIR)) {
      if (!file.endsWith('.json') && !file.endsWith('.jsonl')) continue;
      const raw = readFileSync(join(DIR, file), 'utf8');
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        walk(JSON.parse(line));
      }
    }
    return found;
  }

  const recorded = collectDeployments();

  it('the fixtures are actually there', () => {
    expect(recorded.length).toBeGreaterThan(50);
  });

  for (const expected of EXPECTED) {
    it(`${expected.status} / stopped=${expected.stopped} / [${expected.instances}] → ${expected.phase}`, () => {
      const matches = recorded.filter(
        (d) =>
          d.status === expected.status &&
          d.deploymentStopped === expected.stopped &&
          d.instances.map((i) => i.status).join(',') === expected.instances.join(','),
      );
      expect(matches.length, 'shape missing from the fixtures').toBeGreaterThan(0);
      for (const deployment of matches) {
        const state = deriveContainerState({ hasEverDeployed: true, latestDeployment: deployment });
        expect(state.phase).toBe(expected.phase);
        if (expected.reason) expect((state as { reason: string }).reason).toBe(expected.reason);
      }
    });
  }

  it('no recorded shape derives to unknown — the table covers what Railway really sent', () => {
    const unknowns = recorded
      .map((d) => deriveContainerState({ hasEverDeployed: true, latestDeployment: d }))
      .filter((s) => s.phase === 'unknown');
    expect(unknowns).toEqual([]);
  });

  it('the service-create response reads as never-deployed', () => {
    const raw = JSON.parse(readFileSync(join(DIR, '02-after-create.json'), 'utf8'));
    const node = raw.data.environment.serviceInstances.edges[0].node;
    expect(
      deriveContainerState({
        hasEverDeployed: node.hasEverDeployed,
        latestDeployment: node.latestDeployment,
      }),
    ).toEqual({ phase: 'down', reason: 'never-deployed' });
  });
});
