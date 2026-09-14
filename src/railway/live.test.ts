/**
 * V-21. The one test that talks to Railway. Read-only: it issues a single
 * `ReadServiceInstance` and checks that the whole chain — credential, header,
 * transport, error classification, view mapping, derivation — produces a state
 * the table recognises.
 *
 * Skipped, not failed, when there is no token: CI has none, and a suite that
 * fails on a clean clone is a suite people stop running.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromEnv, type Env } from './credential';
import { readContainer } from './readContainer';
import { deriveContainerState } from '../container/state';

/** `.env.local` is git-ignored and holds the owner's project token. */
function loadEnv(): Env {
  const env: Env = { ...process.env };
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      const value = rawValue!.trim().replace(/^["']|["']$/g, '');
      if (key && value && !env[key]) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const configured =
  Boolean(env.RAILWAY_TOKEN) &&
  Boolean(env.RAILWAY_TOKEN_KIND) &&
  Boolean(env.RAILWAY_SERVICE_ID) &&
  Boolean(env.RAILWAY_ENVIRONMENT_ID);

describe.skipIf(!configured)('live read against Railway — V-21', () => {
  it('reads the configured container and derives a state the table knows', async () => {
    const config = fromEnv(env);
    const view = await readContainer(config.credential, config.target);
    const state = deriveContainerState(view);

    // eslint-disable-next-line no-console
    console.log('live state:', JSON.stringify(state));

    expect(state.phase).not.toBe('unknown');
    expect(['down', 'up', 'starting', 'stopping', 'failed', 'sleeping']).toContain(state.phase);
  }, 30_000);
});

describe.skipIf(configured)('live read against Railway — V-21', () => {
  it.skip('skipped: no RAILWAY_TOKEN in the environment or .env.local', () => {});
});
