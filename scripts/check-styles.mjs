#!/usr/bin/env node
/**
 * The classes `@repo/ui` names actually reach the built stylesheet.
 *
 * Tailwind does not scan outside the package that owns the CSS file, so the
 * consuming application declares `@source` for `packages/ui/src`. Without it the
 * type checks pass, the build succeeds, the tests pass — and the UI renders
 * unstyled. There is no other check in this repository that can see that.
 *
 * `V-DS-14` used to probe for `min-h-touch` and `border-line-strong`, and that
 * probe does not work: measured on the real build, both are still emitted
 * without the directive, because they also appear in the application's own
 * source. What vanishes is the **state variants** — a `hover:`, a `disabled:`
 * or an alpha modifier that only ever appears inside `@repo/ui`'s generated
 * class strings. Those are what this checks.
 *
 * `--self-test` proves the check by breaking it: it removes `@source`, forces a
 * clean rebuild, and fails if the check still passes. A cached build would sail
 * through while proving nothing, so the rebuild is never cached.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = join(ROOT, 'apps/console');
const STYLES = join(APP, 'src/client/styles.css');
const DIST = join(APP, 'dist/assets');

/**
 * Classes that exist only inside `@repo/ui`'s generated strings. A plain
 * `min-h-touch` is no use here: the application writes that itself, so it
 * survives the very failure this is meant to catch.
 */
const PROBES = [
  'hover\\:bg-accent-hover',
  'active\\:bg-accent-active',
  'disabled\\:bg-accent\\/55',
  'disabled\\:border-line-strong\\/55',
  'bg-muted\\/10',
];

function buildCss() {
  // The app's own build script, run directly rather than through turbo: turbo
  // would serve a cached `dist/` and the self-test would pass against a
  // stylesheet built before @source was removed, proving nothing.
  rmSync(join(APP, 'dist'), { recursive: true, force: true });
  try {
    execFileSync('pnpm', ['run', 'build'], { cwd: APP, stdio: 'pipe', encoding: 'utf8' });
  } catch (error) {
    throw new Error(`the client build failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`);
  }
  const sheets = readdirSync(DIST).filter((f) => f.endsWith('.css'));
  if (sheets.length === 0) throw new Error('the build produced no stylesheet');
  return sheets.map((f) => readFileSync(join(DIST, f), 'utf8')).join('\n');
}

/**
 * Which probes are missing from the built CSS.
 *
 * The probes are written as they appear in a selector, where Tailwind escapes
 * `:` and `/` with a backslash — `.hover\:bg-accent-hover`. Searching for the
 * unescaped spelling finds nothing and reports every class as missing, which is
 * a false alarm indistinguishable from the real one.
 */
const readable = (probe) => probe.replaceAll('\\', '');
function missingFrom(css) {
  return PROBES.filter((probe) => !css.includes(probe));
}

const selfTest = process.argv.includes('--self-test');

if (!selfTest) {
  const missing = missingFrom(buildCss());
  if (missing.length > 0) {
    console.error(`Style check failed — ${missing.length} class(es) never reached the stylesheet:`);
    for (const probe of missing) console.error(`  - ${readable(probe)}`);
    console.error('  Is `@source` still pointing at packages/ui/src in src/client/styles.css?');
    process.exit(1);
  }
  console.log(`Style check passed: ${PROBES.length} @repo/ui state variants present in the build.`);
} else {
  const original = readFileSync(STYLES, 'utf8');
  if (!/^@source\s+/m.test(original)) {
    console.error('Self-test cannot run: styles.css has no @source line to remove.');
    process.exit(1);
  }

  let stillPasses = false;
  try {
    writeFileSync(STYLES, original.replace(/^@source\s+.*$/m, '/* @source removed by --self-test */'));
    const missing = missingFrom(buildCss());
    stillPasses = missing.length === 0;
    if (!stillPasses) {
      console.log(`  ok   without @source, ${missing.length} of ${PROBES.length} probes vanish:`);
      for (const probe of missing) console.log(`         ${readable(probe)}`);
    }
  } finally {
    writeFileSync(STYLES, original);
  }

  if (stillPasses) {
    console.error('Self-test FAILED: the check passes even with @source removed, so it proves nothing.');
    process.exit(1);
  }

  const missingAfter = missingFrom(buildCss());
  if (missingAfter.length > 0) {
    console.error('Self-test FAILED: styles.css was restored but the check still fails.');
    process.exit(1);
  }
  console.log('Self-test passed: the check fails without @source and passes with it.');
}
