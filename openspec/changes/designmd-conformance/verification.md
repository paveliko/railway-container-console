# Verification: `designmd-conformance`

Prefix `V-DC-N`. Each line is something a reviewer can confirm or refute by
running one command.

## The conversion lost nothing

- V-DC-1 `build` — **`packages/ui/src/tokens.ts` and `theme.css` are byte-identical
  to `main`.** `git diff` against `origin/main` on those two paths is empty. This
  is what proves no class renamed and no component needed touching.
- V-DC-2 `manual` — The normalised model built from `main`'s `DESIGN.md` and the
  one built from this file are equal field by field: 12 colours, 6 spacings,
  3 radii, 6 grid exemptions, 4 component matrices, 31 contrast checks.
  *Recorded in the PR.* `design.md diff` is **not** this proof — it reports every
  colour as added, because the old `tokens:` wrapper meant it saw none.
- V-DC-3 `build` — `node scripts/design-tokens.mjs` is idempotent: two further
  runs leave the tree unchanged.

## The format

- V-DC-4 `build` — `pnpm check:designmd` reports **0 errors**, and the warning
  set equals the allowlist exactly: `missing-primary` ×1,
  `token-like-ignored` ×1, `orphaned-tokens` ×5.
- V-DC-5 `build` — The allowlist is a gate in both directions. Adding a
  thirteenth colour fails it with `unexpected warning`. Making an accepted
  finding stop appearing — referencing `lineStrong` from a component — fails it
  with `accepted warning no longer reported`. *Break-and-revert, logged.*
- V-DC-6 `build` — The linter is invoked from `node_modules` at a pinned exact
  version, never `npx`. `pnpm check:designmd` succeeds with the network
  unavailable.

## The model

- V-DC-7 `build` — An unrecognised key under `implementation` is an **error**,
  not a silently ignored value. Fixture `implementation-typo` renames `border` to
  `boarder` and is caught.
- V-DC-8 `build` — `check-design.mjs` fails if the published `components` block
  differs from what `derivePublishedComponents` projects from
  `implementation.components`. The two cannot become independent copies.
- V-DC-9 `build` — `node scripts/check-design.mjs --self-test` passes with **ten**
  fixtures, each written in the published format and each failing **for its
  stated reason** — the self-test asserts the message, so a fixture that broke on
  "cannot read the schema" would not count as proof.

## The style check that replaces `V-DS-14`

- V-DC-10 `build` — `pnpm check:styles` builds the client and finds all five
  `@repo/ui`-only state variants in the emitted CSS.
- V-DC-11 `build` — `pnpm check:styles:self-test` removes `@source`, forces an
  uncached rebuild, confirms **all five vanish**, restores `styles.css` and
  confirms the check passes again. `apps/console` is unchanged afterwards, and
  the restore runs in a `finally` so an interrupted run cannot leave it broken.
