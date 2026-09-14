#!/usr/bin/env node
/**
 * DESIGN.md → `packages/ui/src/tokens.ts` + `packages/ui/src/theme.css`.
 *
 * The frontmatter of DESIGN.md is the only place a colour, a measure or a
 * duration is written down. This script is the one thing that reads it, so the
 * two generated files are a function of that block and of nothing else.
 *
 * `--check` regenerates in memory and reports drift without writing; that is
 * the mode `check-design.mjs` and `pnpm check` use.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, kebab, readModel } from './design-model.mjs';

export { ROOT, readModel };

const HEADER = [
  '/* Generated from DESIGN.md by scripts/design-tokens.mjs — do not edit. */',
  '/* Run `node scripts/design-tokens.mjs` after changing the specification. */',
];

/**
 * The generated files live under `packages/ui/src/`, where rule 5 of
 * check-boundaries.mjs matches a lowercase substring over the whole file text.
 * The repository's own name would trip it, so nothing here may name the repo.
 */
export const FORBIDDEN_IN_OUTPUT = ['@repo/', 'backboard', 'fetch(', '/api/', 'container', 'railway', 'deployment'];

/** `13px` → `0.8125rem`. Type respects the reader's font size; WCAG 1.4.4. */
const toRem = (px) => `${Number.parseFloat(px) / 16}rem`;

// ---------------------------------------------------------------------------
// theme.css
// ---------------------------------------------------------------------------

export function renderThemeCss(spec) {
  const t = spec.tokens;
  const lines = [];
  const push = (s = '') => lines.push(s);

  push(HEADER[0].replace('/*', '/*').trim());
  push(HEADER[1]);
  push();
  push('@theme {');

  push('  /* colours */');
  for (const [name, value] of Object.entries(t.colors)) push(`  --color-${kebab(name)}: ${value};`);

  push();
  push('  /* type */');
  push(`  --font-sans: ${t.typography.sans};`);
  push(`  --font-mono: ${t.typography.mono};`);
  for (const [name, px] of Object.entries(t.typography.size)) push(`  --text-${name}: ${toRem(px)};`);
  for (const [name, value] of Object.entries(t.typography.weight)) {
    push(`  --font-weight-${name}: ${value};`);
  }

  push();
  push('  /* measures */');
  for (const [name, value] of Object.entries(t.spacing)) push(`  --spacing-${name}: ${value};`);
  for (const [name, value] of Object.entries(t.rounded)) push(`  --radius-${name}: ${value};`);

  push();
  push('  /* values a utility class cannot carry */');
  push(`  --border-hairline: ${t.border.hairline};`);
  push(`  --focus-width: ${t.focus.width};`);
  push(`  --focus-offset: ${t.focus.offset};`);
  for (const [name, value] of Object.entries(t.spinner.size)) push(`  --spinner-size-${name}: ${value};`);
  push(`  --spinner-stroke: ${t.spinner.stroke};`);

  push();
  push('  /* motion */');
  push(`  --animate-spin-arc: spin ${t.motion.spin} linear infinite;`);
  push('}');
  push();
  push('/* Written out rather than inherited, so the duration in DESIGN.md is the');
  push('   duration on screen even if the CSS framework changes its own keyframes. */');
  push('@keyframes spin {');
  push('  to {');
  push('    transform: rotate(360deg);');
  push('  }');
  push('}');
  push();
  push('@layer components {');
  push('  /* Geometry a utility name cannot express, driven by the variables above. */');
  push('  .border-hairline {');
  push('    border-width: var(--border-hairline);');
  push('  }');
  push();
  push('  .focus-ring:focus-visible {');
  push('    outline: var(--focus-width) solid var(--color-accent);');
  push('    outline-offset: var(--focus-offset);');
  push('  }');
  push();
  for (const name of Object.keys(t.spinner.size)) {
    push(`  .spinner-${name} {`);
    push(`    inline-size: var(--spinner-size-${name});`);
    push(`    block-size: var(--spinner-size-${name});`);
    push('  }');
    push();
  }
  push('  .spinner-stroke {');
  push('    stroke-width: var(--spinner-stroke);');
  push('  }');
  push();
  push('  /* The animation rides on the element that actually turns, and the');
  push('     reduced-motion override has to sit on that same element. Putting it');
  push('     on the arc would look right and do nothing. */');
  push('  .spin {');
  push('    animation: var(--animate-spin-arc);');
  push('  }');
  push();
  push('  @media (prefers-reduced-motion: reduce) {');
  push('    .spin {');
  push('      animation: none;');
  push('    }');
  push('  }');
  push('}');
  push();

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// tokens.ts
// ---------------------------------------------------------------------------

const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** `{ a: 1, b: 2 }` → an indented object literal body. */
const entries = (obj, render, indent = '  ') =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}${/^[a-z][\w]*$/i.test(k) ? k : quote(k)}: ${render(v)},`)
    .join('\n');

const union = (keys) => keys.map(quote).join(' | ');

export function renderTokensTs(spec) {
  const t = spec.tokens;
  const tones = spec.components.badge.variants;
  const variants = spec.components.button.variants;
  const { button: buttonClassesByVariant, tone: toneClassesByName } = spec.classes;
  const lines = [];
  const push = (s = '') => lines.push(s);

  push(HEADER[0]);
  push(HEADER[1]);
  push();
  push('/**');
  push(' * The design system as the code sees it: the names from the specification,');
  push(' * and the complete class strings that render them.');
  push(' *');
  push(' * Class strings are whole literals on purpose. A name assembled at runtime is');
  push(' * invisible to the CSS scanner, so the utility never ships and the element');
  push(' * renders unstyled with nothing failing loudly.');
  push(' */');
  push();

  push(`export type TokenColor = ${union(Object.keys(t.colors))};`);
  push();
  push(`export type TokenSize = ${union(Object.keys(t.typography.size))};`);
  push();
  push(`export type TokenSpace = ${union(Object.keys(t.spacing))};`);
  push();
  push(`export type TokenRadius = ${union(Object.keys(t.rounded))};`);
  push();
  push(`export type Tone = ${union(tones)};`);
  push();
  push(`export type ButtonVariant = ${union(variants)};`);
  push();
  push(`export type SpinnerSize = ${union(Object.keys(t.spinner.size))};`);
  push();

  push('/** Raw values. Prefer the class strings below; these exist for consumers');
  push('  * that have not moved to the generated stylesheet yet. */');
  push('export const colors: Record<TokenColor, string> = {');
  push(entries(t.colors, quote));
  push('};');
  push();
  push('export const typography = {');
  push(`  family: ${quote(t.typography.sans)},`);
  push(`  mono: ${quote(t.typography.mono)},`);
  push('  size: {');
  push(entries(t.typography.size, (px) => quote(toRem(px)), '    '));
  push('  },');
  push('  weight: {');
  push(entries(t.typography.weight, String, '    '));
  push('  },');
  push('} as const;');
  push();
  push('export const space: Record<TokenSpace, string> = {');
  push(entries(t.spacing, quote));
  push('};');
  push();
  push('export const radius: Record<TokenRadius, string> = {');
  push(entries(t.rounded, quote));
  push('};');
  push();

  push('/** Utility classes per tone: a tinted fill, a full-strength border, a label');
  push('  * chosen so it clears 4.5 on that fill. */');
  push('export const tone: Record<Tone, { fill: string; text: string; border: string }> = {');
  for (const name of tones) {
    const c = toneClassesByName[name];
    push(`  ${name}: { fill: ${quote(c.fill)}, text: ${quote(c.text)}, border: ${quote(c.border)} },`);
  }
  push('};');
  push();

  push('/** The tone of a label, kept for callers still reading a bare colour. */');
  push('export const toneColor: Record<Tone, string> = {');
  for (const name of tones) {
    const key = name === 'neutral' ? 'muted' : name;
    push(`  ${name}: colors.${key},`);
  }
  push('};');
  push();

  push('/** Every state of one button variant, in one literal. The two variants');
  push('  * differ in all four states; sharing a disabled rule would give the');
  push('  * secondary variant an accent fill. */');
  push('export const buttonVariant: Record<ButtonVariant, string> = {');
  for (const name of variants) push(`  ${name}: ${quote(buttonClassesByVariant[name])},`);
  push('};');
  push();

  push('/** Structural classes shared by both button variants. */');
  push(`export const buttonBase = ${quote('inline-flex items-center justify-center gap-sm min-h-touch px-lg py-sm border-hairline rounded-sm font-sans text-md font-medium cursor-pointer disabled:cursor-not-allowed focus-ring')};`);
  push();
  push(`export const badgeBase = ${quote('inline-flex items-center gap-xs px-sm py-xs border-hairline rounded-pill font-sans text-sm font-medium')};`);
  push();
  push(`export const cardBase = ${quote('bg-surface border-hairline border-line rounded-md p-xl font-sans text-md text-ink')};`);
  push();
  push(`export const spinnerBase = ${quote('inline-block spin')};`);
  push();
  push('/** The rendered size of a busy indicator, as a class rather than a number. */');
  push('export const spinnerSize: Record<SpinnerSize, string> = {');
  for (const name of Object.keys(t.spinner.size)) push(`  ${name}: ${quote(`spinner-${name}`)},`);
  push('};');
  push();
  push(`export const spinnerStroke = ${quote('spinner-stroke')};`);
  push();

  return lines.join('\n');
}

// ---------------------------------------------------------------------------

export function generate(root = ROOT) {
  const spec = readModel(root);
  return {
    'packages/ui/src/tokens.ts': renderTokensTs(spec),
    'packages/ui/src/theme.css': renderThemeCss(spec),
  };
}

const isMain = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const check = process.argv.includes('--check');
  const generated = generate();
  let drifted = 0;

  for (const [path, text] of Object.entries(generated)) {
    for (const needle of FORBIDDEN_IN_OUTPUT) {
      if (text.toLowerCase().includes(needle)) {
        console.error(`refusing to write ${path}: it contains "${needle}", which rule 5 forbids`);
        process.exit(1);
      }
    }
    if (check) {
      let current = null;
      try {
        current = readFileSync(join(ROOT, path), 'utf8');
      } catch {
        /* missing counts as drift */
      }
      if (current !== text) {
        drifted += 1;
        console.error(`${path} differs from DESIGN.md — run: node scripts/design-tokens.mjs`);
      }
    } else {
      writeFileSync(join(ROOT, path), text);
      console.log(`wrote ${path}`);
    }
  }

  if (check && drifted > 0) process.exit(1);
  if (check) console.log(`Token check passed: ${Object.keys(generated).length} generated file(s) match DESIGN.md.`);
}
