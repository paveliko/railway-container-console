/**
 * The small mechanics every route needs: writing a JSON answer, reading a
 * bounded JSON body, and reading a cookie.
 *
 * Bounded is the load-bearing word. A request body is the one input a stranger
 * controls the size of, and the session route is reachable before any
 * authentication has happened, so it is read with a ceiling rather than
 * accumulated until the client stops talking.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/** 8 KiB. A passphrase is tens of bytes; anything near this is not one. */
export const MAX_BODY_BYTES = 8 * 1024;

export class PayloadTooLarge extends Error {}
export class MalformedBody extends Error {}

export function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

export function noContent(res: ServerResponse, headers: Record<string, string> = {}): void {
  res.writeHead(204, { 'cache-control': 'no-store', ...headers });
  res.end();
}

/**
 * Reads at most `MAX_BODY_BYTES` and parses it. Throws `PayloadTooLarge` the
 * moment the ceiling is crossed — not after buffering the whole thing, which
 * would make the ceiling decorative.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLarge();
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  if (text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new MalformedBody();
  }
}

export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (header === undefined) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}
