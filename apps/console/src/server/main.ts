/**
 * One process serves the screen, the five routes and the one poller — in
 * development and in production alike. The only difference between the two is
 * who produces the HTML, and that is one dynamic import behind one flag.
 *
 * `D-UI-5`.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { handle, isApiRequest } from './routes';
import { disposeRuntime, getRuntime } from './runtime';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT ?? 3000);

/**
 * Fail fast, and say which variable.
 *
 * `V-55` asks a misconfigured console to refuse to start rather than come up
 * and fail later, and this is that refusal. It does mean `V-CS-2` — the first
 * read answering `500 console-misconfigured` — cannot also hold, because a
 * process that exits answers nothing. The two criteria genuinely conflict; the
 * written one wins until the owner settles `Q-OPS-5`, and the conflict is
 * recorded rather than resolved by quietly changing behaviour.
 */
try {
  getRuntime();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const assets = dev
  ? await (await import('./dev')).viteMiddleware()
  : (await import('./static')).staticMiddleware(new URL('../../dist/', import.meta.url));

const server = createServer((req, res) => {
  if (isApiRequest(req.url ?? '/')) {
    void handle(req, res);
    return;
  }
  assets(req, res);
});

server.listen(port, () => {
  console.log(`console listening on :${port}${dev ? ' (dev)' : ''}`);
});

/**
 * Railway sends SIGTERM. Stop reading, end every open stream so no browser is
 * left holding a socket that will never speak again, then let the loop drain.
 * A second signal is impatience, and it is honoured.
 */
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (closing) process.exit(1);
    closing = true;
    server.close();
    disposeRuntime();
    setTimeout(() => process.exit(0), 3_000).unref();
  });
}
