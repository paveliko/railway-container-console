# Tasks: `monorepo-workspace`

Ordered. Prefix `T-MW-N`. `V-MW-N` is in [`verification.md`](verification.md);
plain `V-N` is the parent's. `[x]` done · `[ ]` not started · `[~]` blocked, on
whom is stated.

## T-MW-0 · Decisions

- [x] **T-MW-0.1 Sign `D-OPS-2` and `D-OPS-3`.** *Owner.* **Done 2026-09-14.** Both are `ratified` in `decisions.md`, each with the owner's amendment recorded in place: `D-OPS-2` adds `@repo/ui` as a fourth package (against the proposed text's recommendation to set it aside) and keeps `typescript-config` / `eslint-config` uncreated; `D-OPS-3` replaces the "pnpm already proves isolation" argument with a per-package `typecheck`, and restates the `dist/` alternative as *when a consumer needs ready-made JavaScript*. The rejected alternatives of both are preserved.
- [~] **T-MW-0.2 Answer `Q-UI-5` and `Q-SEC-5`.** *Owner — still open.* Not answered in the ratification message. The implementation applies each question's registered default and marks it at the point of use: enums in `@repo/contracts`; `railway-client` exports `credentialFromEnv` / `targetFromEnv`, `apps/console/src/server/config.ts` composes `Config` and owns `CONSOLE_PASSPHRASE`. Neither default changes observable behaviour. Reversing either is described in `proposal.md` → *What is still open*.

## T-MW-1 · Workspace skeleton

- [x] **T-MW-1.1 Root files.** Result: `pnpm-workspace.yaml`, `turbo.json` exactly as design §5, root `package.json` with `packageManager: pnpm@10.33.2`, `engines.node >= 22`, scripts delegating to turbo; `tsconfig.base.json` per design §4; `package-lock.json` removed; `pnpm-lock.yaml` committed. Depends on: T-MW-0.1. Acceptance: V-MW-4, V-MW-18, V-MW-3. Verified by: `pnpm install --frozen-lockfile`.
- [x] **T-MW-1.2 Empty packages.** Result: `packages/{contracts,container-core,railway-client,ui}` and `apps/console`, each with `package.json` (`private`, `type: module`, an `exports` map, workspace deps as `workspace:*` per design §2), a `tsconfig.json` extending the base, a `typecheck` script, an `src/index.ts`, a short `README.md`. Depends on: T-MW-1.1. Acceptance: V-MW-21, V-MW-22; `pnpm turbo run typecheck` passes on the empty tree. Verified by: the run.

## T-MW-2 · Move, keeping history

- [x] **T-MW-2.1 Contracts.** Result: the `ContainerState` union and `DownReason` out of `src/container/state.ts` into `packages/contracts/src/container-state.ts` as a Zod schema; `console-error.ts` with the shape from parent §9; `railway-enums.ts` from `src/railway/types.ts` (`Q-UI-5` default, excerpt cited); `index.ts` re-exporting types and schemas. Depends on: T-MW-1.2. Acceptance: V-MW-6, V-MW-14, V-MW-15. Verified by: `pnpm turbo run test --filter=@repo/contracts`.
- [x] **T-MW-2.2 Container core.** Result: `git mv src/container/{state,poller}{,.test}.ts` into `packages/container-core/src/`; `provider.ts` with `ContainerProvider { read() }`; `Poller` takes a provider; enums imported from `@repo/contracts`; the fixture path resolved from the module, not the cwd. Depends on: T-MW-2.1. Acceptance: V-MW-5, V-MW-11, V-MW-12; parent V-22 … V-38 unchanged. Verified by: `pnpm turbo run test --filter=@repo/container-core`.
- [x] **T-MW-2.3 Railway client.** Result: `git mv` of `src/railway/*` into `packages/railway-client/src/` and `operations/`; `readContainer.ts` → `read-container.ts` + `provider.ts` (`createRailwayProvider`); `credential.ts` split per `Q-SEC-5`'s default; `scripts/check-operations.ts` moved with module-relative paths and wired as the package's `check` script; `live.test.ts` finding `.env.local` at the repository root and exposed as `test:live`, uncached and out of CI. Depends on: T-MW-2.2. Acceptance: V-MW-9, V-MW-10, V-MW-11, V-MW-16, V-MW-23; parent V-1 … V-12, V-21, V-39 unchanged. Verified by: `pnpm turbo run check test --filter=@repo/railway-client`.
- [x] **T-MW-2.4 UI package.** Result: `packages/ui` with `tokens.ts` (colour, type scale, spacing) and `Button`, `Badge`, `Card`, `Spinner` as plain function components; `react` as a peer dependency; no workspace dependency of any kind; a test per component under `jsdom`. Depends on: T-MW-1.2. Acceptance: V-MW-21, V-MW-22, V-MW-24. Verified by: `pnpm turbo run test --filter=@repo/ui`.
- [x] **T-MW-2.5 Console app.** Result: `git mv app/ next.config.ts` into `apps/console/`; `transpilePackages` set for all four packages; `src/server/config.ts` composing `Config` (credential + target + passphrase); `.env.example` unchanged at the root. Depends on: T-MW-2.3, T-MW-2.4. Acceptance: V-MW-1 (build), V-MW-17, V-MW-20. Verified by: `pnpm turbo run build` and `pnpm dev`.

## T-MW-3 · Enforcement and CI

- [x] **T-MW-3.1 Boundary script.** Result: `scripts/check-boundaries.mjs` implementing design §6 — eight rules; writing the break-and-revert procedure turned up a gap `tsc` leaves open (a side-effect import of an undeclared package raises no error) and rules 7 and 8 close it — run by the root `check` script. Depends on: T-MW-2.5. Acceptance: V-MW-7, V-MW-8, V-MW-22, V-MW-25. Verified by: the break-and-revert procedures, logged in the PR.
- [x] **T-MW-3.2 Fixture round-trip test.** Result: a test in `container-core` that runs every deployment-shaped frame of the recorded experiment through derive → JSON → `containerStateSchema.parse`. Depends on: T-MW-2.2. Acceptance: V-MW-13. Verified by: `pnpm test`.
- [x] **T-MW-3.3 One local gate.** Result: a root `verify` script running the operations gate, the boundary rules, `typecheck`, `test` and `build`; `globalDependencies` and `$TURBO_ROOT$` inputs so that `tsconfig.base.json` and the schema excerpt actually invalidate the tasks that read them; **no `.github/` directory** — design §7 records why the workflow was written and then removed. Depends on: T-MW-3.1. Acceptance: V-MW-23, V-MW-27; V-MW-2 (test titles before/after compared in the PR description), V-MW-19, V-MW-26. Verified by: `pnpm verify` on a clean clone, and the hash comparisons in V-MW-27.

## T-MW-4 · Paperwork

- [x] **T-MW-4.1 Amend the parent and the siblings.** Result: parent `design.md` §2 and §10 and `verification.md` V-40 / V-41 per design §8; parent `tasks.md` T-2.1 marked superseded by this change; `console-screen` reconciled with `@repo/ui` existing; `changes/README.md` updated; root `README.md` "How the repository is organised" and "Running it" updated to `pnpm`. Depends on: T-MW-3.3. Acceptance: no reference to `src/railway/` or `src/container/` at the root remains in the parent's design except in the history note; no document still says there is no `ui` package. Verified by: grep.
- [x] **T-MW-4.2 Archive.** Result: this folder moved to `openspec/changes/archive/2026-09-15-monorepo-workspace/`. Depends on: T-MW-4.1. Done 2026-09-15: the PR is merged and the owner asked for it. The move waited on `spec-validation` `T-SV-12`, which closed `Q-OPS-6` — until then `check-specs.mjs` would have reported `archive/` as a change missing all four of its files.

## Done

T-MW-1 … T-MW-4.1 landed on `codex/monorepo-workspace`. Nothing in the change
touched Railway: the only network call it contains is the live test, which is
not in `test`, not in CI, and skips without credentials.

T-MW-4.2 (archive) waited on the PR being merged; it was merged, and this
folder was archived 2026-09-15. T-MW-0.2 still waits on the owner — archiving
the change does not close a row that was always the owner's, and leaving it
open here is the point of `R-TRACE` still running inside `archive/`.
