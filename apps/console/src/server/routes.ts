/**
 * The five routes of parent design §9, dispatched on method and path.
 *
 * A `switch` rather than a framework. Hono would route this more prettily and
 * cost two production dependencies to do it; SSE wants the raw `ServerResponse`
 * either way; and the deciding detail is that Vite's development middleware is
 * connect-style `(req, res, next)`, which plugs into `node:http` in one line
 * and needs a bridge in both directions from anything Fetch-shaped.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { RailwayRequestError } from '@repo/railway-client';

import { NotFound, toConsoleError } from './errors';
import { json, noContent, readJsonBody } from './http';
import { claim, getRuntime } from './runtime';
import { assertAuthorized, assertSameOrigin, checkPassphrase, issueCookie } from './session';
import { streamEvents } from './sse';

/** Any request under this prefix is ours, and is never answered with HTML. */
export const API_PREFIX = '/api/';

/**
 * How long a verb may take before the console stops waiting on it. The press is
 * not abandoned when this fires — the guard is held and the poller keeps
 * looking — it only stops one hung HTTP call from occupying the route forever.
 */
const VERB_TIMEOUT_MS = 20_000;

export function isApiRequest(url: string): boolean {
  return url === '/api' || url.startsWith(API_PREFIX);
}

async function readState(res: ServerResponse): Promise<void> {
  const { poller } = getRuntime();
  const state = poller.current() ?? (await poller.pollOnce());
  json(res, 200, state ?? null);
}

/**
 * A press.
 *
 * The order here is the whole contract. `claim` takes the guard synchronously,
 * before any await and before the provider is touched, so a second press in the
 * same tick is refused without reaching Railway (`V-18`). Only then is the verb
 * issued, and what happens afterwards depends on *how* it failed:
 *
 *   - it succeeded         → name the target, and let the poller decide when
 *                            the container has actually arrived there;
 *   - Railway refused      → definite knowledge, so free the guard at once;
 *   - it failed ambiguously → the press may have landed. Keep the guard, report
 *                            nothing, and let the poller or the deadline say.
 *
 * The third case is why there is no `catch` that simply releases. Releasing on
 * an ambiguous failure invites a second press over a first that may still be
 * running, and these mutations are not idempotent.
 */
async function press(
  req: IncomingMessage,
  res: ServerResponse,
  transition: 'up' | 'down',
): Promise<void> {
  const runtime = getRuntime();
  assertSameOrigin(req);
  assertAuthorized(req, runtime.config.passphrase);

  const operation = claim(transition);
  const signal = AbortSignal.timeout(VERB_TIMEOUT_MS);

  try {
    if (transition === 'up') {
      const { deploymentId } = await runtime.provider.up(signal);
      // Name the target before answering. From here the poller can tell this
      // start from the previous deployment's leftovers, which is the only thing
      // that stops a stale `up` reading finishing the press.
      runtime.poller.setTarget(operation.id, deploymentId);
      json(res, 202, { deploymentId });
      return;
    }

    await runtime.provider.down(signal);
    json(res, 202, {});
  } catch (error) {
    if (isDefiniteRefusal(error)) {
      runtime.poller.finish(operation.id, 'refused');
    } else {
      runtime.poller.reportIndeterminate(operation.id);
    }
    throw error;
  }
}

/**
 * Did the request definitely not take effect?
 *
 * Railway answering "no" is knowledge, and knowledge frees the guard. A
 * transport failure is not: the request may have arrived, been acted on, and
 * lost its reply. Those are the ones that keep the guard until the poller or
 * the deadline settles the question.
 */
function isDefiniteRefusal(error: unknown): boolean {
  if (!(error instanceof RailwayRequestError)) return false;
  return error.detail.kind !== 'network';
}

export async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const route = `${req.method ?? 'GET'} ${url.pathname}`;

  try {
    switch (route) {
      case 'GET /api/container/state':
        await readState(res);
        return;

      case 'GET /api/container/events':
        streamEvents(req, res);
        return;

      case 'POST /api/container/up':
        await press(req, res, 'up');
        return;

      case 'POST /api/container/down':
        await press(req, res, 'down');
        return;

      case 'POST /api/session': {
        const runtime = getRuntime();
        assertSameOrigin(req);
        const body = await readJsonBody(req);
        const passphrase = runtime.config.passphrase;
        if (passphrase === undefined) {
          // Nothing to sign in to. Saying so is better than a 401 the caller
          // can never satisfy.
          noContent(res);
          return;
        }
        const supplied = (body as { passphrase?: unknown } | undefined)?.passphrase;
        if (!checkPassphrase(supplied, passphrase)) {
          json(res, 401, { error: 'unauthorized' });
          return;
        }
        const { header } = issueCookie(!isDev());
        noContent(res, { 'set-cookie': header });
        return;
      }

      default:
        // An unknown route under /api is a 404 in the console's own error shape.
        // It is never the single-page application's HTML: a typo in a fetch path
        // that comes back as a page is a bug that hides itself.
        throw new NotFound();
    }
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const { status, body, headers } = toConsoleError(error);
    json(res, status, body, headers ?? {});
  }
}

function isDev(): boolean {
  return process.argv.includes('--dev');
}
