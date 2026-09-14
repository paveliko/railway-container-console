# The experiment: what stop and start actually do

> Run 2026-09-14, 15:37–15:47 UTC, against a real service on Railway, with a
> **project token** for every mutation and an **account token** only where a
> subscription required one. This is the `Q-API-6` experiment. Everything below
> marked `[observed]` is a value read out of a live response; the raw frames are
> in the fixtures listed at the end.
>
> Target: project `railway-container-console` (`f72f2a6c…`), environment
> `production` (`e73cd62b…`), service `target` (`09ee9790…`), image
> `nginx:alpine`. Left **stopped** at the end. Neither token is in this
> repository.

## The headline

`[observed]` **`deploymentStop` leaves `status: SUCCESS`.** The stop is visible
only in `deploymentStopped` and in the instances.

```
15:41:17.383  deploymentStop(id) → true
15:41:18.188  status=SUCCESS  deploymentStopped=false  instances=[RUNNING]
15:41:24.237  status=SUCCESS  deploymentStopped=true   instances=[EXITED]
              … unchanged for the next 80 s
```

A console that read `status === "SUCCESS"` as "the container is up" would have
shown a stopped container as running, indefinitely. `D-API-4` was written
against the schema on the guess that this would happen; it happens.

`[observed]` The instance status is **`EXITED`**, not `STOPPED`. Row 9 of the
derivation table in `design.md` §6 listed both; only `EXITED` was seen.

## Timeline, with what each step proves

| Time (UTC) | Action / observation | What it settles |
|---|---|---|
| 15:37:17 | `serviceCreate(source:{image:"nginx:alpine"})` → service id | **A project token may create a service** — `Q-API-8` |
| 15:37:21 | `hasEverDeployed=false`, `latestDeployment=null`, `numReplicas=null` | Row 1 of the table: `down / never-deployed`. **`serviceCreate` does not deploy** |
| 15:37:45 | `serviceInstanceDeployV2` → `2e83786c…` | Up works; returns the id to watch |
| 15:37:55 | `status=SUCCESS`, `instances=[RUNNING]` — **10 s** from call to running | Row 12. An image source really does skip build |
| 15:41:17 | `deploymentStop` → `true` | — |
| ≤ 15:41:24 | `SUCCESS` / `stopped=true` / `[EXITED]` — **≤ 7 s** | **Rows 8 and 9 confirmed** |
| 15:42:5x | `deploymentRestart` on the **stopped** deployment → `true` | see below |
| ≤ +8 s | `SUCCESS` / `stopped=false` / `[RUNNING]`, **same deployment id** | Candidate (c) is real |
| 15:45:10 | `serviceInstanceDeployV2` → **new** id `534f564c…` | Up after stop always available |
| 15:45:12 | new: `DEPLOYING`, `instances=[]`, **`deploymentStopped=true`** | see "the trap" below |
| 15:45:27 | new: `SUCCESS` / `[RUNNING]` — 16 s | — |
| 15:45:28–30 | **old** deployment: `REMOVING` → `REMOVED`, `instances=[REMOVED]`, unasked | Railway retires the previous deployment itself |
| 15:46:5x | `serviceInstanceUpdate(numReplicas: 0)` → **error** | `Q-API-5` closed, negative |
| 15:47 | `numReplicas: 1` restored, `deploymentStop` → left down | cleanup |

## `deploymentRestart` works on a stopped deployment — the docs say otherwise

`[observed]` `deploymentRestart(id)` called on a deployment that had been
stopped returned `true`, and within 8 seconds that **same deployment id** read
`status=SUCCESS`, `deploymentStopped=false`, `instances=[RUNNING]`.

`[observed]` The documentation gloss is *"Restart a **running** deployment
without rebuilding"*, and the dashboard's Restart is documented for *crashed*
deployments. Neither says it revives a stopped one.

`[inferred]` The Railway employee who answered *"you probably want
`deploymentStop` and `deploymentRestart`"* on the support forum was right, and
the published gloss is narrower than the behaviour. This makes candidate (c) of
`Q-API-2` the only pair that keeps one deployment across a down-and-up cycle.

`[to-verify]` Whether restart still works after a long stop, once the image has
aged past the plan's retention. Not tested; the stop here lasted ~90 seconds.

## The trap: `deploymentStopped` is true before anything has started

`[observed]` At 15:45:12 the brand-new deployment read
`status=DEPLOYING`, `instances=[]`, `deploymentStopped=true`.

`[inferred]` `deploymentStopped` means *"no instance is running"*, which is
true of a deployment that has not started yet as well as one that has been
stopped. Read on its own it would report a starting container as down.

`[observed]` The derivation table in `design.md` §6 survives this only because
of its **order**: rows 4–7 match on `status` before row 8 ever looks at
`deploymentStopped`. That ordering was not designed for this case; it is lucky.
It is now load-bearing and must be verified as such — `V-33` is extended to say
`deploymentStopped=true` must **not** produce `down` when `status` is a
transitional value.

## `subscription deployment(id)` does not see a stop

This is the finding that costs a decision.

`[observed]` Subscribed with an account token to the deployment that was then
stopped: **one frame arrived, carrying the pre-stop state**
(`SUCCESS`/`false`/`[RUNNING]`), and nothing after it. The transition to
`EXITED` was caught only by the HTTP poll running alongside.

`[observed]` Subscribed to a deployment while it was being created and
replaced: frames **did** arrive — `DEPLOYING → SUCCESS` on the new deployment,
`REMOVING → REMOVED` on the old one, both within ~2 s of the change.

`[inferred]` The subscription pushes when the deployment's **`status`** field
changes. `deploymentStop` does not change `status` — it changes only
`deploymentStopped` and the instances — so the subscription has nothing to
push. The one and only transition the console must show for "down" is exactly
the one the stream does not carry.

## A project token cannot subscribe at all

`[observed]` The same subscription, same deployment id, two credentials:

| Credential | Result |
|---|---|
| Project token, in `connection_init.payload` as `Project-Access-Token` | `{"id":"d","type":"next","payload":{"errors":[{"message":"Problem processing request"}]}}` then `complete` |
| Account token, as `Authorization: Bearer …` | accepted; frames delivered (see above) |

`[observed]` The same project token performs every **HTTP** operation used in
this experiment without complaint, including mutations.

`[observed]` **`connection_ack` proves nothing.** It is returned for a garbage
token, for an empty `connection_init` payload, and for no payload at all.
Authorization is enforced at `subscribe`.

`[observed]` **Subscription errors arrive inside a `next` frame**, as
`payload.errors`, not as a `type:"error"` frame. A client that handles only
`error` frames sees a subscription that silently produces nothing.

`[inferred]` This corrects `2026-09-14-railway-graphql-surface.md` §1, which
read `connection_ack` as evidence that the handshake authenticates. It does
not.

## `numReplicas: 0` is rejected

`[observed]`

```
serviceInstanceUpdate(input: { numReplicas: 0 })
→ HTTP 200
  {"errors":[{"message":"Error in numReplicas - Invalid input",
              "extensions":{"code":"INTERNAL_SERVER_ERROR"},
              "traceId":"498867609512240188"}],"data":null}
```

`Q-API-5` closes, negative. `numReplicas: 1` on the same mutation returned
`true`.

`[inferred]` Two things for `classify` (`D-API-3`): a plain **validation**
failure also arrives as HTTP 200 with `extensions.code:
INTERNAL_SERVER_ERROR`, so the code distinguishes neither auth nor validation
— only `GRAPHQL_VALIDATION_FAILED`, which is for malformed documents, is
meaningful. And the message *is* useful here (`"Error in numReplicas - Invalid
input"`), so `kind: 'unknown'` must carry the message to the UI, not swallow it.

## What this does to the five candidates for `Q-API-2`

| | Down | Up | Verdict after the experiment |
|---|---|---|---|
| a | `deploymentStop` | `serviceInstanceDeployV2` | **Works.** Every up costs a new deployment and ~16 s |
| b | `deploymentRemove` | `deploymentRedeploy` / `deployV2` | Not tested — Railway does this transition itself when a new deployment succeeds (`REMOVING → REMOVED` observed) |
| **c** | `deploymentStop` | `deploymentRestart` | **Works, verified.** Same deployment id, ~8 s, needs `deployV2` only for the first-ever up |
| d | `numReplicas: 0` | `numReplicas: 1` | **Dead.** `0` rejected |
| e | `serviceDelete` | `serviceCreate` | Not tested; `serviceCreate` permission confirmed |

## Cost

`[observed]` One `nginx:alpine` replica ran for roughly ten minutes across the
whole experiment. `[inferred]` At $20/vCPU-month and $10/GB-month that is a
fraction of a cent. `[to-verify]` `Q-OPS-2` — whether the deployment now
sitting stopped is billed — needs the usage page checked a day later.

## Fixtures

Raw frames, kept out of the repository until the client code exists to load
them (`tasks.md` T-3.4 will copy them into `src/container/__fixtures__/`):
`frames.jsonl`, `stop-frames.jsonl`, `fidelity.jsonl`, plus the four mutation
responses, in this session's scratchpad.

## Sources

Live responses from `https://backboard.railway.com/graphql/v2` and
`wss://backboard.railway.com/graphql/v2`, 2026-09-14 15:37–15:47 UTC.
