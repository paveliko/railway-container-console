# Design: `monorepo-workspace`

Rests on `D-OPS-2` (workspace shape) and `D-OPS-3` (Just-in-Time packages) in
[`../../decisions.md`](../../decisions.md), both **ratified 2026-09-14** with
the owner's amendments — four packages including `@repo/ui`, and a per-package
`typecheck` in place of the "pnpm proves isolation" argument. Everything about
what the console *does* is unchanged and lives in the parent change's
[`design.md`](../railway-container-control/design.md); this document only says
where each piece lives and what it may see.

## 1. Layout

```
.
├── apps/
│   └── console/                       @repo/console — Next.js, the only deployable
│       ├── app/                       layout.tsx, page.tsx, api/container/*/route.ts   (routes: console-server)
│       ├── src/
│       │   ├── features/container-control/   components/ hooks/ api/                (console-screen)
│       │   └── server/                config.ts (Config from env), runtime.ts        (console-server)
│       ├── next.config.ts             transpilePackages: the four @repo/* packages
│       ├── package.json               depends on all four packages
│       └── tsconfig.json              extends ../../tsconfig.base.json; jsx, DOM lib, next plugin
├── packages/
│   ├── contracts/                     @repo/contracts
│   │   └── src/  index.ts · container-state.ts · console-error.ts · railway-enums.ts (Q-UI-5)
│   ├── container-core/                @repo/container-core
│   │   └── src/  index.ts · provider.ts · state.ts · poller.ts · actions.ts (container-verbs)
│   ├── railway-client/                @repo/railway-client
│   │   ├── src/  index.ts · credential.ts · transport.ts · errors.ts · documents.ts · read-container.ts · provider.ts
│   │   ├── operations/*.graphql       the documents, validated against the excerpt
│   │   └── scripts/check-operations.ts
│   └── ui/                            @repo/ui — react and nothing else
│       └── src/  index.ts · tokens.ts · Button.tsx · Badge.tsx · Card.tsx · Spinner.tsx
├── scripts/check-boundaries.mjs       the rules of §6, as a script
├── openspec/                          unchanged
├── .github/workflows/ci.yml
├── package.json                       private; packageManager; scripts delegate to turbo
├── pnpm-workspace.yaml                apps/* · packages/*
├── turbo.json
└── tsconfig.base.json                 strict · noUncheckedIndexedAccess · exactOptionalPropertyTypes
```

Every package has its own `package.json` with `"private": true`, `"type":
"module"`, an `exports` map, and a `tsconfig.json` that extends the root base.
Workspace dependencies are declared as `workspace:*`. `README.md` at the root
stays the reviewer's entry point; each package gets a short `README.md` saying
what it is and what it must not know.

## 2. Who may know what

| Package | Owns | Depends on | Must not know |
|---|---|---|---|
| `@repo/contracts` | `ContainerState`, `DownReason`, `ConsoleError` (parent §9), the SSE event = `ContainerState`; Zod schemas and the types inferred from them; the two Railway status enums (`Q-UI-5` default) | `zod` | React, Next.js, Railway's endpoint, tokens, `ContainerView` |
| `@repo/container-core` | `ContainerView` / `DeploymentView`, `deriveContainerState`, `isTerminal`, `sameState`, `Poller`, the `ContainerProvider` port; later `up()` / `down()` / `inFlight()` | `@repo/contracts` | HTTP, GraphQL, `fetch`, React, Next.js, any `@repo/railway-client` symbol |
| `@repo/railway-client` | `Credential`, `headersFor`, `credentialFromEnv`, `targetFromEnv`, `execute`, `classify`, `RailwayRequestError`, `parseBudget`, the operation documents, `readContainer`, `createRailwayProvider` | `@repo/container-core` (the port and `ContainerView`), `@repo/contracts` (enums), `graphql` (dev, for the gate) | React, Next.js, the console's routes, `CONSOLE_PASSPHRASE` |
| `@repo/ui` | `Button`, `Badge`, `Card`, `Spinner`, the colour and type tokens | `react` (peer) | Railway, `@repo/contracts`, `@repo/container-core`, `fetch`, any route path, the word *container* |
| `@repo/console` | `Config`, the runtime singleton, the four routes, the screen, `features/container-control/` | all four packages, `next`, `react` | — |

The last column is what `scripts/check-boundaries.mjs` and the `exports` maps
enforce; the "depends on" column is what each `package.json` declares and
pnpm enforces; that each package still *compiles* is what its own `typecheck`
task proves (`D-OPS-3`, as amended).

### Why `ui` is a package and not a folder

A folder inside `apps/console` would hold the same files and cost less. What
it would not do is stop a `Button` from importing `@repo/contracts`, reading
`ContainerState`, or calling `/api/container/up` — and the day one of them
does, the primitive is no longer a primitive and the second screen inherits
the coupling. As a package, `ui`'s `package.json` simply does not list
anything it must not know, and the import fails to resolve. The rule is
mechanical, so it survives review fatigue.

`ui` starts with four components because those are the four the screen in
[`../console-screen/`](../console-screen/) actually renders. It grows by the
same test: a component moves into `ui` when a **second** caller needs it and
it does not know the product. Nothing is added speculatively.

## 3. The port — why the arrow points from `railway-client` to `container-core`

```ts
// packages/container-core/src/provider.ts
export interface ContainerProvider {
  read(): Promise<ContainerView>;
  // up/down verbs are added by container-verbs once Q-API-2 is signed
}
```

```ts
// packages/railway-client/src/provider.ts
export function createRailwayProvider(
  credential: Credential, target: Target, fetchImpl?: typeof fetch,
): ContainerProvider;
```

Today `readContainer.ts:4` in the Railway layer imports `ContainerView` from
the container layer, and `state.ts:16` in the container layer imports the
enums from the Railway layer — a cycle. The port resolves it in the direction
that keeps the domain testable without Railway: the domain owns the shape it
reads (`ContainerView`) and the vocabulary it renders (the enums, via
`contracts`); the adapter depends on both and produces them. `Poller` takes a
`read` function already; it takes `provider.read` and nothing changes inside
it.

**Rejected:** `railway-client` returning its own `ServiceInstanceView` and the
app mapping it to `ContainerView`. That puts the one mapping that must be
correct into the deployable, which is the package with the fewest tests.

## 4. What moves where

Every move is a `git mv`, so the history of the tested modules survives the
change. Test files move with their modules.

| Today (`main`, after PR #4) | Becomes | Note |
|---|---|---|
| `src/container/state.ts` — the `ContainerState` union and `DownReason` | `packages/contracts/src/container-state.ts` | now a Zod schema with the type inferred; the discriminant is `phase` |
| `src/container/state.ts` — `ContainerView`, `DeploymentView`, `deriveContainerState`, `isTerminal`, `sameState` | `packages/container-core/src/state.ts` | logic untouched; `state.test.ts` follows |
| `src/container/poller.ts` | `packages/container-core/src/poller.ts` | untouched; `poller.test.ts` follows |
| `src/railway/types.ts` | `packages/contracts/src/railway-enums.ts` | `Q-UI-5` default; the file cites the excerpt |
| `src/railway/credential.ts` | `packages/railway-client/src/credential.ts` | `fromEnv` splits into `credentialFromEnv` + `targetFromEnv` (`Q-SEC-5` default); `Config` and the passphrase go to `apps/console/src/server/config.ts` |
| `src/railway/{transport,errors,documents}.ts`, `operations/` | `packages/railway-client/src/…`, `packages/railway-client/operations/` | untouched |
| `src/railway/readContainer.ts` | `packages/railway-client/src/read-container.ts` + `provider.ts` | `toContainerView` unchanged and now exported with its input type; `createRailwayProvider` wraps it |
| `src/railway/live.test.ts` | `packages/railway-client/src/live.test.ts` | reads `.env.local` from the **repository root**, found by walking up to `pnpm-workspace.yaml` |
| `scripts/check-operations.ts` | `packages/railway-client/scripts/check-operations.ts` | paths resolved from the file, not the cwd |
| `app/`, `next.config.ts` | `apps/console/app/`, `apps/console/next.config.ts` | `transpilePackages` added |
| — | `packages/ui/src/*` | new; four primitives and the tokens, no product knowledge |
| `tsconfig.json` | `tsconfig.base.json` + one per package/app | `exactOptionalPropertyTypes` on — `[observed]` zero errors on `main` |
| `vitest.config.ts` (root) | one per package that has tests | the root `test` script is `turbo run test` |
| `package-lock.json` | `pnpm-lock.yaml` | committed; `--frozen-lockfile` in CI |

Two filesystem paths in the moved tests are resolved relative to the current
working directory today (`state.test.ts` reads the experiment frames,
`live.test.ts` reads `.env.local`) and a third pair inside
`check-operations.ts`. All four become relative to the module, via
`fileURLToPath(import.meta.url)`, because Turborepo runs each package with the
package as cwd.

## 5. Tooling, pinned

`[observed]` 2026-09-14 via `npm view`: pnpm `10.33.2`, turbo `2.10.12`, zod
`4.6.5`. Node stays `>= 22` (`engines`), declared for corepack in the root
`package.json` as `"packageManager": "pnpm@10.33.2"`.

`turbo.json`, the whole of it:

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "check":     {},                                   // railway-client: the operations gate
    "typecheck": { "dependsOn": ["^typecheck"] },      // every package has one — D-OPS-3
    "test":      { "dependsOn": ["^test"] },
    "build":     { "dependsOn": ["^build", "^check"], "outputs": [".next/**", "!.next/cache/**"] },
    "dev":       { "cache": false, "persistent": true },
    "test:live": { "cache": false }                    // needs a token; never cached, never in CI
  }
}
```

Root scripts: `dev`, `build`, `typecheck`, `test`, `check` — each `turbo run
<task>`; `check` additionally runs `node scripts/check-boundaries.mjs`. Only
`@repo/console` has a `build`; under `D-OPS-3` the packages have none, so
`turbo run build` builds exactly one thing and its `^check` dependency.

`test:live` is declared so it is never cached and is deliberately **not** part
of any root script and not part of CI: it is the only task that talks to
Railway, and it skips itself when the `RAILWAY_*` variables are absent.

`next.config.ts` gains one line, `transpilePackages: ['@repo/contracts',
'@repo/container-core', '@repo/railway-client', '@repo/ui']` — the
Just-in-Time contract from the Turborepo docs (`[observed]` 2026-09-14).

## 6. The rules, restated for packages

Parent design §2 stated three rules by folder. `scripts/check-boundaries.mjs`
checks them by package, and CI runs it:

1. The string `backboard.railway.com` appears in exactly one file, and it is
   under `packages/railway-client/src/`. No `wss://` anywhere. (`V-41`)
2. Files ending in `.graphql`, and the word `mutation` inside a GraphQL
   document, exist only under `packages/railway-client/`. (`V-40`, first half;
   the second half — *only `actions.ts` calls a mutation* — becomes *only
   `container-core` calls a verb on the provider*, checked by `container-verbs`.)
3. No source file contains a relative import that leaves its own package
   (`../../packages/`, `../../apps/`) and no import of `@repo/*/src/`.
4. **The client graph stays clean.** No file under
   `apps/console/src/features/`, no file carrying the `'use client'`
   directive, and nothing under `packages/ui/` imports `@repo/container-core`
   or `@repo/railway-client`. The browser's only workspace imports are
   `@repo/contracts` and `@repo/ui`.
5. `@repo/ui` imports nothing from the workspace at all — a `ui` file that
   names any `@repo/` specifier fails the check.

Rule 4 is the one the module system cannot express on its own: `apps/console`
legitimately depends on all four packages, so nothing stops a client component
inside it from importing the server's. **Rejected:** the `server-only` package.
It is the Next.js idiom and it would fail the build precisely, but its export
map resolves to the throwing module under plain Node, which is how vitest runs
`container-core` and `railway-client` — the tests would have to opt out of the
guard that the guard exists to enforce. A grep costs nothing, runs in CI, and
is proven by break-and-revert. It is worth revisiting when the screen exists
and the RSC boundary is real.

Rule 4's *outcome* is additionally checked at the bundle level by the parent's
`V-15`, which `console-screen` implements after `next build`.

## 7. CI

`.github/workflows/ci.yml`: `pnpm/action-setup` reading the version from
`packageManager`, Node 22, `pnpm install --frozen-lockfile`, then `pnpm turbo
run check typecheck test build`. No secrets, and none are needed: `test:live`
is not in that list, the live test skips itself when unconfigured, and the
build must succeed with no `RAILWAY_*` set — a requirement the `console-server`
change carries forward for the runtime singleton.

## 8. Amendments to the parent change

With `D-OPS-2` ratified, the parent's `design.md` §2 diagram gets package
names in place of folder names, §10 is replaced by a pointer to §1 here, and
`verification.md` marks `V-40` / `V-41` as restated in this change. Nothing
else in the parent moves.
