/**
 * The console's own error shape — parent design §9.
 *
 * No Railway response body is ever forwarded to the browser: the union below
 * is closed, and `traceId` is the only thing that travels through from
 * Railway, because it is the only thing a reviewer can act on.
 */

import { z } from 'zod';

export const consoleErrorCodeSchema = z.enum([
  'railway-not-authorized',
  'railway-rate-limited',
  'railway-unavailable',
  'railway-rejected',
  'transition-in-flight',
]);

export type ConsoleErrorCode = z.infer<typeof consoleErrorCodeSchema>;

export const consoleErrorSchema = z.object({
  error: consoleErrorCodeSchema,
  /** When Railway gave one. */
  traceId: z.string().optional(),
  /** `railway-rate-limited` only; mirrors the `Retry-After` header. */
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});

export type ConsoleError = z.infer<typeof consoleErrorSchema>;
