import { describe, expect, it, vi } from 'vitest';
import { RailwayRequestError } from './errors';
import { execute, RAILWAY_GRAPHQL_ENDPOINT } from './transport';

const credential = { kind: 'project', token: 'tok' } as const;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('execute', () => {
  it('posts to the one endpoint with the credential’s header — V-1', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: { ok: true } }));
    await execute('query { ok }', { a: 1 }, { credential, fetchImpl: fetchImpl as never });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe(RAILWAY_GRAPHQL_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Project-Access-Token': 'tok' });
    expect(JSON.parse(String(init.body))).toEqual({ query: 'query { ok }', variables: { a: 1 } });
  });

  it('resolves with data when there is no error — V-10', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: { value: 42 } }));
    await expect(
      execute<{ value: number }>('query { value }', {}, { credential, fetchImpl: fetchImpl as never }),
    ).resolves.toEqual({ value: 42 });
  });

  it('rejects with kind "network" and keeps the cause — V-9', async () => {
    const cause = new TypeError('fetch failed');
    const fetchImpl = vi.fn(async () => { throw cause; });
    const error = await execute('query { x }', {}, { credential, fetchImpl: fetchImpl as never })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RailwayRequestError);
    expect((error as RailwayRequestError).detail).toEqual({ kind: 'network', cause });
  });

  it('rejects on an HTTP 200 that carries "Not Authorized" — V-5', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ errors: [{ message: 'Not Authorized', traceId: 'abc' }], data: null }),
    );
    const error = await execute('query { me { id } }', {}, { credential, fetchImpl: fetchImpl as never })
      .catch((e: unknown) => e);
    expect((error as RailwayRequestError).detail).toEqual({ kind: 'not-authorized', traceId: 'abc' });
  });

  it('issues the document exactly once, whatever goes wrong — V-12', async () => {
    for (const failure of [
      () => jsonResponse({}, { status: 429, headers: { 'Retry-After': '5' } }),
      () => { throw new Error('boom'); },
    ]) {
      const fetchImpl = vi.fn(failure as never);
      await execute('mutation { doThing }', {}, { credential, fetchImpl: fetchImpl as never })
        .catch(() => {});
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });
});
