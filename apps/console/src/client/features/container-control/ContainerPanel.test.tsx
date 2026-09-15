// @vitest-environment jsdom
/**
 * The three reasons a control is disabled, tested one at a time, and the
 * promise that none of them is inferred from `ContainerState`.
 *
 * The last test is the important one. A previous design re-enabled the button
 * whenever a state arrived that looked like an answer — which a reconnect
 * snapshot, a replica change, or the previous deployment's leftovers all do.
 * The server is the only thing that knows, so a satisfying state arriving with
 * no `operation` event must leave the button exactly as it was.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ContainerState, Operation } from '@repo/contracts';

import { ContainerPanel } from './ContainerPanel';
import { createQueryClient } from '../../query-client';

const UP: ContainerState = { phase: 'up', deploymentId: 'dep-1', replicas: 1 };
const STARTING: ContainerState = { phase: 'starting', deploymentId: 'dep-1', status: 'DEPLOYING' };

/** A stand-in the test drives by hand. */
class FakeEventSource {
  static last: FakeEventSource | undefined;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  #listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();

  constructor(readonly url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: (event: MessageEvent<string>) => void) {
    this.#listeners.set(type, [...(this.#listeners.get(type) ?? []), fn]);
  }
  close() {}
  emitState(state: ContainerState) {
    this.emitRaw(JSON.stringify(state));
  }
  /** Whatever the server actually wrote, valid or not — `V-SC-6` needs the not. */
  emitRaw(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
  emitOperation(operation: Operation | null) {
    for (const fn of this.#listeners.get('operation') ?? []) {
      fn(new MessageEvent('operation', { data: JSON.stringify(operation) }));
    }
  }
}

function mount() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ContainerPanel />
    </QueryClientProvider>,
  );
}

const stopButton = () => screen.getByRole('button', { name: 'Stop' }) as HTMLButtonElement;
const headline = () => screen.getByRole('heading', { level: 1 }).textContent;
/** The one `role="alert"` on the card. Empty means a reserved, blank line. */
const errorLine = () => screen.getByRole('alert').textContent?.replace(/\u00A0/g, '').trim() ?? '';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });

/** Answer each request by method, so a press can fail while the read succeeds. */
function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((url: unknown, init?: RequestInit) => handler(String(url), init));
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(UP), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeEventSource.last = undefined;
});

describe('when the control is disabled', () => {
  it('renders the state the server reported, once the first read lands', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveProperty('textContent', 'Up'));
    expect(stopButton().disabled).toBe(false);
  });

  it('2 — the server reporting an operation disables it, with no local press', async () => {
    mount();
    await waitFor(() => expect(stopButton()).toBeTruthy());

    FakeEventSource.last!.emitOperation({
      id: 'op-1', transition: 'down', status: 'in-flight', since: Date.now(),
    });
    await waitFor(() => expect(stopButton().disabled).toBe(true));
  });

  it('3 — a transition nobody here started disables it', async () => {
    mount();
    await waitFor(() => expect(stopButton()).toBeTruthy());

    // Someone pressed Stop in the Railway dashboard, or the container crashed.
    FakeEventSource.last!.emitState(STARTING);
    await waitFor(() =>
      expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true),
    );
  });

  it('a resolving state with no operation event does not re-enable it', async () => {
    mount();
    await waitFor(() => expect(stopButton()).toBeTruthy());

    const source = FakeEventSource.last!;
    source.emitOperation({
      id: 'op-1', transition: 'down', status: 'in-flight', since: Date.now(),
    });
    await waitFor(() => expect(stopButton().disabled).toBe(true));

    // A state that looks like an answer — a reconnect snapshot, a replica
    // change, the previous deployment. The browser cannot tell, so it must not
    // guess: only the server's own verdict releases the control.
    source.emitState({ phase: 'up', deploymentId: 'dep-1', replicas: 2 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(stopButton().disabled).toBe(true);

    source.emitOperation({
      id: 'op-1', transition: 'down', status: 'succeeded', since: Date.now(),
    });
    await waitFor(() => expect(stopButton().disabled).toBe(false));
  });

  it('shows the stream as reconnecting without clearing the state', async () => {
    mount();
    await waitFor(() => expect(stopButton()).toBeTruthy());

    FakeEventSource.last!.onopen?.();
    await waitFor(() => expect(screen.getByText('live')).toBeTruthy());

    FakeEventSource.last!.onerror?.();
    await waitFor(() => expect(screen.getByText('reconnecting')).toBeTruthy());
    // The last known state stays on screen.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Up');
  });
});

const DOWN: ContainerState = { phase: 'down', reason: 'stopped' };
const UP_WITH_URL: ContainerState = {
  phase: 'up', deploymentId: 'dep-1', replicas: 1, url: 'https://target.up.railway.app',
};

describe('the hook and the stream — V-SC-3, V-SC-6', () => {
  it('constructs the EventSource only after the GET resolves — V-SC-3, V-48', async () => {
    let answer!: () => void;
    const read = new Promise<void>((resolve) => { answer = resolve; });
    stubFetch(async () => {
      await read;
      return jsonResponse(UP);
    });

    mount();

    // The read is out and has not answered. There is nothing for an event to
    // update, so there is no stream — and this is the ordering the criterion is
    // about: opening both at once would race the first frame against the read.
    await waitFor(() => expect(screen.getByText('Reading the container…')).toBeTruthy());
    expect(FakeEventSource.last).toBeUndefined();

    answer();

    await waitFor(() => expect(headline()).toBe('Up'));
    expect(FakeEventSource.last).toBeDefined();
    expect(FakeEventSource.last!.url).toBe('/api/container/events');
  });

  it('ignores an SSE frame that fails containerStateSchema, and logs it — V-SC-6', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    await waitFor(() => expect(headline()).toBe('Up'));

    // A phase the contract does not have. Parsing it as state would put a
    // headline on screen that no derivation ever produced.
    FakeEventSource.last!.emitRaw(JSON.stringify({ phase: 'levitating' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(headline()).toBe('Up');
    expect(log).toHaveBeenCalled();

    // Not merely unparseable JSON — malformed and well-formed-but-wrong both
    // take the same path, and both leave the last good state alone.
    FakeEventSource.last!.emitRaw('{not json');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(headline()).toBe('Up');

    // And a valid frame after them still lands, so the stream is not poisoned.
    FakeEventSource.last!.emitState(DOWN);
    await waitFor(() => expect(headline()).toBe('Down'));
  });
});

describe('what the card shows — V-SC-4, V-SC-5, V-SC-7', () => {
  it('leaves no URL on screen when down follows up — V-SC-4, V-47', async () => {
    mount();
    await waitFor(() => expect(headline()).toBe('Up'));

    FakeEventSource.last!.emitState(UP_WITH_URL);
    await waitFor(() =>
      expect(screen.getByRole('link')).toHaveProperty('href', 'https://target.up.railway.app/'),
    );

    // The container is down; the address it used to answer on is not a detail
    // that survives it.
    FakeEventSource.last!.emitState(DOWN);
    await waitFor(() => expect(headline()).toBe('Down'));
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/target\.up\.railway\.app/)).toBeNull();
  });

  it('phrases a 409 as a notice and a 502 as an error — V-SC-5, V-45, V-46', async () => {
    stubFetch(async (url, init) => {
      if (init?.method !== 'POST') return jsonResponse(DOWN);
      return jsonResponse({ error: 'transition-in-flight' }, 409);
    });

    mount();
    await waitFor(() => expect(headline()).toBe('Down'));
    const start = screen.getByRole('button', { name: 'Start' });

    start.click();

    // `V-45`: information, not failure. It reaches the detail line, and the
    // error line stays the blank reserved row it was.
    await waitFor(() => expect(screen.getByText(/already starting/)).toBeTruthy());
    expect(errorLine()).toBe('');
    expect(headline()).toBe('Down');
  });

  it('renders a 502 with its traceId, headline and control unchanged — V-SC-5, V-46', async () => {
    stubFetch(async (url, init) => {
      if (init?.method !== 'POST') return jsonResponse(DOWN);
      return jsonResponse({ error: 'railway-not-authorized', traceId: 'trace-abc' }, 502);
    });

    mount();
    await waitFor(() => expect(headline()).toBe('Down'));
    screen.getByRole('button', { name: 'Start' }).click();

    await waitFor(() => expect(errorLine()).toContain('trace-abc'));
    // The sentence, the identifier, and nothing else from Railway — `V-14`.
    expect(errorLine()).toBe('The token is not permitted to do this · trace trace-abc');

    // An error is additive: it says what failed, not what the container is.
    expect(headline()).toBe('Down');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('writes nothing to storage after mount, press and event — V-SC-7, V-49', async () => {
    mount();
    await waitFor(() => expect(headline()).toBe('Up'));

    stopButton().click();
    FakeEventSource.last!.emitState(DOWN);
    await waitFor(() => expect(headline()).toBe('Down'));

    // Measured, not inferred from the source not naming the APIs: the session
    // cookie is HttpOnly and set by the server, and nothing here persists a
    // thing the reader did not ask it to.
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });
});
