/**
 * `V-CV-1` … `V-CV-4`, and the half of `V-12` that lives in this package: the
 * branch `D-API-5` chose, and the promise that a press issues its mutation
 * exactly once.
 */

import { describe, expect, it, vi } from 'vitest';

import { RailwayRequestError } from './errors';
import { startContainer, stopContainer } from './verbs';
import type { ReadServiceInstanceData } from './read-container';

const credential = { kind: 'project', token: 'tok' } as const;
const target = { projectId: 'p', environmentId: 'e', serviceId: 's' };

function view(
  latest: ReadServiceInstanceData['serviceInstance']['latestDeployment'],
  hasEverDeployed = true,
): ReadServiceInstanceData {
  return { serviceInstance: { hasEverDeployed, latestDeployment: latest } };
}

const STOPPED = view({
  id: 'dep-1', status: 'SUCCESS', deploymentStopped: true, url: null, canRedeploy: true,
  instances: [{ id: 'i', status: 'EXITED' }],
});
const RUNNING = view({
  id: 'dep-1', status: 'SUCCESS', deploymentStopped: false, url: null, canRedeploy: true,
  instances: [{ id: 'i', status: 'RUNNING' }],
});
const NEVER = view(null, false);

/** Records the operation name of every request, and answers each in turn. */
function transcript(readData: ReadServiceInstanceData, mutationData: unknown) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string };
    const name = /\b(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? 'anonymous';
    calls.push(name);
    const data = name === 'ReadServiceInstance' ? readData : mutationData;
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { calls, fetchImpl: fetchImpl as never };
}

describe('startContainer — D-API-5, V-CV-1, V-CV-2', () => {
  it('revives a stopped deployment and keeps its id', async () => {
    const { calls, fetchImpl } = transcript(STOPPED, { deploymentRestart: true });
    const result = await startContainer(credential, target, { fetchImpl });

    expect(calls).toEqual(['ReadServiceInstance', 'RestartDeployment']);
    expect(result).toEqual({ deploymentId: 'dep-1' });
  });

  it('deploys a new instance when there is nothing to revive, and returns the new id', async () => {
    const { calls, fetchImpl } = transcript(NEVER, { serviceInstanceDeployV2: 'dep-new' });
    const result = await startContainer(credential, target, { fetchImpl });

    expect(calls).toEqual(['ReadServiceInstance', 'DeployServiceInstance']);
    expect(result).toEqual({ deploymentId: 'dep-new' });
  });

  it('does not try to revive a deployment that is merely running', async () => {
    const { calls, fetchImpl } = transcript(RUNNING, { serviceInstanceDeployV2: 'dep-new' });
    await startContainer(credential, target, { fetchImpl });

    expect(calls[1]).toBe('DeployServiceInstance');
  });

  it('issues its mutation exactly once — V-12', async () => {
    const { calls, fetchImpl } = transcript(STOPPED, { deploymentRestart: true });
    await startContainer(credential, target, { fetchImpl });

    expect(calls.filter((c) => c === 'RestartDeployment')).toHaveLength(1);
  });
});

describe('stopContainer — D-API-5, V-CV-4', () => {
  it('stops the latest deployment by id', async () => {
    const { calls, fetchImpl } = transcript(RUNNING, { deploymentStop: true });
    await stopContainer(credential, target, { fetchImpl });

    expect(calls).toEqual(['ReadServiceInstance', 'StopDeployment']);
  });

  it('rejects with no-deployment when there is nothing to stop', async () => {
    const { calls, fetchImpl } = transcript(NEVER, {});

    await expect(stopContainer(credential, target, { fetchImpl })).rejects.toThrow(
      RailwayRequestError,
    );
    await expect(
      stopContainer(credential, target, { fetchImpl }),
    ).rejects.toMatchObject({ detail: { kind: 'no-deployment' } });

    // And it never asked Railway to stop anything.
    expect(calls).not.toContain('StopDeployment');
  });

  it('does not retry when the mutation rejects — V-12', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      const name = /\b(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? 'anonymous';
      calls.push(name);
      if (name === 'ReadServiceInstance') {
        return new Response(JSON.stringify({ data: RUNNING }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ errors: [{ message: 'Not Authorized' }] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(
      stopContainer(credential, target, { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ detail: { kind: 'not-authorized' } });
    expect(calls.filter((c) => c === 'StopDeployment')).toHaveLength(1);
  });
});
