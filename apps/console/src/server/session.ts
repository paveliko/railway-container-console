/**
 * The passphrase gate. `D-SEC-2` (resolving `Q-SEC-4`) sets
 * `CONSOLE_PASSPHRASE` on the deployed demo, so there the gate is on: the two
 * mutating routes require a cookie and the two reading routes stay open,
 * because reading state harms nobody. The variable stays optional in code and
 * is normally absent in local development, where there is nothing to protect.
 *
 * The cookie is an HMAC over its own expiry, not a random token in a table:
 * this process has no store, and a value that carries its own deadline cannot
 * be replayed a week later. Comparison is constant-time — a passphrase check
 * that returns early leaks the passphrase one character at a time.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { ForbiddenOrigin, Unauthorized } from './errors';
import { parseCookies } from './http';

export const SESSION_COOKIE = 'console_session';
/** Eight hours: longer than a demo, shorter than a forgotten laptop. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Derived once per process. A restart invalidates every cookie, which is the
 * correct trade for a console with no session store: the cost is one re-entry,
 * and the alternative is a secret that outlives the process that issued it.
 */
const SIGNING_KEY = randomBytes(32);

function sign(expiresAt: number): string {
  const mac = createHmac('sha256', SIGNING_KEY).update(String(expiresAt)).digest('hex');
  return `${expiresAt}.${mac}`;
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on a length mismatch, which would itself be a leak;
  // hashing first makes both sides a fixed width whatever the input.
  const l = createHmac('sha256', SIGNING_KEY).update(left).digest();
  const r = createHmac('sha256', SIGNING_KEY).update(right).digest();
  return timingSafeEqual(l, r);
}

export function issueCookie(secure: boolean): { value: string; header: string } {
  const value = sign(Date.now() + SESSION_TTL_MS);
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) attributes.push('Secure');
  return { value, header: attributes.join('; ') };
}

export function checkPassphrase(supplied: unknown, expected: string): boolean {
  return typeof supplied === 'string' && equal(supplied, expected);
}

/** Verifies the signature *and* the expiry it carries. Either failing is a 401. */
export function hasValidSession(req: IncomingMessage): boolean {
  const cookie = parseCookies(req.headers.cookie).get(SESSION_COOKIE);
  if (cookie === undefined) return false;

  const separator = cookie.lastIndexOf('.');
  if (separator === -1) return false;

  const expiresAt = Number(cookie.slice(0, separator));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  return equal(cookie, sign(expiresAt));
}

/**
 * Refuses a mutating request from an origin this console does not serve.
 *
 * Not required by the specification, and included anyway: with no passphrase
 * set there is otherwise nothing at all between a page on another origin and
 * the two buttons that spend the owner's money. A request with no `Origin` —
 * curl, a health check — is allowed, because same-origin form posts do not
 * send one either.
 */
export function assertSameOrigin(req: IncomingMessage): void {
  const origin = req.headers.origin;
  if (origin === undefined) return;

  const host = req.headers.host;
  if (host === undefined) throw new ForbiddenOrigin();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ForbiddenOrigin();
  }
  if (originHost !== host) throw new ForbiddenOrigin();
}

export function assertAuthorized(req: IncomingMessage, passphrase: string | undefined): void {
  if (passphrase === undefined) return;
  if (!hasValidSession(req)) throw new Unauthorized();
}
