# Design: `design-system`

## 1. The chain, and what each link guarantees

| Link | Guarantees |
|---|---|
| `DESIGN.md` frontmatter | one place a value is written |
| `scripts/design-tokens.mjs` | the two generated files are a pure function of that block |
| `scripts/check-design.mjs` | the committed files equal a fresh generation, and every claim in the block is true |
| `scripts/check-design.mjs --self-test` | each of those checks actually fails when it should |

The last row is the one that makes the rest worth anything. A validator whose
red path is never exercised is a validator that passes because it does nothing.

## 2. The contrast model

Ratios are sRGB. Where a colour is drawn at partial opacity the layers are
composited **in sRGB and rounded to 8 bits per channel**, which is what a
browser does on the way to a framebuffer.

That convention is written into `contrast.method` because it changes answers,
and the first draft of this change got it wrong. It specified *unquantised*
compositing, which put `button/primary/disabled/label` at **8.47**. Rendering
the primitives and reading the painted pixel showed the fill arriving as
`rgb(141, 176, 244)` — the quantised composite — for a real ratio of **8.49**.
The continuous number was a property of a pixel nobody receives. Eight of the
thirty-one checks carry an alpha and moved; the other twenty-three are identical
under either convention.

The lesson is the one this whole change is about: the number was plausible,
internally consistent, and agreed with a second implementation, and it was still
wrong until something measured the screen.

Every check declares its layers explicitly:

```yaml
- id: button/primary/disabled/label
  usage: text
  size: md
  exempt: inactive
  house: disabledLabelStaysLegible
  fg: { color: ink }
  bg: [{ color: surface }, { color: accent, alpha: 0.55 }]
  ratio: 8.49
```

The earlier draft of this change recorded that pair as `ink` on `accent` — the
*opaque* colour, which measures **4.04** — while quoting the composited number.
Naming the layers is what makes that class of error impossible to write down.

### Thresholds

`usage` selects the threshold, and it is tested against the full-precision
ratio rather than the two decimal places the document prints, so a pair at
4.4996 fails rather than rounding into compliance. (That is a separate matter
from the channel rounding above: one models the framebuffer, the other would
merely flatter the report.)

- `text` 4.5, `textLarge` 3.0, `indicator` 3.0.
- `boundary` 3.0, **but only when `identifying: true`**. WCAG 1.4.11 applies to
  a boundary the user needs in order to perceive the control. A `Card`'s border
  is decoration; a secondary `Button`'s border is the button. Both are recorded;
  only the second is enforced.
- `exempt: inactive` disables the WCAG threshold, because inactive controls are
  exempt from 1.4.3 and 1.4.11. It does **not** disable a `house` floor.

### House rules

Stricter than the standard, and labelled as ours rather than as WCAG's:

| Rule | Enforced as |
|---|---|
| `accentNeverOnSmallText` | any `text` check at `size: sm` with `fg.color: accent` fails |
| `lineNeverIdentifies` | any `boundary` check with `identifying: true` and `fg.color: line` fails |
| `disabledLabelStaysLegible` | a check carrying this name must clear `wcag.text` even though it is exempt |

## 3. The disabled state

`opacity: 0.55` on the whole control is what the package did, and it is what the
brief specifies. It is also what puts a primary label at 1.56:1. The scope of
the 55% narrows rather than the value changing:

| | fill | border | label |
|---|---|---|---|
| `primary` disabled | `accent` @ 55% | `accent` @ 55% | **`ink`, full strength** → 8.49 |
| `secondary` disabled | `surface` | `lineStrong` @ 55% | **`muted`, full strength** → 5.85 |

`muted` was the obvious label for both and is wrong for `primary`: on the dimmed
accent fill it measures 2.69. The two variants therefore carry separate disabled
declarations, which is also why `buttonVariant` is a map of whole strings rather
than a base plus a modifier — a shared disabled rule would give `secondary` an
accent fill.

## 4. Why class strings are whole literals

`tokens.ts` emits `'bg-accent/55'`, never `` `bg-${name}/${alpha}` ``. A
constructed class name is invisible to the CSS scanner: the utility is never
generated, the element renders unstyled, and nothing fails — no type error, no
test failure, no build warning. It is the one failure mode in this design that
is silent, so the generator is structured to make it unrepresentable.

## 5. Bundler independence

Nothing in `DESIGN.md`, the generator, `tokens.ts` or `theme.css` names a
bundler, a framework or an import path. `theme.css` is a stylesheet with an
`@theme` block, explicit `@keyframes`, and a small `@layer components` for the
values a utility name cannot carry (focus-ring geometry, spinner size and
stroke).

Wiring it into an application is that application's business, and `apps/console`
is migrating to Vite in parallel. The consuming side needs exactly three lines,
wherever the app's stylesheet entry ends up:

```css
@import "tailwindcss";
@import "@repo/ui/theme.css";
@source "<relative path to packages/ui/src>";
```

`@source` is not optional and is not covered by any type check: Tailwind does
not scan outside the package that owns the CSS file, so without it every class
this package names resolves to nothing at runtime while the build stays green.
Verifying it is `V-DS-14`, and it belongs to the integration change.

## 6. Two amendments to `check-boundaries.mjs`

Both are additive; neither replaces the file.

**Rule 3 — a declared `exports` subpath is not a deep import.** The rule existed
to stop a package reaching into a neighbour's internals. `@repo/ui/theme.css` is
the opposite: a second front door, declared in the package's own `exports` map.
The rule now consults that map. An undeclared subpath still fails, which is the
part that was ever load-bearing.

**Rule 5 — wider vocabulary, and `.css`.** `railway` and `deployment` join the
forbidden list, and this rule alone extends its scan to `.css` under
`packages/ui/src/` — the other seven keep the shared extension list, since a
stylesheet has no imports for them to check.

Worth stating because it bites immediately: rule 5 matches a lowercase substring
over **whole file text, comments and identifiers included**. The repository's own
name, `railway-container-console`, contains two forbidden words, so the
generator's provenance header may not name it — and the generator refuses to
write output that would trip the rule, rather than leaving it for CI. Writing
the component tests turned up a second case: Testing Library's `render()` returns
a property whose name is a banned word, so those tests reach the node through
`screen` instead.

## 7. Rejected alternatives

**Hand-written `tokens.ts` with a validator that compares it to `DESIGN.md`.**
Keeps the file's prose comments, which the original leaned on. Rejected: two
files that must agree, with a check that says *they disagree* rather than
*here is the correct one*. Generation makes the disagreement unrepresentable.

**CSS custom properties with no framework.** Delivers `--color-ink` and friends
with zero dependencies and no build step, and was the standing recommendation
before the owner chose Tailwind v4. Rejected on the owner's instruction; recorded
because it remains the cheapest way back if the framework is ever dropped.

**Keeping inline styles and adding only the validator.** Cheapest of all, and
fixes the two accessibility defects. Rejected: it leaves the values duplicated
between `tokens.ts` and the three documents, which is the condition that let
4.26 and 1.29 go unnoticed in the first place.

**A `yaml` dependency inside `@repo/ui`.** Rejected — it would be the package's
first non-`react` dependency, against `D-OPS-2`. The parser lives at the root,
where the generator runs; the package ships no parser at all.

**Registering dark theme as `Q-UI-N`.** Rejected: an open question is a decision
that is pending. Nobody has asked for a dark theme, so it is a scope boundary and
belongs in "Deliberately out". `Q-UI-6` is also already spoken for by
`ux-brief.md` §10.
