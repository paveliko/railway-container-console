#!/usr/bin/env node
/**
 * `DESIGN.md` against the published `@google/design.md` format.
 *
 * The linter is a second opinion, not a replacement for `check-design.mjs`: its
 * contrast rule reads only opaque `backgroundColor`/`textColor` pairs, and the
 * format has no place for a border, a state or an alpha, which is most of what
 * this design system is made of.
 *
 * Errors always fail. Warnings are held to an allowlist rather than merely
 * printed, because a warning nobody has to act on is a warning nobody reads. A
 * new finding fails; so does a listed one that stops appearing, since that means
 * the reason recorded beside it has gone stale.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Every finding this file is expected to produce, and why it is accepted.
 * Each reason is also written out in DESIGN.md § "Extensions and deviations".
 */
const ACCEPTED = [
  {
    rule: 'missing-primary',
    path: 'colors',
    why: 'the palette calls its accent colour "accent" — a declared deviation, not an oversight',
  },
  {
    rule: 'token-like-ignored',
    path: 'implementation',
    why: 'correct: the format ignores it, and scripts/design-model.mjs reads it instead',
  },
  ...['line', 'lineStrong', 'raised', 'accentHover', 'accentActive'].map((name) => ({
    rule: 'orphaned-tokens',
    path: `colors.${name}`,
    why: 'used as a border, a ground or a state — none of which the format’s components section can express',
  })),
];

const key = (finding) => `${finding.rule} @ ${finding.path}`;

const raw = execFileSync('node', ['node_modules/@google/design.md/dist/index.js', 'lint', 'DESIGN.md'], {
  cwd: ROOT,
  encoding: 'utf8',
  // The CLI exits non-zero when it finds errors; the report is on stdout either
  // way, and this script decides what counts as a failure.
  stdio: ['ignore', 'pipe', 'inherit'],
});

const report = JSON.parse(raw);
const problems = [];

for (const finding of report.findings) {
  if (finding.severity === 'error') {
    problems.push(`error — ${key(finding)}: ${finding.message}`);
  }
}

const seen = new Set(report.findings.filter((f) => f.severity === 'warning').map(key));
const expected = new Set(ACCEPTED.map(key));

for (const k of seen) {
  if (!expected.has(k)) problems.push(`unexpected warning — ${k}`);
}
for (const entry of ACCEPTED) {
  if (!seen.has(key(entry))) {
    problems.push(
      `accepted warning no longer reported — ${key(entry)}. ` +
        'Remove it from the allowlist and from DESIGN.md, or find out what changed.',
    );
  }
}

if (problems.length > 0) {
  console.error(`DESIGN.md format check failed — ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `DESIGN.md format check passed: 0 errors, ${seen.size} accepted warning(s), ` +
    `${report.summary.infos} info.`,
);
