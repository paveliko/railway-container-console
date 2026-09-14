/**
 * The one error shape that leaves the console's server, and the closed set of
 * reasons it can carry.
 *
 * The set is closed on purpose: `V-CS-8` requires every error body the server
 * writes to parse with `consoleErrorSchema`, so a response the schema cannot
 * describe is a defect rather than a detail. That is why the list below is
 * longer than the five Railway-shaped codes — the routes also refuse unknown
 * paths, missing cookies, malformed bodies and oversized ones, and each of
 * those answers needs a name the browser can render. `Q-UI-7`.
 *
 * Nothing here carries a string from a Railway response body. `traceId` is the
 * single exception, and it is an identifier rather than prose (`V-14`).
 */

import { z } from 'zod';

export const consoleErrorCodeSchema = z.enum([
  // Railway said something, and this is what it amounts to.
  'railway-not-authorized',
  'railway-rate-limited',
  'railway-unavailable',
  'railway-rejected',
  // The console's own refusals.
  'transition-in-flight',
  'console-misconfigured',
  'not-found',
  'no-deployment',
  'unauthorized',
  'bad-request',
  'forbidden-origin',
  'payload-too-large',
]);

export type ConsoleErrorCode = z.infer<typeof consoleErrorCodeSchema>;

export const consoleErrorSchema = z.object({
  error: consoleErrorCodeSchema,
  /** When Railway gave one. */
  traceId: z.string().optional(),
  /**
   * `railway-rate-limited` only; mirrors the `Retry-After` header.
   *
   * The browser shows it as how long to wait before pressing again — not as a
   * countdown to an automatic retry, because there is no automatic retry. The
   * mutations are not idempotent (`V-12`).
   */
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});

export type ConsoleError = z.infer<typeof consoleErrorSchema>;
