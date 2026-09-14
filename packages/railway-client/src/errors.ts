/**
 * Railway reports failure with HTTP 200 and an `errors` array. The status code
 * carries almost nothing: "Not Authorized" is a 200, and so is an input
 * validation failure, and both arrive with
 * `extensions.code: "INTERNAL_SERVER_ERROR"`. Observed, twice, live —
 * `_research/2026-09-14-railway-graphql-surface.md` §3 and
 * `_research/2026-09-14-experiment-stop-and-start.md`.
 *
 * So: read the body first, the status second — `decisions.md` D-API-3.
 */

export type RailwayError =
  | { kind: 'not-authorized'; traceId?: string }
  | { kind: 'validation'; message: string; traceId?: string }
  | { kind: 'rate-limited'; retryAfterSeconds?: number }
  | { kind: 'network'; cause: unknown }
  /**
   * There is nothing to act on: the service has no deployment to stop. Not a
   * Railway failure — Railway was never asked — but it reaches the caller by
   * the same channel, because from the verb's point of view it is the same
   * kind of event: the press cannot be carried out. `V-CV-4`.
   */
  | { kind: 'no-deployment' }
  | { kind: 'unknown'; message: string; code?: string; traceId?: string };

export class RailwayRequestError extends Error {
  constructor(readonly detail: RailwayError) {
    super(describe(detail));
    this.name = 'RailwayRequestError';
  }
}

/**
 * The single place in the codebase that matches on Railway's message text.
 *
 * `extensions.code` cannot do this job: it is `INTERNAL_SERVER_ERROR` for an
 * auth failure *and* for `numReplicas: 0`. Whether the string is the intended
 * discriminator is `Q-SEC-3`, asked of Railway. When they answer, this is the
 * line that changes.
 */
const NOT_AUTHORIZED = 'Not Authorized';

interface GraphQLErrorShape {
  message?: unknown;
  extensions?: { code?: unknown } | null;
  traceId?: unknown;
}

export interface Budget {
  limit: number;
  windowSeconds: number;
}

/** Returns null when the response carries no error. */
export function classify(
  status: number,
  body: unknown,
  headers?: Headers,
): RailwayError | null {
  // 429 is the one status that means something on its own.
  if (status === 429) {
    const retryAfterSeconds = parseRetryAfter(headers?.get('retry-after'));
    return retryAfterSeconds === undefined
      ? { kind: 'rate-limited' }
      : { kind: 'rate-limited', retryAfterSeconds };
  }

  const errors = extractErrors(body);
  if (errors.length === 0) {
    // A non-2xx with no GraphQL errors is still a failure, just an opaque one.
    if (status < 200 || status >= 300) {
      return { kind: 'unknown', message: `HTTP ${status} with no GraphQL errors` };
    }
    return null;
  }

  const first = errors[0]!;
  const message = typeof first.message === 'string' ? first.message : 'Unknown Railway error';
  const code = typeof first.extensions?.code === 'string' ? first.extensions.code : undefined;
  const traceId = typeof first.traceId === 'string' ? first.traceId : undefined;

  if (message === NOT_AUTHORIZED) {
    return traceId === undefined ? { kind: 'not-authorized' } : { kind: 'not-authorized', traceId };
  }
  if (code === 'GRAPHQL_VALIDATION_FAILED') {
    return { kind: 'validation', message, ...(traceId !== undefined && { traceId }) };
  }
  // Everything else keeps its message: Railway's own text is often the only
  // useful part ("Error in numReplicas - Invalid input").
  return {
    kind: 'unknown',
    message,
    ...(code !== undefined && { code }),
    ...(traceId !== undefined && { traceId }),
  };
}

/**
 * `ratelimit-policy: "default";q=1000;w=3600` → { limit: 1000, windowSeconds: 3600 }.
 * The `X-RateLimit-Remaining` family is advertised in the CORS exposure list but
 * was not present on ordinary responses, so nothing depends on it.
 */
export function parseBudget(headers: Headers | undefined): Budget | undefined {
  const policy = headers?.get('ratelimit-policy');
  if (!policy) return undefined;
  const limit = Number(/[;,]\s*q=(\d+)/.exec(policy)?.[1]);
  const windowSeconds = Number(/[;,]\s*w=(\d+)/.exec(policy)?.[1]);
  if (!Number.isFinite(limit) || !Number.isFinite(windowSeconds)) return undefined;
  return { limit, windowSeconds };
}

function parseRetryAfter(raw: string | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const seconds = Number(raw.trim());
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function extractErrors(body: unknown): GraphQLErrorShape[] {
  if (typeof body !== 'object' || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as GraphQLErrorShape[]) : [];
}

function describe(detail: RailwayError): string {
  switch (detail.kind) {
    case 'not-authorized': return 'Railway refused the request: Not Authorized';
    case 'validation': return `Railway rejected the query: ${detail.message}`;
    case 'rate-limited': return 'Railway rate limit reached';
    case 'network': return 'Railway was unreachable';
    case 'no-deployment': return 'There is no deployment to act on';
    case 'unknown': return `Railway returned an error: ${detail.message}`;
  }
}
