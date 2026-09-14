import { describe, expect, it } from 'vitest';
import { classify, parseBudget } from './errors';

/**
 * Every fixture below is a real response, copied from the research documents or
 * from `openspec/_research/experiment-2026-09-14/`. None is invented.
 */

const NOT_AUTHORIZED_BODY = {
  errors: [
    {
      message: 'Not Authorized',
      locations: [{ line: 1, column: 9 }],
      path: ['me'],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      traceId: '6317530550794947976',
    },
  ],
  data: null,
};

const VALIDATION_BODY = {
  errors: [
    {
      message: 'Cannot query field "nope" on type "Query".',
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      traceId: '8722891371094866651',
    },
  ],
};

// From 04-replicas0.json — an input validation failure wearing the same code
// as the auth failure above.
const NUM_REPLICAS_BODY = {
  errors: [
    {
      message: 'Error in numReplicas - Invalid input',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      traceId: '498867609512240188',
    },
  ],
  data: null,
};

describe('classify — V-5, V-6', () => {
  it('reads "Not Authorized" out of an HTTP 200, with its traceId', () => {
    expect(classify(200, NOT_AUTHORIZED_BODY)).toEqual({
      kind: 'not-authorized',
      traceId: '6317530550794947976',
    });
  });

  it('does not depend on the status code to see an auth failure', () => {
    // The status is 200 and `response.ok` is true; only the body says otherwise.
    expect(classify(200, NOT_AUTHORIZED_BODY)?.kind).toBe('not-authorized');
  });

  it('recognises a malformed document by its code', () => {
    expect(classify(200, VALIDATION_BODY)).toEqual({
      kind: 'validation',
      message: 'Cannot query field "nope" on type "Query".',
      traceId: '8722891371094866651',
    });
  });

  it('keeps Railway’s message for an input rejection, which is the only useful part', () => {
    expect(classify(200, NUM_REPLICAS_BODY)).toEqual({
      kind: 'unknown',
      message: 'Error in numReplicas - Invalid input',
      code: 'INTERNAL_SERVER_ERROR',
      traceId: '498867609512240188',
    });
  });
});

describe('classify — V-7, V-8', () => {
  it('reads Retry-After on a 429', () => {
    const headers = new Headers({ 'Retry-After': '30' });
    expect(classify(429, {}, headers)).toEqual({ kind: 'rate-limited', retryAfterSeconds: 30 });
  });

  it('leaves retryAfterSeconds undefined when the header is absent', () => {
    const error = classify(429, {});
    expect(error).toEqual({ kind: 'rate-limited' });
    expect((error as { retryAfterSeconds?: number }).retryAfterSeconds).toBeUndefined();
  });

  it('leaves retryAfterSeconds undefined when the header is not a number', () => {
    const headers = new Headers({ 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' });
    expect(classify(429, {}, headers)).toEqual({ kind: 'rate-limited' });
  });
});

describe('classify — V-10', () => {
  it('returns null when there is data and no errors', () => {
    expect(classify(200, { data: { serviceInstance: {} } })).toBeNull();
  });
});

describe('parseBudget — V-11', () => {
  it('parses the policy header Railway actually sends', () => {
    const headers = new Headers({ 'ratelimit-policy': '"default";q=1000;w=3600' });
    expect(parseBudget(headers)).toEqual({ limit: 1000, windowSeconds: 3600 });
  });

  it('is undefined when the header is absent, and does not throw', () => {
    expect(parseBudget(new Headers())).toBeUndefined();
    expect(parseBudget(undefined)).toBeUndefined();
  });

  it('is undefined when the header is shaped differently', () => {
    expect(parseBudget(new Headers({ 'ratelimit-policy': 'default' }))).toBeUndefined();
  });
});
