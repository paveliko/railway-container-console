# Tasks: `console-server`

Checked here on 2026-09-15 against the tree that `vite-console` (PR #8) left,
and checked again the same day once the unrun criteria had runs.

The bodies of T-CS-1 … T-CS-4 all exist — `runtime.ts`, `routes.ts`, `sse.ts`,
`session.ts`, `errors.ts`, `http.ts`, `static.ts`, `dev.ts`, `main.ts` and
`test/fake-railway.ts` — but a row is checked only where every criterion in its
**Acceptance** has a run, and `vite-console` verified its own `V-VC-N` rather
than these. Four criteria were left unrun. Three are now covered, so T-CS-1,
T-CS-3 and T-CS-4 close; the fourth, `V-CS-9`, is `live` and needs a headless
browser, so T-CS-5 stays open and T-CS-6 with it. The runs are named per
criterion in [`verification.md`](verification.md).

- [x] **T-CS-1 Runtime singleton.** Result: `src/server/runtime.ts` per design §1, `config.ts` from `monorepo-workspace` — both exist, written by `vite-console` T-VC-3.1. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-CS-1, V-CS-2. **Closed 2026-09-15:** `src/server/errors.test.ts` now exists and covers `V-CS-2` — the `ConfigError → 500 console-misconfigured` mapping, the variable named in the log and absent from the body, and zero Railway requests. V-CS-1 was already covered. Verified by: `pnpm turbo run build test --filter=@repo/console`.
- [x] **T-CS-2 Fake Railway.** Result: `test/fake-railway.ts` per design §4, replaying the experiment's frames and the scripted failures. Delivered by `vite-console` T-VC-3.4. Depends on: T-CS-1. Acceptance: it can drive the read path to `down / stopped` and `up`. Verified by: `routes.test.ts` and `sse.test.ts`, which drive it through its `STOPPED` and `RUNNING` frames and all five scripted failures over a real socket — rather than a test file of its own, which is what the Acceptance asked for and is a distinction without a difference here.
- [x] **T-CS-3 `GET /state` and `GET /events`.** Result: the two routes; SSE per design §2 — written by `vite-console` T-VC-3.1 (routes) and T-VC-3.3 (SSE). Depends on: T-CS-2. Acceptance: V-CS-3, V-CS-4, V-CS-8. **Closed 2026-09-15:** `errors.test.ts` parses every body the server can produce with `consoleErrorSchema` and asserts the set of codes **equals** the enum's, so the snapshot is over all kinds rather than a sample; the one body written outside `toConsoleError` is parsed over the wire in `routes.test.ts`. V-CS-3 and V-CS-4 were already covered. Verified by: `pnpm test`. *Does not wait on `Q-API-2`.*
- [x] **T-CS-4 `POST /up`, `POST /down`, the gate.** Result: the two routes, `POST /api/session`, cookie check behind `CONSOLE_PASSPHRASE` — written by `vite-console` T-VC-3.1, with the `RailwayError → ConsoleError` mapping from T-VC-3.2. Depends on: T-CS-3, `container-verbs` T-CV-3. Acceptance: V-CS-5, V-CS-6, V-CS-7. **Closed 2026-09-15:** the phase sequence now runs end to end against `test/fake-railway.ts` — `down/stopped → starting → up → down/stopped`, with the second press refused at the point the criterion puts it — and `V-CS-6`'s trailing clause has its own case, `GET /state` after a failed press serving the last known state without a fresh read. V-CS-7 was already covered. Verified by: `pnpm test`.
- [ ] **T-CS-5 Origin check.** Result: a `live`-tagged test with a headless browser. Depends on: T-CS-3, `console-screen` T-SC-1. Acceptance: V-CS-9. **Not started** — no headless-browser test exists, and this is the only task in the change that needs something the repository does not have. **For the owner:** either a browser dependency (Playwright) or one logged manual run; an agent should not add the first without being asked. Verified by: one logged run.
- [ ] **T-CS-6 Paperwork.** Result: parent T-4.3, T-4.4, T-6.1, T-6.2 marked done here; archive. Depends on: T-CS-5.
