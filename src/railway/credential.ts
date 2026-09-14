/**
 * Which header a Railway token goes in depends on the kind of token, and
 * getting it wrong produces an HTTP 200 saying "Not Authorized" with nothing
 * in it about headers (see `_research/2026-09-14-railway-graphql-surface.md`
 * §3, and the live reproduction in the experiment document).
 *
 * So the kind is declared in configuration and validated at startup, never
 * inferred from the token's shape — `decisions.md` D-API-2.
 */

export type TokenKind = 'account' | 'workspace' | 'oauth' | 'project';

export type Credential =
  | { kind: 'account' | 'workspace' | 'oauth'; token: string }
  | { kind: 'project'; token: string };

/** The one container this console manages. No picker — D-API-6. */
export interface Target {
  projectId: string;
  environmentId: string;
  serviceId: string;
}

export interface Config {
  credential: Credential;
  target: Target;
  /** When set, the two mutating routes require a session cookie. Q-SEC-4. */
  passphrase?: string;
}

const TOKEN_KINDS: readonly TokenKind[] = ['account', 'workspace', 'oauth', 'project'];

export function headersFor(credential: Credential): Record<string, string> {
  return credential.kind === 'project'
    ? { 'Project-Access-Token': credential.token }
    : { Authorization: `Bearer ${credential.token}` };
}

export class ConfigError extends Error {}

/** Just a bag of strings. Not `NodeJS.ProcessEnv`, so tests need not fake NODE_ENV. */
export type Env = Record<string, string | undefined>;

/**
 * Throws before the server listens, never later. Every message names the
 * variable at fault, because the alternative is a console that starts and
 * then fails on the first press.
 */
export function fromEnv(env: Env): Config {
  const kind = env.RAILWAY_TOKEN_KIND?.trim();
  if (!kind) {
    throw new ConfigError(
      `RAILWAY_TOKEN_KIND is not set. Expected one of: ${TOKEN_KINDS.join(', ')}.`,
    );
  }
  if (!isTokenKind(kind)) {
    throw new ConfigError(
      `RAILWAY_TOKEN_KIND is "${kind}". Expected one of: ${TOKEN_KINDS.join(', ')}.`,
    );
  }

  const token = required(env, 'RAILWAY_TOKEN');
  const target: Target = {
    projectId: required(env, 'RAILWAY_PROJECT_ID'),
    environmentId: required(env, 'RAILWAY_ENVIRONMENT_ID'),
    serviceId: required(env, 'RAILWAY_SERVICE_ID'),
  };

  const passphrase = env.CONSOLE_PASSPHRASE?.trim();
  return {
    credential: { kind, token } as Credential,
    target,
    ...(passphrase ? { passphrase } : {}),
  };
}

function isTokenKind(value: string): value is TokenKind {
  return (TOKEN_KINDS as readonly string[]).includes(value);
}

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is not set.`);
  return value;
}
