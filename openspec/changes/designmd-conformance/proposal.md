# Proposal: `designmd-conformance`

**Status:** proposed · **Capabilities:** `UI` · **Parent change:**
[`../design-system/`](../design-system/). **Blocked on:** nothing.

## The problem

`DESIGN.md` is the single source for every design token in this repository, and
its format is **invented**. It was written to look like a DesignMD file without
reference to the published specification, because the specification was not
consulted. Three things follow:

1. No tool but this repository's own scripts can read it. The point of a
   published format is that an agent arriving with no context can pick the file
   up; a bespoke schema forfeits that.
2. The only thing checking it is the script that also generates from it. A
   specification and its sole validator sharing an author share their blind
   spots.
3. `V-DS-14` — the criterion guarding the one silent failure in the design
   system — **does not work.** `vite-console` measured it: without `@source`,
   the classes it probes for are still emitted.

## The approach

Move the frontmatter to the published
[`@google/design.md`](https://www.npmjs.com/package/@google/design.md) format
(v0.4.0), and add its linter as a second, independent gate.

The format is smaller than this design system. It has no `borderColor`, no
component states, no alpha, no grid rule and no contrast threshold — and this
design system is mostly made of those. So the file carries the published token
sections *and* an `implementation` block for the rest, and a new
`scripts/design-model.mjs` is the single place that knows how the two fit
together. Everything downstream reads that model and never the frontmatter.

The published `components` map is **derived** from the implementation block
rather than written beside it, so the two cannot drift into independent copies of
the same values.

## What this is not

**It is not full conformance, and this change does not claim it.** The
specification says *"At least the `primary` color palette must be defined"*; this
palette calls its accent colour `accent`, which is what `D-UI-6`,
`console-screen/ux-brief.md` §4 and every generated class name already say. The
deviation is declared in `DESIGN.md` and in the check's allowlist. Renaming the
token in the frontmatter alone would leave the file disagreeing with the code
about what the colour is called — a hidden deviation in place of a declared one.

The right description is **compatible with the published format, with documented
extensions and one documented deviation**.

## Deliberately out

| Left out | Why |
|---|---|
| Adopting `design.md export` as the emitter | Its variable names are verbatim (`--color-lineStrong`), which renames 50+ hardcoded class occurrences across `@repo/ui` and six shipping feature files. Worse, the format bundles weight into each typography token, so `font-bold` and `font-medium` have **no equivalent** — a capability loss, not just churn. The exporter cannot emit the `@layer components` utilities either. |
| Renaming `accent` to `primary` | See above. |
| Any change to `packages/ui/` or `apps/console/` | The generated files stay byte-identical. That is the acceptance criterion, not a side effect. |

## What "done" means

[`verification.md`](verification.md) `V-DC-1 … V-DC-9` pass, `pnpm verify` is
green, and `packages/ui/src/tokens.ts` and `theme.css` are unchanged from `main`.
`D-UI-6` is still **proposed**; the owner signs it.
