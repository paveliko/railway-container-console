# Tasks: `railway-container-control`

Ordered. A task is checked only when its **Result** exists and its
**Acceptance** has been run. T-0 and T-3.4 are checked because their results
are in `_research/`; the client layer landed in PR #4 as one application, and
the remaining implementation is split into child changes (see T-2 … T-7). `V-N` refers to
[`verification.md`](verification.md); `R-N` / `A-N` to the brief's requirement
register; `Q-`/`D-` to the registers at the repository root.

Legend: `[x]` done · `[ ]` not started · `[~]` blocked, on whom is stated.

---

## T-0 · Research — done, 2026-09-14

- [x] **T-0.1 The brief.** Result: `_research/2026-09-14-the-brief.md` with requirement register R-1…R-7, A-1…A-5. Verified against two sources the same day.
- [x] **T-0.2 The domain.** Result: `_research/2026-09-14-railway-domain-model.md` — object graph, the three readings of "container", the two status enums, lifecycle steps, sources, volumes, sleep.
- [x] **T-0.3 The API, from the docs.** Result: `_research/2026-09-14-railway-public-api.md`.
- [x] **T-0.4 The API, live.** Result: `_research/2026-09-14-railway-graphql-surface.md` + `railway-schema-excerpt.graphql`. Read-only probes only: introspection, CORS preflight, error shapes, websocket handshake to `connection_ack`. No resource created, no service touched.
- [x] **T-0.5 Tokens, dashboard verbs, cost, retries.** Result: `_research/2026-09-14-railway-operations-and-cost.md`.
- [x] **T-0.6 Specification.** Result: this folder; `decisions.md` D-API-1…7, D-UI-1…4, D-SEC-1, D-OPS-1 (all *proposed*; `D-API-1` superseded by `D-API-7`); `open-questions.md` Q-API-1…9, Q-UI-1…4, Q-SEC-1…4, Q-OPS-1…2.

## T-1 · Owner decisions and questions to Railway — blocked on the owner

- [~] **T-1.1 Decide what "down" does.** *Owner.* Result: `Q-API-2` closed with a pick among `deploymentStop`+`deploymentRestart` (recommended, verified live), `deploymentStop`+`deployV2`, `deploymentRemove`+redeploy, or `serviceDelete`+`serviceCreate`. `numReplicas: 0` is no longer a candidate — the API rejects it. `D-API-5` re-stated with the pick and moved to `ratified`. Depends on: nothing — the consequences are tabled in operations research §2 and measured in the experiment. Acceptance: `open-questions.md` shows `Q-API-2` resolved; `decisions.md` shows one ratified verb pair. Verified by: reading the two registers.
- [~] **T-1.2 Sign or amend `D-UI-2` (stack), `D-OPS-1` (topology), `D-UI-3` (UI rules), `D-UI-4` (primary user), `D-SEC-1`, `D-API-2…7`.** *Owner.* Result: statuses moved from `proposed`. Acceptance: no decision that T-3+ depends on is still `proposed`. Verified by: `grep -c proposed openspec/decisions.md` equals the number of decisions deliberately left open.
- [~] **T-1.3 Send the Railway-owned questions.** *Owner.* Result: `Q-API-4`, `Q-API-7`, `Q-SEC-2`, `Q-SEC-3`, `Q-OPS-2` sent; date recorded in `open-questions.md`; answers appended as they arrive. Depends on: nothing. Acceptance: V-58. Verified by: the register.
- [x] **T-1.4 Answer `Q-SEC-4` (demo passphrase).** *Owner.* Answered 2026-09-15: `Q-SEC-4` is resolved by `D-SEC-2`, which expands the `planned` row and overturns the default recorded here. The demo is gated — `CONSOLE_PASSPHRASE` is set on the console service, the two mutating routes require the session cookie, the reading routes stay open. Setting the value on the deployed service is `T-DR-3`; verified by V-DR-6.

## T-2 … T-7 · Split into child changes, 2026-09-14

The implementation tasks moved into five smaller changes, each with its own
proposal, design, verification and tasks. Criteria keep their parent `V-N`
numbers; the children add prefixed ones (`V-MW-N`, `V-CV-N`, …). What was
already done stays done and is listed as such.

| Parent task | Status on `main` | Now lives in | Blocked on |
|---|---|---|---|
| T-2.1 Scaffold | done as a single app (PR #4) — **superseded**; `D-OPS-2` / `D-OPS-3` ratified 2026-09-14, the move is in flight | [`../monorepo-workspace/`](../monorepo-workspace/) | ~~`D-OPS-2`, `D-OPS-3`~~ signed 2026-09-14; `Q-UI-5`, `Q-SEC-5` still owner-open, defaults applied |
| T-2.2 Schema gate | done (PR #4) | `monorepo-workspace` T-MW-2.3 (moves it) | — |
| T-2.3 Account safety | **partly** — the usage limit is still not set | [`../deploy-on-railway/`](../deploy-on-railway/) T-DR-0 | owner |
| T-3.1 Credential + transport + errors | done, 28 tests (PR #4) | `monorepo-workspace` T-MW-2.3 (moves it) | — |
| T-3.2 Poller | done, 9 tests (PR #4) | `monorepo-workspace` T-MW-2.2 (moves it) | — |
| T-3.3 Live read | done (PR #4) | `monorepo-workspace` T-MW-2.3 (moves it) | — |
| T-3.4 Experiment | done 2026-09-14 | `_research/` | — |
| T-3.5 Close `Q-OPS-2` | not started | stays here, owner reads the usage page | time |
| T-4.1 State derivation | done, 27 tests (PR #4) | `monorepo-workspace` T-MW-2.2 (moves it) | — |
| T-4.2 Verbs | not started | [`../container-verbs/`](../container-verbs/) | `Q-API-2` — owner |
| T-4.3 Runtime singleton | not started | [`../console-server/`](../console-server/) T-CS-1 | `monorepo-workspace` |
| T-4.4 Routes | not started | `console-server` T-CS-3 (GET), T-CS-4 (POST) | GET: `monorepo-workspace`; POST: `container-verbs` |
| T-5.1 The screen | not started | [`../console-screen/`](../console-screen/) | `monorepo-workspace` |
| T-5.2 Bundle hygiene | not started | `console-screen` T-SC-3 | — |
| T-6.1 Fake Railway e2e | not started | `console-server` T-CS-2, T-CS-5 | — |
| T-6.2 Failure paths | not started | `console-server` T-CS-4 | `container-verbs` |
| T-6.3 Idle budget, live | not started | stays here — one logged 10-minute run once `console-server` lands | token |
| T-7.1 – T-7.3 Deployment | not started | [`../deploy-on-railway/`](../deploy-on-railway/) | owner, everything else |

- [ ] **T-3.5 Close `Q-OPS-2`.** Result: read the Railway usage page ≥ 24 h after the experiment and record whether the stopped deployment was billed. Acceptance: `Q-OPS-2` closed, or escalated to Railway with what was seen. Verified by: the register.
- [ ] **T-6.3 Idle budget.** Result: a `live` test that runs the poller for 10 minutes against Railway and counts requests — expect 20, ±1. Depends on: `console-server`. Acceptance: V-22 against the real endpoint. Verified by: one logged run with the token. *Read-only.*

## T-8 · README and the demonstration — *(R-6, R-7)*

- [ ] **T-8.1 README.** Result: README rewritten for a reviewer arriving cold — what, URL, run locally, where the reasoning is. Depends on: T-7.2. Acceptance: V-57. Verified by: a reader who has not seen the repo finds the four things in under a minute.
- [ ] **T-8.2 Archive the change.** Result: this folder moved to `openspec/changes/archive/2026-MM-DD-railway-container-control/`; `openspec/current/` filled with what the console *is*, derived from design §1, §6, §9. Depends on: everything above. Acceptance: `current/README.md` no longer says "empty by design". Verified by: reading it.
- [ ] **T-8.3 Walkthrough script.** Result: a 10-minute script for the 5–35 minute slot: the four hard facts from the proposal, the state table, the in-flight guard, then three extensions from design §12 with the one-line "it is one route and one operation on these layers" justification for each. Depends on: T-8.1. Acceptance: V-59, rehearsed once. Verified by: timing the rehearsal.
- [ ] **T-8.4 Questions asked, answers folded in.** Result: every Railway answer from T-1.3 reflected in the registers and, where it changes a decision, in a superseding `D-`. Depends on: T-1.3. Acceptance: V-58. Verified by: the register.

---

## Ready to start now, without waiting on anyone

Nothing that is code: every child change waits on a signature. What can be
written today is paperwork — the amendments listed in
`monorepo-workspace` T-MW-4.1 — and the two owner-independent research items,
T-3.5 and `Q-OPS-3`'s reading of the Railway docs (done).

## Cannot start until the owner acts

`D-OPS-2` / `D-OPS-3` (blocks all code), `Q-API-2` (blocks the verbs and the
`POST` routes), T-2.3's usage limit (blocks deployment), `Q-SEC-4`, and the
questions to Railway in T-1.3.
