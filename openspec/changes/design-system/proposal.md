# Proposal: `design-system`

**Status:** proposed · **Capabilities:** `UI` · **Parent change:**
[`../railway-container-control/`](../railway-container-control/). **Requirement
served:** R-4 — *a UI component, not just a backend*, on its presentation side.
**Blocked on:** nothing. **Blocks:** the Tailwind half of
[`../console-screen/`](../console-screen/).

## The problem

`packages/ui/src/tokens.ts` is the only place in the repository where a colour
exists, and it is a hand-written file that nothing checks. Three things follow
from that, and all three are already true:

1. **The numbers in the documents are unverified.** `console-screen/ux-brief.md`
   §4 states *"`accent` on `surface` is 4.57:1"* and tells a designer not to use
   accent for 13px lines. That is correct — but it was asserted, and nothing
   recomputes it. Measuring the rest of the palette turns up two pairs the brief
   does not mention: **`accent` on `raised` is 4.26:1**, below AA for normal
   text, and **`line` on `surface` is 1.29:1**, which is the border a secondary
   `Button` uses as the only thing identifying it as a control.
2. **The disabled state is unreadable.** `Button` applies `opacity: 0.55` to the
   whole control. On the primary variant that puts the label at **1.56:1**. By
   `D-UI-3` that label reads *Starting…* or *Stopping…* and is the only thing on
   screen naming the transition in flight.
3. **There is no stylesheet at all.** Every primitive styles itself with inline
   `style` objects. Nothing is themeable, nothing is overridable, and the values
   are duplicated between the code and three documents.

`console-screen/proposal.md` puts *"A design system, theming"* under
**Deliberately out**, on the grounds that the console is one screen. That was
right about *theming*. It was wrong about the tokens, because the tokens already
exist — they are just unchecked.

## The approach

A root **`DESIGN.md`** whose YAML frontmatter is the only place a colour, a
measure or a duration is written down. Two generated artefacts follow from it
and nothing else:

```
DESIGN.md ── scripts/design-tokens.mjs ──┬── packages/ui/src/tokens.ts    types + class strings
                                         └── packages/ui/src/theme.css    @theme + keyframes + utilities
                └── scripts/check-design.mjs        recomputes, re-derives, refuses drift
```

`check-design.mjs` runs in `pnpm check`. It recomputes every contrast ratio from
the hex values, enforces the threshold **against the unrounded result**, proves
every declared `variant × state` has a check, holds spacing and radius to the
4px grid, and fails if either generated file differs from a fresh generation. A
`--self-test` mode runs eight fixtures, one per failure mode, so the red path of
each rule is itself tested.

The four primitives lose their inline styles and take their classes from the
generated file. Two palette additions come out of the measurements above:
`lineStrong` (#7e8895 — 3.59 / 3.35) for boundaries that identify a control, and
`accentHover` / `accentActive` for states that did not previously exist.

## What this is not

It is not theming. One light theme, two grounds, and every ratio in `DESIGN.md`
stated against one of them.

## Deliberately out

| Left out | Why |
|---|---|
| A dark theme | Every number in `DESIGN.md` §4 is stated against `surface` or `raised`; a third ground reopens all of them. `ux-brief.md` §9 already excludes it. This is a scope boundary, not an open question — there is no pending decision to register. |
| New primitives | `D-OPS-2` grows the package one component at a time on real need. This change refactors the four that exist and adds none. |
| Wiring the stylesheet into the app | `apps/console` is migrating to Vite in parallel. `DESIGN.md`, the generator and both generated files are bundler-agnostic; the import lives in that change's tree. |
| `@repo/ui` gaining a dependency | The `yaml` parser is a **root** devDependency used by the generator. The package itself still depends on `react` and nothing else (`D-OPS-2`). |

## Open questions this leaves alone

`Q-UI-4` (names on screen) and `Q-UI-5` (where the enum types live) are
untouched. No new `Q-UI-N` is registered: `ux-brief.md` §10 already earmarks
`Q-UI-6` for `first-paint`, and nothing here competes for it.

## What "done" means

[`verification.md`](verification.md) `V-DS-1 … V-DS-14` pass, and `pnpm verify`
is green. `D-UI-6` is **proposed**; the owner signs it.
