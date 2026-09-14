# Tasks: `monorepo-workspace`

Ordered. Prefix `T-MW-N`. `V-MW-N` is in [`verification.md`](verification.md);
plain `V-N` is the parent's. `[~]` is blocked, on whom is stated.

## T-MW-0 · Decisions — blocked on the owner

- [~] **T-MW-0.1 Sign `D-OPS-2` and `D-OPS-3`.** *Owner.* Result: both moved from `proposed`, or amended. Acceptance: `decisions.md` shows their status. Nothing below starts before this.
- [~] **T-MW-0.2 Answer `Q-UI-5` and `Q-SEC-5`.** *Owner.* Defaults if unanswered: enums in `@repo/contracts`; `railway-client` reads `RAILWAY_*`, the app reads `CONSOLE_PASSPHRASE`.

## T-MW-1 · Workspace skeleton

- [ ] **T-MW-1.1 Root files.** Result: `pnpm-workspace.yaml`, `turbo.json` exactly as design §5, root `package.json` with `packageManager: pnpm@10.33.2`, `engines.node >= 22`, scripts delegating to turbo; `tsconfig.base.json` per design §4; `package-lock.json` removed; `pnpm-lock.yaml` committed. Depends on: T-MW-0.1. Acceptance: V-MW-4, V-MW-18. Verified by: `pnpm install --frozen-lockfile`.
- [ ] **T-MW-1.2 Empty packages.** Result: `packages/{contracts,container-core,railway-client}` and `apps/console`, each with `package.json` (`private`, `type: module`, `exports: { ".": "./src/index.ts" }`, declared workspace deps per design §2), `tsconfig.json` extending the base, an empty `src/index.ts`, a five-line `README.md`. Depends on: T-MW-1.1. Acceptance: `pnpm turbo run typecheck` passes on the empty tree. Verified by: the run.

## T-MW-2 · Move, keeping history

- [ ] **T-MW-2.1 Contracts.** Result: `git mv` of the `ContainerState` union out of `src/container/state.ts` into `packages/contracts/src/container-state.ts` as a Zod schema; `console-error.ts` with the shape from parent §9; `railway-enums.ts` from `src/railway/types.ts` (per T-MW-0.2); `index.ts` re-exporting types and schemas. Depends on: T-MW-1.2. Acceptance: V-MW-6, V-MW-14, V-MW-15. Verified by: `pnpm turbo run test --filter=@repo/contracts`.
- [ ] **T-MW-2.2 Container core.** Result: `git mv src/container/{state,poller}{,.test}.ts` into `packages/container-core/src/`; `provider.ts` with `ContainerProvider { read() }`; `Poller` takes a provider; enums imported from `@repo/contracts`. Depends on: T-MW-2.1. Acceptance: V-MW-5, V-MW-11, V-MW-12; parent V-22 … V-38 unchanged. Verified by: `pnpm turbo run test --filter=@repo/container-core`.
- [ ] **T-MW-2.3 Railway client.** Result: `git mv` of `src/railway/*` into `packages/railway-client/src/` and `operations/`; `readContainer.ts` → `read-container.ts` + `provider.ts` (`createRailwayProvider`); `credential.ts` split per T-MW-0.2; `scripts/check-operations.ts` moved with package-relative paths and wired as the package's `check` script; `live.test.ts` resolving `.env.local` at the repository root. Depends on: T-MW-2.2. Acceptance: V-MW-9, V-MW-10, V-MW-11, V-MW-16; parent V-1 … V-12, V-21, V-39 unchanged. Verified by: `pnpm turbo run check test --filter=@repo/railway-client`.
- [ ] **T-MW-2.4 Console app.** Result: `git mv app/ next.config.ts` into `apps/console/`; `transpilePackages` set; `src/server/config.ts` composing `Config` (credential + target + passphrase); `.env.example` unchanged at the root. Depends on: T-MW-2.3. Acceptance: V-MW-1 (build), V-MW-17, V-MW-20. Verified by: `pnpm turbo run build` and `pnpm dev`.

## T-MW-3 · Enforcement and CI

- [ ] **T-MW-3.1 Boundary script.** Result: `scripts/check-boundaries.mjs` implementing design §6, run by the root `check` script. Depends on: T-MW-2.4. Acceptance: V-MW-7, V-MW-8. Verified by: the three break-and-revert procedures, logged in the PR.
- [ ] **T-MW-3.2 Fixture round-trip test.** Result: a test in `container-core` (or `railway-client`, whichever owns `toContainerView` fixtures) that runs every experiment frame through derive → JSON → `containerStateSchema.parse`. Depends on: T-MW-2.3. Acceptance: V-MW-13. Verified by: `pnpm test`.
- [ ] **T-MW-3.3 CI.** Result: `.github/workflows/ci.yml` per design §7. Depends on: T-MW-3.1. Acceptance: V-MW-19; V-MW-2 (test titles before/after compared in the PR description). Verified by: the green run on the PR.

## T-MW-4 · Paperwork

- [ ] **T-MW-4.1 Amend the parent.** Result: parent `design.md` §2 and §10 and `verification.md` V-40 / V-41 per design §8; parent `tasks.md` T-2.1 marked superseded by this change; root `README.md` "How the repository is organised" and "Running it" updated to `pnpm`. Depends on: T-MW-3.3. Acceptance: no reference to `src/railway/` or `src/container/` at the root remains in the parent's design except in the history note. Verified by: grep.
- [ ] **T-MW-4.2 Archive.** Result: this folder moved to `openspec/changes/archive/<date>-monorepo-workspace/`. Depends on: T-MW-4.1.

## Ready to start once T-MW-0 is signed

All of T-MW-1 … T-MW-3, in order. Nothing here touches Railway; the only
network call in the whole change is the live test, which skips.
