/**
 * The stream's contract, at the level of the bytes it writes.
 *
 * Driven through fake sockets rather than a real one so the 15 s ping and the
 * 90 s operation deadline can be reached in milliseconds. What is being checked
 * is the framing and the ordering, and both are visible here exactly as a
 * browser would see them.
 */

import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IN_FLIGHT_TIMEOUT_MS, Poller } from '@repo/container-core';
import { operationEventSchema, containerStateSchema } from '@repo/contracts';

import { setRuntime, type Runtime } from './runtime';
import { PING_INTERVAL_MS, streamEvents } from './sse';
import { RUNNING, STOPPED, type Frame } from '../../test/fake-railway';

function viewOf(frame: Frame) {
  const latest = frame.latestDeployment;
  return {
    hasEverDeployed: frame.hasEverDeployed,
    latestDeployment:
      latest === null
        ? null
        : {
            id: latest.id,
            status: latest.status as never,
            deploymentStopped: latest.deploymentStopped,
            instances: latest.instances as never,
            ...(latest.url ? { url: latest.url } : {}),
          },
  };
}

/** A socket that records everything written to it. */
function fakeSocket() {
  const req = new EventEmitter() as IncomingMessage;
  const written: string[] = [];
  const res = {
    writeHead: vi.fn(),
    flushHeaders: vi.fn(),
    write: (chunk: string) => { written.push(chunk); return true; },
    end: vi.fn(),
  } as unknown as ServerResponse;
  return { req, res, written, text: () => written.join('') };
}

/** Every `data:` line of the unnamed event, parsed. */
function stateEvents(text: string): unknown[] {
  return text
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice('data: '.length)));
}

/** Every `operation` event, parsed. */
function operationEvents(text: string): unknown[] {
  return text
    .split('\n\n')
    .filter((frame) => frame.startsWith('event: operation'))
    .map((frame) => JSON.parse(frame.slice(frame.indexOf('data: ') + 'data: '.length)));
}

let runtime: Runtime;

function harness(frame: Frame = RUNNING) {
  let current = frame;
  const poller = new Poller({
    provider: { read: async () => viewOf(current) },
    onReadError: () => {},
    newId: () => 'op_sse',
  });
  runtime = {
    config: {
      credential: { kind: 'project', token: 't' },
      target: { projectId: 'p', environmentId: 'e', serviceId: 's' },
    },
    provider: { read: async () => viewOf(current), up: async () => ({ deploymentId: 'x' }), down: async () => {} },
    poller,
    streams: new Set(),
  };
  setRuntime(runtime);
  return { poller, setFrame: (next: Frame) => { current = next; } };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  runtime?.poller.stop();
  for (const dispose of [...(runtime?.streams ?? [])]) dispose();
  setRuntime(undefined);
  vi.useRealTimers();
});

describe('the stream', () => {
  it('opens with the current state and the current operation, costing no read', async () => {
    const { poller } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const readsBefore = poller.reads();

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);

    expect(poller.reads()).toBe(readsBefore);          // V-26, V-26a
    expect(stateEvents(socket.text())[0]).toMatchObject({ phase: 'up' });
    expect(operationEvents(socket.text())).toEqual([null]);
  });

  it('every state event is a bare ContainerState — V-47', async () => {
    const { poller, setFrame } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);

    setFrame(STOPPED);
    await vi.advanceTimersByTimeAsync(30_000);

    const events = stateEvents(socket.text());
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (const event of events) {
      // Parses as a whole state and carries nothing else: the operation travels
      // on its own event precisely so this stays true.
      expect(() => containerStateSchema.parse(event)).not.toThrow();
    }
  });

  it('announces an operation, and announces its end even when the state never moves', async () => {
    const { poller } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);
    const statesBefore = stateEvents(socket.text()).length;

    poller.claim('down');
    await vi.advanceTimersByTimeAsync(0);
    expect(operationEvents(socket.text()).at(-1)).toMatchObject({ status: 'in-flight' });

    // The container never changes. Under a state-only protocol the browser would
    // wait for a difference that never comes, and the button would stay disabled
    // forever. The operation event is what releases it.
    await vi.advanceTimersByTimeAsync(IN_FLIGHT_TIMEOUT_MS + 1);
    expect(operationEvents(socket.text()).at(-1)).toMatchObject({ status: 'timed-out' });
    expect(stateEvents(socket.text())).toHaveLength(statesBefore);
  });

  it('every operation event validates against its own schema', async () => {
    const { poller } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);
    poller.claim('up');
    await vi.advanceTimersByTimeAsync(0);

    for (const event of operationEvents(socket.text())) {
      expect(() => operationEventSchema.parse(event)).not.toThrow();
    }
  });

  it('a reconnecting browser is told the press is still running', async () => {
    const { poller } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const operation = poller.claim('up')!;

    const socket = fakeSocket();          // the browser comes back mid-press
    streamEvents(socket.req, socket.res);

    expect(operationEvents(socket.text())[0]).toMatchObject({
      id: operation.id,
      status: 'in-flight',
    });
  });

  it('pings inside 20 s so a proxy keeps the socket — V-CS-4', async () => {
    const { poller } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);
    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS + 1_000);

    expect(socket.text()).toContain(': ping');
  });

  it('a disconnect unsubscribes, and stops costing anything', async () => {
    const { poller, setFrame } = harness(RUNNING);
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const socket = fakeSocket();
    streamEvents(socket.req, socket.res);
    expect(runtime.streams.size).toBe(1);

    socket.req.emit('close');
    expect(runtime.streams.size).toBe(0);

    const before = socket.written.length;
    setFrame(STOPPED);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(socket.written).toHaveLength(before);
  });
});
