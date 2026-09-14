#!/usr/bin/env node
/**
 * DESIGN.md → one internal model.
 *
 * The file follows the published `@google/design.md` format, which is a format
 * for describing a visual identity to an agent. It has no place for a component
 * state matrix, a border colour, an alpha, a grid rule or a contrast threshold —
 * and this design system is mostly made of those. So the file carries the
 * published token sections *and* an `implementation` block for everything the
 * format has no section for, and this module is the single place that knows how
 * the two fit together.
 *
 * Everything downstream reads the model and never the frontmatter. That is what
 * keeps one value in one place: the published `components` map is *derived* from
 * the implementation block rather than written beside it, so the two cannot
 * disagree — and `check-design.mjs` fails if the committed file drifts from what
 * this module derives.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The shape of `implementation`. Declared rather than inferred, because an
 * unrecognised key here is almost always a typo, and a typo that is silently
 * ignored switches off whichever rule was meant to read it.
 */
const IMPLEMENTATION_SCHEMA = {
  note: 'string',
  typography: { mono: 'string', weight: 'map' },
  border: { hairline: 'string' },
  focus: { width: 'string', offset: 'string', color: 'string' },
  state: { disabledAlpha: 'number', tintAlpha: 'number' },
  spinner: { size: 'map', stroke: 'string' },
  motion: { spin: 'string' },
  components: 'components',
};

/** camelCase → kebab-case. `lineStrong` is `--color-line-strong` in CSS. */
export const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function checkShape(node, schema, path, problems) {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    problems.push(`${path} should be a mapping`);
    return;
  }
  for (const key of Object.keys(node)) {
    if (!(key in schema)) {
      const known = Object.keys(schema).join(', ');
      problems.push(`${path}.${key} is not a recognised key (expected one of: ${known})`);
    }
  }
  for (const [key, expected] of Object.entries(schema)) {
    const value = node[key];
    if (value === undefined) {
      problems.push(`${path}.${key} is missing`);
      continue;
    }
    if (typeof expected === 'object') checkShape(value, expected, `${path}.${key}`, problems);
  }
}

/**
 * The class strings for one button variant, built from its palette entry.
 *
 * The two variants differ in every state, and the disabled row is why they are
 * described separately rather than as a base plus a modifier: the primary dims
 * its fill and switches the label to `ink`, while the secondary keeps an opaque
 * fill and dims only its border. Sharing one rule turns a white button blue.
 */
function buttonClasses(entry, disabledAlpha) {
  const alpha = Math.round(disabledAlpha * 100);
  const withAlpha = (prefix, color, on) => `${prefix}-${kebab(color)}${on ? `/${alpha}` : ''}`;
  const d = entry.disabled;
  return [
    `bg-${kebab(entry.fill)}`,
    `border-${kebab(entry.border)}`,
    `text-${kebab(entry.label)}`,
    `hover:bg-${kebab(entry.hover)}`,
    `active:bg-${kebab(entry.active)}`,
    `disabled:${withAlpha('bg', d.fill, d.fillAlpha)}`,
    `disabled:${withAlpha('border', d.border, d.borderAlpha)}`,
    `disabled:text-${kebab(d.label)}`,
  ].join(' ');
}

/** Fill, label and border classes for one tone. */
function toneClasses(entry, tintAlpha) {
  const tint = Math.round(tintAlpha * 100);
  return {
    fill: `bg-${kebab(entry.fill)}/${tint}`,
    text: `text-${kebab(entry.label)}`,
    border: `border-${kebab(entry.border)}`,
  };
}

/**
 * The published `components` map, derived from the implementation block.
 *
 * The format allows only `backgroundColor`, `textColor`, `typography`,
 * `rounded`, `padding`, `size`, `height` and `width` — no border, no state, no
 * alpha. So this is a lossy projection of the real design, and it exists for one
 * reason: it lets the format's own linter run its contrast rule over the opaque
 * text-on-fill pairs, which is a second opinion on numbers `check-design.mjs`
 * already asserts. Everything it cannot see is checked by that script instead.
 */
export function derivePublishedComponents(implementation) {
  const out = {};
  // Only the three shapes the format can hold are projected. A component the
  // matrix declares but this function does not know is not an error: it simply
  // has nothing the published section could carry, and `check-design.mjs`
  // still covers it in full.
  const button = implementation.components.button;
  if (button === undefined) return out;
  for (const variant of button.variants) {
    const entry = button.palette[variant];
    out[`button-${variant}`] = {
      backgroundColor: `{colors.${entry.fill}}`,
      textColor: `{colors.${entry.label}}`,
      typography: '{typography.md}',
      rounded: '{rounded.sm}',
      padding: '{spacing.sm}',
    };
  }
  const badge = implementation.components.badge;
  for (const tone of badge.variants) {
    const entry = badge.palette[tone];
    out[`badge-${tone}`] = {
      // The fill is a 10% tint the format cannot express, so the ground beneath
      // it is declared instead. That keeps the linter's contrast reading honest
      // rather than optimistic: the tint only ever raises the ratio.
      backgroundColor: `{colors.${badge.grounds[0]}}`,
      textColor: `{colors.${entry.label}}`,
      typography: '{typography.sm}',
      rounded: '{rounded.pill}',
    };
  }
  out.card = {
    backgroundColor: '{colors.surface}',
    textColor: '{colors.ink}',
    typography: '{typography.md}',
    rounded: '{rounded.md}',
    padding: '{spacing.xl}',
  };
  return out;
}

/** `{ variants, palette }` → `{ <variant>: render(entry) }`, or `{}` if absent. */
const paletteMap = (component, render) =>
  component?.palette === undefined
    ? {}
    : Object.fromEntries(component.variants.map((v) => [v, render(component.palette[v])]));

/** The frontmatter of DESIGN.md, as one model with stable paths. */
export function readModel(root = ROOT) {
  const text = readFileSync(join(root, 'DESIGN.md'), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (match === null) throw new Error('DESIGN.md has no YAML frontmatter block');
  return buildModel(parse(match[1]));
}

export function buildModel(front) {
  const problems = [];
  for (const key of ['name', 'colors', 'typography', 'rounded', 'spacing', 'implementation']) {
    if (front[key] === undefined) problems.push(`frontmatter is missing "${key}"`);
  }
  if (problems.length > 0) throw new Error(problems.join('; '));

  checkShape(front.implementation, IMPLEMENTATION_SCHEMA, 'implementation', problems);
  if (problems.length > 0) {
    throw new Error(`DESIGN.md implementation block: ${problems.join('; ')}`);
  }

  const impl = front.implementation;

  // The format wants a font family on every typography token, so the stack is
  // written once with a YAML anchor and referenced. If that ever stops being
  // true the scale has silently become two scales, so say so rather than
  // picking one arbitrarily.
  const families = new Set(Object.values(front.typography).map((t) => t.fontFamily));
  if (families.size !== 1) {
    throw new Error(
      `typography tokens declare ${families.size} different fontFamily values; ` +
        'the console has one family and the generator emits one --font-sans',
    );
  }

  const tokens = {
    colors: front.colors,
    typography: {
      sans: [...families][0],
      mono: impl.typography.mono,
      size: Object.fromEntries(Object.entries(front.typography).map(([k, v]) => [k, v.fontSize])),
      weight: impl.typography.weight,
    },
    spacing: front.spacing,
    rounded: front.rounded,
    border: impl.border,
    focus: impl.focus,
    state: impl.state,
    spinner: impl.spinner,
    motion: impl.motion,
  };

  const components = Object.fromEntries(
    Object.entries(impl.components).map(([name, c]) => [
      name,
      { variants: c.variants, states: c.states, grounds: c.grounds },
    ]),
  );

  return {
    meta: { version: front.version, name: front.name, description: front.description },
    tokens,
    components,
    grid: front.grid,
    contrast: front.contrast,
    /** What the file declares, and what it should declare. `check-design.mjs` compares them. */
    published: { components: front.components ?? {}, derived: derivePublishedComponents(impl) },
    // Built only for the components that carry a palette. A matrix entry
    // without one declares states to be checked but no colours to render —
    // which is exactly what the test fixtures are.
    classes: {
      button: paletteMap(impl.components.button, (e) =>
        buttonClasses(e, impl.state.disabledAlpha),
      ),
      tone: paletteMap(impl.components.badge, (e) => toneClasses(e, impl.state.tintAlpha)),
    },
  };
}
