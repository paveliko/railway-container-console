# Verification: `spec-validation`

Prefix `V-SV-N`. Each line is something a reviewer can confirm or refute by
running one command. `build` needs no network; `manual` is a recorded procedure.

Identifiers written `example:` are named in order to say they do not exist —
see [`design.md`](design.md) §1.

## The checker

- V-SV-1 `build` — `node scripts/check-specs.mjs` exits 0 on the tree, and
  non-zero when **any one** of the six error rules is broken. One
  break-and-revert procedure per rule, all six logged in the PR:
  split a `D-` row from its table header (`R-STRUCT`); duplicate a task's
  canonical checkbox, and separately delete `Q-SEC-4`'s row (`R-ID`); write
  `example:D-API-9` bare, and separately point a delegation cell at
  `example:T-CS-99` (`R-REF`); drop an identifier from an `Acceptance:`, and
  separately make two criteria cite only each other (`R-TRACE`); rename a link
  target (`R-LINK`); write `[X]` as a checkbox (`R-VOCAB`). Each failure names
  rule, file, line and identifier.
- V-SV-2 `build` — `node scripts/check-specs.mjs --self-test` passes, and every
  rule is covered in **both** directions. A red fixture that produces a problem
  with the wrong `rule` or `id` is reported as a failure, not a pass; a green
  fixture that produces any problem is reported as the parser over-firing.
- V-SV-3 `build` — Warnings never fail the build. With a warning present and no
  error, the exit code is 0, the pass line reports the warning count separately
  from the error count, and `pnpm check` continues to the next checker.
- V-SV-4 `build` — **The checker accepts its own specification.** With
  `openspec/changes/spec-validation/` in the tree — including the
  break-and-revert prose above, the fixture identifiers quoted in `design.md`
  §4, and the schema notation in `design.md` §1 — `node scripts/check-specs.mjs`
  exits 0.

## The rules

- V-SV-5 `build` — `R-STRUCT`: every directory under `changes/` holds
  `proposal.md`, `design.md`, `verification.md` and `tasks.md`; extra files such
  as `console-screen/ux-brief.md` are not failures; `changes/README.md`'s index
  names exactly the directories present, neither omitting one nor naming a
  directory that does not exist; and every `D-` or `Q-` row is part of a table
  contiguous with its header. The last clause is why `D-API-7` was rendering as
  literal pipe-delimited text.
- V-SV-6 `build` — `R-ID`: `Q-<CAP>-N` and `D-<CAP>-N` are dense from 1 within
  each of `API`, `UI`, `SEC`, `OPS`, and defined exactly once, in either the
  table-row or the `### \`Q-UI-6\`` prose form. Every `V-` and `T-` has **at most
  one canonical definition** and at most one index entry; an index entry beside
  a canonical definition — `T-3.5`, `T-6.3` — is legal and is not a duplicate.
  A plain `V-<n>` defined outside `railway-container-control` is an ambiguity
  error. Capability prefixes and child codes come from their declared
  vocabularies.
- V-SV-7 `build` — `R-REF`: every `V-`, `T-`, `Q-` and `D-` identifier written
  anywhere under `openspec/` resolves — including the six inside fenced blocks,
  which are genuine references and are checked like any other. Template notation
  (`D-SEC-N`) is not an identifier and is excluded by the grammar, not by a
  list. Every delegation cell in the parent's index resolves: *stays here*
  requires a canonical definition in the same file, and any other cell must name
  at least one change folder or task that exists.
- V-SV-8 `build` — `R-TRACE`: every criterion **reaches** a task through the
  citation graph — an edge to each task whose `Acceptance:` claims it and to
  each criterion citing it, with `V-A … V-B` expanded to the closed range and
  backticks stripped. Two criteria citing only each other reach no task and are
  reported as a cycle, naming both. This is traceability: it proves somebody
  signed up to meet the criterion, not that it is met.
- V-SV-9 `build` — `R-LINK`: every relative markdown link under `openspec/`
  resolves to a file or directory that exists. Anchors are not resolved, and the
  pass line does not claim they are.
- V-SV-10 `build` — `R-VOCAB`: every task checkbox is `[x]`, `[ ]` or `[~]`;
  every criterion kind is `unit`, `build`, `live` or `manual`; every decision
  status begins with `ratified`, `proposed`, `superseded` or `planned`, read as
  a leading keyword because the cells are prose; every
  `**Amended by \`slug\`:**` names an existing change folder.

## The warnings

- V-SV-11 `manual` — `W-CLAIM` reports a prose block in `_research/` that opens
  a claim run without `[observed]`, `[inferred]` or `[to-verify]`; the variants
  `[observed — secondary]` and `[inferred, later disproved]` count. Its limits
  are stated in `design.md` §7, and it is a warning **because** those limits are
  real: it does not implement rule 2, it assists it.
- V-SV-12 `build` — `W-CRED` reports a `RAILWAY_*=`, `Authorization: Bearer` or
  `Project-Access-Token:` slot not followed by a placeholder or nothing.
  Break-and-revert with a dummy literal, never committed. This is not secret
  scanning; `design.md` §7 says so.
- V-SV-13 `manual` — `W-FILE` reports a `D-` or `Q-` row filed under a section
  heading that names a different capability. Today: `D-API-7` under
  `## Tokens and secrets`, `D-OPS-4` under `## Console`.
- V-SV-14 `build` — `W-EXAMPLE` reports an `example:` marker naming an
  identifier that exists, so the convention cannot quietly become a way to
  silence a real reference. The pass line counts every marker skipped.

## The wiring

- V-SV-15 `build` — `pnpm check` runs `check-specs.mjs` **in addition to**
  `check-boundaries.mjs`, `check-design.mjs` and `check-designmd.mjs`, and
  `pnpm verify` still runs `check-styles.mjs` **last, after
  `turbo run typecheck test build`**, because that checker builds the app and
  reads the emitted stylesheet. Confirmed by the order of the summary lines in
  one full `pnpm verify`, recorded in the PR.
- V-SV-16 `build` — `node scripts/check-design.mjs --self-test` still reports
  ten fixtures after the move to `scripts/__fixtures__/design/`, and
  `check-boundaries.mjs`, `check-designmd.mjs` and `check-styles.mjs` are
  untouched.
- V-SV-17 `build` — `pnpm verify` succeeds on a clean clone with no `.env`, no
  network and no Railway token. `check-specs.mjs` reads only the working tree.

## What is not verified here

- Whether a claim marker is true, whether a criterion is falsifiable, whether a
  decision's rejected alternatives are the real ones. All review.
- That no agent moved a decision to `ratified` — needs a git base. `Q-OPS-7`.
- That the corpus contains no leaked secret, and that it is written in English.
  `design.md` §7 records why each was dropped rather than approximated.
