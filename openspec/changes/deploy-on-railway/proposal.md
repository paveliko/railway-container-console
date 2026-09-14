# Proposal: `deploy-on-railway`

**Status:** proposed · **Capabilities:** `OPS`, `SEC` · **Parent change:**
[`../railway-container-control/`](../railway-container-control/), tasks
T-7.1 … T-7.3. **Requirement served:** R-5.
**Blocked on the owner for:** the account usage limit (parent T-2.3, `V-56`),
creating project B's target and project A's console service (`D-OPS-1`), and
the passphrase (`Q-SEC-4`). Blocked on every other change landing.

## The problem

`D-OPS-1` fixes the topology — console in project A, target in project B,
a project token scoped to B — but was written for a single application. The
workspace changes how Railway builds the console: it is a *shared* monorepo
in Railway's terms, built from the root so `apps/console` sees its three
packages, with a start command that names the app. How exactly Railway detects
and runs that is `Q-OPS-3`, `[to-verify]` until the first deploy.

## The approach

- **Config as code.** A `railway.json` at the repository root (or the
  console's service settings, if the file cannot express it — `[to-verify]`)
  with the build command `pnpm turbo run build --filter=@repo/console`, the
  start command `pnpm --filter @repo/console start`, and watch paths
  `apps/console/**`, `packages/**`, `pnpm-lock.yaml`, `turbo.json`.
- **Target first.** The experiment's service `target` (`nginx:alpine`, left
  stopped) becomes project B's target, or a fresh one is created — owner's
  choice; serverless off, one replica, restart on failure.
- **Console second.** Project A, the six variables from parent design §3, a
  public domain, no passphrase unless `Q-SEC-4` says so.
- **Manual checks last.** `V-50`, `V-51` performed against the deployed URL,
  cycling the target once; `V-52 … V-56` per their procedures.

## Deliberately out

| Left out | Why |
|---|---|
| Custom domain, preview environments, PR deploys | not asked; each is a Railway setting, not code |
| A second Railway environment for the console | one demo |

## What "done" means

Parent `V-50 … V-56` pass; [`verification.md`](verification.md) `V-DR-N`
pass; `Q-OPS-3` closed with what was observed.
