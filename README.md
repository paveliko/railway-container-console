# railway-container-console

A small web console that spins one Railway container up and down through
Railway's public GraphQL API — built for Railway's take-home for the
*Senior Full-Stack Engineer - Product* role.

**Status:** the workspace is done and signed — four packages and one app under
pnpm and Turborepo (`D-OPS-2`, `D-OPS-3`) — and the console is built: Vite and
React in the browser, one long-lived Node process serving it and holding the
poller (`D-UI-5`, `D-OPS-4`). The two verbs, the four routes with SSE and the
one screen all exist and are tested; `pnpm verify` is green. Two things are
left, and they are different in kind. **Deployment** has not happened and is the
owner's: an account usage limit, two Railway services, and a passphrase value
that never enters this public repository. **Verification** is incomplete: the
change that wrote the code checked its own criteria and left eleven of the three
feature changes' criteria unrun — they are listed, one per line, in
[the parent's `tasks.md`](openspec/changes/railway-container-control/tasks.md)
under *Ready to start now*, and marked on the criteria themselves. Neither is
hidden behind the other: the console works, and this says exactly how much of
that is proven.

---

## If you are reviewing this

The brief is one sentence — *build an application to spin up and spin down a
container using our GQL API … with a UI component … deployed on Railway*. The
feature is small. The work here is in the decisions around it, made before the
code and written down so they can be argued with.

**Ten-minute reading order:**

1. [`openspec/_research/2026-09-14-the-brief.md`](openspec/_research/2026-09-14-the-brief.md)
   — what was asked, quoted, and what this repository assumes on top (R-1…R-7, A-1…A-5).
2. [`openspec/changes/railway-container-control/proposal.md`](openspec/changes/railway-container-control/proposal.md)
   — the problem, the user's scenario, the minimal product, what is left out.
3. [`openspec/decisions.md`](openspec/decisions.md)
   — every decision with the alternatives that lost.
4. [`openspec/open-questions.md`](openspec/open-questions.md)
   — everything still unresolved, including five questions for Railway.

**Five things found by probing the live API and then running a real container
up and down** — not by reading about it. Sources:
[the API surface](openspec/_research/2026-09-14-railway-graphql-surface.md) and
[the experiment](openspec/_research/2026-09-14-experiment-stop-and-start.md),
with raw frames in [`experiment-2026-09-14/`](openspec/_research/experiment-2026-09-14/).

| Finding | Consequence |
|---|---|
| CORS on `backboard.railway.com` is pinned to `https://railway.com` | the browser cannot call the API; a server side is forced, not chosen |
| "Not Authorized" — and plain input validation — arrive as **HTTP 200** with `extensions.code: INTERNAL_SERVER_ERROR` | errors are classified from the body, never from the status |
| After a real `deploymentStop` the deployment still reads **`status: SUCCESS`**; the stop appears only in `deploymentStopped` and in the instances (`EXITED`) | "is it up" is read from the replicas, not the deployment — the UI never lies |
| Subscriptions exist and work, but a **project token is refused at `subscribe`**, and a stop never reaches a subscriber at all — the stream fires on `status`, and a stop does not change it | the console polls on a bounded schedule instead: 30 s idle, 2 s in flight |
| `deploymentRestart` **revives a stopped deployment** in ~8 s, same deployment id — though the docs describe it as being for *running* ones | "down" and "up" can be the same deployment, so the UI may honestly say the same container came back |

And one thing found on Railway's own support forum: users have asked for a
"pause" button since 2022 and are told to *remove the deployment*; their
follow-up questions — will data survive, is it billed — go unanswered. The
Railway dashboard has no Stop button; the API has one. That is the product this
console is
([`…/2026-09-14-railway-customers-and-users.md`](openspec/_research/2026-09-14-railway-customers-and-users.md) §4).

**What the console is:** one screen; one configured service; a control that
reads *Start* or *Stop* according to the state Railway actually reports; the
deployment's status shown while starting; a second press refused server-side; a
refresh that loses nothing. Vite and React in the browser, served by one
long-lived `node:http` process that holds one poller and fans state out to every
browser over SSE — one port in development and in production (`D-UI-5`). The
Railway socket `D-UI-2` was chosen for is gone: a project token cannot
subscribe, and a stop never reaches a subscriber (`D-API-7`). A project token,
on the server only.
Specified in
[`design.md`](openspec/changes/railway-container-control/design.md) and
checkable against 60 criteria in
[`verification.md`](openspec/changes/railway-container-control/verification.md),
many of them against the experiment's real recorded frames.

---

## Next steps — for me

Ordered. Nothing below the line starts before the line is crossed.

**Decide (owner only — agents prepare, the owner signs):**

- [x] **What "down" does** — answered 2026-09-14, `D-API-5` `ratified`,
      `Q-API-2` closed 2026-09-15. **Down** = `deploymentStop(latestDeployment.id)`.
      **Up** = `deploymentRestart(id)` when a stopped deployment exists, else
      `serviceInstanceDeployV2`. So the service, its configuration and its
      history all survive a spin-down, and the restart path brings back *the
      same container*, keeping its deployment id — which is why the screen can
      honestly say so. The three that lost: `deploymentStop`+`deployV2`,
      `deploymentRemove`+redeploy, `serviceDelete`+`serviceCreate`;
      `numReplicas: 0` was dead already, the API rejects it. Consequences
      tabled in
      [`operations-and-cost.md` §2](openspec/_research/2026-09-14-railway-operations-and-cost.md),
      measured in [the experiment](openspec/_research/2026-09-14-experiment-stop-and-start.md).
      Still open: whether restart revives a deployment stopped for hours rather
      than ninety seconds (`Q-API-9`).
- [ ] **Sign or amend** the `proposed` decisions in
      [`decisions.md`](openspec/decisions.md) — stack (`D-UI-5`, which
      supersedes `D-UI-2`), Just-in-Time packages under Vite and `tsx`
      (`D-OPS-4`), topology (`D-OPS-1`), primary user (`D-UI-4`), polling over
      subscriptions (`D-API-7`, which supersedes `D-API-1`), the design system
      (`D-UI-6`), the demo gate (`D-SEC-2`), the corpus checker (`D-OPS-5`),
      fail-fast on a bad environment (`D-OPS-6`), and the rest.
- [ ] **Answer `Q-OPS-8`** — `.railway/railway.ts` or dashboard settings for the
      console service. Railway deprecated Config as Code and closed it to new
      services, so the `railway.json` this repository planned is not an option;
      the choice is live and nothing is written until it is made.
- [x] **Demo passphrase or not** — answered 2026-09-15. `D-SEC-2`: the deployed
      demo **is** gated. `CONSOLE_PASSPHRASE` is set on the console service, so
      the two mutating routes (`POST /api/container/up` and `/down`) require a
      session cookie obtained from `POST /api/session`; reading state and the
      SSE stream stay open to anyone with the link. The passphrase itself is
      **not in this repository** — it is public — and travels privately with
      the demo link. `Q-SEC-4` closed.
- [x] **Sign the workspace shape** — done 2026-09-14. `D-OPS-2` (four packages
      and one app, `contracts ← container-core ← railway-client`, plus `ui`)
      and `D-OPS-3` (packages consumed from source, no `dist/`, a `typecheck`
      per package) are `ratified`, each with an owner's amendment recorded in
      place. Implemented in
      [`openspec/changes/monorepo-workspace/`](openspec/changes/monorepo-workspace/).
- [ ] **Answer `Q-UI-5` and `Q-SEC-5`** — where the two Railway status enums
      live, and who reads the environment. Both were left open at ratification;
      the code applies each question's registered default and marks it at the
      point of use, so either is a local edit to reverse.

**Ask Railway** (the posting says to — `R-7`): `Q-API-4` token type;
`Q-API-7` — is a project token meant to be unable to subscribe, is a
`deploymentStop` meant to be invisible to a subscriber, is `connection_ack`
meant to carry no auth signal; `Q-SEC-2` whose token in the demo; `Q-SEC-3`
how to detect an auth failure; `Q-OPS-2` is a stopped deployment billed.
Record the date sent in `open-questions.md`.

**Verify by looking** (the dashboard, no API): is there a *Stop* action or
only *Remove*; what the *Remove* dialog warns about; can replicas be set to 0;
what the customers page actually says. Update the `[to-verify]` marks.

---

- [ ] **Set a usage limit** on the Railway account — the one thing from T-2.3
      that is still missing. The project and the project token exist
      (`.env.local`, git-ignored).
- [x] ~~**Run the experiment**~~ — done 2026-09-14: a real `nginx:alpine`
      container was started, stopped, restarted and stopped again, with every
      frame recorded. The service is left **stopped**.
- [ ] **Read the usage page** a day later and close `Q-OPS-2` — is a stopped
      deployment billed? (T-3.5)
- [x] ~~**Then build**~~ — the order held, and everything but the last step has
      landed: [`monorepo-workspace`](openspec/changes/monorepo-workspace/) →
      [`container-verbs`](openspec/changes/container-verbs/) →
      [`console-server`](openspec/changes/console-server/) →
      [`console-screen`](openspec/changes/console-screen/) →
      [`deploy-on-railway`](openspec/changes/deploy-on-railway/) → README and
      walkthrough. The three middle changes were written in one pass by
      [`vite-console`](openspec/changes/vite-console/), which replaced Next.js
      with Vite on the way through. The parent's
      [`tasks.md`](openspec/changes/railway-container-control/tasks.md) is the
      index of what moved where.
- [ ] **Close the verification gaps.** Eleven criteria across the three feature
      changes have no run — `vite-console` verified its own and did not pick
      these up. They need nobody's signature and are listed individually under
      *Ready to start now* in the parent's `tasks.md`.

Nothing is waiting on a signature to be *written* any more: `D-OPS-2` /
`D-OPS-3` are signed, `Q-API-2` and `Q-SEC-4` are closed, and the code is
there. What waits on the owner is deployment — the usage limit, the two
services, the passphrase value, and `Q-OPS-8` — and the batch of `proposed`
decisions the whole thing now rests on.

---

## How the repository is organised

A pnpm workspace driven by Turborepo — `D-OPS-2`. One deployable, four
packages, one permitted direction of dependency.

```
apps/
└── console/           @repo/console         Vite + one Node process — the only thing that ships
packages/
├── contracts/         @repo/contracts       Zod schemas + the types inferred from them
├── container-core/    @repo/container-core  state, poller, the ContainerProvider port
├── railway-client/    @repo/railway-client  the only code that knows Railway exists
└── ui/                @repo/ui              Button · Badge · Card · Spinner — react and nothing else
scripts/
├── check-boundaries.mjs   the eight rules pnpm and the exports maps cannot see
├── check-bundle.mjs       the built assets, for Railway's host and a build-time token
├── check-design.mjs       every contrast ratio in DESIGN.md, recomputed from the hex
├── check-designmd.mjs     DESIGN.md against the published @google/design.md format
├── check-specs.mjs        the openspec/ corpus: identifiers, references, traceability
├── check-styles.mjs       the @repo/ui classes that must survive into the built CSS
├── design-model.mjs       the normalised model both design scripts read
└── design-tokens.mjs      DESIGN.md → @repo/ui tokens.ts and theme.css
```

```
contracts  ←  container-core  ←  railway-client        ui   (react only)
    ↑               ↑                  ↑                ↑
    └───────────────┴──── console ─────┴────────────────┘
```

`container-core` declares the port; `railway-client` implements it. That is
what keeps the domain testable without a token — and what makes a boundary
crossing a resolution error rather than a review comment.

```
openspec/
├── _research/         source material — every claim marked [observed] / [inferred] / [to-verify]
├── changes/
│   ├── railway-container-control/   the parent: proposal, design, 60 criteria (V-N), tasks as an index
│   ├── monorepo-workspace/          the workspace above — signed, implemented
│   ├── container-verbs/             up() / down() — built; Q-API-2 closed
│   ├── console-server/              runtime, four routes, SSE, fake Railway — built
│   ├── console-screen/              the one screen — built
│   ├── design-system/               DESIGN.md as the single source for every token
│   ├── designmd-conformance/        that file, in the published format
│   ├── vite-console/                Next.js out, Vite and one long-lived process in
│   ├── deploy-on-railway/           the workspace on Railway, manual checks — the last step
│   └── spec-validation/             this corpus, checked by a script rather than by prose
├── current/           what the console *is* — empty until the change is implemented and archived
├── decisions.md       D-<CAP>-N, each with its rejected alternatives; proposed until the owner signs
└── open-questions.md  Q-<CAP>-N, never smoothed over in prose
```

Capability prefixes: `API` (Railway's API surface), `UI` (the console), `SEC`
(tokens and secrets), `OPS` (deploying this app). Rules for agents working here
are in [`CLAUDE.md`](CLAUDE.md).

## Running it

Node 22 and pnpm 10 — `corepack enable` picks the version up from
`packageManager`.

```bash
pnpm install
pnpm verify       # everything below, in dependency order — run this before pushing
```

There is no CI workflow; `pnpm verify` is the gate, and it is hermetic — no
secret, no network, no Railway — so it gives the same answer on any clean
clone. Several of its checks prove themselves: `check-design.mjs` and
`check-specs.mjs` each run a suite of fixtures whose red *and* green paths are
committed, `check-styles.mjs` proves its probe by removing `@source` and
rebuilding, `check-bundle.mjs` was proved by importing the Railway client into a
client component and watching the build fail, and every rule in
`check-specs.mjs` has a logged break-and-revert.
A check whose failure path is untested is not a guarantee. Its parts, when you
want one on its own:

```bash
pnpm check        # the operations gate, the boundary rules, the two design
                  # checks, and the specification corpus
pnpm typecheck    # one tsc per package: pnpm proves the graph, tsc proves the code
pnpm test         # 193 tests across the four packages and the app
pnpm build        # runs the operations gate first, then vite build, then
                  # greps everything emitted for Railway's host and for a
                  # build-time token — V-15, and a leak fails the build
pnpm dev          # one process at apps/console — Vite in middleware mode,
                  # packages picked up from source through tsx
```

The one test that would talk to Railway is a separate, uncached task, kept out
of `verify` so that it can only run when asked for by name:

```bash
pnpm test:live    # skips itself unless .env.local has the five RAILWAY_* variables
```

The screen is built — `pnpm dev` serves it, and `apps/console/test/dev-server.ts`
drives it against a fake Railway with no token at all. To point it at a real
container instead, copy `.env.example` to `.env.local` at the repository root
and fill in the five `RAILWAY_*` variables. The token never leaves the server
and never enters this repository.

---

Pavel Rapoport · [rapoport.studio](https://rapoport.studio)
