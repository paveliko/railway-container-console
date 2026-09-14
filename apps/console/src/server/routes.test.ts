/**
 * The HTTP boundary, driven over a real socket against a fake Railway.
 *
 * These run the actual dispatch, the actual transport and the actual error
 * classification. The only thing replaced is `fetch`, which is the point: a
 * test that stubbed the provider would prove the routes call something, not
 * that a `429` becomes a `429`.
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Poller } from '@repo/container-core';
import { createRailwayProvider } from '@repo/railway-client';

import { handle, isApiRequest } from './routes';
import { setRuntime, type Runtime } from './runtime';
import { fakeRailway, RUNNING, STOPPED, type Failure, type Frame } from '../../test/fake-railway';

const credential = { kind: 'project', token: 'tok' } as const;
const target = { projectId: 'p', environmentId: 'e', serviceId: 's' };

let server: Server;
let origin: string;
let railway: ReturnType<typeof fakeRailway>;
let runtime: Runtime;

interface Harness {
  frame?: Frame;
  failWith?: Failure | null;
  passphrase?: string;
  delayMs?: number;
}

function start(options: Harness = {}): void {
  let frame = options.frame ?? STOPPED;
  let failure: Failure | null = options.failWith ?? null;

  railway = fakeRailway({
    frame: () => frame,
    failMutationsWith: () => failure,
    mutationDelayMs: () => options.delayMs ?? 0,
  });
  (railway as unknown as { setFrame: (f: Frame) => void }).setFrame = (f) => { frame = f; };
  (railway as unknown as { setFailure: (f: Failure | null) => void }).setFailure = (f) => {
    failure = f;
  };

  const provider = createRailwayProvider(credential, target, railway.fetchImpl);
  const poller = new Poller({ provider, onReadError: () => {} });
  runtime = {
    config: {
      credential,
      target,
      ...(options.passphrase !== undefined ? { passphrase: options.passphrase } : {}),
    },
    provider,
    poller,
    streams: new Set(),
  };
  setRuntime(runtime);
}

beforeEach(async () => {
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const dispose of [...(runtime?.streams ?? [])]) dispose();
  runtime?.poller.stop();
  setRuntime(undefined);
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const post = (path: string, body?: unknown) =>
  fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('routing', () => {
  it('claims /api for itself and nothing else', () => {
    expect(isApiRequest('/api/container/state')).toBe(true);
    expect(isApiRequest('/api')).toBe(true);
    expect(isApiRequest('/assets/app.js')).toBe(false);
    expect(isApiRequest('/')).toBe(false);
  });

  it('answers an unknown /api route with 404 JSON, never HTML', async () => {
    start();
    const response = await fetch(`${origin}/api/nope`);
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'not-found' });
  });

  it('serves the current state', async () => {
    start({ frame: RUNNING });
    const response = await fetch(`${origin}/api/container/state`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ phase: 'up', deploymentId: 'dep-1' });
  });
});

describe('the guard — V-18', () => {
  it('two simultaneous presses issue one mutation; the other gets 409', async () => {
    start({ frame: STOPPED });
    const [a, b] = await Promise.all([post('/api/container/up'), post('/api/container/up')]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([202, 409]);

    const refused = a.status === 409 ? a : b;
    expect(await refused.json()).toEqual({ error: 'transition-in-flight' });

    // The refused press reached Railway not at all — not even the read.
    expect(railway.countOf('RestartDeployment')).toBe(1);
  });

  it('a start answers 202 with the deployment it is waiting for', async () => {
    start({ frame: STOPPED });
    const response = await post('/api/container/up');
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ deploymentId: 'dep-1' });
    expect(runtime.poller.operation()).toMatchObject({ transition: 'up', target: 'dep-1' });
  });

  it('a definite refusal frees the guard; the next press is accepted', async () => {
    start({ frame: RUNNING, failWith: 'not-authorized' });
    const first = await post('/api/container/down');
    expect(first.status).toBe(502);
    expect(await first.json()).toMatchObject({ error: 'railway-not-authorized', traceId: 'trace-abc' });
    expect(runtime.poller.busy()).toBe(false);
  });

  it('an ambiguous failure keeps the guard, so a second press cannot double-fire', async () => {
    start({ frame: RUNNING, failWith: 'network' });
    const first = await post('/api/container/down');
    expect(first.status).toBe(503);
    expect(runtime.poller.busy()).toBe(true);

    const second = await post('/api/container/down');
    expect(second.status).toBe(409);
    expect(railway.countOf('StopDeployment')).toBe(1);
  });
});

describe('the error contract — Q-UI-7', () => {
  const cases: [Failure, number, string][] = [
    ['not-authorized', 502, 'railway-not-authorized'],
    ['rate-limited', 429, 'railway-rate-limited'],
    ['rate-limited-no-header', 429, 'railway-rate-limited'],
    ['validation', 502, 'railway-rejected'],
    ['network', 503, 'railway-unavailable'],
  ];

  for (const [failure, status, code] of cases) {
    it(`${failure} becomes ${status} ${code}`, async () => {
      start({ frame: RUNNING, failWith: failure });
      const response = await post('/api/container/down');
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ error: code });
    });
  }

  it('mirrors Retry-After when Railway sent one, and omits it when it did not', async () => {
    start({ frame: RUNNING, failWith: 'rate-limited' });
    const withHeader = await post('/api/container/down');
    expect(withHeader.headers.get('retry-after')).toBe('30');
    expect(await withHeader.json()).toMatchObject({ retryAfterSeconds: 30 });

    start({ frame: RUNNING, failWith: 'rate-limited-no-header' });
    const without = await post('/api/container/down');
    const payload = (await without.json()) as Record<string, unknown>;
    expect(payload).toEqual({ error: 'railway-rate-limited' });
    expect(payload.retryAfterSeconds).toBeUndefined();
  });

  it('never forwards Railway prose, only the trace id', async () => {
    start({ frame: RUNNING, failWith: 'validation' });
    const response = await post('/api/container/down');
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain('numReplicas');
    expect(text).not.toContain('Invalid input');
  });

  it('refuses to stop what does not exist', async () => {
    start({ frame: { hasEverDeployed: false, latestDeployment: null } });
    const response = await post('/api/container/down');
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'no-deployment' });
  });
});

describe('the passphrase gate — V-20, V-CS-7', () => {
  it('leaves everything open when no passphrase is configured', async () => {
    start({ frame: RUNNING });
    expect((await fetch(`${origin}/api/container/state`)).status).toBe(200);
    expect((await post('/api/container/down')).status).toBe(202);
  });

  it('refuses a press without a cookie but still serves state', async () => {
    start({ frame: RUNNING, passphrase: 'open sesame' });
    const refused = await post('/api/container/down');
    expect(refused.status).toBe(401);
    expect(await refused.json()).toEqual({ error: 'unauthorized' });
    expect(railway.countOf('StopDeployment')).toBe(0);

    expect((await fetch(`${origin}/api/container/state`)).status).toBe(200);
  });

  it('exchanges the right passphrase for a hardened cookie, and accepts it', async () => {
    start({ frame: RUNNING, passphrase: 'open sesame' });

    const wrong = await post('/api/session', { passphrase: 'guess' });
    expect(wrong.status).toBe(401);

    const right = await post('/api/session', { passphrase: 'open sesame' });
    expect(right.status).toBe(204);
    const cookie = right.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');

    const accepted = await fetch(`${origin}/api/container/down`, {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0]! },
    });
    expect(accepted.status).toBe(202);
  });

  it('rejects a malformed body with 400 and an oversized one with 413', async () => {
    start({ passphrase: 'open sesame' });

    const malformed = await fetch(`${origin}/api/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'bad-request' });

    const huge = await fetch(`${origin}/api/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'x'.repeat(9000) }),
    });
    expect(huge.status).toBe(413);
    expect(await huge.json()).toEqual({ error: 'payload-too-large' });
  });

  it('refuses a cross-origin press', async () => {
    start({ frame: RUNNING });
    const response = await fetch(`${origin}/api/container/down`, {
      method: 'POST',
      headers: { origin: 'https://elsewhere.example' },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'forbidden-origin' });
    expect(railway.countOf('StopDeployment')).toBe(0);
  });
});
