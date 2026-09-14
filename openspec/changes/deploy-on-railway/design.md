# Design: `deploy-on-railway`

Topology is parent [design §11](../railway-container-control/design.md) and
`D-OPS-1`. Deltas for the workspace only.

## 1. What Railway sees

`[observed]` `docs.railway.com/guides/monorepo`, 2026-09-14: shared monorepos
build from the root with a custom start command such as `pnpm --filter
<package> start`; watch paths are gitignore-style patterns; on import Railway
detects pnpm workspaces and proposes per-package commands.

`[to-verify]` (`Q-OPS-3`): whether the auto-detected build runs `pnpm
install` at the root and `next build` in the right package, and whether
`packageManager` is honoured. The first deploy answers both; the answer is
written into `Q-OPS-3` and, if it changes the commands below, into this file.

## 2. Commands

| Setting | Value |
|---|---|
| Root directory | unset — shared monorepo |
| Build | `pnpm turbo run build --filter=@repo/console` (runs `railway-client#check` first) |
| Start | `pnpm --filter @repo/console start` |
| Watch paths | `apps/console/**`, `packages/**`, `pnpm-lock.yaml`, `turbo.json`, `package.json` |
| Runtime | Node 22 — from `engines`; `[to-verify]` that Railpack reads it |

## 3. Variables on the console service

The six from parent design §3. `RAILWAY_TOKEN` is B's project token, entered
in the dashboard, never in a file. `V-54` searches the deploy log for its
first eight characters.
