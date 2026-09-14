# Railway — tokens, the dashboard's own verbs, costs, retries

> Gathered 2026-09-14 from `docs.railway.com` (URLs at the end) and from the live
> schema excerpt. Marks: `[observed]` read from the source · `[inferred]`
> reasoned from it · `[to-verify]` not confirmed.
>
> This document answers four questions the other three do not: where tokens
> come from and what they can reach; what Railway's own dashboard calls the
> actions; what running and stopping a container costs; and what happens on
> a retry or a double press.

## 1. Tokens — where they are made, what they reach

`[observed]` From `docs.railway.com/guides/public-api`:

| Token | Created at | Reaches | Docs' warning |
|---|---|---|---|
| Account | `railway.com/account/tokens` | *"any API action you are authorized to do across all your resources and workspaces"* | *"Do not share this token with anyone else."* |
| Workspace | same page, workspace selected | *"all the workspace's resources, and cannot be used to access your personal resources or other workspaces"* | sharing with teammates permitted |
| Project | project settings → tokens | *"scoped to a specific environment within a project and can only be used to authenticate requests to that environment"* | — |
| OAuth | "Login with Railway" | what the user granted | for third-party apps |

`[observed]` Header per type is as recorded in
[`2026-09-14-railway-public-api.md`](2026-09-14-railway-public-api.md):
`Authorization: Bearer` for account / workspace / OAuth,
`Project-Access-Token` for project. The docs' smoke query for a project token is
`query { projectToken { projectId environmentId } }`.

`[inferred]` For a console that manages exactly one service in one environment
(`D-API-6`), a **project token** is the least privilege that works: it cannot
list or touch anything outside that environment, so a leak costs one
environment, not an account. It is also the type whose header is different,
which is why `D-API-2` makes the type explicit. Whether Railway *expects* a
project token for the exercise is `Q-API-4`.

`[to-verify]` Whether a project token is allowed to call every mutation the
console needs (`serviceInstanceDeployV2`, `deploymentStop`, and the
alternatives in §2). The docs say "authenticate requests to that environment";
they do not enumerate permitted operations. Folded into `Q-API-4`.

## 2. What the dashboard calls the actions — and what the API calls them

`[observed]` From `docs.railway.com/reference/deployments`, the actions a user
can take on a deployment in the dashboard:

| Dashboard action | Docs' description |
|---|---|
| **Restart** | restarts the process within the container; for crashes or lockups |
| **Redeploy** | *"Redeploys the selected deployment"* from its original source |
| **Rollback** | redeploys an older deployment, within the plan's retention policy |
| **Remove** | *"Stops the currently running deployment"* and marks it `REMOVED`, moving it to history |
| **Abort** | cancels initializing or building deployments |

**There is no dashboard action called "Stop".** The user-facing way to make a
container not run is *Remove*.

`[observed]` The API has both `deploymentRemove(id)` — *"Remove a deployment
from the history"* (manage-deployments page) — and `deploymentStop(id)` —
*"Halts a currently running instance."* (same page; in the schema: *"Stops a
deployment."*).

`[inferred]` The dashboard's *Remove* corresponds to `deploymentRemove`, which
both stops the container and moves the deployment out of the active set.
`deploymentStop` is an API-only verb with no documented dashboard counterpart;
what it leaves behind (a `SUCCESS` deployment with stopped instances, per the
schema — see the domain-model document) is exactly what `Q-API-6` has to look
at. This corrects an earlier sentence in
[`2026-09-14-railway-graphql-surface.md`](2026-09-14-railway-graphql-surface.md)
§5 that called "Stop" the dashboard's verb; it is not.

`[inferred]` So the four candidate meanings of "spin down" now read, with
their documented consequences:

| Candidate | What it does, per docs | What survives | Reverse |
|---|---|---|---|
| `deploymentStop(id)` | halts the running instance | service, config, the deployment record (`[to-verify]` its exact state) | `deploymentRedeploy(id)` or a new `serviceInstanceDeployV2` |
| `deploymentRemove(id)` | stops it **and** moves it to history, `REMOVED` | service, config, history entry; *"Removed deployments are not recoverable through standard means"* | `serviceInstanceDeployV2` (new deployment) — `canRedeploy` on a removed one `[to-verify]` |
| `serviceInstanceUpdate(numReplicas: 0)` | replica change is a *staged change*, applied *"without triggering a full redeploy"*; instances *"drained gracefully"* | everything — if `0` is accepted, which the scaling docs neither allow nor forbid | `numReplicas: 1` |
| `serviceDelete(id)` | *"This will delete the service and all its deployments."* | nothing | `serviceCreate` — a new service, new id, new domain |

`[observed — secondary]` A fifth pairing comes from Railway's support forum,
not the docs: asked how to *"temporarily disable a web service via the Public
API without deletion"*, a Railway employee answered *"you probably want
`deploymentStop` and `deploymentRestart`"*, and the asker reported both
returning successfully; a UI status that lagged the API was noted in the same
thread ([customers §4](2026-09-14-railway-customers-and-users.md)). That pair
keeps the **same deployment id** across down and up, which none of the four
above does. It needs the `Q-API-6` experiment like the others, and it still
needs `serviceInstanceDeployV2` for the very first up.

The choice between them is the owner's (`Q-API-2`); the differences are not
cosmetic.

## 3. Docs' state names vs. the API enum

`[observed]` The deployments reference describes the lifecycle as
`Initializing → Building → Deploying → Active` (or `Failed`), then `Crashed`,
`Completed` (*"the app exits with a zero exit code"*), `Removing → Removed`.

`[observed]` The API enum `DeploymentStatus` has no `ACTIVE` and no
`COMPLETED`; it has `SUCCESS`, `INITIALIZING`, `BUILDING`, `DEPLOYING`,
`FAILED`, `CRASHED`, `REMOVING`, `REMOVED`, plus `QUEUED`, `WAITING`,
`NEEDS_APPROVAL`, `SKIPPED`, `SLEEPING`.

`[inferred]` Dashboard *Active* = API `SUCCESS`. Dashboard *Completed* has no
enum value of its own and is most likely `SUCCESS` with every instance
`EXITED` — which is one more reason `D-API-4` reads the instances, not just
the status. `[to-verify]` under `Q-API-6`.

## 4. Replicas and serverless

`[observed]` Scaling reference: replicas are changed *"in the service
settings"*; the change *"will trigger a staged change. When applied, Railway
scales your service without triggering a full redeploy."* No minimum or maximum
is stated; **zero is neither allowed nor forbidden in the text.**

`[observed]` Serverless (formerly app sleeping): a service sleeps after
**5 minutes without outbound packets**; wakes on inbound traffic; first
requests after sleep can see cold-boot delay and *"may return 502 errors"*;
*"slept services still consume a slot on Railway's infrastructure"*.

`[inferred]` Serverless is a cost feature, not a control — it cannot be told
to sleep now. For this console it is a way the container can go down on its
own (`Q-UI-2`) and should be **off** on the target service.

## 5. What it costs

`[observed]` From `docs.railway.com/reference/pricing/plans`:

| Plan | Monthly | Included usage |
|---|---|---|
| Free | $0 | $1/month |
| Trial | $0 | $5 one-time |
| Hobby | $5 | $5/month |
| Pro | $20 | $20/month |

| Resource | Rate |
|---|---|
| CPU | $20 per vCPU-month |
| Memory | $10 per GB-month |
| Volume | $0.15 per GB-month |
| Egress | $0.05 per GB |

*"You are only charged for the resources you actually use."*

`[inferred]` Arithmetic, not a quote: a tiny image (say 0.05 vCPU and 64 MB
resident, idle) costs about $1.00 + $0.64 ≈ **$1.6 per month if left running
continuously**, inside the Hobby plan's included $5. The console itself, a
small Node process, costs about the same. The exercise fits in the included
credit with room to spare; a runaway (a crash loop, or a large image) would
not, so usage limits should be set on the account before the first deploy.

`[to-verify]` Whether a deployment that has been **stopped** (`deploymentStop`)
or **removed** is billed for anything. Neither the pricing page nor the
optimize-usage guide says. The guide's only statement is that serverless
*"stop[s] a service when it is inactive, effectively reducing the overall cost
to run it"*, which implies a stopped container is not metered for CPU/memory
but does not say so. Registered as `Q-OPS-2`.

`[observed]` Volumes: *"each service can only have a single volume"*; storage
billed per GB, minutely; limits 0.5 GB Free / 5 GB Hobby / 50 GB Pro; volumes
persist across redeploys (the docs warn only of brief downtime when
redeploying a service with a volume).

`[inferred]` Neither the console nor the target container needs a volume:
nothing has to persist. This is recorded so that it is a decision and not an
omission.

## 6. Retries, double presses, idempotency

`[observed]` No mutation in the excerpt takes an idempotency key or a
client-supplied id: `serviceInstanceDeployV2(serviceId, environmentId,
commitSha?)`, `deploymentStop(id)`, `deploymentRemove(id)`,
`serviceInstanceUpdate(...)`.

`[observed]` Deployments reference: *"When new deployments trigger, older ones
eventually become `Removed`."*

`[inferred]` Two `serviceInstanceDeployV2` calls in quick succession create
two deployments, and Railway itself retires the older one once the newer is
active. So a double press of "up" is not catastrophic, but it is wasteful (two
builds, two request-budget units) and it makes the console's own state
ambiguous for a minute. The console should refuse the second press
server-side, not only in the browser — recorded as `D-UI-3`.

`[to-verify]` `deploymentStop` on a deployment that is already stopped:
error, no-op, or `true` — unknown. `deploymentStop` on a deployment that is
still `BUILDING`: the docs point to *Abort* / `deploymentCancel` for that
phase. Both go into the `Q-API-6` experiment script.

`[observed]` Rate limiting: HTTP `429`, with `Retry-After` in the exposed
header list; observed policy `1000` per `3600` s on Hobby. `[inferred]` A
retry policy for the console: never retry a mutation automatically (it is not
idempotent); retry the one-shot read after a `429` once `Retry-After` elapses;
the subscription reconnects on its own (`D-API-1`).

## Sources — all read 2026-09-14

- `https://docs.railway.com/guides/public-api` — tokens
- `https://docs.railway.com/reference/deployments` — lifecycle, dashboard actions
- `https://docs.railway.com/integrations/api/manage-deployments` — API glosses
- `https://docs.railway.com/reference/scaling` — replicas
- `https://docs.railway.com/reference/app-sleeping` — serverless
- `https://docs.railway.com/reference/pricing/plans` — plans and rates
- `https://docs.railway.com/guides/optimize-usage` — cost controls
- `https://docs.railway.com/reference/volumes` — volumes
- `https://docs.railway.com/reference/services`, `…/guides/services` — sources, images
- [`railway-schema-excerpt.graphql`](railway-schema-excerpt.graphql) — mutation signatures
