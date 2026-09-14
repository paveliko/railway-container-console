/**
 * V-MW-11. The port is an adapter over the same read, not a second mapping:
 * `createRailwayProvider(...).read()` must return exactly what
 * `readContainer(...)` returned before the workspace split, for the same
 * response — and `toContainerView` must still be the only thing that decides
 * the shape.
 */

import { describe, expect, it, vi } from 'vitest';

import { createRailwayProvider } from './provider';
import { readContainer, toContainerView, type ReadServiceInstanceData } from './read-container';

const credential = { kind: 'project', token: 'tok' } as const;
const target = { projectId: 'p', environmentId: 'e', serviceId: 's' };

/** The shape recorded in the 2026-09-14 experiment, stopped state. */
const RESPONSE: ReadServiceInstanceData = {
  serviceInstance: {
    hasEverDeployed: true,
    latestDeployment: {
      id: '2e83786c-cf0d-489b-b7d3-84bec70b4913',
      status: 'SUCCESS',
      deploymentStopped: true,
      url: null,
      canRedeploy: true,
      instances: [{ id: '07902bb3-2429-416b-99f3-acda0b1e7530', status: 'EXITED' }],
    },
  },
};

const fakeFetch = () =>
  vi.fn(
    async () =>
      new Response(JSON.stringify({ data: RESPONSE }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );

describe('createRailwayProvider — V-MW-11', () => {
  it('reads the same ContainerView that readContainer returns', async () => {
    const direct = await readContainer(credential, target, fakeFetch() as never);
    const viaPort = await createRailwayProvider(credential, target, fakeFetch() as never).read();

    expect(viaPort).toEqual(direct);
    expect(viaPort).toEqual(toContainerView(RESPONSE));
  });

  it('binds the credential and target it was given', async () => {
    const fetchImpl = fakeFetch();
    await createRailwayProvider(credential, target, fetchImpl as never).read();

    const [, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ 'Project-Access-Token': 'tok' });
    expect(JSON.parse(String(init.body)).variables).toEqual({
      serviceId: 's',
      environmentId: 'e',
    });
  });

  it('exposes the whole port — Q-API-2 is closed, D-API-5 signed', () => {
    const provider = createRailwayProvider(credential, target);
    expect(Object.keys(provider).sort()).toEqual(['down', 'read', 'up']);
  });
});
