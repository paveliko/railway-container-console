# Verification: `monorepo-workspace`

One criterion per line. Prefix `V-MW-N`; the parent's `V-N` are cited, not
renumbered. `build` runs at build or CI time; `unit` needs no network;
`manual` is a numbered procedure.

## The workspace builds and tests from a clean clone

- V-MW-1 `build` — On a clean clone with Node 22 and corepack, `pnpm install --frozen-lockfile && pnpm turbo run check typecheck test build` exits 0 with no `RAILWAY_*` variable set.
- V-MW-2 `unit` — The test run collects at least the 65 tests present on `main` after PR #4 (64 unit + 1 live, which skips), with the same test names; nothing is lost in the move (diff of the test titles before and after is empty).
- V-MW-3 `build` — `pnpm turbo run build --filter=@repo/console --dry-run=json` lists exactly `@repo/console#build` and `@repo/railway-client#check`; no package has a `build` task (`D-OPS-3`).
- V-MW-4 `build` — `git ls-files | grep -c package-lock.json` is 0 and `pnpm-lock.yaml` is tracked.
- V-MW-26 `build` — Every workspace package and the app declares a `typecheck` script, and `pnpm turbo run typecheck` runs one task per package (`D-OPS-3` as amended: pnpm's resolution is not a type check).

## Boundaries are enforced by the module system, not by prose

- V-MW-5 `unit` — `packages/container-core/package.json` declares no dependency on `@repo/railway-client`, `next`, `react` or `graphql`; adding `import '@repo/railway-client'` to any file in `container-core` makes `pnpm turbo run typecheck` fail with a module-resolution error (procedure: add, run, remove, run).
- V-MW-6 `unit` — `packages/contracts/package.json` declares `zod` and nothing else under `dependencies`.
- V-MW-7 `unit` — `import x from '@repo/railway-client/src/transport'` from `apps/console` fails typecheck: every package's `exports` map exposes `.` only (procedure as in V-MW-5).
- V-MW-8 `build` — `node scripts/check-boundaries.mjs` exits 0 on the tree; it exits non-zero when any rule in design §6 is broken (procedures: copy the host string into `apps/console`; add a `.graphql` file under `container-core`; add `../../packages/contracts/src/index` as an import — each fails, each reverted passes).
- V-MW-9 `build` — Restated `V-41`: `backboard.railway.com` occurs in exactly one source file, under `packages/railway-client/src/`; `wss://` occurs nowhere under `apps/` or `packages/`.
- V-MW-10 `build` — Restated `V-40` (first half): `.graphql` files and the token `mutation` inside a GraphQL document occur only under `packages/railway-client/`.

## The presentation package knows nothing about the product

- V-MW-21 `unit` — `packages/ui/package.json` declares `react` as a peer dependency and lists **no** `@repo/*` dependency of any kind.
- V-MW-22 `build` — No file under `packages/ui/` contains the substring `@repo/`, `backboard`, `fetch(`, `/api/`, or the word `container` (design §6 rule 5); adding `import '@repo/contracts'` to a `ui` component makes `node scripts/check-boundaries.mjs` exit non-zero (break-and-revert).
- V-MW-24 `unit` — `Button`, `Badge`, `Card` and `Spinner` each render under `jsdom` from props alone, with no provider and no context; `Button` forwards `onClick` and honours `disabled`.
- V-MW-25 `build` — Design §6 rule 4: no file under `apps/console/src/features/`, no file carrying `'use client'`, and nothing under `packages/ui/` imports `@repo/container-core` or `@repo/railway-client`; adding such an import to a `'use client'` file makes the boundary script exit non-zero (break-and-revert). This is the static half of parent `V-15`, whose bundle half `console-screen` adds after `next build`.

## The port replaces the cycle

- V-MW-11 `unit` — `packages/container-core/src/index.ts` exports `ContainerProvider`, `ContainerView`, `deriveContainerState`, `Poller`; `packages/railway-client/src/index.ts` exports `createRailwayProvider`, and `createRailwayProvider(...).read()` returns the same `ContainerView` that `readContainer(...)` returned before the move (same fixture, deep-equal).
- V-MW-12 `unit` — `Poller` is constructed in tests with a fake `ContainerProvider` whose `read` is a stub; no test under `container-core` imports from `@repo/railway-client` (grep).

## Contracts are checked at runtime, not cast

- V-MW-13 `unit` — For every deployment-shaped frame in `openspec/_research/experiment-2026-09-14/*.jsonl` — the `poll-old` and `poll-new` frames, and the `http` frames whose body carries `data.deployment` — `deriveContainerState(view)` round-trips through `containerStateSchema.parse(JSON.parse(JSON.stringify(state)))` unchanged (extends `V-38`). Frames of other kinds (`ack`, `ws`, `ACTION`, `END`, mutation results) carry no deployment and are skipped by an explicit filter, not by a `try`.
- V-MW-14 `unit` — `containerStateSchema.safeParse({ phase: 'running' })` fails; `consoleErrorSchema.safeParse({ error: 'transition-in-flight' })` succeeds and `{ error: 'oops' }` fails — the closed unions from parent §6 and §9 are closed at runtime too.
- V-MW-15 `unit` — `ContainerState` as imported in `apps/console` is `z.infer<typeof containerStateSchema>` — there is no second hand-written declaration of the union anywhere under `apps/` or `packages/` (grep for `phase: 'down'` in a `type` declaration outside `contracts` returns nothing).

## Configuration

- V-MW-16 `unit` — With `RAILWAY_TOKEN_KIND=project`, `credentialFromEnv` returns `{ kind: 'project', token }` and `headersFor` yields `Project-Access-Token` only — parent `V-1 … V-4` pass unchanged against the split functions (`Q-SEC-5` default).
- V-MW-17 `unit` — `apps/console/src/server/config.ts` is the only file that reads `CONSOLE_PASSPHRASE` (grep).
- V-MW-18 `build` — `tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` to `true`, and `pnpm turbo run typecheck` passes.

## CI, and the one task that talks to Railway

- V-MW-19 `manual` — A pull request to `main` runs the workflow in design §7 and shows it green, with no repository secret referenced anywhere in the workflow file.
- V-MW-23 `build` — `test:live` is declared `"cache": false` in `turbo.json`, is not referenced by any root `package.json` script, and does not appear in `.github/workflows/ci.yml`; running it without `RAILWAY_*` set reports the live test as skipped, not failed (parent `V-21`).
- V-MW-20 `manual` — `pnpm dev` from the root starts Next.js at `apps/console`, serves the placeholder page, and an edit to `packages/contracts/src/container-state.ts` is picked up without restarting (Just-in-Time, `D-OPS-3`).

## Parent criteria that must still pass, unchanged

`V-1 … V-12` (credential, transport, errors), `V-21` (live, skipped without a
token), `V-22 … V-26a` (poller), `V-27 … V-38` (derivation), `V-39` (the
operations gate, now `packages/railway-client/scripts/check-operations.ts`).
