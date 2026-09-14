/**
 * Railway's failures, and the console's own, translated into the one shape that
 * leaves this server.
 *
 * This mapping existed nowhere before: `@repo/railway-client` deliberately does
 * not import `@repo/contracts`' error schema, because a transport has no
 * business knowing what an HTTP status means to a browser. So the translation
 * lives here, in the deployable, with the status table of parent design §9.
 *
 * One rule governs all of it: no string from a Railway response body crosses to
 * the browser. `traceId` is the single exception, and it is an identifier, not
 * prose (`V-14`). Railway's own message is logged, where an operator can read
 * it, and dropped.
 *
 * `D-API-3` once argued the opposite for `kind: 'unknown'`, and that
 * disagreement was registered as `Q-SEC-6` rather than settled quietly here.
 * It was settled on 2026-09-15: `V-14` wins, `D-API-3` is amended, and the
 * clause is withdrawn. This file did not change; only the question did.
 */

import type { ConsoleError, ConsoleErrorCode } from '@repo/contracts';
import { ConfigError, RailwayRequestError } from '@repo/railway-client';

import { MalformedBody, PayloadTooLarge } from './http';

/** A press arrived while another was still running. Raised before any verb. */
export class TransitionInFlight extends Error {}
/** The passphrase gate is on and this request did not pass it. */
export class Unauthorized extends Error {}
/** A mutating request arrived from an origin this console does not serve. */
export class ForbiddenOrigin extends Error {}
/** No route matched. */
export class NotFound extends Error {}

export interface Mapped {
  status: number;
  body: ConsoleError;
  headers?: Record<string, string>;
}

function plain(error: ConsoleErrorCode, status: number): Mapped {
  return { status, body: { error } };
}

export function toConsoleError(error: unknown): Mapped {
  if (error instanceof TransitionInFlight) return plain('transition-in-flight', 409);
  if (error instanceof Unauthorized) return plain('unauthorized', 401);
  if (error instanceof ForbiddenOrigin) return plain('forbidden-origin', 403);
  if (error instanceof NotFound) return plain('not-found', 404);
  if (error instanceof PayloadTooLarge) return plain('payload-too-large', 413);
  if (error instanceof MalformedBody) return plain('bad-request', 400);

  if (error instanceof ConfigError) {
    // The console's own text, not Railway's, so printing it breaks no rule —
    // and `V-55` wants the variable at fault named where a deploy log shows it.
    console.error(`[config] ${error.message}`);
    return plain('console-misconfigured', 500);
  }

  if (error instanceof RailwayRequestError) {
    const detail = error.detail;
    // `exactOptionalPropertyTypes` is on: an explicit `undefined` is not absent.
    const trace =
      'traceId' in detail && detail.traceId !== undefined ? { traceId: detail.traceId } : {};

    switch (detail.kind) {
      case 'not-authorized':
        return { status: 502, body: { error: 'railway-not-authorized', ...trace } };

      case 'rate-limited':
        return detail.retryAfterSeconds === undefined
          ? plain('railway-rate-limited', 429)
          : {
              status: 429,
              body: {
                error: 'railway-rate-limited',
                retryAfterSeconds: detail.retryAfterSeconds,
              },
              // Mirrored, per parent design §9, so a proxy or a curl sees the
              // same number the browser is told.
              headers: { 'retry-after': String(detail.retryAfterSeconds) },
            };

      case 'network':
        return plain('railway-unavailable', 503);

      case 'no-deployment':
        return plain('no-deployment', 409);

      case 'validation':
      case 'unknown':
        // The message lives in the log and nowhere else.
        console.error(`[railway] ${detail.kind}: ${detail.message}`);
        return { status: 502, body: { error: 'railway-rejected', ...trace } };
    }
  }

  console.error('[unmapped]', error);
  return plain('railway-unavailable', 503);
}
