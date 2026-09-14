# Proposal: `railway-container-control`

**Status:** proposed · **Capabilities:** `API`, `UI`, `SEC`, `OPS` ·
**Requirements served:** R-1 … R-7 in
[`../../_research/2026-09-14-the-brief.md`](../../_research/2026-09-14-the-brief.md).
**Blocked on the owner for:** the meaning of "down" (`Q-API-2`), the stack
(`D-UI-2`), the deployment topology (`D-OPS-1`), whether the demo needs a
passphrase (`Q-SEC-4`). Everything else can proceed.

## The problem

Railway's take-home asks for an application with a UI that spins a container
up and down through their GraphQL API, deployed on Railway, to be walked
through in a 30-minute code review and discussed for how it would be extended
(R-1 … R-7). The feature is small. What is not small is getting four things
right that the research established the hard way:

1. **The browser cannot call Railway.** CORS on `backboard.railway.com` is
   pinned to `https://railway.com`
   ([surface §2](../../_research/2026-09-14-railway-graphql-surface.md)).
   There has to be a server, whether or not the brief implies one.
2. **The token cannot ship.** Public repository, public demo (`D-SEC-1`).
3. **Failure does not look like failure.** "Not Authorized" is HTTP 200 with
   `extensions.code: INTERNAL_SERVER_ERROR` (surface §3), and a stopped
   deployment still reports `status: SUCCESS`
   ([domain model](../../_research/2026-09-14-railway-domain-model.md)). A
   console that reads status codes, or `status` alone, will lie.
4. **"Down" is four different verbs** — stop, remove, scale to zero, delete —
   with different consequences
   ([operations §2](../../_research/2026-09-14-railway-operations-and-cost.md)).
   Picking one silently would be a product decision disguised as a detail.

This change specifies the smallest application that satisfies R-1 … R-5 while
getting those four things right, and leaves the fourth to the owner.

## The user's scenario

A reviewer opens the deployed URL. Nothing to log in to, nothing to paste
(pending `Q-SEC-2` / `Q-SEC-4`).

1. The page shows the container's **current state** — `down`, `up`,
   `starting`, `stopping`, `failed`, `sleeping`, or `unknown` with what was
   observed — and one control whose label matches: *Start* or *Stop*.
2. They press **Start**. The control disables and reads *Starting…*; the
   deployment step appears as Railway reports it — *creating container*,
   *configuring network*, *health check*. Nothing on the page claims the
   container is up until Railway says so.
3. The state becomes **up**, with the deployment's URL if it has one. The
   control reads *Stop*.
4. They press **Stop**. *Stopping…*, then **down**.
5. At any point they refresh the page, open a second tab, or press twice: the
   page shows the same state as before, the second press is refused, and
   nothing is lost, because the browser holds no state of its own.
6. If Railway refuses or is unreachable, the page says so in one line, with
   the `traceId` Railway returned, and keeps showing the last known state.

That is the whole product. The UI states are tabled in
[`design.md`](design.md) §1.

## The approach

```
browser ── HTTP + SSE ──▶ console server (one Node process) ── HTTPS POST ──▶ backboard.railway.com/graphql/v2
                                                             ── WSS (graphql-transport-ws) ──▶ same URL
```

- One screen, rendering one `ContainerState` and nothing else (`D-UI-3`).
- One server-side module that is the only code allowed to know the endpoint,
  the credential or a GraphQL document (`D-API-2`, `D-API-3`).
- Live state over Railway's undocumented-but-working subscriptions, held on
  the server and fanned out over SSE; zero requests to Railway while idle
  (`D-API-1`).
- Container state derived from `latestDeployment.status` **and**
  `instances[].status` **and** `deploymentStopped`, by a pure function with an
  explicit `unknown` (`D-API-4`).
- Two domain verbs, `up()` and `down()`, whose bodies are the only thing the
  owner's answer to `Q-API-2` changes (`D-API-5`, recommendation).
- One configured `(project, environment, service)`; no browsing (`D-API-6`).
- Next.js + TypeScript as a single `next start` process, one Railway service
  (`D-UI-2`); the target container in a separate project, from a public image,
  serverless off (`D-OPS-1`).

## Minimum versus optional

| | Minimum — this change | Optional — named as extensions, not built |
|---|---|---|
| Scope | one container, configured | picker over projects / services (needs account token) |
| Controls | Start / Stop | Restart, Redeploy, Rollback, Remove-from-history |
| State | phase + step + URL + last error | logs stream (`deploymentLogs` subscription exists), metrics |
| Auth on the console | none, pending `Q-SEC-4` | passphrase; "Login with Railway" OAuth |
| Token | one project token, server-side | token per reviewer; rotation |
| Persistence | none — the server holds nothing across restarts | history of who pressed what, when |
| Target | one public image, serverless off | image chosen in the UI; volumes; variables |
| Tests | unit for the pure parts; two live checks skipped without a token | end-to-end against a throwaway project |

Every item in the right column is an honest answer to R-6's "how would you
extend it". They are listed so that the walkthrough has them; none is built,
because none is asked for.

## Deliberately out of this change

| Left out | Why |
|---|---|
| The `Q-API-6` experiment (watching a real `deploymentStop`) | Research, not implementation; creates a paid resource; the owner runs it — [`tasks.md`](tasks.md) T-2.3 |
| Choosing between stop / remove / scale-to-zero / delete | Owner's decision, `Q-API-2` |
| Anything in the "optional" column above | Not asked |

## What "done" means

Every line in [`verification.md`](verification.md) passes, and the tasks in
[`tasks.md`](tasks.md) are checked, in order. "Works on my machine" is not a
state this change recognises.

## What this change asks the owner to decide before code

| Decision | Where | Default if unanswered |
|---|---|---|
| What "down" does | `Q-API-2` → `D-API-5` | none — code does not start on the two verb bodies |
| Stack | `D-UI-2` | Next.js + TS, as proposed |
| Topology | `D-OPS-1` | separate projects, as proposed |
| Demo passphrase | `Q-SEC-4` | none; a one-variable passphrase is a 20-line addition later |
| Which of `Q-API-4`, `Q-API-7`, `Q-SEC-2`, `Q-SEC-3`, `Q-OPS-2` to ask Railway | `open-questions.md`, owner **Railway** | ask all five; R-7 says questions are expected |
