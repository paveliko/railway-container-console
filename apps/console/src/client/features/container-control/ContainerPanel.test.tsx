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
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(state) }));
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
