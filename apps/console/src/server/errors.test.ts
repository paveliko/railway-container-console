/**
 * `V-CS-2` and `V-CS-8`: the one shape that leaves this server.
 *
 * `toConsoleError` is pure, so these run it directly rather than through a
 * socket — which is the point of `V-CS-2`. `V-55` makes a misconfigured console
 * exit before it listens, so there is no request to make; the claim the
 * criterion actually makes, after `D-OPS-6` reworded it, is about the mapping.
 *
 * `V-CS-8` is a closure check, not a sample. Parsing a handful of bodies with
 * `consoleErrorSchema` proves those bodies; asserting that the codes produced
 * here *exhaust* `consoleErrorCodeSchema` is what makes a thirteenth code
 * arriving without a mapping into a failing test rather than a quiet gap.
 * `routes.test.ts` covers the same set over the wire, including the one body
 * the routes write without going through this function.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { consoleErrorCodeSchema, consoleErrorSchema } from '@repo/contracts';
import { ConfigError, RailwayRequestError } from '@repo/railway-client';

import {
  ForbiddenOrigin,
  NotFound,
  TransitionInFlight,
  Unauthorized,
  toConsoleError,
} from './errors';
import { MalformedBody, PayloadTooLarge } from './http';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a misconfigured console — V-CS-2', () => {
  it('maps a ConfigError to 500 console-misconfigured', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mapped = toConsoleError(
      new ConfigError('RAILWAY_TOKEN_KIND is not set. Expected one of: account, project.'),
    );

    expect(mapped.status).toBe(500);
    expect(mapped.body).toEqual({ error: 'console-misconfigured' });
    expect(log).toHaveBeenCalled();
  });

  it('names the variable in the log and nowhere else', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mapped = toConsoleError(new ConfigError('RAILWAY_TOKEN_KIND is not set.'));

    // The body carries the code and nothing else — no variable name, no prose.
    // A misconfigured public demo must not tell a stranger which environment
    // variable to go looking for.
    expect(JSON.stringify(mapped.body)).not.toContain('RAILWAY_TOKEN_KIND');
    expect(Object.keys(mapped.body)).toEqual(['error']);

    // And the operator, who reads the deploy log, is told exactly which one.
    expect(log.mock.calls.flat().join(' ')).toContain('RAILWAY_TOKEN_KIND');
  });

  it('reaches Railway not at all', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);

    toConsoleError(new ConfigError('RAILWAY_TOKEN is not set.'));

    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

/** Every error the server can raise, paired with the code it must become. */
const MAPPINGS: [string, unknown, number, string][] = [
  ['TransitionInFlight', new TransitionInFlight(), 409, 'transition-in-flight'],
  ['Unauthorized', new Unauthorized(), 401, 'unauthorized'],
  ['ForbiddenOrigin', new ForbiddenOrigin(), 403, 'forbidden-origin'],
  ['NotFound', new NotFound(), 404, 'not-found'],
  ['PayloadTooLarge', new PayloadTooLarge(), 413, 'payload-too-large'],
  ['MalformedBody', new MalformedBody(), 400, 'bad-request'],
  ['ConfigError', new ConfigError('RAILWAY_TOKEN is not set.'), 500, 'console-misconfigured'],
  [
    'railway not-authorized',
    new RailwayRequestError({ kind: 'not-authorized', traceId: 'trace-abc' }),
    502,
    'railway-not-authorized',
  ],
  [
    'railway rate-limited, with Retry-After',
    new RailwayRequestError({ kind: 'rate-limited', retryAfterSeconds: 30 }),
    429,
    'railway-rate-limited',
  ],
  [
    'railway rate-limited, without',
    new RailwayRequestError({ kind: 'rate-limited' }),
    429,
    'railway-rate-limited',
  ],
  [
    'railway network',
    new RailwayRequestError({ kind: 'network', cause: new TypeError('fetch failed') }),
    503,
    'railway-unavailable',
  ],
  [
    'railway no-deployment',
    new RailwayRequestError({ kind: 'no-deployment' }),
    409,
    'no-deployment',
  ],
  [
    'railway validation',
    new RailwayRequestError({ kind: 'validation', message: 'Error in numReplicas - Invalid input' }),
    502,
    'railway-rejected',
  ],
  [
    'railway unknown',
    new RailwayRequestError({ kind: 'unknown', message: 'something Railway said' }),
    502,
    'railway-rejected',
  ],
  ['anything unmapped', new Error('boom'), 503, 'railway-unavailable'],
];

describe('every error body parses with consoleErrorSchema — V-CS-8', () => {
  for (const [name, error, status, code] of MAPPINGS) {
    it(`${name} → ${status} ${code}, and the body parses`, () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const mapped = toConsoleError(error);

      expect(mapped.status).toBe(status);
      const parsed = consoleErrorSchema.safeParse(mapped.body);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.error).toBe(code);
    });
  }

  it('the schema is strict about what a body may carry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Not a tautology: `safeParse` above would accept a body with an extra key,
    // because the object schema is not strict. So the fields are asserted too.
    const rateLimited = toConsoleError(
      new RailwayRequestError({ kind: 'rate-limited', retryAfterSeconds: 30 }),
    );
    expect(rateLimited.body).toEqual({ error: 'railway-rate-limited', retryAfterSeconds: 30 });
    expect(rateLimited.headers).toEqual({ 'retry-after': '30' });

    const notAuthorized = toConsoleError(
      new RailwayRequestError({ kind: 'not-authorized', traceId: 'trace-abc' }),
    );
    expect(notAuthorized.body).toEqual({ error: 'railway-not-authorized', traceId: 'trace-abc' });
  });

  it('covers the whole code set, so a new code cannot arrive untested', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const produced = new Set(
      MAPPINGS.map(([, error]) => toConsoleError(error).body.error as string),
    );

    // `Q-UI-7` closed the set on the argument that a code with no sentence and
    // no test is not in it. This is the half of that a test can hold.
    expect([...produced].sort()).toEqual([...consoleErrorCodeSchema.options].sort());
  });
});
