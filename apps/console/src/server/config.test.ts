/**
 * V-MW-17, and the half of `V-3` / `V-4` that moved here when `fromEnv` split:
 * the passphrase is a console concern, so the test for it is a console test.
 */

import { describe, expect, it } from 'vitest';
import type { Env } from '@repo/railway-client';

import { configFromEnv } from './config';

const COMPLETE = {
  RAILWAY_TOKEN_KIND: 'project',
  RAILWAY_TOKEN: 't0ken',
  RAILWAY_PROJECT_ID: 'p',
  RAILWAY_ENVIRONMENT_ID: 'e',
  RAILWAY_SERVICE_ID: 's',
} satisfies Env;

describe('configFromEnv — V-3, V-4, V-MW-17', () => {
  it('accepts a complete environment', () => {
    const config = configFromEnv({ ...COMPLETE });
    expect(config.credential).toEqual({ kind: 'project', token: 't0ken' });
    expect(config.target).toEqual({ projectId: 'p', environmentId: 'e', serviceId: 's' });
    expect(config.passphrase).toBeUndefined();
  });

  it('carries a passphrase when one is set', () => {
    expect(configFromEnv({ ...COMPLETE, CONSOLE_PASSPHRASE: 'shh' }).passphrase).toBe('shh');
  });

  it('treats a blank passphrase as absent — an empty env var is not a gate', () => {
    expect(configFromEnv({ ...COMPLETE, CONSOLE_PASSPHRASE: '   ' }).passphrase).toBeUndefined();
  });

  it('still refuses a missing token kind, naming the accepted values', () => {
    const { RAILWAY_TOKEN_KIND: _omitted, ...rest } = COMPLETE;
    expect(() => configFromEnv(rest)).toThrow(/account, workspace, oauth, project/);
  });
});
