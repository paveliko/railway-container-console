/**
 * V-MW-14: the two unions that cross HTTP are closed at runtime, not only in
 * the type system. V-MW-15's other half — that there is no second, hand-written
 * declaration of `ContainerState` — is a grep in `scripts/check-boundaries.mjs`.
 */

import { describe, expect, it } from 'vitest';

import {
  consoleErrorSchema,
  containerStateSchema,
  DEPLOYMENT_INSTANCE_STATUSES,
  DEPLOYMENT_STATUSES,
} from './index';

describe('containerStateSchema', () => {
  it('rejects a phase that does not exist', () => {
    expect(containerStateSchema.safeParse({ phase: 'running' }).success).toBe(false);
  });

  it('rejects a known phase that is missing its payload', () => {
    expect(containerStateSchema.safeParse({ phase: 'starting' }).success).toBe(false);
  });

  it('accepts every phase of the union with a well-formed payload', () => {
    const states = [
      { phase: 'down', reason: 'stopped' },
      { phase: 'starting', deploymentId: 'd', status: 'DEPLOYING' },
      { phase: 'up', deploymentId: 'd', replicas: 1 },
      { phase: 'up', deploymentId: 'd', replicas: 2, url: 'https://example.test' },
      { phase: 'stopping', deploymentId: 'd' },
      { phase: 'failed', deploymentId: 'd', status: 'CRASHED' },
      { phase: 'sleeping', deploymentId: 'd' },
      { phase: 'unknown', observed: 'status=SUCCESS' },
    ];
    for (const state of states) {
      expect(containerStateSchema.safeParse(state), JSON.stringify(state)).toMatchObject({
        success: true,
      });
    }
  });

  it('rejects a down reason outside the three', () => {
    expect(containerStateSchema.safeParse({ phase: 'down', reason: 'paused' }).success).toBe(false);
  });

  it('rejects a failed status that is not FAILED or CRASHED', () => {
    const parsed = containerStateSchema.safeParse({
      phase: 'failed',
      deploymentId: 'd',
      status: 'SUCCESS',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('consoleErrorSchema', () => {
  it('accepts an error code on its own', () => {
    expect(consoleErrorSchema.safeParse({ error: 'transition-in-flight' }).success).toBe(true);
  });

  it('rejects an error code outside the union', () => {
    expect(consoleErrorSchema.safeParse({ error: 'oops' }).success).toBe(false);
  });

  it('carries traceId and retryAfterSeconds when present', () => {
    const parsed = consoleErrorSchema.parse({
      error: 'railway-rate-limited',
      traceId: 't-1',
      retryAfterSeconds: 30,
    });
    expect(parsed).toEqual({
      error: 'railway-rate-limited',
      traceId: 't-1',
      retryAfterSeconds: 30,
    });
  });
});

describe('the Railway enums', () => {
  it('keeps the excerpt order and count', () => {
    expect(DEPLOYMENT_STATUSES).toHaveLength(13);
    expect(DEPLOYMENT_STATUSES[0]).toBe('BUILDING');
    expect(DEPLOYMENT_INSTANCE_STATUSES).toHaveLength(10);
    expect(DEPLOYMENT_INSTANCE_STATUSES).not.toContain('SLEEPING');
  });

  it('has no STOPPED deployment status — the stop shows in the instances', () => {
    expect(DEPLOYMENT_STATUSES as readonly string[]).not.toContain('STOPPED');
    expect(DEPLOYMENT_INSTANCE_STATUSES as readonly string[]).toContain('STOPPED');
  });
});
