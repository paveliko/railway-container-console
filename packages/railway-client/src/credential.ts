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
 *
 * This used to be one `fromEnv` returning credential, target *and*
 * `CONSOLE_PASSPHRASE`. The passphrase is a console concern (`Q-SEC-4`) and
 * this package may not know one, so it split in two and the composition moved
 * to `apps/console/src/server/config.ts` — `Q-SEC-5`'s registered default,
 * still open. `V-1 … V-4` are unchanged by the split.
 */
export function credentialFromEnv(env: Env): Credential {
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
  return { kind, token } as Credential;
}

export function targetFromEnv(env: Env): Target {
  return {
    projectId: required(env, 'RAILWAY_PROJECT_ID'),
    environmentId: required(env, 'RAILWAY_ENVIRONMENT_ID'),
    serviceId: required(env, 'RAILWAY_SERVICE_ID'),
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
