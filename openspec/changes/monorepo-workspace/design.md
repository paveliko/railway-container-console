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
├── scripts/check-boundaries.mjs       the eight rules of §6, as a script
├── openspec/                          unchanged
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
checks eight by package, and CI runs it. Each rule names the criterion it
implements, so a failure points at a line in `verification.md` and not at a
regular expression.

1. The string `backboard.railway.com` appears in exactly one file, and it is
   under `packages/railway-client/src/`. No `wss://` anywhere. (`V-MW-9`,
   restating `V-41`)
2. Files ending in `.graphql`, and a GraphQL operation inside a template
   literal, exist only under `packages/railway-client/`. (`V-MW-10`, restating
   the first half of `V-40`; the second half — *only `actions.ts` calls a
   mutation* — becomes *only `container-core` calls a verb on the provider*,
   checked by `container-verbs`.)
3. No source file contains a relative import that leaves its own package, and
   no file imports `@repo/*/…` past a package's `exports` map. (`V-MW-8`,
   `V-MW-7`)
4. **The client graph stays clean.** No file under
   `apps/console/src/features/`, no file carrying the `'use client'`
   directive, and nothing under `packages/ui/` imports `@repo/container-core`
   or `@repo/railway-client`. The browser's only workspace imports are
   `@repo/contracts` and `@repo/ui`. (`V-MW-25`)
5. `@repo/ui` knows nothing about the product: no source file under
   `packages/ui/src/` names a `@repo/` specifier, Railway's host, a `fetch(`
   call, a `/api/` route, or the word *container*. (`V-MW-22`)
6. `ContainerState` is declared once. No file outside `packages/contracts/src/`
   redeclares the union. (`V-MW-15`)
7. Every `@repo/*` specifier a package's sources name is declared in that
   package's own `package.json`. (`V-MW-5`)
8. The workspace dependency graph is acyclic. (`V-MW-5`)

Rules 4 and 5 are the ones the module system cannot express: `apps/console`
legitimately depends on all four packages, so nothing stops a client component
inside it from importing the server's. **Rejected:** the `server-only` package.
It is the Next.js idiom and it would fail the build precisely, but its export
map resolves to the throwing module under plain Node, which is how vitest runs
`container-core` and `railway-client` — the tests would have to opt out of the
guard that the guard exists to enforce. A grep costs nothing, runs in CI, and
is proven by break-and-revert. Worth revisiting when the screen exists and the
RSC boundary is real.

Rule 7 exists because of something the break-and-revert procedure turned up
rather than something anticipated. `[observed]` 2026-09-14: a *side-effect*
import — `import '@repo/railway-client';`, no bindings — raises **no** TS2307
under `moduleResolution: bundler`, even though the package is undeclared and
pnpm would refuse to resolve it at run time. A named import from the same
specifier fails typecheck immediately. So `tsc` alone does not close the
boundary in every import form, and rule 7 closes it in all of them by reading
each `package.json` instead of relying on the compiler. Rule 8 falls out of
the same manifest read for free.

Rule 4's *outcome* is additionally checked at the bundle level by the parent's
`V-15`, which `console-screen` implements after `next build`.

## 7. Verification runs locally

There is no CI workflow, and no `.github/` directory. The gate is one command
at the repository root:

```bash
pnpm verify        # check (operations gate + the eight boundary rules), then
                   # typecheck, test and build, in dependency order
```

**Rejected:** a GitHub Actions workflow running the same four tasks. It was
written, and it is removed by the owner's decision. Two reasons stand behind
that, and only the first is about this repository: the account's Actions
minutes are not currently available, so a workflow here is a permanently red
check that teaches a reviewer to ignore red checks — which is worse than no
check at all. The second is that everything the workflow did is reproducible
by anyone with the repository, because the tasks are hermetic: no secret, no
network, no Railway. `pnpm verify` on a clean clone is the same gate.

**What is given up, stated plainly.** Nothing now runs the checks except a
person choosing to run them, so a pull request can be opened with the tree
broken and nothing will say so. The mitigation is that the command is one word
and that `verify` is named in the README's *Running it* section as the thing to
run before pushing. **Becomes a workflow again** when Actions is available: the
file is four steps — `pnpm/action-setup`, Node 22, `pnpm install
--frozen-lockfile`, `pnpm verify` — and it needs no secret, because `test:live`
is a separate task that is not part of `verify`.

`test:live` stays outside `verify` for that reason: it is the only task that
would reach Railway, it is declared `"cache": false`, and it skips itself when
the five `RAILWAY_*` variables are absent.

## 7a. Turborepo inputs — what invalidates what

Two files the tasks genuinely depend on live outside any package, so Turborepo
cannot infer them:

```jsonc
"globalDependencies": ["tsconfig.base.json"],          // every task
"check": { "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/openspec/_research/railway-schema-excerpt.graphql"] }
```

Without the first, editing the shared compiler options does not change any
`typecheck` hash and the cache replays a stale pass. Without the second, editing
the schema excerpt does not change `railway-client#check` and the operations
gate — whose entire purpose is to notice that the schema and the documents have
drifted apart — reports success from cache without re-reading the schema.
`$TURBO_ROOT$` keeps the excerpt scoped to the one task that reads it rather
than making it global, so a schema edit does not invalidate the test suites.

Both were `[observed]` on 2026-09-14 by comparing `--dry-run=json` hashes
before and after an edit; both are verified the same way, in `V-MW-27`.

## 8. Amendments to the parent change

With `D-OPS-2` ratified, the parent's `design.md` §2 diagram gets package
names in place of folder names, §10 is replaced by a pointer to §1 here, and
`verification.md` marks `V-40` / `V-41` as restated in this change. Nothing
else in the parent moves.
