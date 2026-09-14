/**
 * Where the console's configuration is composed.
 *
 * `@repo/railway-client` answers "which credential, which container" and
 * nothing else — it may not know what a console passphrase is (`Q-SEC-4` is a
 * console concern, and `D-OPS-2` forbids the Railway package from knowing one).
 * So the split is: that package exports `credentialFromEnv` and
 * `targetFromEnv`, and this file — the only reader of `CONSOLE_PASSPHRASE` in
 * the repository (`V-MW-17`) — puts the three together.
 *
 * `Q-SEC-5` is still open. What it decides is only whether `Config` belongs
 * here or in a package of its own; the split itself is forced either way.
 */

import {
  credentialFromEnv,
  targetFromEnv,
  type Credential,
  type Env,
  type Target,
} from '@repo/railway-client';

export interface Config {
  credential: Credential;
  target: Target;
  /** When set, the two mutating routes require a session cookie. Q-SEC-4. */
  passphrase?: string;
}

/**
 * Throws before the server listens, never later. Every message names the
 * variable at fault, because the alternative is a console that starts and then
 * fails on the first press.
 */
export function configFromEnv(env: Env): Config {
  // The credential is validated first, exactly as the single `fromEnv` did
  // before the split, so the first message a misconfigured console prints is
  // still about the token and not about a project id.
  const credential = credentialFromEnv(env);
  const target = targetFromEnv(env);
  const passphrase = env.CONSOLE_PASSPHRASE?.trim();

  return {
    credential,
    target,
    ...(passphrase ? { passphrase } : {}),
  };
}
