# Tasks: `spec-validation`

`[x]` done · `[ ]` not started · `[~]` blocked, on whom is stated.
`V-SV-N` is in [`verification.md`](verification.md).

- [~] **T-SV-0 Sign `D-OPS-5`.** *Owner.* Result: the decision to check the
  corpus with a script of this repository's own, rather than by adopting
  `@fission-ai/openspec` or by continuing to review by hand, moves from
  `proposed`. Depends on: nothing. Acceptance: `decisions.md` shows `D-OPS-5`
  ratified. Verified by: reading the register. *Nothing below is blocked on it —
  the checker is written against the proposed text.*
- [ ] **T-SV-1 Split the fixture directory.** Result: the ten design fixtures
  move to `scripts/__fixtures__/design/`; `check-design.mjs` reads that path;
  `V-DS-4` gains an `**Amended by \`spec-validation\`:**` note. Depends on:
  nothing. Acceptance: V-SV-16. Verified by: `pnpm check:design:self-test`,
  **run before any spec fixture exists** so the green run is unambiguous.
- [ ] **T-SV-2 Reader, parsers, structured problems.** Result:
  `scripts/check-specs.mjs` with the markdown reader, the block splitter, the
  four document parsers, the `Acceptance:` range expander, the canonical /
  index / group / reference distinction of design §2, and
  `checkCorpus(root)` returning `{ rule, severity, file, line, id, message }`
  records. Depends on: nothing. Acceptance: it reports the corpus's identifier
  counts and no rule has run yet. Verified by: `node scripts/check-specs.mjs`.
- [ ] **T-SV-3 `R-STRUCT`, `R-ID`.** Result: the two rules and their red and
  green fixtures, including `green-index-plus-canonical` and
  `id-canonical-duplicate`. Depends on: T-SV-1, T-SV-2. Acceptance: V-SV-5,
  V-SV-6. Verified by: `pnpm check:specs:self-test`.
- [ ] **T-SV-4 `R-REF` and the example convention.** Result: the rule, the
  delegation-cell check, the `example:` lookbehind, and the fixtures
  `ref-dangling`, `ref-delegation-dangling`, `ref-stays-here-without-definition`,
  `green-example-marker`, `green-id-in-fence`, `green-template-ids`,
  `green-planned-reference`. Depends on: T-SV-3. Acceptance: V-SV-7.
  Verified by: `pnpm check:specs:self-test`. *Lands before any prose that needs
  the convention.*
- [ ] **T-SV-5 `R-TRACE`.** Result: the reachability query, the cycle report,
  and the fixtures `trace-unreachable`, `trace-cycle`,
  `green-acceptance-range`. Depends on: T-SV-4. Acceptance: V-SV-8.
  Verified by: `pnpm check:specs:self-test`.
- [ ] **T-SV-6 `R-LINK`, `R-VOCAB`.** Result: the two rules and their fixtures.
  Depends on: T-SV-5. Acceptance: V-SV-9, V-SV-10. Verified by:
  `pnpm check:specs:self-test`.
- [ ] **T-SV-7 The four warnings.** Result: `W-CLAIM`, `W-CRED`, `W-FILE`,
  `W-EXAMPLE`, the two-severity exit logic, and the counts in the pass line.
  Depends on: T-SV-6. Acceptance: V-SV-3, V-SV-11, V-SV-12, V-SV-13, V-SV-14.
  Verified by: `pnpm check:specs:self-test`.
- [ ] **T-SV-8 The corpus findings.** Result: the register and corpus edits the
  rules surface, each justified on content — `decisions.md:42`'s blank line
  removed and `D-API-7` refiled, `D-OPS-4` refiled, the `D-SEC-2` `planned` row,
  `planned` added to the status vocabulary, the missing `Acceptance:` clauses,
  the four research markers. Where a finding turns out to be the rule being
  wrong, the rule is narrowed and the commit message says so. Depends on:
  T-SV-7. Acceptance: V-SV-1's green path. Verified by: `pnpm check:specs`.
- [ ] **T-SV-9 Wiring.** Result: `check:specs` and `check:specs:self-test` in
  the root `package.json`; `check-specs.mjs` appended to `check`; both fixture
  self-tests added to `verify` **before** the build, with `check-styles.mjs`
  left last. `turbo.json` deliberately unchanged — design §5. Depends on:
  T-SV-8. Acceptance: V-SV-15, V-SV-17. Verified by: `pnpm verify` on a clean
  clone, with the order of the summary lines recorded.
- [ ] **T-SV-10 Break-and-revert.** Result: six logged procedures, one per error
  rule, each reverted. Depends on: T-SV-9. Acceptance: V-SV-1, V-SV-2, V-SV-4.
  Verified by: the log in the PR.
- [ ] **T-SV-11 Paperwork.** Result: `changes/README.md` gains the row and `SV`
  in the child-code legend; `Q-OPS-6` and `Q-OPS-7` registered; `README.md`
  §Running it names the fourth checker. Depends on: T-SV-10.
