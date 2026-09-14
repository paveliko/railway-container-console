/**
 * The only module that knows the endpoint exists.
 *
 * The browser cannot reach it: CORS on backboard is pinned to
 * https://railway.com regardless of the requesting origin
 * (`_research/2026-09-14-railway-graphql-surface.md` §2). That is not a
 * preference this layer implements — it is the only thing the transport allows.
 */

import { headersFor, type Credential } from './credential';
import { classify, parseBudget, RailwayRequestError, type Budget } from './errors';

export const RAILWAY_GRAPHQL_ENDPOINT = 'https://backboard.railway.com/graphql/v2';

export interface ExecuteOptions {
  credential: Credential;
  /** Injected in tests; defaults to the global. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

let lastBudget: Budget | undefined;

/** What Railway last told us about the rate limit. For display only. */
export function lastKnownBudget(): Budget | undefined {
  return lastBudget;
}

/**
 * Rejects with `RailwayRequestError`, never with a raw Response, and never
 * retries: none of the mutations this console issues is idempotent
 * (`_research/2026-09-14-railway-operations-and-cost.md` §6).
 */
export async function execute<TData>(
  document: string,
  variables: Record<string, unknown>,
  options: ExecuteOptions,
): Promise<TData> {
  const doFetch = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(RAILWAY_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { ...headersFor(options.credential), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: document, variables }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    throw new RailwayRequestError({ kind: 'network', cause });
  }

  const budget = parseBudget(response.headers);
  if (budget) lastBudget = budget;

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    if (!response.ok) {
      throw new RailwayRequestError({
        kind: 'unknown',
        message: `HTTP ${response.status} with an unreadable body`,
      });
    }
    throw new RailwayRequestError({ kind: 'network', cause });
  }

  const error = classify(response.status, body, response.headers);
  if (error) throw new RailwayRequestError(error);

  const data = (body as { data?: TData }).data;
  if (data == null) {
    throw new RailwayRequestError({
      kind: 'unknown',
      message: 'Railway returned no data and no error',
    });
  }
  return data;
}
