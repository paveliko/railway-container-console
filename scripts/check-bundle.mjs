#!/usr/bin/env node
/**
 * What the browser is actually sent.
 *
 * `V-15` has three parts and this is the only one that reads the output rather
 * than the input. `check-boundaries.mjs` rule 4 walks the client import graph in
 * the source; `apps/console/vite.config.ts` declines to widen `envPrefix` or to
 * add a `define`; and this greps everything the build emitted for Railway's host
 * and for a token value present at build time. The first two prove what the
 * source says. This one proves what is served.
 *
 * `console-screen` design §3 specified it as a step after `next build` over
 * `.next/static/`. Next.js is gone (`D-OPS-4`) and for a while the step went
 * with it: `vite.config.ts` carried a comment *describing* this grep where the
 * grep should have been, and `verification.md` cited that comment's line number
 * as the implementation. A comment is not a check. §3 is amended and this is
 * the check.
 *
 * It lives here, beside its four siblings, rather than inside the Vite config,
 * for a reason that is itself a rule: `V-MW-9` says Railway's host appears in
 * exactly one file under `packages/railway-client/src/`, and a check that names
 * the host in order to grep for it would be the second. `check-boundaries.mjs`
 * has the same property and resolves it the same way — rule 1 searches `apps/`
 * and `packages/`, and a checker is neither.
 *
 * It runs from `@repo/console`'s `build` script, after `vite build`, so a leak
 * fails the build at the moment it is created rather than at a later gate that
 * can be skipped.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'apps/console/dist');

const needles = [['backboard.railway.com', 'Railway’s API host']];

// The sentinel of design §3: a token value present at build time must not
// survive into a chunk. Vite exposes only `VITE_*`, so the green path is
// structural rather than lucky — which is precisely why it is worth a check
// that would notice if a `define` or a widened `envPrefix` ever changed that.
// A short value is ignored, because a two-character token matches everything.
const sentinel = process.env.RAILWAY_TOKEN;
if (sentinel !== undefined && sentinel.length >= 8) {
  // Described, never printed. A check that echoes a credential into the build
  // log has become the leak it was written to catch.
  needles.push([sentinel, 'the RAILWAY_TOKEN value present at build time']);
}

/** Everything emitted, sourcemaps included: a map is served beside its chunk. */
function emitted(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? emitted(full) : [full];
  });
}

if (!existsSync(DIST)) {
  console.error(`Bundle check failed — ${relative(ROOT, DIST)} does not exist; run the build first.`);
  process.exit(1);
}

const files = emitted(DIST);
const found = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [needle, what] of needles) {
    if (text.includes(needle)) found.push(`${relative(DIST, file)} contains ${what}`);
  }
}

if (found.length > 0) {
  console.error('Bundle check failed — the browser bundle must not carry the server’s secrets:');
  for (const line of found) console.error(`  - ${line}`);
  process.exit(1);
}

console.log(`Bundle check passed: ${files.length} emitted file(s), ${needles.length} needle(s).`);
