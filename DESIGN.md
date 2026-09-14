---
designmd: 1
name: Railway container console
tokens:
  colors:
    ink: "#111418"
    muted: "#5b6672"
    line: "#dfe3e8"
    lineStrong: "#7e8895"
    surface: "#ffffff"
    raised: "#f6f7f9"
    accent: "#2f6feb"
    accentHover: "#2a63d4"
    accentActive: "#2559bd"
    positive: "#177245"
    caution: "#8a5a00"
    danger: "#b3261e"
  typography:
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    size:
      sm: 13px
      md: 15px
      lg: 18px
      xl: 24px
    weight:
      regular: 400
      medium: 500
      bold: 600
  spacing:
    xs: 4px
    sm: 8px
    md: 12px
    lg: 16px
    xl: 24px
    touch: 44px
  radius:
    sm: 4px
    md: 8px
    pill: 999px
  border:
    hairline: 1px
  focus:
    width: 2px
    offset: 2px
    color: accent
  state:
    disabledAlpha: 0.55
    tintAlpha: 0.1
  spinner:
    size:
      sm: 16px
      md: 24px
    stroke: 2px
  motion:
    spin: 0.9s

grid:
  step: 4
  applies: [spacing, radius, spinner.size]
  exempt:
    radius.pill: a pill is a shape, not a measure
    border.hairline: 1px is the device hairline; 4 is a rule about layout
    focus.width: ditto
    focus.offset: ditto
    spinner.stroke: an SVG stroke, not layout
    typography.size: type is a modular scale, not a grid

components:
  button:
    variants: [primary, secondary]
    states: [default, hover, active, disabled]
    grounds: [surface]
  badge:
    variants: [neutral, accent, positive, caution, danger]
    states: [default]
    grounds: [surface]
  card:
    variants: [default]
    states: [default]
    grounds: [raised]
  spinner:
    variants: [default]
    states: [default]
    grounds: [surface]

contrast:
  method:
    space: srgb
    composite: srgb-8bit
    round: 2
    tolerance: 0.01
    rendererTolerance: 0.15
    alphaMargin: 0.25
  wcag:
    text: 4.5
    textLarge: 3.0
    boundary: 3.0
    indicator: 3.0
    ref: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  house:
    accentNeverOnSmallText: accent is 4.26 on raised and 4.57 on surface — no margin; use ink
    lineNeverIdentifies: line is 1.29; an enabled interactive boundary uses lineStrong
    disabledLabelStaysLegible: 4.5 even though WCAG exempts inactive controls
  checks:
    - { id: button/primary/default/label, usage: text, size: md, fg: { color: surface }, bg: [{ color: accent }], ratio: 4.57 }
    - { id: button/primary/default/border, usage: boundary, identifying: true, fg: { color: accent }, bg: [{ color: surface }], ratio: 4.57 }
    - { id: button/primary/hover/label, usage: text, size: md, fg: { color: surface }, bg: [{ color: accentHover }], ratio: 5.48 }
    - { id: button/primary/hover/border, usage: boundary, identifying: true, fg: { color: accentHover }, bg: [{ color: surface }], ratio: 5.48 }
    - { id: button/primary/active/label, usage: text, size: md, fg: { color: surface }, bg: [{ color: accentActive }], ratio: 6.48 }
    - { id: button/primary/active/border, usage: boundary, identifying: true, fg: { color: accentActive }, bg: [{ color: surface }], ratio: 6.48 }
    - { id: button/primary/disabled/label, usage: text, size: md, exempt: inactive, house: disabledLabelStaysLegible, fg: { color: ink }, bg: [{ color: surface }, { color: accent, alpha: 0.55 }], ratio: 8.49 }
    - { id: button/primary/disabled/border, usage: boundary, exempt: inactive, fg: { color: accent, alpha: 0.55 }, bg: [{ color: surface }], ratio: 2.18 }
    - { id: button/secondary/default/label, usage: text, size: md, fg: { color: ink }, bg: [{ color: surface }], ratio: 18.47 }
    - { id: button/secondary/default/border, usage: boundary, identifying: true, fg: { color: lineStrong }, bg: [{ color: surface }], ratio: 3.59 }
    - { id: button/secondary/hover/label, usage: text, size: md, fg: { color: ink }, bg: [{ color: raised }], ratio: 17.23 }
    - { id: button/secondary/hover/border, usage: boundary, identifying: true, fg: { color: lineStrong }, bg: [{ color: raised }], ratio: 3.35 }
    - { id: button/secondary/active/label, usage: text, size: md, fg: { color: ink }, bg: [{ color: raised }], ratio: 17.23 }
    - { id: button/secondary/active/border, usage: boundary, identifying: true, fg: { color: lineStrong }, bg: [{ color: raised }], ratio: 3.35 }
    - { id: button/secondary/disabled/label, usage: text, size: md, exempt: inactive, house: disabledLabelStaysLegible, fg: { color: muted }, bg: [{ color: surface }], ratio: 5.85 }
    - { id: button/secondary/disabled/border, usage: boundary, exempt: inactive, fg: { color: lineStrong, alpha: 0.55 }, bg: [{ color: surface }], ratio: 1.87 }
    - { id: badge/neutral/default/label, usage: text, size: sm, fg: { color: muted }, bg: [{ color: surface }, { color: muted, alpha: 0.1 }], ratio: 5.13 }
    - { id: badge/neutral/default/border, usage: boundary, identifying: false, fg: { color: lineStrong }, bg: [{ color: surface }], ratio: 3.59 }
    - { id: badge/accent/default/label, usage: text, size: sm, fg: { color: ink }, bg: [{ color: surface }, { color: accent, alpha: 0.1 }], ratio: 16.27 }
    - { id: badge/accent/default/border, usage: boundary, identifying: false, fg: { color: accent }, bg: [{ color: surface }], ratio: 4.57 }
    - { id: badge/positive/default/label, usage: text, size: sm, fg: { color: positive }, bg: [{ color: surface }, { color: positive, alpha: 0.1 }], ratio: 5.16 }
    - { id: badge/positive/default/border, usage: boundary, identifying: false, fg: { color: positive }, bg: [{ color: surface }], ratio: 5.95 }
    - { id: badge/caution/default/label, usage: text, size: sm, fg: { color: caution }, bg: [{ color: surface }, { color: caution, alpha: 0.1 }], ratio: 5.16 }
    - { id: badge/caution/default/border, usage: boundary, identifying: false, fg: { color: caution }, bg: [{ color: surface }], ratio: 5.93 }
    - { id: badge/danger/default/label, usage: text, size: sm, fg: { color: danger }, bg: [{ color: surface }, { color: danger, alpha: 0.1 }], ratio: 5.54 }
    - { id: badge/danger/default/border, usage: boundary, identifying: false, fg: { color: danger }, bg: [{ color: surface }], ratio: 6.54 }
    - { id: card/default/default/title, usage: text, size: lg, fg: { color: ink }, bg: [{ color: surface }], ratio: 18.47 }
    - { id: card/default/default/border, usage: boundary, identifying: false, fg: { color: line }, bg: [{ color: raised }], ratio: 1.20 }
    - { id: spinner/default/default/arc, usage: indicator, fg: { color: accent }, bg: [{ color: surface }], ratio: 4.57 }
    - { id: spinner/default/default/track, usage: boundary, identifying: false, fg: { color: line }, bg: [{ color: surface }], ratio: 1.29 }
    - { id: focus/ring/default/outline, usage: indicator, fg: { color: accent }, bg: [{ color: surface }], ratio: 4.57 }
---

# DESIGN

The frontmatter above is the only place a colour, a measure or a duration is
written down. `scripts/design-tokens.mjs` turns it into
`packages/ui/src/tokens.ts` and `packages/ui/src/theme.css`; both are generated
and neither is edited by hand. `scripts/check-design.mjs` regenerates them in
memory and fails if what is committed differs, so the spec cannot drift away
from the code without the build saying so.

Everything below is a rule a reviewer can check, not a preference.

## 1. What is in scope

One light theme. Two grounds — `surface` for a card, `raised` for the page
behind it — and every contrast number in this file is stated against one of
them. A dark theme is out of scope, and adding one reopens every number in §4;
`console-screen/ux-brief.md` §9 records the same exclusion.

The vocabulary rule of `V-MW-22` applies to everything generated into
`packages/ui/src/`: the presentation layer does not learn what the product is.

## 2. The 4px grid

`spacing`, `radius` and `spinner.size` are multiples of 4. Nothing else in the
frontmatter is, and each exception is declared in `grid.exempt` with a reason —
the validator fails on an *undeclared* exemption, so the list cannot quietly
grow.

Type sizes are recorded in px because that is how they are designed, and
emitted in **rem** against a 16px base, so a reader who has enlarged their
browser font still gets the enlargement (WCAG 1.4.4). This is the one place
where the spec's unit and the emitted unit deliberately differ.

## 3. Vertical rhythm

- **24px** (`spacing.xl`) between blocks.
- **8px** (`spacing.sm`) between lines of text that belong together — a
  headline and its detail line.
- **24px** of padding inside a card, uniformly.

`ux-brief.md` §3 fixes the same rhythm for the screen this package serves.

## 4. Contrast

Ratios are computed in sRGB. Where a colour is drawn at less than full opacity,
the layers are composited **in sRGB and rounded to 8 bits per channel**, the way
a browser composites into a framebuffer, and the ratio is reported to two
decimal places.

`contrast.method` states this because it changes answers. Composited in
continuous space, `button/primary/disabled/label` reads 8.47; composited to 8
bits it reads **8.49**, and 8.49 is what a reader actually receives — measured in
a real renderer, that fill paints `rgb(141, 176, 244)`. Two implementations that
disagree by 0.02 will eventually disagree about a threshold, and the one that
disagrees with the screen is the wrong one. Eight of the thirty-one checks carry
an alpha and are affected; the rest are identical either way.

### Why an alpha check needs a margin

A stylesheet is free to represent a translucent colour in a space of its own
choosing. Measured, `bg-accent/10` arrives as an `oklab()` value whose round-trip
back to sRGB lands on `rgb(234, 240, 253)` where this document's arithmetic says
`rgb(234, 241, 253)` — one step on one channel, worth up to **0.11** of ratio.

Chasing that exactly would mean encoding one framework's colour pipeline into
this specification, and the number would rot the first time the framework
changed it. The rule instead: `rendererTolerance` names how far a renderer may
legitimately land from the arithmetic, and **`alphaMargin` requires any check
carrying an alpha to clear its floor by 0.25** — comfortably more than the drift.
A translucent colour that needs the third decimal place to pass is a colour
whose contrast was never real. The smallest such margin here is 0.63.

### What WCAG requires

`contrast.wcag` carries the thresholds: 4.5 for text, 3.0 for large text, 3.0
for a boundary **and only where that boundary is what identifies the control**,
3.0 for a graphical indicator. Inactive (disabled) controls are exempt from
1.4.3 and 1.4.11. The `identifying` flag on each boundary check is what decides
whether the 3.0 threshold is enforced or merely recorded: a `Card`'s border is
decoration, a secondary `Button`'s border is the control.

### What this product requires on top

Three house rules, stricter than the standard, each with its reason:

| Rule | Why |
|---|---|
| `accent` is never the colour of `typography.size.sm` text | It measures 4.57 on `surface` and **4.26 on `raised`**. The second fails AA outright and the first has no margin. Small text uses `ink` or the tone's own colour. |
| `line` never carries an *enabled* interactive boundary | 1.29 against `surface`. `lineStrong` (3.59 / 3.35) exists for exactly this. `line` stays for decoration — card borders, the spinner track, hairlines. |
| A disabled label stays at 4.5 or better | WCAG exempts it. `D-UI-3` does not: while a transition is in flight the disabled button's label is the *only* thing on screen naming what is happening. Dimming the whole button puts that label at **1.56** — which is why 55% opacity applies to the fill and border while the label switches colour instead. |

### The measured table

| Pair | Ratio | |
|---|---|---|
| `ink` on `surface` | 18.47 | |
| `ink` on `raised` | 17.23 | |
| `muted` on `surface` / `raised` | 5.85 / 5.46 | |
| `accent` on `surface` | 4.57 | AA, no margin |
| `accent` on `raised` | **4.26** | below AA — large text only |
| `ink` on opaque `accent` | 4.04 | below AA — why a primary label is `surface`, not `ink` |
| `ink` on `accent`@55% over `surface` | 8.49 | the disabled primary label |
| `surface` on `accent`@55% over `surface` | 2.18 | what dimming the whole button would have given |
| `line` on `surface` | 1.29 | decoration only |
| `lineStrong` on `surface` / `raised` | 3.59 / 3.35 | enabled boundaries |
| `positive` / `caution` / `danger` on `surface` | 5.95 / 5.93 / 6.54 | |

`contrast.checks` carries one entry per component, variant, state and layer.
The validator requires coverage of every `variant × state` a component
declares, so a state cannot be added without its contrast being considered.

## 5. States

Every interactive element declares four states. The two `Button` variants
differ in all of them, and specifying them together is a bug — a shared
disabled rule would give `secondary` an accent fill.

| | `primary` | `secondary` |
|---|---|---|
| default | `accent` fill, `accent` border, `surface` label | `surface` fill, `lineStrong` border, `ink` label |
| hover | `accentHover` fill | `raised` fill |
| active | `accentActive` fill | `raised` fill |
| disabled | fill and border at `state.disabledAlpha`, label `ink` | fill `surface`, border at `state.disabledAlpha`, label `muted` |

Focus is not a variant of the above: `focus.width` / `focus.offset` draw the
same ring on both, outside the control's own border so it is never confused
with it, and it appears on `:focus-visible` only.

## 6. Touch targets

Any control a finger can hit is at least `spacing.touch` (44px) tall. That is
the reason 44 is in the spacing scale at all — it is on the grid (4 × 11) and
it is not a padding value.

## 7. Motion

One animation: `motion.spin`, 0.9s, linear, infinite. Its keyframes are
written into `theme.css` explicitly rather than borrowed from whatever the CSS
framework happens to ship, so the duration in this file is the duration on
screen.

Under `prefers-reduced-motion` the spinner does not rotate. It keeps its
accessible label, because per `ux-brief.md` §8 the spinner never carries
meaning alone — the words next to it do.

## 8. What is generated, and what that guarantees

| Artefact | Contains |
|---|---|
| `packages/ui/src/theme.css` | the `@theme` block, `@keyframes spin`, and a small utility layer for the values a class name cannot express (focus ring geometry, spinner size and stroke) |
| `packages/ui/src/tokens.ts` | the token *types*, the legacy value objects, and whole-literal class strings per variant and tone |

Class strings are complete literals. A constructed name — `` `bg-${tone}` `` —
is invisible to the CSS scanner and the utility silently never ships, so the
generator never emits one.

No component file contains a hex colour, a bare `px` or `rem` measure, or a raw
opacity number. `check-design.mjs` enforces that by reading the `.tsx` files,
which is the check that keeps this document authoritative rather than
aspirational.
