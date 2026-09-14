/**
 * Serving the built client in production.
 *
 * Forty lines rather than a dependency, because the behaviour is three rules
 * and one of them has to be right: a path that escapes the root must be
 * refused. `startsWith(root)` is the tempting version of that check and it is
 * wrong — `/dist-evil` starts with `/dist` — so the comparison is against the
 * root plus a separator, after decoding and normalising.
 *
 * The other rule worth stating: the single-page fallback answers navigations
 * only. A missing asset is a 404, not the application's HTML, because a script
 * tag that receives a page of markup fails in a way nobody can read.
 */

import { createReadStream, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf('.');
  return (dot === -1 ? undefined : CONTENT_TYPES[path.slice(dot)]) ?? 'application/octet-stream';
}

function wantsHtml(req: IncomingMessage): boolean {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') return false;
  return (req.headers.accept ?? '').includes('text/html');
}

/** The resolved file inside `root`, or null if it escapes or is not a file. */
function fileWithin(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  const candidate = resolve(join(root, normalize(decoded)));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;

  try {
    return statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

export function staticMiddleware(dist: URL) {
  const root = resolve(fileURLToPath(dist));
  const index = join(root, 'index.html');

  return (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const file = fileWithin(root, pathname);

    if (file !== null) {
      // Vite fingerprints everything under assets/, so those may be cached
      // forever; index.html must never be, or a deploy is invisible.
      const immutable = pathname.startsWith('/assets/');
      res.writeHead(200, {
        'content-type': contentTypeFor(file),
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-store',
      });
      createReadStream(file).pipe(res);
      return;
    }

    if (wantsHtml(req)) {
      res.writeHead(200, { 'content-type': CONTENT_TYPES['.html']!, 'cache-control': 'no-store' });
      createReadStream(index).pipe(res);
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  };
}
