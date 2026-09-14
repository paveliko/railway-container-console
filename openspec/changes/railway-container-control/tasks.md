# Tasks: `railway-container-control`

Ordered. A task is checked only when its **Result** exists and its
**Acceptance** has been run. T-0 and T-3.4 are checked because their results
are in `_research/`; no implementation task has been started. `V-N` refers to
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
- [~] **T-1.4 Answer `Q-SEC-4` (demo passphrase).** *Owner.* Result: `Q-SEC-4` resolved by a `D-SEC-2`. Default if unanswered: no gate; `CONSOLE_PASSPHRASE` stays an optional variable.

## T-2 · Project preparation

- [x] **T-2.1 Scaffold.** *Done.* Result: Next.js + TypeScript app at the repository root per design §10 (`app/`, `src/railway/`, `src/container/`, `lib/runtime.ts`), `vitest` wired, `.env.example` with the six names from design §3 and no values, `README.md` extended with "run locally". Depends on: T-1.2 (`D-UI-2`). Acceptance: `npm run build` and `npm test` pass on a clean clone with an empty test; `git grep -c 'RAILWAY_TOKEN=' .env.example` = 1 and the value is empty. Verified by: CI run on the branch.
- [x] **T-2.2 Schema excerpt as a build input.** *Done — no codegen; validation gate instead, see design §10. Proven both ways: a bogus field fails the build.* Result: codegen from `openspec/_research/railway-schema-excerpt.graphql` into `src/railway/generated/`; a build step that validates every `src/railway/operations/*.graphql` against it. Depends on: T-2.1. Acceptance: V-39 — add a document with a bogus field, build fails; remove it, build passes. Verified by: the two build runs, logged in the PR.
- [~] **T-2.3 Account safety.** *Partly done.* Project `railway-container-console` and a project token for its `production` environment exist; the token lives in `.env.local`, which is git-ignored and untracked. **Still to do: set the account usage limit** — it was not set before the experiment, and it should be set before anything is deployed. Depends on: nothing. Acceptance: V-56; `git ls-files | grep -c '^\.env'` = 0. Verified by: the usage page. *The owner sets the limit, not an agent.*

## T-3 · API integration, verified

- [x] **T-3.1 Credential + transport + errors.** *Done — 28 tests.* Result: `credential.ts`, `transport.ts`, `errors.ts` per design §3–§4, with fixtures copied from the observed responses in surface research §3. Depends on: T-2.2. Acceptance: V-1…V-12. Verified by: `npm test`.
- [x] **T-3.2 Poller.** *Done — 9 tests on a fake clock.* Result: `container/poller.ts` per design §5 — 30 s idle, 2 s in flight, de-duplicated by value, survives a failed read. Against a fake clock and a fake transport. Depends on: T-3.1, T-4.1. Acceptance: V-22…V-26a. Verified by: `npm test`.
- [x] **T-3.3 Live read check.** *Done — returned `{phase:'down',reason:'stopped'}` against the real service, and skips without a token.* Result: a test tagged `live` that runs V-21 with the project token from `.env.local` and is skipped without one. Depends on: T-3.2, T-2.3. Acceptance: V-21 passes locally with the token; the CI run without a token reports it as skipped, not failed. Verified by: both runs logged. *Read-only against Railway; no resource created.*
- [x] **T-3.4 The `Q-API-6` experiment.** **Done 2026-09-14**, with the owner's authorisation and their project token, against service `target` (`nginx:alpine`) in project `railway-container-console`. Result: [`_research/2026-09-14-experiment-stop-and-start.md`](../../_research/2026-09-14-experiment-stop-and-start.md), raw frames in `_research/experiment-2026-09-14/`. Closed `Q-API-5` (negative), `Q-API-6`, `Q-API-8`; superseded `D-API-1` with `D-API-7`; revised `D-API-5`; opened `Q-API-9`. The service was left **stopped**. Acceptance: rows 8, 9 and 12 of design §6 moved from `to-verify` to `observed`; V-38 names concrete fixtures. Verified by: the fixtures in the repository.
- [ ] **T-3.5 Close `Q-OPS-2`.** Result: read the Railway usage page ≥ 24 h after the experiment and record whether the stopped deployment was billed. Depends on: T-3.4. Acceptance: `Q-OPS-2` closed, or escalated to Railway with what was seen. Verified by: the register.

## T-4 · Server-side operations

- [x] **T-4.1 State derivation.** *Done — 27 tests, including every shape the live experiment produced.* Result: `state.ts` per design §6, table rows as named test cases. Depends on: T-2.2 (enum types). Acceptance: V-27…V-37. Verified by: `npm test`. Can start before T-3.4; V-38 is added after it.
- [ ] **T-4.2 Verbs and the in-flight guard.** Result: `actions.ts` — `up()`, `down()`, `watch()`, `inFlight()`; `Up.graphql` and `Down.graphql` with the owner's verb. Depends on: T-1.1, T-3.1, T-3.2, T-4.1. Acceptance: V-12, V-18, V-19, V-40. Verified by: `npm test` + build.
- [ ] **T-4.3 Runtime singleton.** Result: `lib/runtime.ts` — one poller per process, last known state in memory, SSE fan-out, `inFlight` held here. Depends on: T-4.2. Acceptance: V-23, V-26, V-26a. Verified by: `npm test`.
- [ ] **T-4.4 Route handlers.** Result: the four routes from design §9 with the single error shape, Node runtime declared; passphrase gate if T-1.4 says so. Depends on: T-4.3. Acceptance: V-13, V-14, V-17, V-18, V-20, V-41. Verified by: `npm test` + build.

## T-5 · Interface

- [ ] **T-5.1 The one screen.** Result: `app/page.tsx` rendering design §1 from `ContainerState`; `GET /state` then `EventSource`; no browser storage. Depends on: T-4.4 (or a fake server). Acceptance: V-42…V-49. Verified by: component tests in `npm test`.
- [ ] **T-5.2 Bundle hygiene.** Result: a build-time check that the client bundle contains neither the host nor a sentinel token. Depends on: T-5.1. Acceptance: V-15. Verified by: `npm run build` output.

## T-6 · Errors, states, edge cases — end to end

- [ ] **T-6.1 Against a fake Railway.** Result: an in-process fake that replays `_research/experiment-2026-09-14/*.jsonl` over HTTP; an end-to-end test that drives Start → starting → Up → second press → Stop → Down → refresh. Depends on: T-5.1 — **the fixtures already exist** (T-3.4). Acceptance: V-16 (request log shows only the console's origin), V-47, V-48. Verified by: `npm test`.
- [ ] **T-6.2 Failure paths.** Result: the same harness with the fake returning not-authorized, 429, `"Error in numReplicas - Invalid input"`, and a dropped connection. Depends on: T-6.1. Acceptance: V-45, V-46, V-25 observed end to end. Verified by: `npm test`.
- [ ] **T-6.3 Idle budget.** Result: a `live` test that runs the poller for 10 minutes against Railway and counts requests — expect 20, ±1. Depends on: T-4.3, T-2.3. Acceptance: V-22 against the real endpoint. Verified by: one logged run with the token. *Read-only.*

## T-7 · Deployment on Railway — *(R-5)*

- [ ] **T-7.1 Target service.** *Owner.* Result: the target image deployed once in project B (this is T-3.4's first step, reused), serverless off, replicas 1, restart `ON_FAILURE`; left **down** after the experiment. Depends on: T-3.4. Acceptance: V-53. Verified by: the dashboard.
- [ ] **T-7.2 Console service.** *Owner deploys; agent prepares config.* Result: project A with the console service from this repository, the six variables set, a public domain. Depends on: T-4.4, T-5.2, T-7.1. Acceptance: V-52, V-54, V-55. Verified by: the procedures in V-52…V-55, logged.
- [ ] **T-7.3 Manual state checks on the deployed console.** Result: V-50 and V-51 performed against the deployed URL, with the target actually cycling once. Depends on: T-7.2. Acceptance: both pass. Verified by: a short screen recording or two screenshots in the PR. *Starts and stops the real target: the owner does this.*

## T-8 · README and the demonstration — *(R-6, R-7)*

- [ ] **T-8.1 README.** Result: README rewritten for a reviewer arriving cold — what, URL, run locally, where the reasoning is. Depends on: T-7.2. Acceptance: V-57. Verified by: a reader who has not seen the repo finds the four things in under a minute.
- [ ] **T-8.2 Archive the change.** Result: this folder moved to `openspec/changes/archive/2026-MM-DD-railway-container-control/`; `openspec/current/` filled with what the console *is*, derived from design §1, §6, §9. Depends on: everything above. Acceptance: `current/README.md` no longer says "empty by design". Verified by: reading it.
- [ ] **T-8.3 Walkthrough script.** Result: a 10-minute script for the 5–35 minute slot: the four hard facts from the proposal, the state table, the in-flight guard, then three extensions from design §12 with the one-line "it is one route and one operation on these layers" justification for each. Depends on: T-8.1. Acceptance: V-59, rehearsed once. Verified by: timing the rehearsal.
- [ ] **T-8.4 Questions asked, answers folded in.** Result: every Railway answer from T-1.3 reflected in the registers and, where it changes a decision, in a superseding `D-`. Depends on: T-1.3. Acceptance: V-58. Verified by: the register.

---

## Ready to start now, without waiting on anyone

T-2.1, T-2.2, T-3.1, T-3.2, T-4.1, T-4.3, T-5.1 (against a fake), T-5.2 and
T-6.1 — the fixtures T-6.1 was waiting on now exist. Everything except the two
verb bodies and anything that touches a real Railway resource. T-2.1 assumes
`D-UI-2` as proposed; if the owner changes the stack, T-2.1 is redone and
nothing else is.

## Cannot start until the owner acts

T-1.\* (the decisions, and the questions to Railway), T-4.2 (the verb bodies —
they need `Q-API-2` signed), T-7.\* (deployment). T-2.3 is **partly done**: the
project and the project token exist; the **account usage limit has not been
set**, and it should be before anything else is deployed.
