# railway-container-console

A small web console that spins one Railway container up and down through
Railway's public GraphQL API — built for Railway's take-home for the
*Senior Full-Stack Engineer - Product* role.

**Status: research and specification are done; no product code yet.**
What "spin down" should mean is a decision with consequences, and it is left
to a person, not an agent — see *Next steps*.

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

**Four things the research found by probing the live API, not by reading about it**
(details in [`openspec/_research/2026-09-14-railway-graphql-surface.md`](openspec/_research/2026-09-14-railway-graphql-surface.md)):

| Finding | Consequence |
|---|---|
| CORS on `backboard.railway.com` is pinned to `https://railway.com` | the browser cannot call the API; a server side is forced, not chosen |
| "Not Authorized" arrives as **HTTP 200** with `extensions.code: INTERNAL_SERVER_ERROR` | errors are classified from the body, never from the status |
| GraphQL **subscriptions work** over `graphql-transport-ws` — undocumented | no polling; zero requests to Railway while idle |
| `DeploymentStatus` has **no `STOPPED`**; a stopped deployment stays `SUCCESS` and reports the stop through its instances | "is it up" is read from the replicas, not the deployment — the UI never lies |

And one thing found on Railway's own support forum: users have asked for a
"pause" button since 2022 and are told to *remove the deployment*; their
follow-up questions — will data survive, is it billed — go unanswered. That is
the product this console is
([`…/2026-09-14-railway-customers-and-users.md`](openspec/_research/2026-09-14-railway-customers-and-users.md) §4).

**What the console will be:** one screen; one configured service; a control
that reads *Start* or *Stop* according to the state Railway actually reports;
the deployment step shown while starting; a second press refused server-side;
a refresh that loses nothing. Next.js as one Node process, holding one
subscription socket and fanning state out over SSE. Token on the server only.
Specified in
[`design.md`](openspec/changes/railway-container-control/design.md) and
checkable against 59 criteria in
[`verification.md`](openspec/changes/railway-container-control/verification.md).

---

## Next steps — for me

Ordered. Nothing below the line starts before the line is crossed.

**Decide (owner only — agents prepare, the owner signs):**

- [ ] **What "down" does.** Five candidates, different consequences —
      `deploymentStop`, `deploymentRemove`, `deploymentStop`+`deploymentRestart`,
      `numReplicas: 0`, `serviceDelete`. Table in
      [`operations-and-cost.md` §2](openspec/_research/2026-09-14-railway-operations-and-cost.md);
      recommendation in `D-API-5`. Close `Q-API-2`.
- [ ] **Sign or amend** the eleven `proposed` decisions in
      [`decisions.md`](openspec/decisions.md) — stack (`D-UI-2`), topology
      (`D-OPS-1`), primary user (`D-UI-4`), and the rest.
- [ ] **Demo passphrase or not** — `Q-SEC-4`.

**Ask Railway** (the posting says to — `R-7`): `Q-API-4` token type,
`Q-API-7` are subscriptions supported, `Q-SEC-2` whose token in the demo,
`Q-SEC-3` how to detect an auth failure, `Q-OPS-2` is a stopped deployment
billed. Record the date sent in `open-questions.md`.

**Verify by looking** (the dashboard, no API): is there a *Stop* action or
only *Remove*; what the *Remove* dialog warns about; can replicas be set to 0;
what the customers page actually says. Update the `[to-verify]` marks.

---

- [ ] **Set a usage limit** on the Railway account; create the target project
      and a project token — into `.env` only. (`tasks.md` T-2.3)
- [ ] **Run the experiment** — deploy a tiny image once, apply the chosen
      "down", watch the `deployment` subscription, record the frames as
      fixtures. This is the one step that starts and stops a real container.
      (`Q-API-6`, T-3.4)
- [ ] **Then build**, in the order of
      [`tasks.md`](openspec/changes/railway-container-control/tasks.md):
      scaffold → transport and errors → subscription client → state derivation
      → verbs → routes → the screen → tests → deploy → README and walkthrough.

Tasks that need none of the above and can start today: T-2.1, T-2.2, T-3.1,
T-3.2, T-4.1, T-5.1, T-5.2.

---

## How the repository is organised

```
openspec/
├── _research/         source material — every claim marked [observed] / [inferred] / [to-verify]
├── changes/
│   └── railway-container-control/
│       ├── proposal.md      problem, scenario, scope, what is left out
│       ├── design.md        UI states, layers, state derivation, sequences, stack, topology
│       ├── verification.md  59 falsifiable acceptance criteria (V-N)
│       └── tasks.md         ordered tasks — result, dependencies, acceptance, how verified
├── current/           what the console *is* — empty until the change is implemented and archived
├── decisions.md       D-<CAP>-N, each with its rejected alternatives; proposed until the owner signs
└── open-questions.md  Q-<CAP>-N, never smoothed over in prose
```

Capability prefixes: `API` (Railway's API surface), `UI` (the console), `SEC`
(tokens and secrets), `OPS` (deploying this app). Rules for agents working here
are in [`CLAUDE.md`](CLAUDE.md).

## Running it

There is nothing to run yet. When there is: copy `.env.example` to `.env`,
fill in the five `RAILWAY_*` variables (names in
[`design.md` §3](openspec/changes/railway-container-control/design.md)),
`npm install`, `npm run dev`. The token never leaves the server and never
enters this repository.

---

Pavel Rapoport · [rapoport.studio](https://rapoport.studio)
