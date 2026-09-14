# Verification: `monorepo-workspace`

One criterion per line. Prefix `V-MW-N`; the parent's `V-N` are cited, not
renumbered. `build` runs at build or CI time; `unit` needs no network;
`manual` is a numbered procedure.

## The workspace builds and tests from a clean clone

- V-MW-1 `build` — On a clean clone with Node 22 and corepack, `pnpm install --frozen-lockfile && pnpm turbo run check typecheck test build` exits 0 with no `RAILWAY_*` variable set.
- V-MW-2 `unit` — The test run collects at least the 66 tests present on `main` after PR #4 (64 passing, 2 skipped), with the same test names; nothing is lost in the move (diff of `vitest --reporter=json` test titles before and after is empty).
- V-MW-3 `build` — `pnpm turbo run build --filter=@repo/console --dry-run=json` lists exactly `@repo/console#build` and `@repo/railway-client#check`; no package has a `build` task (`D-OPS-3`).
- V-MW-4 `build` — `git ls-files | grep -c package-lock.json` is 0 and `pnpm-lock.yaml` is tracked.

## Boundaries are enforced by the module system, not by prose

- V-MW-5 `unit` — `packages/container-core/package.json` declares no dependency on `@repo/railway-client`, `next`, `react` or `graphql`; adding `import '@repo/railway-client'` to any file in `container-core` makes `pnpm turbo run typecheck` fail with a module-resolution error (procedure: add, run, remove, run).
- V-MW-6 `unit` — `packages/contracts/package.json` declares `zod` and nothing else under `dependencies`.
- V-MW-7 `unit` — `import x from '@repo/railway-client/src/transport'` from `apps/console` fails typecheck: every package's `exports` map exposes `.` only (procedure as in V-MW-5).
- V-MW-8 `build` — `node scripts/check-boundaries.mjs` exits 0 on the tree; it exits non-zero when any of the three rules in design §6 is broken (three procedures: copy the host string into `apps/console`; add a `.graphql` file under `container-core`; add `../../packages/contracts/src/index` as an import — each fails, each reverted passes).
- V-MW-9 `build` — Restated `V-41`: `backboard.railway.com` occurs in exactly one source file, under `packages/railway-client/src/`; `wss://` occurs nowhere under `apps/` or `packages/`.
- V-MW-10 `build` — Restated `V-40` (first half): `.graphql` files and the token `mutation` inside a GraphQL document occur only under `packages/railway-client/`.

## The port replaces the cycle

- V-MW-11 `unit` — `packages/container-core/src/index.ts` exports `ContainerProvider`, `ContainerView`, `deriveContainerState`, `Poller`; `packages/railway-client/src/index.ts` exports `createRailwayProvider`, and `createRailwayProvider(...).read()` returns the same `ContainerView` that `readContainer(...)` returned before the move (same fixture, deep-equal).
- V-MW-12 `unit` — `Poller` is constructed in tests with a fake `ContainerProvider` whose `read` is a stub; no test under `container-core` imports from `@repo/railway-client` (grep).

## Contracts are checked at runtime, not cast

- V-MW-13 `unit` — For every frame in `openspec/_research/experiment-2026-09-14/*.jsonl`, `deriveContainerState(toContainerView(frame))` round-trips through `containerStateSchema.parse(JSON.parse(JSON.stringify(state)))` unchanged (extends `V-38`).
- V-MW-14 `unit` — `containerStateSchema.safeParse({ phase: 'running' })` fails; `consoleErrorSchema.safeParse({ error: 'transition-in-flight' })` succeeds and `{ error: 'oops' }` fails — the closed unions from parent §6 and §9 are closed at runtime too.
- V-MW-15 `unit` — `ContainerState` as imported in `apps/console` is `z.infer<typeof containerStateSchema>` — there is no second hand-written declaration of the union anywhere under `apps/` or `packages/` (grep for `phase: 'down'` in a `type` declaration outside `contracts` returns nothing).

## Configuration

- V-MW-16 `unit` — With `RAILWAY_TOKEN_KIND=project`, `credentialFromEnv` returns `{ kind: 'project', token }` and `headersFor` yields `Project-Access-Token` only — parent `V-1 … V-4` pass unchanged against the split functions (`Q-SEC-5` default).
- V-MW-17 `unit` — `apps/console/src/server/config.ts` is the only file that reads `CONSOLE_PASSPHRASE` (grep).
- V-MW-18 `build` — `tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` to `true`, and `pnpm turbo run typecheck` passes.

## CI

- V-MW-19 `manual` — A pull request to `main` runs the workflow in design §7 and shows it green with the live test reported as skipped, not failed.
- V-MW-20 `manual` — `pnpm dev` from the root starts Next.js at `apps/console`, serves the placeholder page, and an edit to `packages/contracts/src/container-state.ts` is picked up without restarting (Just-in-Time, `D-OPS-3`).

## Parent criteria that must still pass, unchanged

`V-1 … V-12` (credential, transport, errors), `V-21` (live, skipped without a
token), `V-22 … V-26a` (poller), `V-27 … V-38` (derivation), `V-39` (the
operations gate, now `packages/railway-client/scripts/check-operations.ts`).
