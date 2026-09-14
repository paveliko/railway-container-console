# Proposal: `monorepo-workspace`

**Status:** proposed · **Capabilities:** `OPS` (shape of the build), touches
`API` and `UI` only by moving files · **Parent change:**
[`../railway-container-control/`](../railway-container-control/) — this change
replaces its T-2.1 and re-homes T-2.2, T-3.1 … T-3.3 and T-4.1, all of which
are already done as a single application.
**Blocked on the owner for:** `D-OPS-2` (the workspace shape) and `D-OPS-3`
(how packages are consumed), plus two placement questions, `Q-UI-5` and
`Q-SEC-5`. No file moves before those are signed.

## The problem

The parent change draws three layers — `railway/`, `container/`, the route
handlers — and states three rules about what may import what
([design §2](../railway-container-control/design.md)). Today those rules are
enforced by prose and by two grep checks (`V-40`, `V-41`). The module system
does not know them, and the code that was merged in PR #4 shows the
consequence:

- `[observed]` `src/railway/readContainer.ts` imports `ContainerView` from
  `../container/state`, and `src/container/state.ts` imports the two status
  enums from `../railway/types`. The two layers depend on each other. In one
  application nothing complains; the boundary exists only on the diagram.
- `[observed]` `src/railway/credential.ts` reads `CONSOLE_PASSPHRASE`, which
  is a console concern (`Q-SEC-4`), from inside the Railway layer.
- `[observed]` The `ContainerState` type, which the browser will render, lives
  in `src/container/state.ts` next to the derivation logic, so the future
  client bundle would import a server module to get a type.

None of this is a bug today. All of it becomes one the moment a second
developer, or the same developer six months later, adds a feature. The
brief's 30-minute slot on "how you would extend it" (R-6) is exactly that
moment.

## The approach

Make the layers packages, so that a boundary crossing is a build error rather
than a review comment. The smallest workspace that does this is three
packages and one application:

```
apps/console/               @repo/console         Next.js — the only deployable
packages/contracts/         @repo/contracts       what browser and server agree on
packages/container-core/    @repo/container-core  state, poller, verbs, the provider port
packages/railway-client/    @repo/railway-client  the only code that knows Railway
```

with one permitted direction of dependency:

```
contracts  ←  container-core  ←  railway-client
    ↑               ↑                  ↑
    └────────────── console ───────────┘
```

`container-core` declares a `ContainerProvider` port and `railway-client`
implements it. That is what breaks the cycle: the domain says what it needs to
read, the adapter supplies it. The domain's tests run against a fake provider
and never see GraphQL.

pnpm's isolated `node_modules` makes an undeclared import fail to resolve;
each package's `exports` map makes a deep import fail to resolve; Turborepo
runs `check`, `typecheck`, `test` and `build` in dependency order from the
root. No ESLint, no `dist/`, no codegen — see `D-OPS-3` and the rejected
alternatives in `D-OPS-2` for what was deliberately not added.

## Minimum versus optional

| | Minimum — this change | Optional — named, not built |
|---|---|---|
| Packages | `contracts`, `container-core`, `railway-client`; app `console` | `ui` (when a second screen exists), `eslint-config` (when there is a linter), `typescript-config` as a package (a root file does the job) |
| Boundary enforcement | pnpm strict resolution, `exports` maps, one root script that greps for the three rules | ESLint `no-restricted-imports`, `dependency-cruiser` |
| Package consumption | Just-in-Time: `exports` → `src/*.ts`, transpiled by Next.js and run from source by vitest (`D-OPS-3`) | compiled `dist/` with declarations and Turborepo build cache |
| Runtime validation | Zod schemas in `contracts` for the two shapes that cross HTTP (`ContainerState`, `ConsoleError`) | schemas for Railway's responses (the adapter passes enum strings through on purpose — `readContainer.ts`) |
| CI | one GitHub Actions workflow: install, `check`, `typecheck`, `test`, `build` | caching Turborepo remotely; matrix |

## Deliberately out of this change

| Left out | Why |
|---|---|
| The two verbs `up()` / `down()` | `Q-API-2`, owner — [`../container-verbs/`](../container-verbs/) |
| The runtime singleton, the four routes, SSE | [`../console-server/`](../console-server/) |
| The screen | [`../console-screen/`](../console-screen/) |
| Deploying the workspace on Railway | [`../deploy-on-railway/`](../deploy-on-railway/); the one open question it raises is registered here as `Q-OPS-3` |
| A `ui` package | no second consumer; recorded as set aside in `D-OPS-2` |

## What "done" means

Every line in [`verification.md`](verification.md) passes; every task in
[`tasks.md`](tasks.md) is checked; the parent change's `V-1 … V-12`,
`V-21 … V-38` still pass with the same test names; `V-40` and `V-41` pass in
their restated form. The parent's design §2 and §10 are amended to name
packages instead of folders.

## What this change asks the owner to decide before code

| Decision | Where | Default if unanswered |
|---|---|---|
| Workspace shape: three packages + one app | `D-OPS-2` | as proposed |
| Just-in-Time packages, not compiled | `D-OPS-3` | as proposed; the owner's original suggestion of `tsc` → `dist` is the recorded alternative |
| Where the two Railway status enums live | `Q-UI-5` | `@repo/contracts` |
| Who reads the environment | `Q-SEC-5` | `railway-client` reads `RAILWAY_*`; the app adds `CONSOLE_PASSPHRASE` |
| `exactOptionalPropertyTypes: true` | none needed — `[observed]` 2026-09-14: `tsc --noEmit --exactOptionalPropertyTypes` on `main` reports zero errors | turn it on in the base tsconfig |
