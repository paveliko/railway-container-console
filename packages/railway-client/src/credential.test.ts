import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  credentialFromEnv,
  headersFor,
  targetFromEnv,
  type Env,
} from './credential';

/**
 * `fromEnv` split in two when the code became packages: the passphrase it also
 * used to read is a console concern and now lives in
 * `apps/console/src/server/config.ts` (`Q-SEC-5`'s registered default). The
 * composition is restated here, in the same order, so that every assertion
 * below is the one `V-3` / `V-4` always made.
 */
const fromEnv = (env: Env) => ({
  credential: credentialFromEnv(env),
  target: targetFromEnv(env),
});

const COMPLETE = {
  RAILWAY_TOKEN_KIND: 'project',
  RAILWAY_TOKEN: 't0ken',
  RAILWAY_PROJECT_ID: 'p',
  RAILWAY_ENVIRONMENT_ID: 'e',
  RAILWAY_SERVICE_ID: 's',
} satisfies Env;

describe('headersFor — V-1, V-2', () => {
  it('sends a project token in Project-Access-Token and nothing else', () => {
    const headers = headersFor({ kind: 'project', token: 'abc' });
    expect(headers).toEqual({ 'Project-Access-Token': 'abc' });
    expect(headers).not.toHaveProperty('Authorization');
  });

  for (const kind of ['account', 'workspace', 'oauth'] as const) {
    it(`sends a ${kind} token as a bearer token and nothing else`, () => {
      const headers = headersFor({ kind, token: 'abc' });
      expect(headers).toEqual({ Authorization: 'Bearer abc' });
      expect(headers).not.toHaveProperty('Project-Access-Token');
    });
  }
});

describe('credentialFromEnv + targetFromEnv — V-3, V-4', () => {
  it('accepts a complete environment', () => {
    const config = fromEnv({ ...COMPLETE });
    expect(config.credential).toEqual({ kind: 'project', token: 't0ken' });
    expect(config.target).toEqual({ projectId: 'p', environmentId: 'e', serviceId: 's' });
  });

  it('ignores CONSOLE_PASSPHRASE — this package may not know it (V-MW-17)', () => {
    const config = fromEnv({ ...COMPLETE, CONSOLE_PASSPHRASE: 'shh' });
    expect(JSON.stringify(config)).not.toContain('shh');
  });

  it('refuses a missing token kind, naming the accepted values', () => {
    const { RAILWAY_TOKEN_KIND: _omitted, ...rest } = COMPLETE;
    expect(() => fromEnv(rest)).toThrow(ConfigError);
    expect(() => fromEnv(rest)).toThrow(/account, workspace, oauth, project/);
  });

  it('refuses an unknown token kind, quoting what it got', () => {
    expect(() => fromEnv({ ...COMPLETE, RAILWAY_TOKEN_KIND: 'bearer' })).toThrow(/"bearer"/);
  });

  for (const name of [
    'RAILWAY_TOKEN',
    'RAILWAY_PROJECT_ID',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_SERVICE_ID',
  ] as const) {
    it(`refuses a missing ${name}, naming it`, () => {
      const env = { ...COMPLETE, [name]: '' };
      expect(() => fromEnv(env)).toThrow(new RegExp(name));
    });
  }
});
