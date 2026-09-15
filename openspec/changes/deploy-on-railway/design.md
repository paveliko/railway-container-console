# Design: `deploy-on-railway`

Topology is parent [design §11](../railway-container-control/design.md) and
`D-OPS-1`. Deltas for the workspace only.

## 1. What Railway sees

`[observed]` `docs.railway.com/guides/monorepo`, 2026-09-14: shared monorepos
build from the root with a custom start command such as `pnpm --filter
<package> start`; watch paths are gitignore-style patterns; on import Railway
detects pnpm workspaces and proposes per-package commands.

`[to-verify]` (`Q-OPS-3`): whether the auto-detected build runs `pnpm
install` at the root and `vite build` in the right package, and whether
`packageManager` is honoured. The first deploy answers both; the answer is
written into `Q-OPS-3` and, if it changes the commands below, into this file.
*(Read `next build` until 2026-09-15: Next.js was removed by `D-UI-5` and
`D-OPS-4`, and the console now builds with Vite and starts under `tsx`.)*

### How a setting reaches Railway, as of 2026-09-15

`[observed]` `docs.railway.com/config-as-code`, read 2026-09-15: *"Config as
Code is deprecated. Prefer Infrastructure as Code (`.railway/railway.ts`)."* ·
**"New services cannot opt into Config as Code."** · existing `railway.json` /
`railway.toml` files keep working **for services that already use them** until
**2026-12-01 (hard cutoff)**.

`[observed]` `railway.com/railway.schema.json` (301 → `backboard.railway.app`),
read 2026-09-15 — the whole of what the deprecated file could ever say:
`build.builder`, `build.buildCommand`, `build.watchPatterns`,
`build.dockerfilePath`, `build.nixpacksConfigPath`, `build.nixpacksPlan`,
`build.nixpacksVersion`, `build.railpackVersion`; `deploy.startCommand`,
`deploy.preDeployCommand`, `deploy.preDeployTimeoutSeconds`,
`deploy.numReplicas`, `deploy.healthcheckPath`, `deploy.healthcheckTimeout`,
`deploy.sleepApplication`, `deploy.runtime`, `deploy.registryCredentials`,
`deploy.restartPolicyType` (`ON_FAILURE` | `ALWAYS` | `NEVER`),
`deploy.restartPolicyMaxRetries`, `deploy.cronSchedule`, `deploy.region`,
`deploy.multiRegionConfig`, `deploy.limitOverride`, `deploy.requiredMountPath`,
`deploy.overlapSeconds`, `deploy.drainingSeconds`, `deploy.ipv6EgressEnabled`;
plus `environments.<name>` overriding either block. **There is no key for the
root directory and none for environment variables.**

`[observed]` `docs.railway.com/infrastructure-as-code` and its reference, read
2026-09-15: `.railway/railway.ts` — TypeScript generally available, Python and
Go in beta — imports `defineRailway, project, service, github, image, …` from
`railway/iac`, needs `npm install railway` and the Railway CLI, and is
**applied by the owner through `railway config plan` / `apply`** rather than
read out of the repository at deploy time. `service()` takes `source` (with
`rootDirectory`), `build`, `start`, `preDeploy`, `healthcheck`,
`healthcheckTimeout`, `replicas`, `env`, `domains`, `volumeMounts`. A service
cannot be managed by both systems at once.

`[to-verify]`: the IaC reference read today shows **no** option for watch
patterns and none for a restart policy. Whether they are absent, undocumented,
or dashboard-only is unresolved and is part of `Q-OPS-8`.

**What this repository is on.** There is no `railway.json` here, and nothing in
this corpus records a service of this project as using one. What the experiment
established (2026-09-14) is that the service `target` exists — an
`nginx:alpine` image created through the API, with no repository attached and
so nothing to read a config file from; it is left stopped. Nothing is claimed
here about what other services do or do not exist; the console service is
`[to-verify]`, visible only in the dashboard. On that evidence the deprecated
file is **not a candidate for the console**, and its 2026-12-01 cutoff does not
bind this project. The live choice is `.railway/railway.ts` against dashboard
settings, which is `Q-OPS-8` and is the owner's.

## 2. Commands

| Setting | Value | `.railway/railway.ts` | Dashboard | Deprecated `railway.json` |
|---|---|---|---|---|
| Root directory | unset — shared monorepo | `source: github(repo)` with no `rootDirectory` | Root Directory, left empty | **no key** |
| Build | `pnpm turbo run build --filter=@repo/console` (runs `railway-client#check` first) | `build` | Build Command | `build.buildCommand` |
| Start | `pnpm --filter @repo/console start` | `start` | Start Command | `deploy.startCommand` |
| Watch paths | `apps/console/**`, `packages/**`, `pnpm-lock.yaml`, `turbo.json`, `package.json` | **`[to-verify]`** — no option in the reference read 2026-09-15 | Watch Paths | `build.watchPatterns` |
| Restart on failure | `ON_FAILURE` | **`[to-verify]`** — no option in the reference read 2026-09-15 | Restart Policy | `deploy.restartPolicyType` |
| Runtime | Node 22 — from `engines`; `[to-verify]` that Railpack reads it | not a key either way — read from `engines` | — | no key |
| The six variables (§3) | see §3 | `env` | Variables | **no key** |

Read the last column as history, not as an option: §1 records that the
deprecated file is closed to this service. Two rows — the root directory and
the variables — could never have lived in it on any path, which is the flat
answer to whether "config as code" could ever have carried this design: no, not
all of it.

Whichever mechanism `Q-OPS-8` picks, the **passphrase value** is not in it.
`D-SEC-2` puts `CONSOLE_PASSPHRASE` on the service and its value in the message
that carries the demo link; `env` in an IaC file would commit it to a public
repository, so that one variable is entered in the dashboard even if the rest
are not. `railway/iac`'s `preserve()` exists for exactly this and is the shape
to use if IaC wins.

## 3. Variables on the console service

The six from parent design §3. `RAILWAY_TOKEN` is B's project token, entered
in the dashboard, never in a file. `V-54` searches the deploy log for its
first eight characters.
