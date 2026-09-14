# Tasks: `design-system`

Phase A is independent of the Vite migration and is done. Phase B waits for it
to merge, because the only thing left is the import.

## Phase A — the specification and the package

- [x] **T-DS-1 `DESIGN.md`.** Result: the frontmatter, and the body stating the
  grid, the rhythm, the contrast model, the states, touch targets and motion.
  Depends on: nothing. Acceptance: it parses, and every ratio in it is one a
  script produced. Verified by: `node scripts/check-design.mjs`.
- [x] **T-DS-2 Generator.** Result: `scripts/design-tokens.mjs`, `yaml` as a root
  devDependency, `packages/ui/src/tokens.ts` and `theme.css` regenerated.
  Depends on: T-DS-1. Acceptance: V-DS-1, V-DS-13. Verified by:
  `pnpm design:tokens` leaving the tree unchanged.
- [x] **T-DS-3 Validator and fixtures.** Result: `scripts/check-design.mjs`, the
  eight fixtures under `scripts/__fixtures__/`, both wired into `pnpm check`.
  Depends on: T-DS-2. Acceptance: V-DS-2 … V-DS-11. Verified by:
  `pnpm check:design:self-test`.
- [x] **T-DS-4 Boundary amendments.** Result: rule 3 consults the `exports` map;
  rule 5 gains `railway`, `deployment` and `.css`. `packages/ui/package.json`
  declares `./theme.css`. Depends on: T-DS-2. Acceptance: V-DS-12. Verified by:
  `pnpm check:boundaries`, plus break-and-revert logged in the PR.
- [x] **T-DS-5 Primitives.** Result: `Button`, `Badge`, `Card`, `Spinner` on
  generated classes, no inline styles, no literal values; hover, active and
  focus-visible added; `Spinner.label` required. Depends on: T-DS-2.
  Acceptance: V-DS-15 … V-DS-18. Verified by: `pnpm --filter @repo/ui test`.
- [x] **T-DS-6 `ux-brief.md` amendments.** Result: §4 and D-3 admit the three new
  colours; §5.1 records the Badge treatment and the states that now exist.
  Depends on: T-DS-5. Acceptance: the brief and the token file agree.

## Phase B — integration, after `console-nextjs-vite-migration` merges

- [x] **T-DS-7 — done by `vite-console`.** Update from `main` and confirm the shape.** Result: the real
  `vite.config.ts` and client entry are known, and the decision ID taken by the
  migration is confirmed so `D-UI-6` does not collide. Depends on: that merge.
  *Read-only.*
- [x] **T-DS-8 — done by `vite-console`.** Wire the stylesheet.** Result: `@tailwindcss/vite` added to the
  existing config **keeping `react()`**; the app's stylesheet entry imports
  `tailwindcss`, `@repo/ui/theme.css` and declares `@source` for
  `packages/ui/src`. Depends on: T-DS-7. Acceptance: V-DS-14. Verified by:
  grepping the built CSS for `min-h-touch`.
- [x] **T-DS-9 — done by `vite-console`.** Manifests and cache inputs.** Result: the migration's scripts and
  dependencies kept, `yaml` at the root, `pnpm-lock.yaml` regenerated after the
  merge, `pnpm verify` running both the existing checks and `check-design`, and
  `DESIGN.md` plus the generator added to the `inputs` of the cacheable tasks
  that actually read them. Depends on: T-DS-8. Verified by: `pnpm verify`.
- [x] **T-DS-10 — done by `vite-console`.** `Spinner.label` call sites.** Result: every caller and test
  updated for the required prop. Depends on: T-DS-7. Verified by: `pnpm verify`.
- [x] **T-DS-11 — done by `vite-console`.** The real screen.** Result: computed-style measurements on the
  screen as it exists post-merge, at 375px and desktop, plus screenshots.
  Depends on: T-DS-8. Acceptance: V-DS-19. Verified by: the measurements and
  screenshots in the PR.
- [ ] **T-DS-12 Paperwork.** Result: `D-UI-6` signed by the owner; archive.
  Depends on: T-DS-11. *Owner.*

> **Phase B landed inside `vite-console` (2026-09-15)**, because the merge order
> reversed: this change went first, and its primitives render nothing without
> the stylesheet wiring that lives in the consuming application's tree. Only
> `T-DS-12` — the owner's signature on `D-UI-6` — remains here.
>
> One finding to carry back: **`V-DS-14`'s probes do not detect a missing
> `@source`.** Measured on the real build — without the directive, `min-h-touch`
> and `border-line-strong` are still emitted, while the state variants
> (`hover:bg-accent-hover`, `disabled:bg-accent/55`, `bg-muted/10`) silently
> vanish. The probe should be a state variant.
>
> **Acted on 2026-09-15 by `designmd-conformance`.** `V-DS-14` is struck and
> replaced by `V-DC-10` / `V-DC-11`: `scripts/check-styles.mjs` probes the state
> variants, and its `--self-test` proves the check by removing `@source` and
> forcing an uncached rebuild.
