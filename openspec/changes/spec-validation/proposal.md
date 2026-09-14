# Proposal: `spec-validation`

**Status:** proposed · **Capabilities:** `OPS` (the repository's own gate) ·
**Parent change:** none — this change serves the corpus, not the product.
**Blocked on:** nothing.

## The problem

`CLAUDE.md` states seven hard rules. `decisions.md` and `open-questions.md`
state a dozen more in their own header blocks — dense numbering, rejected
alternatives, a successor for every superseded decision, resolutions appended
rather than edited. **Nothing checks any of them.**

This repository already argues, twice, that a rule which is written down and
never re-derived is a wish: `check-design.mjs` recomputes every contrast ratio
rather than trusting the printed one, and `check-boundaries.mjs` turns three
prose import rules into resolution errors. The specification corpus — the
artefact a reviewer is most likely to read first — is the one part of the
repository still governed by prose alone.

It has drifted, and the drift is invisible:

| Finding | Where |
|---|---|
| `D-API-7` is separated from its table header by a blank line, so GitHub renders the repository's most consequential decision as **literal pipe-delimited text**, not a table row. It is also filed under `## Tokens and secrets`. | `decisions.md:42` |
| `D-OPS-4` sits inside the `## Console — D-UI-N` table. | `decisions.md:55` |
| `D-SEC-2` is referenced by a task but does not exist anywhere. | `railway-container-control/tasks.md:28` |
| Eleven criteria are defined and claimed by no task — nobody signed up to meet them. | across five changes |
| Four research paragraphs open a claim without `[observed]` / `[inferred]` / `[to-verify]`. | `_research/` |

None of these survived four rounds of review by hand, which is the argument for
a script rather than more review.

## The approach

`scripts/check-specs.mjs`, a third sibling to the two existing checkers: ESM, no
dependencies, hermetic, run from `pnpm check`. Six rules that fail the build and
four that only warn.

The split is the whole design. **Errors are structural and referential** —
identifiers unique and dense where a register promises density, references that
resolve, criteria that trace to a task, links that resolve, closed vocabularies.
**Warnings are everything whose truth a script cannot reach**, starting with
whether a paragraph carries a claim marker.

Three things this deliberately does not do:

1. **It does not judge meaning.** Whether an `[observed]` mark is true, whether
   a criterion is falsifiable, whether a decision is well argued — all review,
   none arithmetic. [`design.md`](design.md) §7 lists them so a green check
   cannot be mistaken for more than it is.
2. **It does not invent register rules to enforce.** An earlier draft would have
   required a strikethrough, a dated *"Why it fell"* and a signer on every
   ratified row. Only `D-API-1` is written that way, so enforcing it meant
   **rewriting two ratified decisions to satisfy a linter** — the precise thing
   *superseded rather than edited* exists to prevent. Dropped.
3. **It does not bend the corpus to fit a regular expression.** `T-1.4` reserves
   the number `D-SEC-2` for a decision the owner has yet to argue. Renaming it
   to `D-SEC-N` would make the check pass and delete the intent. Instead the
   register gains a `planned` row, and the reservation becomes visible where
   rule 3 says it belongs.

## Deliberately out

| Left out | Why |
|---|---|
| `@fission-ai/openspec` | The npm package named `openspec` is a dead 2019 stub — v0.0.0, four files, 1,275 bytes. The real tool is `@fission-ai/openspec`, and this repository's `openspec/` is a **name collision**, not an installation of it. Its validator checks its own delta schema (`## ADDED Requirements`, `#### Scenario:`), which no change here uses; it has no home for either register; and `openspec init` would claim the directory and write into `AGENTS.md`, which states it carries no rules of its own. Recorded as `D-OPS-5`. |
| Enforcing rule 5 (an agent does not ratify) | Needs a diff against a git base; this script is hermetic and sees one working tree. `Q-OPS-7`. |
| Archive semantics | `changes/archive/` does not exist yet. Designing for it now would be speculation. `Q-OPS-6`. |
| Secret scanning | The credential rule asserts that **known slots** carry placeholders. Entropy heuristics were measured and rejected — they fire on Railway forum slugs and GraphQL type names. Naming it a secret scanner would be a false guarantee. |
| An "English throughout" codepoint check | Rule 7 is about the document's audience. A correct quotation or proper name in another script is not a violation, and a check that cannot tell one from a genuinely non-English paragraph is worse than none. |
| Markdown anchor resolution | The corpus has zero relative anchor links. There is nothing to check, and a check the corpus never exercises is untested by construction. |

## What "done" means

[`verification.md`](verification.md) `V-SV-1 … V-SV-17` pass, `pnpm verify` is
green and still hermetic, and the checker **accepts its own specification** —
including the prose below that names identifiers which do not exist.
`D-OPS-5` is still **proposed**; the owner signs it.
