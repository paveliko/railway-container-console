/**
 * The stream the browser holds open.
 *
 * Two event types, and the split matters. The unnamed event carries a bare
 * `ContainerState` and every one of them replaces the whole value — that is
 * `V-47`, and adding fields to it would break the promise. The named
 * `operation` event carries what the state cannot say: whether the press the
 * user made is still running.
 *
 * The browser cannot work that out for itself. It has no read sequence, no
 * operation epoch, and no way to tell a state that answers the press from one
 * that merely arrived after it. The server has all three, so the server says so
 * and the browser renders the answer.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { getRuntime } from './runtime';

/** Comment frames, so a proxy between here and the browser keeps the socket. */
export const PING_INTERVAL_MS = 15_000;
/** How long the browser waits before reconnecting; bounds `reconnecting`. */
const RETRY_MS = 3_000;

export function streamEvents(req: IncomingMessage, res: ServerResponse): void {
  const runtime = getRuntime();

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-transform',
    connection: 'keep-alive',
    // nginx-family proxies buffer `text/event-stream` into uselessness without
    // this. Whether Railway's edge honours it is `Q-OPS-4`; it is harmless if
    // it is ignored.
    'x-accel-buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`retry: ${RETRY_MS}\n\n`);

  // Both subscriptions replay immediately, which is what makes a reconnect
  // mid-press cost nothing and — more importantly — stops the browser's button
  // flickering back to enabled while the press is still running.
  const unsubscribeState = runtime.poller.subscribe((state) => {
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  });
  const unsubscribeOperation = runtime.poller.subscribeOperation((operation) => {
    res.write(`event: operation\ndata: ${JSON.stringify(operation)}\n\n`);
  });

  const ping = setInterval(() => res.write(': ping\n\n'), PING_INTERVAL_MS);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearInterval(ping);
    unsubscribeState();
    unsubscribeOperation();
    runtime.streams.delete(dispose);
    res.end();
  };

  runtime.streams.add(dispose);
  req.on('close', dispose);
}
