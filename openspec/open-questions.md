# Open Questions

> **Schema:** `| ID | Priority | Owner | Question | Source |`
>
> **Prefix by capability:** `Q-API-N` (Railway API surface), `Q-UI-N` (console),
> `Q-SEC-N` (tokens and secrets), `Q-OPS-N` (deploying this app).
>
> **Lifecycle.** A question closes either by registering the `D-<CAP>-N` that
> resolves it, or by being marked `withdrawn` with a reason. Questions are not
> edited in place — the resolution is appended, pointing at the closing decision.
>
> Numbering is dense. Numbers are not skipped and not reused.

---

## Railway API — `Q-API-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-API-1 | high | me | Which mutations actually spin a container up and down? Introspection is open, so this is read from the schema rather than guessed — but it needs a token first.<br><br>→ **Narrowed 2026-09-14.** The schema was introspected; the candidates are enumerated per level (service / deployment / replica) in `_research/2026-09-14-railway-domain-model.md`. Closes together with `Q-API-2`. | `_research/2026-09-14-railway-public-api.md` |
| Q-API-2 | high | me | Does "spin down" mean stopping a deployment, removing it, or scaling a service to zero — and does the reverse restore the same container or create a new one? The UI can only claim what the API actually did.<br><br>→ **Narrowed 2026-09-14.** Deploy and redeploy yield a new deployment id; `deploymentRestart` keeps it, and a Railway employee recommended `deploymentStop` + `deploymentRestart` on the forum for exactly this (`_research/2026-09-14-railway-customers-and-users.md` §4; whether restart works after stop is `[to-verify]`). The five candidates and their consequences are tabled in `_research/2026-09-14-railway-operations-and-cost.md` §2; `D-API-5` is a *recommendation* (`deploymentStop`). **This is the owner's decision** — stopping, removing, scaling to zero and deleting are different products — and closes when the owner picks and the `Q-API-6` experiment confirms what the pick leaves behind. | same |
| Q-API-3 | medium | me | Is there a subscription or event stream for deployment state, or is polling the only option? Determines whether the console can reflect state honestly within the rate limit.<br><br>→ **Resolved by `D-API-1`.** There is: `subscription deployment(id)` over `graphql-transport-ws` at the same URL, undocumented, handshake observed end-to-end (`_research/2026-09-14-railway-graphql-surface.md` §1). | same |
| Q-API-4 | medium | **Railway** | Which token type do you expect a candidate to use for this exercise — account, workspace or project? A project token is scoped to one environment and uses a different auth header, which changes the app's shape. | to ask before the interview |
| Q-API-5 | low | me | Is `serviceInstanceUpdate(numReplicas: 0)` accepted, and does it stop the running instances? It is the fallback "down" if `deploymentStop` turns out not to leave a state the console can read. Needs a live service. | `_research/2026-09-14-railway-domain-model.md` |
| Q-API-6 | high | me | What does a real `deploymentStop` look like through `subscription deployment(id)`: does `status` stay `SUCCESS`, do the instances read `STOPPED` or `EXITED`, does `deploymentStopped` flip, and how fast? Rows 8–12 of the state table in `changes/railway-container-control/design.md` are `[to-verify]` until this runs. Creates a paid service on the owner's account, so the owner runs it. | `changes/railway-container-control/design.md` |
| Q-API-7 | medium | **Railway** | The `Subscription` root works over `graphql-transport-ws` but is not in the public API docs. Is it a supported surface for a third-party client, does it count against the request budget, and does a project token authenticate over it (`connection_init` payload)? | to ask before the interview |
| Q-API-8 | medium | me | Can a **project token** call every mutation the console needs (`serviceInstanceDeployV2`, `deploymentStop`, and whichever alternative the owner picks)? The docs say it "authenticates requests to that environment" without listing permitted operations. Verified in the `Q-API-6` experiment, which should run with a project token for that reason. | `_research/2026-09-14-railway-operations-and-cost.md` §1 |

## Console — `Q-UI-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-UI-1 | high | me | How does the console reflect a container transitioning without naive polling? 100 requests/hour on a free account is exhausted in under two minutes at 1 Hz.<br><br>→ **Resolved by `D-API-1`.** It does not poll: the server holds one subscription and fans `ContainerState` out to the browser over SSE. Steady state costs zero requests. | `_research/2026-09-14-railway-public-api.md` |
| Q-UI-2 | medium | me | What does the UI show when the container is in a state it did not initiate — started or stopped from the Railway dashboard while the console is open?<br><br>→ **Resolved by `D-UI-3`** (on top of `D-API-1`): the same thing it shows for its own transitions — the state arrives over the same subscription and is rendered the same way. | `_research/2026-09-14-the-brief.md` |
| Q-UI-3 | medium | **owner** | Validate the primary user (`D-UI-4`) with 3–5 interviews in the chosen segment — developers who start and stop test environments — using the five questions in `_research/2026-09-14-user-hypotheses-and-cjm.md` §5. Until then the segment and the journey are hypotheses. Not on the critical path for the take-home, but it decides whether the journey's stage 1 and stage 4 needs are real. | `_research/2026-09-14-user-hypotheses-and-cjm.md` |
| Q-UI-4 | medium | me | Stage 1 of the journey wants the **names** of project, environment and service on screen; `D-API-6` fixes one configured triple and `design.md` §1 shows only the phase. Three one-shot reads at startup (`project(id){name}`, `environment(id){name}`, `service(id){name}`) would show the names without adding a picker — is that in the MVP? Same question for *last known at HH:MM* on the reconnecting indicator and for a link to the deployment in the Railway dashboard as the zero-cost "path to diagnosis". | `_research/2026-09-14-user-hypotheses-and-cjm.md` §4 |

## Tokens and secrets — `Q-SEC-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-SEC-1 | high | me | Where does the token live at runtime? A public repository and a deployed demo mean it cannot be in the client bundle, which forces a server side whether or not the brief asks for one.<br><br>→ **Resolved by `D-SEC-1`.** Since 2026-09-14 the server side is also forced by transport: CORS on `backboard.railway.com` is pinned to `https://railway.com` (`_research/2026-09-14-railway-graphql-surface.md` §2). | `_research/2026-09-14-the-brief.md` |
| Q-SEC-2 | medium | **Railway** | Should the deployed demo be usable by a reviewer with my token, or should they supply their own? The first is convenient and leaks capability; the second is safer and adds a step. | to ask before the interview |
| Q-SEC-4 | medium | me | The deployed demo is a public URL with two buttons that spend the owner's money and change real infrastructure. Should the console require a shared passphrase (one env var, one cookie) before accepting `POST /up` / `/down`, or is an unauthenticated demo acceptable for the interview window? Related to `Q-SEC-2` but independent of it — it applies even if the token is the owner's. | `changes/railway-container-control/proposal.md` |
| Q-SEC-3 | low | **Railway** | An auth failure comes back as HTTP 200 with `extensions.code: INTERNAL_SERVER_ERROR` and the message `"Not Authorized"`. Is matching that string the intended way for a client to detect it, or is there a stable code we should be reading? `D-API-3` isolates the match to one line pending the answer. | `_research/2026-09-14-railway-graphql-surface.md` |

## Deployment — `Q-OPS-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-OPS-1 | medium | me | Can the console spin containers within the same Railway project it is itself deployed to, or does that create a loop worth avoiding?<br><br>→ **Resolved by `D-OPS-1`:** separate projects. It could, and the loop is real — a wrong service id would let the console stop itself. | `_research/2026-09-14-the-brief.md` |
| Q-OPS-2 | medium | me / **Railway** | Is a deployment that has been stopped (`deploymentStop`) or removed billed for CPU/memory? The pricing and optimize-usage pages do not say; "only charged for the resources you actually use" implies not. Matters for how long the demo can sit stopped between interviews. Check the usage page after the `Q-API-6` experiment; ask Railway if unclear. | `_research/2026-09-14-railway-operations-and-cost.md` §5 |
