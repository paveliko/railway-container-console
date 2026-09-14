# Verification: `design-system`

Prefix `V-DS-N`. Each line is something a reviewer can confirm or refute by
running one command.

## The chain

- V-DS-1 `build` — `node scripts/design-tokens.mjs` is idempotent: running it on
  a clean tree leaves `git status` unchanged.
- V-DS-2 `build` — Editing any value in `DESIGN.md`'s frontmatter and running
  `node scripts/check-design.mjs` fails with `drift`. *Break-and-revert, logged.*
- V-DS-3 `build` — Hand-editing `packages/ui/src/tokens.ts` or `theme.css` fails
  the same way. The generated files cannot be the place a change is made.
- V-DS-4 `build` — `node scripts/check-design.mjs --self-test` passes, and it
  covers nine distinct failure modes: `contrast-below-threshold`,
  `exemption-abused`, `ratio-mismatch`, `alpha-margin-too-thin`,
  `grid-violation`, `grid-exempt-typo`, `accent-on-small-text`,
  `line-identifies-control`, `coverage-gap`.
  **Amended by `spec-validation`:** the fixtures moved from
  `scripts/__fixtures__/` to `scripts/__fixtures__/design/`, because that script
  treated every entry in the shared directory as one of its own and a second
  checker's fixtures would have broken it. The set, the names and the command
  are unchanged; `implementation-typo` brings the count to ten.

## Contrast

- V-DS-5 `build` — Every `contrast.checks` entry is recomputed from the hex
  values; a recorded ratio more than `method.tolerance` from the measured one
  fails. Confirmed by shifting one recorded ratio by 0.05.
- V-DS-6 `build` — Thresholds are applied to the full-precision ratio, not the
  two decimals the document prints. The
  `contrast-below-threshold` fixture proves the enforcement; a pair that rounds
  to 4.50 from below is rejected.
- V-DS-7 `build` — `exempt: inactive` suppresses the WCAG threshold but not a
  `house` floor. The `exemption-abused` fixture is a disabled label at 1.29:1
  claiming `disabledLabelStaysLegible`, and it fails. *This fixture exists
  because the real disabled label measures 8.49 and could never demonstrate it.*
- V-DS-8 `build` — A `boundary` check with `identifying: true` is held to 3.0; one
  with `identifying: false` is recorded and not enforced. `card/default/default/border`
  at 1.20 passes; `line-identifies-control` at 1.29 fails.
- V-DS-9 `build` — Coverage: every `variant × state` a component declares has at
  least one check. Deleting the two `button/secondary/hover` entries fails.

## The grid

- V-DS-10 `build` — Every value under `grid.applies` is a multiple of 4 unless
  named in `grid.exempt`. Adding `spacing.odd: 6px` fails.
- V-DS-11 `build` — An entry in `grid.exempt` naming a path that is not in the
  token tree fails, so a typo cannot silently switch a check off.

## The boundary

- V-DS-12 `build` — `node scripts/check-boundaries.mjs` passes with 8 rules, now
  including `.css` under `packages/ui/src/` and the widened vocabulary. Adding
  `// container` to any component fails it. *Break-and-revert, logged.*
- V-DS-13 `build` — The generator **refuses to write** output containing a
  forbidden word, rather than deferring to CI. Putting the repository's own name
  in the provenance header exits non-zero and writes nothing.
- V-DS-14 ~~`build` — a grep for `min-h-touch` and `border-line-strong` in the
  build output finds them.~~ **Wrong, and replaced 2026-09-15 by `V-DC-10` /
  `V-DC-11`.** `vite-console` measured it: without `@source` both classes are
  *still emitted*, because the application writes them itself, so the probe
  survives the exact failure it was meant to catch. What vanishes is the state
  variants — `hover:`, `disabled:`, an alpha modifier — which appear only inside
  `@repo/ui`'s generated class strings. `scripts/check-styles.mjs` probes those,
  and its `--self-test` proves it by removing `@source` and forcing an uncached
  rebuild.

## The compositing convention

- V-DS-20 `manual` — `contrast.method.composite` describes what a renderer
  actually does. Rendering the primitives and reading the painted pixel back
  through a canvas reproduces the validator's arithmetic: the disabled primary
  fill paints `rgb(141, 176, 244)` for 8.4857, against 8.49 computed. *This
  criterion exists because the first draft specified continuous compositing,
  which is self-consistent, agrees with a second implementation, and describes a
  pixel no reader receives.*
- V-DS-21 `build` — Any check carrying an alpha clears its floor by at least
  `method.alphaMargin`. The `alpha-margin-too-thin` fixture is a label at 4.55
  against a floor of 4.5 and fails. *The rule exists because `bg-accent/10`
  is emitted as an `oklab()` value whose round-trip to sRGB lands on
  `rgb(234, 240, 253)` rather than the arithmetic's `rgb(234, 241, 253)` —
  0.11 of ratio. Modelling one framework's colour pipeline would rot; requiring
  a margin wider than its drift does not. The smallest margin in use is 0.63.*

## The components

- V-DS-15 `unit` — No file in `packages/ui/src/*.tsx` contains a hex colour, a
  bare `px`/`rem`/`em` measure, or a direct `opacity` assignment.
- V-DS-16 `unit` — The two `Button` variants carry separate disabled
  declarations: `primary` has `disabled:bg-accent/55` and `disabled:text-ink`,
  and `secondary` has neither an accent fill nor an accent border in any state.
- V-DS-17 `unit` — `Badge` in the `accent` tone labels itself `text-ink`, never
  `text-accent`, and still carries `border-accent`.
- V-DS-18 `unit` — `Spinner` requires a `label`; omitting it is a compile error,
  and the SVG is `aria-hidden`.
- V-DS-19 `manual` — *Integration.* On the real screen at 375px and at desktop
  width, read through `getComputedStyle` / `getBoundingClientRect`, not through
  class names: every control is ≥44px tall; blocks are 24px apart and text lines
  8px; borders resolve to `1px` in the expected `rgb()`; the spinner's
  `animation-duration` is `0.9s` and becomes `none` under emulated
  `prefers-reduced-motion`; a visible focus ring appears on `Tab`; every control
  is keyboard-reachable.
