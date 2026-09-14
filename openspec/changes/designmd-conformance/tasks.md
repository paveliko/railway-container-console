# Tasks: `designmd-conformance`

- [x] **T-DC-1 Normalisation layer.** Result: `scripts/design-model.mjs` — one
  model with stable paths, a declared schema for the extension block, and the
  derivation of the published `components` map. Depends on: nothing.
  Acceptance: V-DC-7, V-DC-8. Verified by: `pnpm check:design:self-test`.
- [x] **T-DC-2 Convert `DESIGN.md`.** Result: published token sections, the
  `implementation` extension, `grid` and `contrast` carried over, body in the
  canonical section order with Elevation & Depth and Do's and Don'ts added.
  Depends on: T-DC-1. Acceptance: V-DC-2, V-DC-4. Verified by:
  `pnpm check:designmd`.
- [x] **T-DC-3 Rewire the generator and validator.** Result: both read the model;
  emitted output unchanged. Depends on: T-DC-1. Acceptance: V-DC-1, V-DC-3.
  Verified by: `git diff origin/main -- packages/ui/src/tokens.ts packages/ui/src/theme.css`.
- [x] **T-DC-4 Migrate the fixtures.** Result: ten fixtures in the published
  format, one per failure mode, including the new `implementation-typo`.
  Depends on: T-DC-1. Acceptance: V-DC-9. Verified by:
  `pnpm check:design:self-test`.
- [x] **T-DC-5 The linter as a gate.** Result: `scripts/check-designmd.mjs`, the
  allowlist, `@google/design.md` pinned at the root, wired into `check`.
  Depends on: T-DC-2. Acceptance: V-DC-4, V-DC-5, V-DC-6. Verified by:
  break-and-revert logged in the PR.
- [x] **T-DC-6 Replace `V-DS-14`.** Result: `scripts/check-styles.mjs` and its
  self-test, wired into `verify`; `design-system/verification.md` updated.
  Depends on: nothing. Acceptance: V-DC-10, V-DC-11. Verified by:
  `pnpm check:styles:self-test`.
- [ ] **T-DC-7 Paperwork.** Result: `D-UI-6` signed by the owner, covering both
  this change and `design-system`; archive both. Depends on: T-DC-6. *Owner.*
