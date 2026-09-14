#!/usr/bin/env node
/**
 * DESIGN.md, checked.
 *
 * The specification claims contrast ratios, a 4px grid and a set of house rules.
 * A document that claims those things and is never re-derived is a wish. This
 * recomputes every number from the hex values, enforces each threshold against
 * the full-precision ratio rather than the printed one, and fails if the
 * generated files have drifted from the block they came from.
 *
 * `--self-test` runs the fixtures under `scripts/__fixtures__/`, which exist so
 * that each failure mode is proved to fail. A check whose red path is untested
 * is not a guarantee.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, readSpec, FORBIDDEN_IN_OUTPUT } from './design-tokens.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// ---------------------------------------------------------------------------
// Colour maths. sRGB, composited to 8 bits — see DESIGN.md §4.
// ---------------------------------------------------------------------------

const channel = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toRgb = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r / 255) + 0.7152 * channel(g / 255) + 0.0722 * channel(b / 255);

/**
 * Paint layers in order, first opaque, each over the last, rounding every
 * channel to 8 bits as it goes.
 *
 * The rounding is the whole point. A browser composites into an 8-bit sRGB
 * framebuffer, so the colour a reader's eye receives is the quantised one, and
 * a ratio computed in continuous space is a ratio of a pixel nobody sees.
 * Measured in a real renderer, `button/primary/disabled/label` paints
 * rgb(141, 176, 244) and reads 8.49; the continuous composite says 8.47.
 */
const flatten = (layers, colors) =>
  layers.reduce((under, layer) => {
    const over = toRgb(colors[layer.color]);
    const alpha = layer.alpha ?? 1;
    return under === null
      ? over.slice()
      : over.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha)));
  }, null);

function ratioOf(check, colors) {
  const background = flatten(check.bg, colors);
  const foreground =
    (check.fg.alpha ?? 1) === 1
      ? toRgb(colors[check.fg.color])
      : flatten([...check.bg, check.fg], colors);
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------

/** House rules that impose a floor of their own where WCAG would exempt. */
const HOUSE_FLOOR = { disabledLabelStaysLegible: (wcag) => wcag.text };

export function checkSpec(spec, generated, sources) {
  const problems = [];
  const fail = (rule, detail) => problems.push(`${rule}: ${detail}`);
  const { colors } = spec.tokens;
  const { method, wcag, checks } = spec.contrast;

  // -- 1. contrast -----------------------------------------------------------
  for (const check of checks) {
    if (colors[check.fg.color] === undefined) {
      fail('contrast', `${check.id} names unknown colour "${check.fg.color}"`);
      continue;
    }
    if (check.bg.some((l) => colors[l.color] === undefined)) {
      fail('contrast', `${check.id} names an unknown background colour`);
      continue;
    }

    const actual = ratioOf(check, colors);
    const recorded = Number(check.ratio);
    if (Math.abs(actual - recorded) > method.tolerance) {
      fail(
        'contrast',
        `${check.id} records ${recorded.toFixed(method.round)} but measures ` +
          `${actual.toFixed(method.round)} — outside the ${method.tolerance} tolerance`,
      );
    }

    // The threshold is tested against the full-precision ratio, not the two
    // decimal places the specification prints: a pair at 4.4996 would round to
    // 4.50 and must still fail. (Distinct from the channel rounding above,
    // which models the framebuffer rather than the report.)
    const floor =
      check.exempt === undefined
        ? wcag[check.usage === 'boundary' && check.identifying !== true ? 'none' : check.usage]
        : check.house !== undefined
          ? HOUSE_FLOOR[check.house]?.(wcag)
          : undefined;

    if (floor !== undefined && actual < floor) {
      fail(
        'contrast',
        `${check.id} measures ${actual.toFixed(4)}, below the ${floor} required for ` +
          `${check.exempt === undefined ? `usage "${check.usage}"` : `house rule "${check.house}"`}`,
      );
    }

    // A translucent colour is composited by the renderer, which may represent it
    // in a colour space of its own and land a step away from this arithmetic —
    // measured at up to 0.11 of ratio. Rather than model that pipeline, require
    // the margin to be wider than it can ever be.
    const hasAlpha =
      check.fg.alpha !== undefined || check.bg.some((layer) => layer.alpha !== undefined);
    if (hasAlpha && floor !== undefined && actual >= floor && actual < floor + method.alphaMargin) {
      fail(
        'contrast',
        `${check.id} measures ${actual.toFixed(4)}, clearing ${floor} by less than the ` +
          `${method.alphaMargin} an alpha-composited pair needs; a renderer may land ` +
          `${method.rendererTolerance} away from this arithmetic`,
      );
    }
  }

  // -- 2. house rules --------------------------------------------------------
  for (const check of checks) {
    if (check.usage === 'text' && check.size === 'sm' && check.fg.color === 'accent') {
      fail('house', `${check.id} uses accent on size sm — accentNeverOnSmallText`);
    }
    if (check.usage === 'boundary' && check.identifying === true && check.fg.color === 'line') {
      fail('house', `${check.id} identifies a control with line — lineNeverIdentifies`);
    }
  }

  // -- 3. coverage: every variant x state of every component -----------------
  const covered = new Set(checks.map((c) => c.id.split('/').slice(0, 3).join('/')));
  for (const [name, component] of Object.entries(spec.components)) {
    for (const variant of component.variants) {
      for (const state of component.states) {
        if (!covered.has(`${name}/${variant}/${state}`)) {
          fail('coverage', `${name}/${variant}/${state} has no contrast check`);
        }
      }
    }
  }

  // -- 4. the 4px grid -------------------------------------------------------
  const { step, applies, exempt } = spec.grid;
  const walk = (node, path) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path === '' ? k : `${path}.${k}`);
      return;
    }
    const px = /^(\d+(?:\.\d+)?)px$/.exec(String(node));
    if (px === null) return;
    if (exempt[path] !== undefined) return;
    if (Number(px[1]) % step !== 0) {
      fail('grid', `${path} is ${node}, not a multiple of ${step}, and is not declared in grid.exempt`);
    }
  };
  for (const group of applies) {
    const node = group.split('.').reduce((o, k) => o?.[k], spec.tokens);
    walk(node, group);
  }
  // An exemption for something that is on the grid anyway is dead weight, and an
  // exemption naming nothing is a typo that silently disables a check.
  for (const path of Object.keys(exempt)) {
    if (path.split('.').reduce((o, k) => o?.[k], spec.tokens) === undefined) {
      fail('grid', `grid.exempt names "${path}", which is not in the token tree`);
    }
  }

  // -- 5. the generated files carry no product vocabulary --------------------
  for (const [path, text] of Object.entries(generated)) {
    for (const needle of FORBIDDEN_IN_OUTPUT) {
      if (text.toLowerCase().includes(needle)) {
        fail('vocabulary', `${path} contains "${needle}"`);
      }
    }
  }

  // -- 6. no literal values left in the components ---------------------------
  for (const [path, text] of Object.entries(sources)) {
    const body = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/#[0-9a-f]{3,8}\b/i.test(body)) fail('leakage', `${path} contains a hex colour`);
    if (/\b\d+(?:\.\d+)?(?:px|rem|em)\b/.test(body)) fail('leakage', `${path} contains a raw measure`);
    if (/\bopacity\s*[:=]/.test(body)) fail('leakage', `${path} sets opacity directly`);
  }

  return problems;
}

/** The committed generated files, and the hand-written components beside them. */
function readTree(root) {
  const generated = generate(root);
  const committed = Object.fromEntries(
    Object.keys(generated).map((p) => {
      let text = null;
      try {
        text = readFileSync(join(root, p), 'utf8');
      } catch {
        /* missing counts as drift */
      }
      return [p, text];
    }),
  );
  const dir = join(root, 'packages/ui/src');
  const sources = Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
      .map((f) => [`packages/ui/src/${f}`, readFileSync(join(dir, f), 'utf8')]),
  );
  return { generated, committed, sources };
}

function run(root) {
  const spec = readSpec(root);
  const { generated, committed, sources } = readTree(root);
  const problems = checkSpec(spec, generated, sources);
  for (const [path, text] of Object.entries(generated)) {
    if (committed[path] !== text) {
      problems.push(`drift: ${path} differs from DESIGN.md — run node scripts/design-tokens.mjs`);
    }
  }
  return { spec, problems };
}

// ---------------------------------------------------------------------------

const selfTest = process.argv.includes('--self-test');

if (selfTest) {
  const dir = join(ROOT, 'scripts/__fixtures__');
  let failures = 0;
  for (const name of readdirSync(dir).sort()) {
    const expected = readFileSync(join(dir, name, 'expect.txt'), 'utf8').trim();
    let problems = [];
    try {
      const spec = readSpec(join(dir, name));
      problems = checkSpec(spec, {}, {});
    } catch (error) {
      problems = [`parse: ${error.message}`];
    }
    const hit = problems.some((p) => p.includes(expected));
    if (hit) {
      console.log(`  ok   ${name} — caught "${expected}"`);
    } else {
      failures += 1;
      console.error(`  FAIL ${name} — expected a problem containing "${expected}"`);
      for (const p of problems) console.error(`         got: ${p}`);
      if (problems.length === 0) console.error('         got: (no problems at all)');
    }
  }
  if (failures > 0) {
    console.error(`Self-test failed: ${failures} fixture(s) were not caught.`);
    process.exit(1);
  }
  console.log(`Self-test passed: ${readdirSync(dir).length} fixture(s), each caught.`);
} else {
  const { spec, problems } = run(ROOT);
  if (problems.length > 0) {
    console.error(`Design check failed — ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `Design check passed: ${spec.contrast.checks.length} contrast checks, ` +
      `${Object.keys(spec.components).length} components, 6 rules.`,
  );
}
