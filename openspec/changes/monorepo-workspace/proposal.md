# Proposal: `monorepo-workspace`

**Status:** in implementation — `D-OPS-2` and `D-OPS-3` were **ratified by the
owner on 2026-09-14**, both with amendments recorded in
[`../../decisions.md`](../../decisions.md) · **Capabilities:** `OPS` (shape of
the build), touches `API` and `UI` only by moving files · **Parent change:**
[`../railway-container-control/`](../railway-container-control/) — this change
replaces its T-2.1 and re-homes T-2.2, T-3.1 … T-3.3 and T-4.1, all of which
are already done as a single application.
**Still open, and carried, not smoothed over:** `Q-UI-5` and `Q-SEC-5`. Both
were left unanswered in the ratification message; the implementation applies
each question's own **registered default** and says so in every place it
shows, so that reversing either is a local edit and not a redesign. See
[*What is still open*](#what-is-still-open) at the end.

## The problem

The parent change draws three layers — `railway/`, `container/`, the route
handlers — and states three rules about what may import what
([design §2](../railway-container-control/design.md)). Today those rules are
enforced by prose and by two grep checks (`V-40`, `V-41`). The module system
does not know them, and the code that was merged in PR #4 shows the
consequence:

- `[observed]` `src/railway/readContainer.ts:4` imports `ContainerView` from
  `../container/state`, and `src/container/state.ts:16` imports the two status
  enums from `../railway/types`. The two layers depend on each other. In one
  application nothing complains; the boundary exists only on the diagram.
- `[observed]` `src/railway/credential.ts:24-29,69-73` reads
  `CONSOLE_PASSPHRASE`, which is a console concern (`Q-SEC-4`), from inside the
  Railway layer.
- `[observed]` The `ContainerState` type, which the browser will render, lives
  in `src/container/state.ts` next to the derivation logic, so the future
  client bundle would import a server module to get a type.
- `[observed]` There is no place for a shared presentation primitive. The
  screen has not been written yet, so every `Button` it grows will be written
  inside the one page that needs it, and the second screen will copy them.

None of this is a bug today. All of it becomes one the moment a second
developer, or the same developer six months later, adds a feature. The
brief's 30-minute slot on "how you would extend it" (R-6) is exactly that
moment.

## The approach

Make the layers packages, so that a boundary crossing is a build error rather
than a review comment. Four packages and one application:

```
apps/console/               @repo/console         Next.js — the only deployable
packages/contracts/         @repo/contracts       what browser and server agree on
packages/container-core/    @repo/container-core  state, poller, verbs, the provider port
packages/railway-client/    @repo/railway-client  the only code that knows Railway
packages/ui/                @repo/ui              presentation primitives — react and nothing else
```

with one permitted direction of dependency:

```
contracts  ←  container-core  ←  railway-client        ui   (react only)
    ↑               ↑                  ↑                ↑
    └───────────────┴──── console ─────┴────────────────┘
```

`container-core` declares a `ContainerProvider` port and `railway-client`
implements it. That is what breaks the cycle: the domain says what it needs to
read, the adapter supplies it. The domain's tests run against a fake provider
and never see GraphQL.

`@repo/ui` is the other half of the shape, and it is defined by what it may
**not** know: not Railway, not `@repo/contracts`, not `fetch`. It holds
`Button`, `Badge`, `Card`, `Spinner` and the colour and type scale, and it
grows one component at a time, when a second place actually needs one.
Anything that knows what a *container* is — the phase table, the up/down
controls, the connection indicator — stays in
`apps/console/src/features/container-control/`. The test for whether a
component belongs in `ui` is whether it could render in a repository that has
never heard of Railway.

pnpm's isolated `node_modules` makes an undeclared import fail to resolve;
each package's `exports` map makes a deep import fail to resolve; a boundary
script catches the two things neither can see — a relative import that climbs
out of a package, and a server package reached from the client graph.
Turborepo runs `check`, `typecheck`, `test` and `build` in dependency order
from the root. No ESLint, no `dist/`, no codegen — see `D-OPS-3` and the
rejected alternatives in `D-OPS-2` for what was deliberately not added.

**Every package has its own `typecheck`.** This is the correction the owner
made when ratifying `D-OPS-3`: pnpm proves that a package does not import what
it did not declare, and that is *all* it proves. Whether the package's own
sources compile, and whether a change in `contracts` still type-checks in
`container-core`, is a question only `tsc` answers. Dropping `dist/` drops the
build step, not the type check.

## Minimum versus optional

| | Minimum — this change | Optional — named, not built |
|---|---|---|
| Packages | `contracts`, `container-core`, `railway-client`, `ui`; app `console` | `eslint-config` (when there is a linter), `typescript-config` as a package (a root file does the job) |
| `ui` contents | `Button`, `Badge`, `Card`, `Spinner`, tokens for colour and type | every further primitive, added when a second caller needs it — never speculatively |
| Boundary enforcement | pnpm strict resolution, `exports` maps, one root script for the rules the module system cannot see | ESLint `no-restricted-imports`, `dependency-cruiser` |
| Package consumption | Just-in-Time: `exports` → `src/*.ts(x)`, transpiled by Next.js and run from source by vitest (`D-OPS-3`) | compiled `dist/` when a consumer needs plain JavaScript |
| Runtime validation | Zod schemas in `contracts` for the two shapes that cross HTTP (`ContainerState`, `ConsoleError`) | schemas for Railway's responses (the adapter passes enum strings through on purpose — `read-container.ts`) |
| Verification | one local command, `pnpm verify` — the operations gate, the boundary rules, types, tests, build | a CI workflow (removed by the owner: the account's Actions minutes are unavailable, and a permanently red check is worse than none); remote Turborepo caching |

## Deliberately out of this change

| Left out | Why |
|---|---|
| The two verbs `up()` / `down()` | `Q-API-2`, owner — [`../container-verbs/`](../container-verbs/) |
| The runtime singleton, the four routes, SSE | [`../console-server/`](../console-server/) |
| The screen, and the container-control components | [`../console-screen/`](../console-screen/) — this change ships `@repo/ui` with its primitives and no feature components |
| Deploying the workspace on Railway | [`../deploy-on-railway/`](../deploy-on-railway/); the one open question it raises is registered as `Q-OPS-3` |
| A linter | there is none today; `eslint-config` is set aside in `D-OPS-2`, not refused |

## What "done" means

Every line in [`verification.md`](verification.md) passes; every task in
[`tasks.md`](tasks.md) is checked; the parent change's `V-1 … V-12`,
`V-21 … V-38` still pass with the same test names; `V-40` and `V-41` pass in
their restated form. The parent's design §2 and §10 are amended to name
packages instead of folders.

## What is still open

Neither question below was answered in the ratification message. Each has a
**registered default** in [`../../open-questions.md`](../../open-questions.md);
the implementation applies that default, marks it at the point of use, and
changes nothing about the observable behaviour of the code that moves.

| Question | Default applied | What reversing it costs |
|---|---|---|
| `Q-UI-5` — where the two Railway status enums live | `@repo/contracts`, with the schema excerpt cited in the file; `railway-client` imports them | `contracts` declares `status: string`, the enums move back to `railway-client`, and the UI loses the narrowed type. One file moves; no logic changes. |
| `Q-SEC-5` — who reads the environment | `railway-client` exports `credentialFromEnv` and `targetFromEnv`; `apps/console/src/server/config.ts` composes `Config` and is the only reader of `CONSOLE_PASSPHRASE` | The split is forced by `D-OPS-2` regardless — `railway-client` may not know a console concern. What is open is only whether the app or a fifth package owns `Config`. |

`exactOptionalPropertyTypes` needed no decision: `[observed]` 2026-09-14,
`tsc --noEmit --exactOptionalPropertyTypes` on `main` reports zero errors, so
the base tsconfig turns it on.
