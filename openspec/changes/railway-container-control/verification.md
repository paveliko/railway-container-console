# Verification: `railway-container-control`

One criterion per line. Each is a test, a build step, a CI check or a manual
check with a stated procedure, and it passes or fails. `unit` needs no network;
`live` needs a token and is skipped without one; `build` runs at build time;
`manual` is a numbered procedure a second person can repeat. Requirement IDs
(`R-N`) are from the brief's requirement register.

## Credential

- V-1 `unit` — With `RAILWAY_TOKEN_KIND=project`, the outgoing request carries `Project-Access-Token: <token>` and **no** `Authorization` header.
- V-2 `unit` — With `RAILWAY_TOKEN_KIND` ∈ `{account, workspace}`, it carries `Authorization: Bearer <token>` and **no** `Project-Access-Token` header.
- V-3 `unit` — With `RAILWAY_TOKEN_KIND` missing or any other value, `fromEnv` throws before the server listens, and the message names the accepted values.
- V-4 `unit` — With any of `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID` missing, startup fails naming the missing variable.

## Transport and errors

- V-5 `unit` — Given the observed fixture (HTTP 200, `errors[0].message = "Not Authorized"`, `extensions.code = "INTERNAL_SERVER_ERROR"`, `data: null`), `execute` rejects with `RailwayError{ kind: 'not-authorized' }` and the fixture's `traceId`.
- V-6 `unit` — Given HTTP 200 with `extensions.code = "GRAPHQL_VALIDATION_FAILED"`, `execute` rejects with `kind: 'validation'` and the message.
- V-7 `unit` — Given HTTP 429 with `Retry-After: 30`, `execute` rejects with `kind: 'rate-limited'`, `retryAfterSeconds: 30`.
- V-8 `unit` — Given HTTP 429 without `Retry-After`, `retryAfterSeconds` is `undefined`, not `NaN` or `0`.
- V-9 `unit` — Given `fetch` rejecting, `execute` rejects with `kind: 'network'` and the original error as `cause`.
- V-10 `unit` — Given HTTP 200 with `data` present and no `errors`, `execute` resolves with `data` typed as the document's result.
- V-11 `unit` — Given `ratelimit-policy: "default";q=1000;w=3600`, the parsed budget is `{ limit: 1000, windowSeconds: 3600 }`; given the header absent, budget is `undefined` and nothing throws.
- V-12 `unit` — A mutation document is issued exactly once per `up()` / `down()` call even when `execute` rejects with `rate-limited` or `network` — no automatic retry of mutations.

## Boundary

- V-13 `unit` — For every `RailwayError.kind` and for `transition-in-flight`, the HTTP response from `/api/container/*` has exactly the keys `{ error, traceId?, retryAfterSeconds? }` and the status in design §9; a snapshot test over all kinds.
- V-14 `unit` — No string from a Railway response body other than `traceId` appears in a console error response (fixture with a sentinel string in `message`; sentinel must not appear).
- V-15 `build` — The browser bundle contains neither the string `backboard.railway.com` nor the value of `RAILWAY_TOKEN` (grep over the built assets with a sentinel token). *(R-3 via A-2, `D-SEC-1`)*
- V-16 `live` — Loading the console in a headless browser produces zero requests to any host other than the console's own origin (request log).
- V-17 `unit` — `POST /api/container/up` responds `202 { deploymentId }` before any `ContainerState` with `phase: 'up'` has been emitted (ordering asserted with a fake Railway).
- V-18 `unit` — While `inFlight() = 'up'`, a second `POST /up` and a `POST /down` both return `409 { error: 'transition-in-flight' }` and issue **no** Railway request.
- V-19 `unit` — `inFlight()` clears when `watch()` yields a phase ∉ `{starting, stopping}`, and also clears after 120 s with no such phase.
- V-20 `unit` — With `CONSOLE_PASSPHRASE` set, `POST /up` without the session cookie returns `401`; `GET /state` and `GET /events` still return `200`. With it unset, `POST /up` needs no cookie.

## Keeping state current — `D-API-7`

- V-21 `live` — One read with the project token returns a `ContainerView` that `deriveContainerState` maps to a phase without falling to row 13. Skipped, not failed, when no token is present.
- V-22 `unit` — With no transition in flight the poller issues one read per 30 s (fake clock, 10 simulated minutes → 20 reads, ±1).
- V-23 `unit` — On an accepted mutation the poller switches to 2 s; on reaching a terminal phase it returns to 30 s; with no terminal phase it returns to 30 s after 90 s.
- V-24 `unit` — Two identical consecutive reads produce **one** SSE event, not two: states are de-duplicated by value.
- V-25 `unit` — A read that rejects with `network` or `rate-limited` leaves the last known state unchanged, emits no SSE event, and does not stop the poller; the next tick proceeds.
- V-26 `unit` — An SSE client that connects receives the last known `ContainerState` as its first event, from memory, without a new Railway request; likewise a second client and a reconnecting client.
- V-26a `unit` — The number of Railway reads is independent of the number of connected SSE clients (0, 1 and 5 clients → identical read counts).

## State derivation

- V-27 `unit` — `{ hasEverDeployed: false, latestDeployment: null }` → `{ phase: 'down', reason: 'never-deployed' }`.
- V-28 `unit` — `{ status: 'SUCCESS', deploymentStopped: true, instances: [{ status: 'EXITED' }] }` → `{ phase: 'down', reason: 'stopped' }` — the shape actually observed after `deploymentStop`. Same for `STOPPED`, which the enum allows but the experiment never produced.
- V-29 `unit` — `{ status: 'SUCCESS', deploymentStopped: false, instances: [{ status: 'RUNNING' }] }` → `{ phase: 'up', replicas: 1 }`.
- V-30 `unit` — `{ status: 'SUCCESS', instances: [{ status: 'RUNNING' }, { status: 'RUNNING' }] }` → `replicas: 2`.
- V-31 `unit` — `{ status: 'BUILDING' }` → `phase: 'starting'`; `DEPLOYING`, `INITIALIZING`, `QUEUED`, `WAITING`, `NEEDS_APPROVAL` likewise.
- V-32 `unit` — `{ status: 'FAILED' }` → `{ phase: 'failed', status: 'FAILED' }`; `CRASHED` likewise.
- V-33 `unit` — `{ status: 'SLEEPING' }` → `phase: 'sleeping'`.
- V-34 `unit` — `{ status: 'REMOVING' }` → `'stopping'`; `{ status: 'REMOVED' }` → `{ phase: 'down', reason: 'removed' }`.
- V-35 `unit` — Property test: for every `DeploymentStatus` × every multiset of up to 3 `DeploymentInstanceStatus` values × `deploymentStopped ∈ {true,false}`, `deriveContainerState` returns a value and never throws.
- V-36 `unit` — Any combination not covered by rows 1–12 of the design table returns `phase: 'unknown'` whose `observed` string contains the literal status and every literal instance status.
- V-37 `unit` — `deriveContainerState` never returns `phase: 'up'` when `deploymentStopped` is `true`, whatever the instances say; **and** `{ status: 'DEPLOYING', deploymentStopped: true, instances: [] }` — what a not-yet-started deployment really reports — returns `phase: 'starting'`, not `down`. Ordering regression test.
- V-38 `unit` — Every frame in `_research/experiment-2026-09-14/*.jsonl` derives to the phase the experiment log records for that moment: `SUCCESS`/`stopped=true`/`[EXITED]` → `down / stopped`; `SUCCESS`/`stopped=false`/`[RUNNING]` → `up`; `DEPLOYING`/`stopped=true`/`[]` → `starting`; `REMOVED`/`[REMOVED]` → `down / removed`.

## Operations documents

- V-39 `build` — Every document under `railway/operations/` validates against `_research/railway-schema-excerpt.graphql`; a document using a field not in the excerpt fails the build.
- V-40 `build` — A `.graphql` file containing `mutation` is imported only from `container/actions.ts`; any other importer fails the build (lint rule or grep). **Restated for packages** (`D-OPS-2` ratified 2026-09-14) as `V-MW-10` — documents live only in `@repo/railway-client` — and `V-CV-9` — only `container-core/actions.ts` calls a verb on the provider. This line is now verified in its restated form only.
- V-41 `build` — The host `backboard.railway.com` appears in exactly one source file, `railway/transport.ts`. No `wss://` URL appears in the source at all (`D-API-7` removed the socket). **Restated for packages** (`D-OPS-2` ratified 2026-09-14) as `V-MW-9`: the host occurs in exactly one file under `packages/railway-client/src/`. This line is now verified in its restated form only.

## UI — *(R-4)*

- V-42 `unit` — For each `phase` in design §1, rendering `ContainerState` produces the headline, the detail line and the control label in that row (component test, one case per row).
- V-43 `unit` — For `starting` and `stopping`, the control is `disabled`; for every other phase it is not.
- V-44 `unit` — For `unknown`, both **Start** and **Stop** are rendered and enabled.
- V-45 `unit` — A `409` response to a press renders *already starting* / *already stopping* in the detail line and does **not** render the error line.
- V-46 `unit` — A `502` with `traceId` renders the error line containing the `traceId`; the headline and control stay as they were before the press.
- V-47 `unit` — An SSE event replaces the entire rendered state; no field from the previous state survives if absent from the new one (e.g. `url` disappears when phase leaves `up`).
- V-48 `unit` — On mount, the component issues `GET /state` first and opens `EventSource` second; it renders the `GET` result before the first SSE event (ordering asserted with fakes).
- V-49 `unit` — Nothing is written to `localStorage` / `sessionStorage` / cookies by the page, except the passphrase session cookie when `Q-SEC-4` applies.
- V-50 `manual` — Open the deployed URL in two tabs; press **Start** in tab A; within 2 s tab B shows *Starting…* with a disabled control; pressing in tab B shows *already starting* and nothing else changes.
- V-51 `manual` — Press **Start**; refresh the page during *Starting…*; the page comes back showing *Starting…* with the current step, not *Down*.

## Deployment — *(R-5)*

- V-52 `manual` — The console is reachable at a `*.up.railway.app` URL (or a custom domain) served by a Railway service in project A; `GET /api/container/state` there returns a `ContainerState` JSON.
- V-53 `manual` — The target service in project B has serverless **off** and `numReplicas = 1` in its settings; its project token is the one the console uses.
- V-54 `manual` — Railway's deploy logs for the console contain no token value (search the log for the token's first 8 characters).
- V-55 `manual` — With the console's variables removed one at a time, the service fails to start with the message from V-3/V-4 in the deploy log, and starts again when restored.
- V-56 `manual` — An account usage limit is set and visible on the Railway usage page before the first deploy of either project.

## Demo and README — *(R-6, R-7)*

- V-57 `manual` — The README states, in under one screen: what it does, the URL, how to run it locally (`.env.example` → `.env`), and where the decisions and open questions live.
- V-58 `manual` — Every `Q-<CAP>-N` owned by **Railway** has been sent to Railway before the interview, and `open-questions.md` records the date sent and any answer.
- V-59 `manual` — The walkthrough script (`tasks.md` T-8.3) demonstrates, in order: state on load → Start → steps → Up with URL → second-tab 409 → Stop → Down → refresh; and names three extensions from design §12.

## Settled before this change, by the `Q-API-6` experiment

`deploymentStop` leaves `SUCCESS` / `stopped=true` / `[EXITED]` (the V-38
fixtures) · `deploymentRestart` revives a stopped deployment, same id, ~8 s ·
a project token performs every mutation the console needs but cannot subscribe ·
`numReplicas: 0` is rejected.

## Not verified by this change

- Whether `deploymentRestart` still works after a long stop — `Q-API-9`. The up path falls back to `serviceInstanceDeployV2`, so this is a quality question, not a correctness one.
- Whether a stopped deployment is billed — `Q-OPS-2`; read the usage page.
- Whether Railway intends the subscription limits observed — `Q-API-7`.
