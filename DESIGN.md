---
version: alpha
name: Railway container console
description: >-
  One screen that reports whether a configured container is up, and moves it
  between up and down. Light only, two grounds, and every ratio in this file
  measured rather than asserted.

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

# The format asks for a font family on every typography token. The console has
# one, so it is written once and referenced.
typography:
  sm:
    fontFamily: &sans "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif"
    fontSize: 13px
  md:
    fontFamily: *sans
    fontSize: 15px
  lg:
    fontFamily: *sans
    fontSize: 18px
  xl:
    fontFamily: *sans
    fontSize: 24px

rounded:
  sm: 4px
  md: 8px
  pill: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  touch: 44px

# Derived from `implementation.components`, never written by hand —
# `check-design.mjs` fails if this block and that one disagree. The format allows
# only backgroundColor, textColor, typography, rounded, padding and size, so this
# is a lossy projection: no border, no state, no alpha. It exists so the format's
# own linter can run its contrast rule over the opaque text-on-fill pairs.
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  badge-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.sm}"
    rounded: "{rounded.pill}"
  badge-accent:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sm}"
    rounded: "{rounded.pill}"
  badge-positive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.positive}"
    typography: "{typography.sm}"
    rounded: "{rounded.pill}"
  badge-caution:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.caution}"
    typography: "{typography.sm}"
    rounded: "{rounded.pill}"
  badge-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.sm}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"

# Everything the published format has no section for. The linter reports this
# key as an unrecognised token map and that report is correct — these values are
# ignored by `design.md export`, and `scripts/design-tokens.mjs` reads them
# instead. `design-model.mjs` declares the shape, so an unknown key here is an
# error rather than a rule that quietly stops running.
implementation:
  note: >-
    Read by scripts/design-model.mjs. Not part of the @google/design.md schema.

  typography:
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    weight:
      regular: 400
      medium: 500
      bold: 600

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

  # The state matrix, and the colour each state actually uses. This is the
  # normative source for both the generated class strings and the contrast
  # coverage rule; the published `components` block above is derived from it.
  components:
    button:
      variants: [primary, secondary]
      states: [default, hover, active, disabled]
      grounds: [surface]
      palette:
        primary:
          fill: accent
          border: accent
          label: surface
          hover: accentHover
          active: accentActive
          disabled: { fill: accent, fillAlpha: true, border: accent, borderAlpha: true, label: ink }
        secondary:
          fill: surface
          border: lineStrong
          label: ink
          hover: raised
          active: raised
          disabled: { fill: surface, fillAlpha: false, border: lineStrong, borderAlpha: true, label: muted }
    badge:
      variants: [neutral, accent, positive, caution, danger]
      states: [default]
      grounds: [surface]
      palette:
        neutral: { fill: muted, label: muted, border: lineStrong }
        accent: { fill: accent, label: ink, border: accent }
        positive: { fill: positive, label: positive, border: positive }
        caution: { fill: caution, label: caution, border: caution }
        danger: { fill: danger, label: danger, border: danger }
    card:
      variants: [default]
      states: [default]
      grounds: [raised]
    spinner:
      variants: [default]
      states: [default]
      grounds: [surface]

grid:
  step: 4
  applies: [spacing, rounded, spinner.size]
  exempt:
    rounded.pill: a pill is a shape, not a measure
    border.hairline: 1px is the device hairline; 4 is a rule about layout
    focus.width: ditto
    focus.offset: ditto
    spinner.stroke: an SVG stroke, not layout
    typography.size: type is a modular scale, not a grid

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
written down. `scripts/design-model.mjs` turns it into one internal model;
`scripts/design-tokens.mjs` turns that into `packages/ui/src/tokens.ts` and
`packages/ui/src/theme.css`; `scripts/check-design.mjs` regenerates both in
memory and fails if what is committed differs. The specification cannot drift
away from the code without the build saying so.

The file follows the published [`@google/design.md`](https://www.npmjs.com/package/@google/design.md)
format, with **documented extensions and one documented deviation** — see
§Do's and Don'ts. It is not fully conformant, and this document does not claim
to be.

## Overview

One screen, one configured container, one light theme. Two grounds: `surface`
for a card and `raised` for the page behind it. Every contrast number in this
file is stated against one of them.

The tone is plain. The console never claims more than the API said, so the
palette has no celebratory green and no alarming red beyond the one colour that
means an error actually happened. A dark theme is out of scope; adding one
reopens every number in §Colors.

Nothing generated into `packages/ui/src/` may name the product — `V-MW-22`.
The presentation layer does not learn what the application is for.

## Colors

Twelve colours. Two neutrals for text, two for grounds, two for boundaries, and
four semantic hues.

- **`ink` (#111418)** — headlines and body text. 18.47:1 on `surface`.
- **`muted` (#5b6672)** — detail lines, the connection indicator, a disabled
  secondary label. 5.85:1, safe everywhere.
- **`line` (#dfe3e8)** — **decoration only.** A card border, a hairline, a
  spinner track. It measures 1.29:1 and must never be the thing that tells a
  reader where a control is.
- **`lineStrong` (#7e8895)** — every boundary that *identifies* a control.
  3.59:1 on `surface`, 3.35:1 on `raised`; both clear the 3.0 that WCAG 1.4.11
  asks of a control's boundary.
- **`surface` (#ffffff)** and **`raised` (#f6f7f9)** — the two grounds.
- **`accent` (#2f6feb)**, with `accentHover` and `accentActive` — the primary
  control, the spinner arc, the focus ring.
- **`positive` / `caution` / `danger`** — the semantic tones.

### Contrast

Ratios are sRGB. Where a colour is drawn at less than full opacity the layers
are composited **in sRGB and rounded to 8 bits per channel**, the way a browser
composites into a framebuffer, and the ratio is reported to two decimals.

`contrast.method` states this because it changes answers. Composited in
continuous space, `button/primary/disabled/label` reads 8.47; composited to 8
bits it reads **8.49**, and 8.49 is what a reader receives — measured in a real
renderer, that fill paints `rgb(141, 176, 244)`. Eight of the thirty-one checks
carry an alpha and are affected; the rest are identical either way.

**Why an alpha check needs a margin.** A stylesheet may represent a translucent
colour in a space of its own choosing. Measured, `bg-accent/10` arrives as an
`oklab()` value whose round-trip to sRGB lands on `rgb(234, 240, 253)` where
this document's arithmetic says `rgb(234, 241, 253)` — one step on one channel,
worth up to **0.11** of ratio. Encoding one framework's colour pipeline here
would rot the first time that pipeline changed, so `rendererTolerance` names how
far a renderer may legitimately land from the arithmetic and **`alphaMargin`
requires any check carrying an alpha to clear its floor by 0.25**. A translucent
colour that needs the third decimal place to pass never really passed. The
smallest such margin in use is 0.63.

**What WCAG requires.** `contrast.wcag` carries the thresholds: 4.5 for text,
3.0 for large text, 3.0 for a graphical indicator, and 3.0 for a boundary **only
where that boundary is what identifies the control**. Inactive controls are
exempt from 1.4.3 and 1.4.11. The `identifying` flag on each boundary check
decides whether 3.0 is enforced or merely recorded: a card's border is
decoration, a secondary button's border is the button.

| Pair | Ratio | |
|---|---|---|
| `ink` on `surface` / `raised` | 18.47 / 17.23 | |
| `muted` on `surface` / `raised` | 5.85 / 5.46 | |
| `accent` on `surface` | 4.57 | AA, no margin |
| `accent` on `raised` | **4.26** | below AA — large text only |
| `ink` on opaque `accent` | 4.04 | why a primary label is `surface`, not `ink` |
| `ink` on `accent`@55% over `surface` | 8.49 | the disabled primary label |
| `surface` on `accent`@55% over `surface` | 2.18 | what dimming the whole button would have given |
| `line` on `surface` | 1.29 | decoration only |
| `lineStrong` on `surface` / `raised` | 3.59 / 3.35 | enabled boundaries |
| `positive` / `caution` / `danger` on `surface` | 5.95 / 5.93 / 6.54 | |

## Typography

One family, four sizes, three weights. The family is the system stack, so the
console inherits whatever the reader already reads comfortably.

Sizes are recorded in px because that is how they are designed, and emitted in
**rem** against a 16px base, so a reader who has enlarged their browser font
still gets the enlargement — WCAG 1.4.4. This is the one place where the
specification's unit and the emitted unit deliberately differ.

The monospace stack exists for one thing: a `traceId`.

## Layout

**The 4px grid.** `spacing`, `rounded` and `spinner.size` are multiples of four.
Nothing else is, and every exception is declared in `grid.exempt` with a reason —
the validator fails on an *undeclared* exemption, and on an exemption naming a
path that does not exist, so the list can neither grow quietly nor rot.

**Vertical rhythm.** 24px (`spacing.xl`) between blocks; 8px (`spacing.sm`)
between lines of text that belong together, such as a headline and its detail
line; 24px of padding inside a card, uniformly.

**Touch targets.** Any control a finger can hit is at least `spacing.touch`
(44px) tall. That is why 44 is in the spacing scale at all — it is on the grid
(4 × 11) and it is not a padding value.

## Elevation & Depth

There is none, and that is a decision rather than an omission. The console is
one card on one page. Depth is carried by a 1px border and a change of ground —
`surface` on `raised` — and by nothing else: no shadow, no blur, no z-layering.
A shadow would imply a hierarchy that does not exist, and the card never
overlaps anything.

## Shapes

Three radii. `sm` (4px) for a control, `md` (8px) for the card, `pill` (999px)
for a badge. `pill` is exempt from the grid because it is a shape and not a
measure — any number past half the element's height produces the same capsule.

Borders are one device pixel. `border.hairline` is exempt from the grid for the
same kind of reason: 1px is what a hairline is, and four would be a rule about
layout applied to something that is not layout.

## Components

Four primitives, and the states each one declares. `implementation.components`
is the normative matrix; `contrast.checks` must cover every `variant × state` it
declares, so a state cannot be added without its contrast being considered.

**Button.** Two variants, four states. They differ in all four, and specifying
them together is a bug: a shared disabled rule would give `secondary` an accent
fill.

| | `primary` | `secondary` |
|---|---|---|
| default | `accent` fill, `accent` border, `surface` label | `surface` fill, `lineStrong` border, `ink` label |
| hover | `accentHover` fill | `raised` fill |
| active | `accentActive` fill | `raised` fill |
| disabled | fill and border at `state.disabledAlpha`, label `ink` | `surface` fill, border at `state.disabledAlpha`, label `muted` |

`opacity: 0.55` applied to the whole control is what the package did first, and
it put a primary label at **1.56:1**. That label reads *Starting…* or
*Stopping…* and is the only thing on screen naming a transition in flight, so
the 55% narrowed to the fill and the border while the label switched colour.
`muted` was the obvious label for both variants and is wrong for `primary`: on
the dimmed accent fill it measures 2.69.

**Badge.** A 10% tint of the tone, a full-strength border in the tone, and a
label chosen to clear 4.5 on that tint. The accent tone's label is `ink`, not
accent, because accent is barred from 13px text. Softening the *border* instead
of tinting the fill would drop it to 1.29:1 — the number `lineStrong` exists to
avoid.

**Card.** `surface` fill, a 1px `line` border, `md` radius, 24px of padding. The
border is decoration and is recorded as `identifying: false`.

**Spinner.** A `line` track and an `accent` arc, turning once every 0.9s. The
keyframes are written into `theme.css` explicitly rather than borrowed from
whatever the CSS framework happens to ship, so the duration in this file is the
duration on screen. Under `prefers-reduced-motion` it does not turn; it keeps
its label, because the spinner never carries meaning alone.

**Focus.** Not a variant of the above. The same ring on every control, drawn
outside the control's own border so the two are never confused, on
`:focus-visible` only.

## Do's and Don'ts

Three house rules, stricter than the standard, each with its reason:

- **Don't** use `accent` for `typography.size.sm` text. It measures 4.57 on
  `surface` and **4.26 on `raised`** — the second fails AA outright and the
  first has no margin. Small text uses `ink` or the tone's own colour.
- **Don't** let `line` carry an *enabled* interactive boundary. 1.29:1.
  `lineStrong` exists for exactly this; `line` stays for decoration.
- **Do** keep a disabled label at 4.5 or better, even though WCAG exempts
  inactive controls. While a transition is in flight that label is the only
  account of what is happening.

### Extensions and deviations from the published format

Stated plainly, because a clean lint run is not the same as conformance.

- **Deviation — no `primary` colour.** The specification says *"At least the
  `primary` color palette must be defined"*. This palette calls its one accent
  colour `accent`, which is what `D-UI-6`, `console-screen/ux-brief.md` §4 and
  every generated class name already say. Renaming the token in the frontmatter
  alone would leave the file disagreeing with the code about what the colour is
  called — a hidden deviation in place of a declared one. The linter reports
  `missing-primary`, and that report is correct.
- **Extension — `implementation`.** Everything the format has no section for:
  the weight scale, the monospace stack, border and focus geometry, the spinner,
  motion, the alpha constants, and the component state matrix. The linter
  reports it as an unrecognised token map, and that report is also correct: it
  *is* ignored by `design.md export`.
- **Extension — `grid` and `contrast`.** The 4px rule and the thirty-one
  contrast checks. Neither draws a finding.
- **Accepted findings — seven, and no more.** `missing-primary` ×1,
  `token-like-ignored` on `implementation` ×1, and `orphaned-tokens` ×5 for
  `line`, `lineStrong`, `raised`, `accentHover` and `accentActive`. Each of those
  five is used as a *border*, a *ground* or a *state*, and the format's
  `components` section can express none of the three.
  `scripts/check-designmd.mjs` holds this exact list. A new finding fails the
  build, and so does a listed one that stops appearing — a reason that has gone
  stale is worth as much attention as a new problem.
