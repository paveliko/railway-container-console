/**
 * The only file in this package that names Vite, reached only behind `--dev`.
 *
 * Middleware mode rather than a second process: one server owns the port in
 * development and in production, so the stream the browser holds is the same
 * stream in both, written by the same code, with no proxy in between. A
 * development proxy in front of `text/event-stream` is a well-known way to
 * spend an afternoon debugging buffering that production never had.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

export async function viteMiddleware(): Promise<
  (req: IncomingMessage, res: ServerResponse) => void
> {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  return (req, res) => vite.middlewares(req, res);
}
