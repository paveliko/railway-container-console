# Design: `monorepo-workspace`

Rests on `D-OPS-2` (workspace shape) and `D-OPS-3` (Just-in-Time packages) in
[`../../decisions.md`](../../decisions.md), both *proposed*. Everything about
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
│       ├── next.config.ts             transpilePackages: the three @repo/* packages
│       ├── package.json               depends on all three packages
│       └── tsconfig.json              extends ../../tsconfig.base.json; jsx, DOM lib, next plugin
├── packages/
│   ├── contracts/                     @repo/contracts
│   │   └── src/  index.ts · container-state.ts · console-error.ts · railway-enums.ts (Q-UI-5)
│   ├── container-core/                @repo/container-core
│   │   └── src/  index.ts · provider.ts · state.ts · poller.ts · actions.ts (container-verbs)
│   └── railway-client/                @repo/railway-client
│       ├── src/  index.ts · credential.ts · transport.ts · errors.ts · documents.ts · read-container.ts · provider.ts
│       ├── operations/*.graphql       the documents, validated against the excerpt
│       └── scripts/check-operations.ts
├── scripts/check-boundaries.mjs       the three grep rules from parent design §2, as a script
├── openspec/                          unchanged
├── .github/workflows/ci.yml
├── package.json                       private; packageManager; scripts delegate to turbo
├── pnpm-workspace.yaml                apps/* · packages/*
├── turbo.json
└── tsconfig.base.json                 strict · noUncheckedIndexedAccess · exactOptionalPropertyTypes
```

Every package has its own `package.json` with `"private": true`, `"type":
"module"`, an `exports` map, and a `tsconfig.json` that extends the root base.
`README.md` at the root stays the reviewer's entry point; each package gets a
five-line `README.md` saying what it is and what it must not know.

## 2. Who may know what

| Package | Owns | Depends on | Must not know |
|---|---|---|---|
| `@repo/contracts` | `ContainerState`, `DownReason`, `ConsoleError` (parent §9), `UpAccepted`, the SSE event = `ContainerState`; Zod schemas and the types inferred from them; the two Railway status enums if `Q-UI-5` says so | `zod` | React, Next.js, Railway's endpoint, tokens, `ContainerView` |
| `@repo/container-core` | `ContainerView` / `DeploymentView`, `deriveContainerState`, `isTerminal`, `sameState`, `Poller`, the `ContainerProvider` port; later `up()` / `down()` / `inFlight()` | `@repo/contracts` | HTTP, GraphQL, `fetch`, React, Next.js, any `@repo/railway-client` symbol |
| `@repo/railway-client` | `Credential`, `headersFor`, `credentialFromEnv`, `targetFromEnv`, `execute`, `classify`, `RailwayError`, `parseBudget`, the operation documents, `readContainer`, `createRailwayProvider` | `@repo/container-core` (the port and `ContainerView`), `@repo/contracts` (enums), `graphql` (dev, for the gate) | React, Next.js, the console's routes, `CONSOLE_PASSPHRASE` |
| `@repo/console` | `Config`, the runtime singleton, the four routes, the screen | all three packages, `next`, `react` | — |

The last column is what `scripts/check-boundaries.mjs` and the `exports` maps
enforce; the "depends on" column is what each `package.json` declares and
pnpm enforces.

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

Today `readContainer.ts` in the Railway layer imports `ContainerView` from the
container layer, and `state.ts` in the container layer imports the enums from
the Railway layer — a cycle. The port resolves it in the direction that keeps
the domain testable without Railway: the domain owns the shape it reads
(`ContainerView`) and the vocabulary it renders (the enums, via `contracts`);
the adapter depends on both and produces them. `Poller` takes a `read`
function already; it will take `provider.read` and nothing changes inside it.

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
| `src/railway/types.ts` | `packages/contracts/src/railway-enums.ts` | pending `Q-UI-5`; default shown |
| `src/railway/credential.ts` | `packages/railway-client/src/credential.ts` | `fromEnv` splits into `credentialFromEnv` + `targetFromEnv` pending `Q-SEC-5`; `Config` and the passphrase go to `apps/console/src/server/config.ts` |
| `src/railway/{transport,errors,documents}.ts`, `operations/` | `packages/railway-client/src/…`, `packages/railway-client/operations/` | untouched |
| `src/railway/readContainer.ts` | `packages/railway-client/src/read-container.ts` + `provider.ts` | `toContainerView` unchanged; `createRailwayProvider` wraps it |
| `src/railway/live.test.ts` | `packages/railway-client/src/live.test.ts` | reads `.env.local` from the **repository root**, not the package cwd |
| `scripts/check-operations.ts` | `packages/railway-client/scripts/check-operations.ts` | paths become relative to the package: `../../openspec/_research/railway-schema-excerpt.graphql`, `./operations` |
| `app/`, `next.config.ts` | `apps/console/app/`, `apps/console/next.config.ts` | `transpilePackages` added |
| `tsconfig.json` | `tsconfig.base.json` + one per package/app | `exactOptionalPropertyTypes` on — `[observed]` zero errors on `main` |
| `vitest.config.ts` (root) | none | vitest's defaults find `src/**/*.test.ts` in each package; the root `test` script is `turbo run test` |
| `package-lock.json` | `pnpm-lock.yaml` | committed; `--frozen-lockfile` in CI |

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
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test":      { "dependsOn": ["^test"] },
    "build":     { "dependsOn": ["^build", "^check"], "outputs": [".next/**", "!.next/cache/**"] },
    "dev":       { "cache": false, "persistent": true },
    "test:live": { "cache": false }                    // needs a token; never cached
  }
}
```

Root scripts: `dev`, `build`, `typecheck`, `test`, `check` — each `turbo run
<task>`; plus `check:boundaries` → `node scripts/check-boundaries.mjs`, which
`check` also runs. Only `@repo/console` has a `build`; under `D-OPS-3` the
packages have none, so `turbo run build` builds exactly one thing and its
`^check` dependency.

`next.config.ts` gains one line, `transpilePackages: ['@repo/contracts',
'@repo/container-core', '@repo/railway-client']` — the Just-in-Time contract
from the Turborepo docs (`[observed]` 2026-09-14).

## 6. The three rules, restated for packages

Parent design §2 stated them by folder. `scripts/check-boundaries.mjs` checks
them by package, and CI runs it:

1. The string `backboard.railway.com` appears in exactly one file, and it is
   under `packages/railway-client/src/`. No `wss://` anywhere. (`V-41`)
2. Files ending in `.graphql`, and the word `mutation` inside a GraphQL
   document, exist only under `packages/railway-client/`. (`V-40`, first half;
   the second half — *only `actions.ts` calls a mutation* — becomes *only
   `container-core` calls a verb on the provider*, checked by `container-verbs`.)
3. No source file contains a relative import that leaves its own package
   (`../../packages/`, `../../apps/`) and no import of `@repo/*/src/`.

## 7. CI

`.github/workflows/ci.yml`: `pnpm/action-setup` reading the version from
`packageManager`, Node 22, `pnpm install --frozen-lockfile`, then `pnpm turbo
run check typecheck test build`. No secrets: the live test skips itself, and
the build must succeed with no `RAILWAY_*` set — a requirement the
`console-server` change carries forward for the runtime singleton.

## 8. Amendments to the parent change

When `D-OPS-2` is ratified, the parent's `design.md` §2 diagram gets package
names in place of folder names, §10 is replaced by a pointer to §1 here, and
`verification.md` marks `V-40` / `V-41` as restated in this change. Nothing
else in the parent moves.
