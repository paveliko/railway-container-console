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
| T-4.2 Verbs | **implemented** in `vite-console` T-VC-2.1, T-VC-2.2 (PR #8) · verification partial | [`../container-verbs/`](../container-verbs/) T-CV-1, T-CV-2 done; T-CV-3 open on `V-CV-3` | ~~`Q-API-2`~~ closed 2026-09-15 by `D-API-5`; a `REMOVED` fixture for `up()` |
| T-4.3 Runtime singleton | **implemented** in `vite-console` T-VC-3.1 · verification partial | [`../console-server/`](../console-server/) T-CS-1, open on `V-CS-2` | a test for `toConsoleError` |
| T-4.4 Routes | **implemented** in `vite-console` T-VC-3.1, T-VC-3.2, T-VC-3.3 · verification partial | `console-server` T-CS-3 (GET, open on `V-CS-8`), T-CS-4 (POST, open on `V-CS-5`) | a `consoleErrorSchema` snapshot; a phase-sequence run against the fake Railway |
| T-5.1 The screen | **implemented** in `vite-console` T-VC-4.1 … T-VC-4.4 · verification partial | [`../console-screen/`](../console-screen/) T-SC-1 (open on `V-SC-3`, `V-SC-6`), T-SC-2 (open on `V-SC-4`, `V-SC-5`, `V-SC-7`) | five criteria with no run — the largest debt of the three |
| T-5.2 Bundle hygiene | **implemented** — the grep is at `apps/console/vite.config.ts:29` (`vite-console` T-VC-5.1) · unverified | `console-screen` T-SC-3, open on `V-SC-8` | a logged break-and-revert |
| T-6.1 Fake Railway e2e | **done** for the fake (`vite-console` T-VC-3.4, `console-server` T-CS-2); the live origin check is not started | `console-server` T-CS-2 done; T-CS-5 open on `V-CS-9` | a headless browser |
| T-6.2 Failure paths | **implemented** in `vite-console` T-VC-3.2 — the `RailwayError → ConsoleError` mapping and the parametrised failure table · verification partial | `console-server` T-CS-4, open on `V-CS-5` | the phase sequence; the `GET /state` clause of `V-CS-6` |
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

**The code landed.** `vite-console` (PR #8) wrote the bodies of
`container-verbs`, `console-server` and `console-screen`; the workspace was
signed 2026-09-14 and `Q-API-2` closed 2026-09-15. What is left that needs
nobody's signature is verification, and there is a real amount of it — PR #8
verified its own `V-VC-N` and left eleven of the three children's criteria
unrun:

- `V-CV-3` — a `REMOVED` fixture, so `up()`'s deploy branch is tested and not
  merely inferred. Closes `T-CV-3`.
- `V-CS-2` — a test for `toConsoleError`'s `ConfigError → 500`. Closes `T-CS-1`.
- `V-CS-8` — the `consoleErrorSchema` snapshot over every kind the routes
  produce. Closes `T-CS-3`.
- `V-CS-5` — the phase sequence driven against `test/fake-railway.ts`, plus
  `V-CS-6`'s trailing clause. Closes `T-CS-4`.
- `V-SC-3`, `V-SC-6` — the read-before-stream ordering and the rejected SSE
  body. Closes `T-SC-1`.
- `V-SC-4`, `V-SC-5`, `V-SC-7` — the URL cleared on `down`, the `502` with a
  `traceId` rendered, and the storage measurement. Closes `T-SC-2`.
- `V-SC-8` — a logged break-and-revert of the bundle grep. Closes `T-SC-3`.
- `V-CS-9` — the `live` origin check: a headless browser loading the running
  console and making requests to its own origin only. Closes `T-CS-5`. This one
  needs a browser dependency the repository does not have, so it is
  owner-independent but not free.

Eleven in total. None of them needs a decision; all of them need someone to sit
down and write a test.

Also owner-independent: T-3.5, and the paperwork `deploy-on-railway` T-DR-1.1
carries.

## Cannot start until the owner acts

T-2.3's usage limit (blocks deployment), `Q-OPS-8` (dashboard settings or
`.railway/railway.ts` — blocks `T-DR-1.2`), the two services in T-7.1 / T-7.2,
the passphrase value, the questions to Railway in T-1.3, and the signatures
still outstanding on the `proposed` decisions (T-1.2). `D-OPS-2` / `D-OPS-3`
were signed 2026-09-14, `Q-API-2` closed 2026-09-15 by `D-API-5`, and `Q-SEC-4`
was answered 2026-09-15 by `D-SEC-2` (T-1.4) — none of the three blocks anything
any longer.
