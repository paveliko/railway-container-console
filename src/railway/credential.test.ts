import { describe, expect, it } from 'vitest';
import { ConfigError, fromEnv, headersFor, type Env } from './credential';

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

describe('fromEnv — V-3, V-4', () => {
  it('accepts a complete environment', () => {
    const config = fromEnv({ ...COMPLETE });
    expect(config.credential).toEqual({ kind: 'project', token: 't0ken' });
    expect(config.target).toEqual({ projectId: 'p', environmentId: 'e', serviceId: 's' });
    expect(config.passphrase).toBeUndefined();
  });

  it('carries a passphrase when one is set', () => {
    expect(fromEnv({ ...COMPLETE, CONSOLE_PASSPHRASE: 'shh' }).passphrase).toBe('shh');
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
