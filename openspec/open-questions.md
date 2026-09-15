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
| Q-API-1 | high | me | Which mutations actually spin a container up and down? Introspection is open, so this is read from the schema rather than guessed — but it needs a token first.<br><br>→ **Narrowed 2026-09-14.** The schema was introspected; the candidates are enumerated per level (service / deployment / replica) in `_research/2026-09-14-railway-domain-model.md`. Closes together with `Q-API-2`.<br><br>→ **Closed 2026-09-15 by `D-API-5`**, which was ratified 2026-09-14 and whose own status line already said `Q-API-2` closes with it. The registry is what had not caught up: this row and the next stayed `open` for a day after the decision that answers them was signed. The mutations are `deploymentStop`, `deploymentRestart` and `serviceInstanceDeployV2`, and they are in `packages/railway-client/src/documents.ts`. No new ratification was asked of the owner for this. | `_research/2026-09-14-railway-public-api.md` |
| Q-API-2 | high | me | Does "spin down" mean stopping a deployment, removing it, or scaling a service to zero — and does the reverse restore the same container or create a new one? The UI can only claim what the API actually did.<br><br>→ **Narrowed 2026-09-14.** Deploy and redeploy yield a new deployment id; `deploymentRestart` keeps it, and a Railway employee recommended `deploymentStop` + `deploymentRestart` on the forum for exactly this (`_research/2026-09-14-railway-customers-and-users.md` §4; whether restart works after stop is `[to-verify]`). The five candidates and their consequences are tabled in `_research/2026-09-14-railway-operations-and-cost.md` §2.<br><br>→ **Narrowed again 2026-09-14 by the `Q-API-6` experiment.** `numReplicas: 0` is **rejected by the API** — candidate (d) is dead. `deploymentStop` ↔ `deploymentRestart` is **verified working**, keeps the same deployment id and takes ~8 s; `D-API-5` now recommends it. Still the owner's pick between stop/restart, stop/deploy, remove/redeploy and delete/create.<br><br>→ **Closed 2026-09-15 by `D-API-5`**, ratified 2026-09-14. The pick was made: **down = `deploymentStop(latestDeployment.id)`; up = `deploymentRestart(id)` when a stopped deployment exists, else `serviceInstanceDeployV2`.** So “spin down” means stopping the deployment — the service, its configuration and its history all survive — and the reverse restores *the same container* on the restart path, keeping the deployment id, while the deploy path mints a new one. `packages/railway-client/src/verbs.ts` implements exactly that and returns which id it acted on, because “something is up” is not the same claim as “the thing I started is up”. What the pair does **not** answer is whether restart still revives a deployment stopped for hours rather than ninety seconds; that is `Q-API-9` and it stays open. | same |
| Q-API-3 | medium | me | Is there a subscription or event stream for deployment state, or is polling the only option? Determines whether the console can reflect state honestly within the rate limit.<br><br>→ **Resolved by `D-API-1`.** There is: `subscription deployment(id)` over `graphql-transport-ws` at the same URL, undocumented, handshake observed end-to-end (`_research/2026-09-14-railway-graphql-surface.md` §1). | same |
| Q-API-4 | medium | **Railway** | Which token type do you expect a candidate to use for this exercise — account, workspace or project? A project token is scoped to one environment and uses a different auth header, which changes the app's shape. | to ask before the interview |
| Q-API-5 | low | me | Is `serviceInstanceUpdate(numReplicas: 0)` accepted, and does it stop the running instances?<br><br>→ **Closed 2026-09-14, negative.** `{"errors":[{"message":"Error in numReplicas - Invalid input"}]}`. `1` on the same mutation returns `true`. | `_research/2026-09-14-experiment-stop-and-start.md` |
| Q-API-6 | high | me | What does a real `deploymentStop` look like: does `status` stay `SUCCESS`, do the instances read `STOPPED` or `EXITED`, does `deploymentStopped` flip, and how fast?<br><br>→ **Closed 2026-09-14 — experiment run** (`_research/2026-09-14-experiment-stop-and-start.md`, raw frames in `_research/experiment-2026-09-14/`). `status` stays `SUCCESS`; `deploymentStopped` → `true`; instances → `EXITED` (never `STOPPED`); ≤ 7 s. Two findings beyond the question: the subscription does **not** report the stop, and a not-yet-started deployment also reads `deploymentStopped=true`. Feeds `D-API-4`, `D-API-7`. | `changes/railway-container-control/design.md` |
| Q-API-7 | medium | **Railway** | The `Subscription` root works over `graphql-transport-ws` but is not in the public API docs.<br><br>→ **Sharpened 2026-09-14 by experiment**, and now three concrete questions rather than one vague one: (1) Is a **project token** meant to be unable to subscribe? It performs every HTTP mutation we need, but `subscribe` is refused for it while an account token succeeds. (2) Is it intended that `subscription deployment(id)` does **not** fire when only the instances change — so a `deploymentStop` is invisible to a subscriber? (3) `connection_ack` is returned for a garbage token and for an empty payload; is the ack meant to carry no authentication signal at all? | to ask before the interview |
| Q-API-8 | medium | me | Can a **project token** call every mutation the console needs?<br><br>→ **Closed 2026-09-14, mostly yes.** Over HTTP a project token performed `serviceCreate`, `serviceInstanceDeployV2`, `deploymentStop`, `deploymentRestart` and `serviceInstanceUpdate`, and every read used in the experiment. **But it cannot open a subscription** — see `Q-API-7`. That single gap is what forced `D-API-7`. | `_research/2026-09-14-railway-operations-and-cost.md` §1 |
| Q-API-9 | low | me | Does `deploymentRestart` still revive a stopped deployment after a **long** stop — hours or days, once the image ages toward the plan's retention? The experiment stopped for ~90 seconds. If it degrades, the up path silently falls back to `serviceInstanceDeployV2` and the console must not promise "the same container". | `_research/2026-09-14-experiment-stop-and-start.md` |

## Console — `Q-UI-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-UI-1 | high | me | How does the console reflect a container transitioning without naive polling? 100 requests/hour on a free account is exhausted in under two minutes at 1 Hz.<br><br>→ **Resolved by `D-API-1`.** It does not poll: the server holds one subscription and fans `ContainerState` out to the browser over SSE. Steady state costs zero requests. | `_research/2026-09-14-railway-public-api.md` |
| Q-UI-2 | medium | me | What does the UI show when the container is in a state it did not initiate — started or stopped from the Railway dashboard while the console is open?<br><br>→ **Resolved by `D-UI-3`** (on top of `D-API-1`): the same thing it shows for its own transitions — the state arrives over the same subscription and is rendered the same way. | `_research/2026-09-14-the-brief.md` |
| Q-UI-3 | medium | **owner** | Validate the primary user (`D-UI-4`) with 3–5 interviews in the chosen segment — developers who start and stop test environments — using the five questions in `_research/2026-09-14-user-hypotheses-and-cjm.md` §5. Until then the segment and the journey are hypotheses. Not on the critical path for the take-home, but it decides whether the journey's stage 1 and stage 4 needs are real. | `_research/2026-09-14-user-hypotheses-and-cjm.md` |
| Q-UI-4 | medium | me | Stage 1 of the journey wants the **names** of project, environment and service on screen; `D-API-6` fixes one configured triple and `design.md` §1 shows only the phase. Three one-shot reads at startup (`project(id){name}`, `environment(id){name}`, `service(id){name}`) would show the names without adding a picker — is that in the MVP? Same question for *last known at HH:MM* on the reconnecting indicator and for a link to the deployment in the Railway dashboard as the zero-cost "path to diagnosis". | `_research/2026-09-14-user-hypotheses-and-cjm.md` §4 |
| Q-UI-5 | medium | **owner** | Where do `DeploymentStatus` and `DeploymentInstanceStatus` live once the code is packages? `ContainerState.starting.status` and `ContainerState.failed.status` carry a `DeploymentStatus` to the browser, so the browser contract already contains it, which argues for `@repo/contracts`. But it is Railway's vocabulary, hand-copied from the schema excerpt, and the gate in `railway-client` validates operation documents, not enums. **Recommendation:** `@repo/contracts`, with the excerpt cited in the file; `railway-client` imports them. **Alternative:** keep them in `railway-client` and have `contracts` declare `status: string` — loses the narrowed type in the UI and gives the `unknown` phase a second, weaker route to appear. Default if unanswered: `contracts`.<br><br>→ **Not answered in the `D-OPS-2` / `D-OPS-3` ratification of 2026-09-14, and still open.** `changes/monorepo-workspace` implements the **default** stated in this row — the enums live in `@repo/contracts/src/railway-enums.ts`, with the schema excerpt cited at the top of the file, and `@repo/railway-client` imports them. The file carries a comment naming this question, so reversing the default is one `git mv` and one type change in `contracts`. Recorded in `changes/monorepo-workspace/proposal.md` → *What is still open*. | `changes/monorepo-workspace/design.md` §2, §4 |

## Tokens and secrets — `Q-SEC-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-SEC-1 | high | me | Where does the token live at runtime? A public repository and a deployed demo mean it cannot be in the client bundle, which forces a server side whether or not the brief asks for one.<br><br>→ **Resolved by `D-SEC-1`.** Since 2026-09-14 the server side is also forced by transport: CORS on `backboard.railway.com` is pinned to `https://railway.com` (`_research/2026-09-14-railway-graphql-surface.md` §2). | `_research/2026-09-14-the-brief.md` |
| Q-SEC-2 | medium | **Railway** | Should the deployed demo be usable by a reviewer with my token, or should they supply their own? The first is convenient and leaks capability; the second is safer and adds a step. | to ask before the interview |
| Q-SEC-4 | medium | me | The deployed demo is a public URL with two buttons that spend the owner's money and change real infrastructure. Should the console require a shared passphrase (one env var, one cookie) before accepting `POST /up` / `/down`, or is an unauthenticated demo acceptable for the interview window? Related to `Q-SEC-2` but independent of it — it applies even if the token is the owner's.<br><br>→ **Closed 2026-09-15 by `D-SEC-2`**, which expands the `planned` row `T-1.4` was waiting for and overturns the default recorded there. The demo **is** gated: the deployment sets `CONSOLE_PASSPHRASE`, the two mutating routes require the session cookie, the two reading routes stay open. The passphrase reaches the reviewer privately, with the demo link; it is in no file in this public repository. | `changes/railway-container-control/proposal.md` |
| Q-SEC-3 | low | **Railway** | An auth failure comes back as HTTP 200 with `extensions.code: INTERNAL_SERVER_ERROR` and the message `"Not Authorized"`. Is matching that string the intended way for a client to detect it, or is there a stable code we should be reading? `D-API-3` isolates the match to one line pending the answer. | `_research/2026-09-14-railway-graphql-surface.md` |
| Q-SEC-5 | low | **owner** | Who reads the environment? Today `fromEnv` in `src/railway/credential.ts` returns the credential, the target *and* `CONSOLE_PASSPHRASE`; the passphrase is a console concern (`Q-SEC-4`), not a Railway one, and in the workspace `railway-client` must not know it. **Recommendation:** `railway-client` exports `credentialFromEnv` and `targetFromEnv`; `apps/console/src/server/config.ts` composes `Config` and adds the passphrase. `V-3` and `V-4` are unchanged. Default if unanswered: the recommendation.<br><br>→ **Not answered in the `D-OPS-2` / `D-OPS-3` ratification of 2026-09-14, and still open.** `changes/monorepo-workspace` implements the **default**: `@repo/railway-client` exports `credentialFromEnv` and `targetFromEnv`, and `apps/console/src/server/config.ts` composes `Config` and is the only reader of `CONSOLE_PASSPHRASE` (`V-MW-17`). Note that *some* split is forced by `D-OPS-2` — `railway-client` may not know a console concern — so what stays open is only whether the app or a further package owns `Config`. `V-1 … V-4` pass unchanged. Recorded in `changes/monorepo-workspace/proposal.md` → *What is still open*. | `changes/monorepo-workspace/design.md` §4 |

## Deployment — `Q-OPS-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-OPS-1 | medium | me | Can the console spin containers within the same Railway project it is itself deployed to, or does that create a loop worth avoiding?<br><br>→ **Resolved by `D-OPS-1`:** separate projects. It could, and the loop is real — a wrong service id would let the console stop itself. | `_research/2026-09-14-the-brief.md` |
| Q-OPS-2 | medium | me / **Railway** | Is a deployment that has been stopped (`deploymentStop`) or removed billed for CPU/memory? The pricing and optimize-usage pages do not say; "only charged for the resources you actually use" implies not. Matters for how long the demo can sit stopped between interviews. → **Now checkable:** as of 2026-09-14 15:47 UTC the service `target` sits with a **stopped** deployment (`SUCCESS`/`stopped=true`/`EXITED`) and has run for about ten minutes in total. Reading the usage page a day later separates "billed while stopped" from "billed only while running". | `_research/2026-09-14-railway-operations-and-cost.md` §5 |
| Q-OPS-3 | medium | me | How does Railway build a *shared* pnpm workspace from the repository root, so that `apps/console` gets its four workspace packages (`D-OPS-2`, ratified 2026-09-14)? `[observed]` from `docs.railway.com/guides/monorepo`, read 2026-09-14: Railway distinguishes *isolated* monorepos (set **Root Directory**; only that directory is pulled) from *shared* ones (build from the root, set a custom **start command** such as `pnpm --filter backend start`); **watch paths** limit which changes trigger a deploy; on import Railway auto-detects pnpm / npm / yarn / bun workspaces and proposes per-package commands. `[to-verify]` whether the detected build command installs at the root and builds the app with its workspace dependencies, or whether `pnpm turbo run build --filter=@repo/console` must be set explicitly; whether the `packageManager` field is honoured (corepack) or the pnpm version must be pinned another way. Closes with the first deploy in `changes/deploy-on-railway/`. | `docs.railway.com/guides/monorepo` |

---

## Registered by `vite-console`, 2026-09-15

### `Q-UI-6` — what is on screen before the first state arrives

*medium · me · open, implemented with a proposed default*

`ux-brief.md` §10 earmarked this number for `first-paint` and did not register
it. Taken here for exactly that, and widened by one case the brief did not
consider: **the first read failing.** SSE opens only after a successful
`GET /api/container/state`, and every automatic refetch is off, so a failed
first read leaves the reader with no state *and* no stream, permanently.

**Implemented default:** the card with a spinner in place of the headline while
the read is in flight; on failure, the card with the human sentence and a
**Try again** control that re-issues the *read* and nothing else. Both are one
question because both answer "what does this show when it has nothing to show".

### `Q-UI-7` — the `ConsoleError` set is not closed

*medium · me · open, implemented with a proposed default*

`V-CS-8` requires every error body to parse with `consoleErrorSchema`, and the
schema had five codes while the routes answer eleven conditions.
`console-misconfigured` was the case that surfaced it — `V-CS-2` names a code
the schema does not have, so `V-CS-2` and `V-CS-8` could not both pass.

**Implemented default:** the enum gains `console-misconfigured`, `not-found`,
`unauthorized`, `bad-request`, `forbidden-origin`, `payload-too-large` and
`no-deployment` (the last for `V-CV-4`). Schema, server, sentences and tests
move together; a code with no sentence and no test is not in the set.

### `Q-UI-8` — the card's maximum width has no token

*medium · owner · open, and the code currently violates its own rule*

`ux-brief.md` §3 fixes the card at 480 px. `DESIGN.md` has no layout token, and
`grid.applies` covers `spacing`, `radius` and `spinner.size` only — so the
screen presently uses `max-w-[30rem]`, an arbitrary value, which is exactly what
D-3 forbids. It is written down here rather than left as a quiet exception.

**Two ways out.** Add `layout.cardMax: 480px` to `DESIGN.md` — and it is not
enough to add the value: `scripts/design-tokens.mjs` must emit it, `grid.applies`
must cover the new subtree so 480 is grid-checked (4 × 120), and the usage check
must reach it. That is a coordinated edit to `design-system`'s files. Or permit
composition measures in application CSS, with the exemption written down.

### `Q-SEC-6` — may a Railway message reach the browser?

*low · owner · **closed 2026-09-15 by the amended `D-API-3`***

`D-API-3`'s post-experiment extension says `kind: 'unknown'` **must** carry
Railway's `message` through to the UI rather than swallow it. `V-14` says no
string from a Railway response body may appear in a console response except
`traceId`. Both are written down, and they contradict each other.

**Implemented default: `V-14` wins.** The message is logged where an operator
reads it and dropped before the response. If the owner prefers `D-API-3`, the
change is one branch in `apps/console/src/server/errors.ts`.

→ **Closed 2026-09-15.** The owner kept `V-14`, and `D-API-3` — which is
`proposed`, so it is amended rather than superseded — withdraws the clause that
said `kind: 'unknown'` must carry Railway's `message` to the UI. The experiment's
observation that produced that clause is kept; only the instruction is gone. No
code changed: `errors.ts` already logged and dropped. **Rejected:** forwarding the
message, and forwarding it only for `kind: 'validation'` — both argued in
`D-API-3`.

### `Q-OPS-4` — what does Railway's image do to a Just-in-Time server?

*medium · me · open, closes with the first deploy*

Three things this change could not establish locally. Does Railpack honour
`engines.node: ">=22.12"`? Does its edge buffer `text/event-stream` despite
`x-accel-buffering: no`? And — the one that matters — does anything in the build
image or runtime disturb the pnpm workspace symlinks that `start` resolves
through? An earlier draft of the plan asserted this was a hazard; it is not
established either way, and it is checked against the real image rather than
guessed at. If it does bite, `D-OPS-4` records the server bundle as the fallback.

### `Q-OPS-5` — fail fast, or stay up and answer 500?

*medium · owner · **closed 2026-09-15 by `D-OPS-6`***

`V-55` requires a misconfigured console to refuse to start. `V-CS-2` requires the
first `GET /api/container/state` to answer `500 console-misconfigured`. A process
that exits answers nothing, so the two cannot both hold.

**Implemented: fail fast**, because that is the criterion as written, and an
earlier draft of this work quietly redefined it — which is the thing to avoid.
`V-CS-2` is marked blocked rather than reported as passing. The alternative, if
the owner prefers it, is listen-and-degrade plus an explicit readiness endpoint
and an amended `V-55`.

→ **Closed 2026-09-15 by `D-OPS-6`.** Fail fast stands, and no code changed.
What changed is `V-CS-2`, which stops being a claim about the process and becomes
the claim its test actually makes: `toConsoleError` maps a `ConfigError` to
`500 { error: 'console-misconfigured' }`, the variable is named in the server log
and not in the response body, and no Railway request is made. So `V-CS-2` is no
longer blocked and no longer contradicts `V-55`. **Rejected:** listen-and-degrade
with a readiness endpoint — argued in `D-OPS-6`.


---

## Registered by `spec-validation`, 2026-09-15

### `Q-OPS-6` — what does the checker do with an archived change?

*low · me · open, deliberately unimplemented*

`CLAUDE.md` says a change folder takes a date prefix when it moves to
`archive/`. No change has been archived yet, `changes/archive/` does not exist,
and `current/` is still empty by design — so every rule in `check-specs.mjs` is
written against a corpus that has never seen one.

The questions an archive raises are real and none of them has an obvious answer:
does an archived change still have to satisfy `R-TRACE`, or is its work
finished by definition? Do its identifiers stay in the resolvable set — they
must, or every reference into it dangles — while being exempt from
`R-STRUCT`? Does the date prefix change the child-code legend?

**Implemented for now: nothing.** If `changes/archive/` appears, the checker
reports it as an unknown directory rather than guessing. Designing the semantics
before there is one archived change to look at would be speculation dressed as a
rule.

### `Q-OPS-7` — may the corpus gate stop being hermetic?

*medium · **owner** · open, implemented with the hermetic default*

Rule 5 says an agent does not move a decision from `proposed` to `ratified`.
`check-specs.mjs` **cannot enforce it.** The rule is about a *change* to a file,
and the script sees one working tree; catching it needs a diff against a git
base — `origin/main`, or the merge base of the branch.

That is not hard to write. It is a change of kind: `pnpm verify` is currently
hermetic and gives the same answer on any clean clone, with no network and no
git history, which is the property that lets it stand in for the CI this
repository deliberately does not have. A rule that reads `git diff` gives a
different answer in a shallow clone, on a detached head, and in an archive
downloaded as a zip.

**Recommendation:** leave the gate hermetic and enforce rule 5 by review, which
is where "the owner signs" already lives. **Alternative:** a separate,
explicitly non-hermetic `check:specs:history` that is not part of `verify` and
is run in the PR only. **Default if unanswered:** the recommendation — rule 5 is
listed in `changes/spec-validation/design.md` §7 as not verified.

---

## Registered by `deploy-on-railway`, 2026-09-15

### `Q-OPS-8` — `.railway/railway.ts` for project A, or settings in the dashboard?

*medium · **owner** · open, and it is decided now rather than at the first deploy*

Railway retired the mechanism this change was written against. `[observed]`
`docs.railway.com/config-as-code`, read 2026-09-15: *"Config as Code is
deprecated. Prefer Infrastructure as Code (`.railway/railway.ts`)."* and
**"New services cannot opt into Config as Code."**; existing `railway.json` /
`railway.toml` files keep working for services already on them until
**2026-12-01 (hard cutoff)**. Nothing in this repository is on one — there is no
such file, and the only service the experiment established, `target`, is an
image created through the API with no repository attached. So the deadline does
not bind this project, and `railway.json` is not one of the options.

The two that are:

**`.railway/railway.ts`.** Expresses more of design §2 than the deprecated file
ever could — `source` with `rootDirectory`, `build`, `start`, `preDeploy`,
`healthcheck`, `replicas`, `env`, `domains`, `volumeMounts` — so the deployment
becomes reviewable in the repository, which is what every other decision here
has wanted. It costs a `railway` npm dependency and the Railway CLI, and it is
**applied by the owner** (`railway config plan` / `apply`), not read on push, so
it does not remove a manual step so much as move it. `D-OPS-2` and `D-OPS-4`
have been strict about dependencies; this would be the first one that exists
only to describe infrastructure. `[to-verify]`: the reference read 2026-09-15
shows no option for watch paths and none for a restart policy, both of which
design §2 wants.

**Dashboard settings.** Costs nothing, adds no dependency, and is where the
variables have to be entered anyway — `D-SEC-2` keeps `CONSOLE_PASSPHRASE` out
of every file in this public repository. It records nothing: a reviewer reading
the repository cannot see how the service is built, which is the one thing this
repository is otherwise good at.

**Recommendation:** dashboard settings for this demo, and say so in the README —
one service, one deployment, configured once by the person who owns the
account, against a file that needs a dependency, a CLI and an owner-run apply to
express four settings and cannot express two of them. **Alternative if the
deployment is meant to be part of what a reviewer reads:** `.railway/railway.ts`
with `preserve()` for the passphrase. **Default if unanswered:** the
recommendation; `T-DR-1.2` records which was used.

Blocks `T-DR-1.2`. `T-DR-1.1` — the reading above, written into
`changes/deploy-on-railway/design.md` §1 and §2 — is done and does not wait on
the answer.
