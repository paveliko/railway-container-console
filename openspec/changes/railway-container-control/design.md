# Design: `railway-container-control`

Decisions this change rests on are registered in
[`../../decisions.md`](../../decisions.md) — `D-API-1` … `D-API-6`, `D-UI-1` …
`D-UI-3`, `D-SEC-1`, `D-OPS-1` — each with the alternatives that lost. This
document shows what they produce. Read §1 for the product, §2–§9 for the
mechanism, §10–§12 for where it runs.

## 1. UI states — `D-UI-1`, `D-UI-3`

The page is a function of one value, `ContainerState` (§6). There is no other
client state.

| `phase` | Headline | Detail line | Control | Control enabled |
|---|---|---|---|---|
| `down` | **Down** | `never deployed` / `stopped` / `removed` | **Start** | yes |
| `starting` | **Starting…** | the deployment's own status, humanised (*building*, *deploying*) — the finer `DeploymentEventStep` needs a subscription the project token cannot open | *Starting…* | no |
| `up` | **Up** | deployment URL as a link, if any; `n replicas` if `n > 1` | **Stop** | yes |
| `stopping` | **Stopping…** | — | *Stopping…* | no |
| `failed` | **Failed** | `FAILED` / `CRASHED` | **Start** | yes |
| `sleeping` | **Sleeping** | *serverless sleep — wakes on traffic* | **Stop** | yes |
| `unknown` | **Unknown** | the literal statuses observed | **Start** and **Stop** | yes, both — the user knows more than the table |

Always present, below: a one-line **connection** indicator (`live` / `reconnecting`)
for the SSE stream, and the **last error**, if any, as
`<human sentence> · trace <traceId>` — cleared on the next successful state.

Rules:

- A press while the control is disabled does nothing. A press that reaches the
  server while a transition is in flight gets `409 transition-in-flight` and
  the page shows *already starting* / *already stopping* — no error styling.
- First paint is from `GET /api/container/state`; the SSE stream is opened
  immediately after and every event replaces the whole state. A refresh
  mid-transition therefore shows the transition, not a reset.
- Externally-initiated changes (dashboard, sleep, crash) arrive over the same
  stream and render through the same table. Nothing distinguishes "we did
  this" from "this happened", because the API does not either.
- No optimistic transition: the control disables on press and re-enables only
  when a new state arrives. If no state arrives within 10 s of an accepted
  press, the detail line adds *waiting for Railway…* — still not an error.
- Pending `Q-UI-4`: the names of project, environment and service in the
  header (three one-shot reads at startup, no picker); *last known at HH:MM*
  on the `reconnecting` indicator; a link to the deployment in the Railway
  dashboard while `starting` / `failed`. None of the three changes the state
  model; all three come from the journey's stage 1 and stage 4.

## 2. Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│ browser (one page)                                                   │
│   GET  /api/container/state           first paint                    │
│   EventSource /api/container/events   SSE: ContainerState            │
│   POST /api/container/up · /down                                     │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  same origin, no token
┌───────────────────────────────▼──────────────────────────────────────┐
│ app/api/container/*  (route handlers)   maps HTTP ⇄ container/       │
├──────────────────────────────────────────────────────────────────────┤
│ container/                              domain verbs, one state type │
│   actions.ts   up() · down() · inFlight()                            │
│   poller.ts    watch() — 30 s idle, 2 s in flight   (D-API-7)        │
│   state.ts     deriveContainerState(view) → ContainerState  (pure)   │
├──────────────────────────────────────────────────────────────────────┤
│ railway/                            the only module that knows Railway
│   credential.ts  Credential · headersFor() · fromEnv()               │
│   transport.ts   execute(doc, vars)            HTTPS POST            │
│   errors.ts      RailwayError · classify(status, body)               │
│   operations/    *.graphql, validated against the schema excerpt     │
│   generated/     types from the excerpt                              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  Project-Access-Token                │
                                ▼
                 https://backboard.railway.com/graphql/v2
```

Rules the layering enforces (each is a line in `verification.md`):

- Nothing outside `railway/` imports a `.graphql` document or mentions the host.
- Nothing outside `container/actions.ts` calls a mutation.
- Nothing in the browser bundle mentions the host or the credential.

## 3. Credential — `D-API-2`

```ts
type Credential =
  | { kind: 'account' | 'workspace' | 'oauth'; token: string }  // Authorization: Bearer <token>
  | { kind: 'project';                       token: string }; // Project-Access-Token: <token>

function headersFor(c: Credential): Record<string, string>;
function fromEnv(env: NodeJS.ProcessEnv): Credential;          // throws at startup, never later
```

Configuration, names only (`.env.example` carries these; `.env` is ignored):

```
RAILWAY_TOKEN_KIND=project          # account | workspace | project
RAILWAY_TOKEN=
RAILWAY_PROJECT_ID=
RAILWAY_ENVIRONMENT_ID=
RAILWAY_SERVICE_ID=
CONSOLE_PASSPHRASE=                 # only if Q-SEC-4 says yes; absent = no gate
```

The kind is declared, not inferred. The recommended kind is `project` — least
privilege, and verified to perform every HTTP operation the console needs
(`Q-API-8`). It cannot open a subscription, which is one of the two reasons
`D-API-7` polls instead.

## 4. Transport — `D-API-3`

```ts
function execute<TData, TVars>(
  doc: TypedDocument<TData, TVars>, vars: TVars,
): Promise<TData>;                   // rejects with RailwayError, never with a raw Response

type RailwayError =
  | { kind: 'not-authorized'; traceId?: string }
  | { kind: 'validation';     message: string; traceId?: string }
  | { kind: 'rate-limited';   retryAfterSeconds?: number }
  | { kind: 'network';        cause: unknown }
  | { kind: 'unknown';        message: string; code?: string; traceId?: string };

function classify(status: number, body: unknown): RailwayError | null;   // null = no error
```

`classify` reads the body first and the status second, because the observed
auth failure is `200` + `errors[].message === "Not Authorized"`. The string
match is in exactly one place, named, with the research citation next to it —
so that when `Q-SEC-3` is answered, one line changes.

`429` is the one status that *is* meaningful; `Retry-After` is read when
present. Mutations are **never retried automatically** — they are not
idempotent (operations research §6). The one-shot read may be retried once
after `Retry-After`.

## 5. Keeping state current — `D-API-7`

```ts
function pollOnce(): Promise<ContainerView>;          // one HTTP read
function watch(): AsyncIterable<ContainerState>;      // the poller, derived and de-duplicated
```

**Polling, not subscriptions.** The experiment
([`…/2026-09-14-experiment-stop-and-start.md`](../../_research/2026-09-14-experiment-stop-and-start.md))
killed the subscription design twice over: a project token is refused at
`subscribe`, and even with an account token the stream never reports a
`deploymentStop`, because that changes only the instances and the stream fires
on `status`.

| Situation | Interval | Requests |
|---|---|---|
| idle | 30 s | 120 / hour |
| transition in flight | 2 s, until a terminal phase or 90 s | ~45 per press |
| a browser connects, reconnects, or refreshes | — | 0 — served from the poller's last value |

One poller per process, whatever the number of viewers. The browser still
never talks to Railway and still holds no state. Against the observed
1 000 requests/hour the idle cost is 12 % and leaves room for ~19 presses an
hour, which is more than a demo will ever see.

Two properties the polling design keeps that the subscription would not:

- it notices a change the console did not make — the dashboard, a crash,
  serverless sleep — within 30 s, which is what `Q-UI-2` asks for;
- it works with the least-privileged credential, which is what `D-API-2`
  wants.

The subscription is not deleted from the research; it is an extension (§12)
with a documented reason for not being used, and three questions for Railway
(`Q-API-7`).

## 6. State — `D-API-4`

```ts
type ContainerState =
  | { phase: 'down';     reason: 'never-deployed' | 'stopped' | 'removed' }
  | { phase: 'starting'; deploymentId: string; step?: DeploymentEventStep }
  | { phase: 'up';       deploymentId: string; url?: string; replicas: number }
  | { phase: 'stopping'; deploymentId: string }
  | { phase: 'failed';   deploymentId: string; status: 'FAILED' | 'CRASHED' }
  | { phase: 'sleeping'; deploymentId: string }
  | { phase: 'unknown';  observed: string };    // shown, never hidden

type ContainerView = {                          // what the two read operations return
  hasEverDeployed: boolean;
  latestDeployment: null | {
    id: string; status: DeploymentStatus; deploymentStopped: boolean; url?: string;
    instances: { id: string; status: DeploymentInstanceStatus }[];
  };
};

function deriveContainerState(view: ContainerView): ContainerState;   // pure, total
```

Derivation, in order; the first matching row wins. `[to-verify]` rows are the
ones `Q-API-6` will confirm or correct — and the ones the owner's `Q-API-2`
pick may reshape (if "down" is `deploymentRemove`, rows 3 and 8–9 swap roles).

| # | `latestDeployment` | `instances[].status` | → `phase` | Mark |
|---|---|---|---|---|
| 1 | `null`, `hasEverDeployed = false` | — | `down / never-deployed` | observed field semantics |
| 2 | `null`, `hasEverDeployed = true` | — | `down / removed` | inferred |
| 3 | `REMOVED` | — | `down / removed` | observed enum |
| 4 | `REMOVING` | — | `stopping` | observed enum |
| 5 | `QUEUED · WAITING · NEEDS_APPROVAL · BUILDING · DEPLOYING · INITIALIZING` | any | `starting` | observed enum |
| 6 | `FAILED · CRASHED` | — | `failed` | observed enum |
| 7 | `SLEEPING` | — | `sleeping` | observed enum |
| 8 | `SUCCESS`, `deploymentStopped = true` | — | `down / stopped` | **observed** |
| 9 | `SUCCESS` | all ∈ `{STOPPED, EXITED}` | `down / stopped` | **observed** (`EXITED`; `STOPPED` never seen) |
| 10 | `SUCCESS` | any ∈ `{REMOVING}` | `stopping` | inferred |
| 11 | `SUCCESS` | any ∈ `{CREATED, INITIALIZING, RESTARTING}` | `starting` | inferred |
| 12 | `SUCCESS` | ≥ 1 `RUNNING`, none of the above | `up` | **observed** |
| 13 | anything else | anything else | `unknown` with the literal values | — |

Row 13 is the honesty clause from `D-UI-1`: a combination the table does not
know is shown as such, not rounded to the nearest happy state.

**The order is load-bearing, not cosmetic.** A deployment that has not started
yet reads `deploymentStopped = true` with `instances = []` while
`status = DEPLOYING` — observed. Rows 4–7 match on `status` first, so row 8
never sees it. Reordering the table would make the console report a starting
container as down. `V-37` verifies exactly this.

## 7. Verbs — `D-API-5` (recommendation; owner decides `Q-API-2`)

```ts
function up():       Promise<{ deploymentId: string }>;   // restart a stopped deployment, else deploy a new one
function down():     Promise<void>;                        // read latestDeployment.id → <owner's verb>(id)
function watch():    AsyncIterable<ContainerState>;        // the poller (§5) → derive
function inFlight(): 'up' | 'down' | null;                 // set on accept, cleared on the next terminal state
```

`up()` in the recommended pair, verified live:

```
read latestDeployment
  → exists and derives to `down / stopped`  →  deploymentRestart(id)      ~8 s, same id
  → otherwise                               →  serviceInstanceDeployV2()  ~16 s, new id
```

The bodies of `Up.graphql` and `Down.graphql` are the only things `Q-API-2`
changes. The signatures above do not move whichever of `deploymentStop`,
`deploymentRemove`, `serviceInstanceUpdate(numReplicas)` or `serviceDelete` the
owner picks — with one exception: candidate (c), delete/create, changes
`RAILWAY_SERVICE_ID` from configuration to state, and is the reason it is the
least recommended.

`numReplicas: 0` is no longer a fallback — the API rejects `0`.

`watch()` is the poller of §5. The `deploymentEvents` step that §1 shows while
starting came from the subscription and is no longer available at 2 s
granularity for a project token; the detail line falls back to the deployment's
own `status` (*building*, *deploying*) unless `Q-API-7` says otherwise.

`inFlight()` is the server-side guard behind `409`: set when a mutation is
accepted, cleared when `watch()` yields a phase other than `starting` /
`stopping`, and also cleared by a 2-minute timeout so that a lost subscription
cannot wedge the console — after which the next press goes through and the
state, whatever it is, is shown.

## 8. Sequences

### Pressing Start

```
browser            server                           Railway
  │ POST /up          │                                │
  │──────────────────▶│ inFlight()? → 409              │
  │                   │ read latestDeployment ────────▶│
  │                   │ stopped ? deploymentRestart(id)│
  │                   │         : deployV2()  ────────▶│
  │◀── 202 {deploymentId}   inFlight = 'up'            │
  │                   │ poller → 2 s                   │
  │                   │──── read ─────────────────────▶│ DEPLOYING
  │◀── SSE starting   │                                │
  │                   │──── read ─────────────────────▶│ SUCCESS / [RUNNING]
  │◀── SSE up         │  inFlight = null, poller → 30 s│
```

The HTTP response returns as soon as Railway has accepted the mutation. Nothing
in the response claims the container is up; that claim only ever travels over
the SSE channel, from a derived state, after Railway said so.

### Refresh mid-transition

```
browser (new)      server
  │ GET /state        │  → ContainerState from memory (starting, step: HEALTHCHECK)
  │ EventSource       │  → first event: the same state; then live
```

No Railway request; no reset; the disabled control and the step are back
within one round trip.

### Double press, second tab

```
tab A: POST /up → 202          inFlight = 'up'
tab B: POST /up → 409 transition-in-flight   (no Railway request)
```

### Change the console did not make

```
poller (≤30 s) ── read ──▶ Deployment{CRASHED} → derive → SSE failed → both tabs show Failed
```

Detection is bounded by the idle interval: a change the console did not make
appears within 30 seconds, not instantly. That is the price of `D-API-7`, and
it is stated rather than hidden.

### Railway refuses

```
POST /down → execute(Down) rejects not-authorized{traceId}
           → 502 { error: "railway-not-authorized", traceId }
           → page: "Railway refused the request · trace 6317…", state unchanged
```

## 9. HTTP boundary — `D-API-6`

| Route | Returns |
|---|---|
| `GET  /api/container/state` | `ContainerState` |
| `GET  /api/container/events` | SSE stream of `ContainerState`, one event per change; current state first |
| `POST /api/container/up` | `202 { deploymentId }` · `409 transition-in-flight` · error |
| `POST /api/container/down` | `202 {}` · `409 transition-in-flight` · error |

Errors leaving the server have one shape, and it is not Railway's:

```json
{ "error": "railway-not-authorized" | "railway-rate-limited" | "railway-unavailable" | "railway-rejected" | "transition-in-flight",
  "traceId": "…",           // when Railway gave one
  "retryAfterSeconds": 30 } // rate-limited only
```

HTTP status per error: `409` in-flight · `429` rate-limited (with the same
`Retry-After`) · `502` not-authorized, rejected · `503` unavailable. No Railway
response body is forwarded verbatim. The `traceId` is.

If `CONSOLE_PASSPHRASE` is set (`Q-SEC-4`), the two `POST` routes require a
cookie set by a `POST /api/session` that checks it; the two `GET` routes stay
open — reading state is harmless. If it is unset, there is no gate.

There is no route to choose a project, environment or service.

## 10. Stack and runtime — `D-UI-2`

Next.js (App Router) + TypeScript, one process, `next start`. In Next.js terms:

```
app/
  page.tsx                      the one screen (client component for SSE)
  api/container/{state,events,up,down}/route.ts
src/
  railway/  container/          as in §2 — plain TypeScript, no Next imports
lib/runtime.ts                  the process singleton: socket, current state, inFlight
```

Two constraints the runtime imposes, recorded so nobody rediscovers them:

- The route handlers must run in the **Node** runtime (`export const runtime =
  'nodejs'`), not edge — the socket and SSE need a long-lived process.
- The singleton lives in module scope of a server-only file; with `next dev`'s
  hot reload it may be recreated, which is fine, and with `next start` it is
  one per process, which is what §5 assumes. Railway runs one container →
  one process → one socket.

Dependencies, deliberately few: `next`, `react`, `graphql` (for document
parsing and validation against the excerpt), `graphql-ws` (client for the
subprotocol; Node ≥ 22 has `WebSocket` built in), a codegen dev-dependency,
`vitest`. No GraphQL client framework — two documents and one subscription do
not need one, and the layer in §2 is the abstraction.

## 11. Where it runs — `D-OPS-1`

```
Railway project A "container-console"      Railway project B "console-target"
  service: console (this repo)               service: target  (public image, e.g. a tiny HTTP server)
  variables: RAILWAY_TOKEN_KIND=project      settings: serverless OFF, replicas 1, restart ON_FAILURE
             RAILWAY_TOKEN=<project token of B/production>
             RAILWAY_PROJECT_ID=B  RAILWAY_ENVIRONMENT_ID=B/production  RAILWAY_SERVICE_ID=target
```

- Account usage limit set before either exists (operations research §5).
- The target image is chosen for size and for having an HTTP endpoint, so
  `up` has a URL to show; it is not a product decision and can be swapped.
- Nothing in project A can touch project A: the token is scoped to B.

`[note]` The `Q-API-6` experiment ran inside a single project
(`railway-container-console`, service `target`, still present and stopped),
because that is what existed. The two-project split above is still the
deployment topology; the experiment's service can become project B's target, or
be deleted.

## 12. Minimum versus optional — the extension answers

Built: §1–§11. Not built, listed for R-6:

- **Live updates over the GraphQL subscription.** It exists and works — for an
  account token, and only for `status` changes. Using it would mean a broader
  credential *and* a hybrid with the poller anyway. The three questions it
  raises are `Q-API-7`. This is the sharpest item to talk through, because the
  reason for not using it was measured rather than assumed.
- **`deploymentEvents` step detail** while starting — same credential problem.
- A project / service picker (needs an account token; `D-API-6` rejected it).
- Restart, Redeploy and Rollback as separate controls.
- A logs pane on `deploymentLogs`.
- A passphrase, or "Login with Railway" OAuth, on the console.
- Press history — who pressed what, when.
- Choosing the image from the UI.

Each is one route and one operation on the existing layers; that is the point
of the layers.

## 13. Testing surface

Unit tests need no network: `classify`, `headersFor`, `fromEnv`,
`deriveContainerState`, the `409` guard, and the poller's cadence against a
fake clock. The fixtures are real: `_research/experiment-2026-09-14/` holds the
recorded frames, and rows 8–12 of §6 are tested against them. One integration
test needs a token and is skipped without it: a single live read that returns a
derivable `ContainerView`.
