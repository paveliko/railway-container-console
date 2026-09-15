# Tasks: `console-server`

Checked here on 2026-09-15 against the tree that `vite-console` (PR #8) left.
The bodies of T-CS-1 … T-CS-4 all exist — `runtime.ts`, `routes.ts`, `sse.ts`,
`session.ts`, `errors.ts`, `http.ts`, `static.ts`, `dev.ts`, `main.ts` and
`test/fake-railway.ts`, with 27 tests — but a row is checked only where every
criterion in its **Acceptance** has a run, and `vite-console` verified its own
`V-VC-N` rather than these. Four criteria were left unrun; the runs, and the
gaps, are named per criterion in [`verification.md`](verification.md).

- [ ] **T-CS-1 Runtime singleton.** Result: `src/server/runtime.ts` per design §1, `config.ts` from `monorepo-workspace` — both exist, written by `vite-console` T-VC-3.1. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-CS-1, V-CS-2. **Open on `V-CS-2`**: `toConsoleError`'s `ConfigError → 500 console-misconfigured` mapping has no test — there is no `errors.test.ts`. V-CS-1 is covered. Verified by: `pnpm turbo run build test --filter=@repo/console`.
- [x] **T-CS-2 Fake Railway.** Result: `test/fake-railway.ts` per design §4, replaying the experiment's frames and the scripted failures. Delivered by `vite-console` T-VC-3.4. Depends on: T-CS-1. Acceptance: it can drive the read path to `down / stopped` and `up`. Verified by: `routes.test.ts` and `sse.test.ts`, which drive it through its `STOPPED` and `RUNNING` frames and all five scripted failures over a real socket — rather than a test file of its own, which is what the Acceptance asked for and is a distinction without a difference here.
- [ ] **T-CS-3 `GET /state` and `GET /events`.** Result: the two routes; SSE per design §2 — written by `vite-console` T-VC-3.1 (routes) and T-VC-3.3 (SSE). Depends on: T-CS-2. Acceptance: V-CS-3, V-CS-4, V-CS-8. **Open on `V-CS-8`**: no server test parses a body with `consoleErrorSchema`, and there is no snapshot over all kinds. V-CS-3 and V-CS-4 are covered. Verified by: `pnpm test`. *Does not wait on `Q-API-2`.*
- [ ] **T-CS-4 `POST /up`, `POST /down`, the gate.** Result: the two routes, `POST /api/session`, cookie check behind `CONSOLE_PASSPHRASE` — written by `vite-console` T-VC-3.1, with the `RailwayError → ConsoleError` mapping from T-VC-3.2. Depends on: T-CS-3, `container-verbs` T-CV-3. Acceptance: V-CS-5, V-CS-6, V-CS-7. **Open on `V-CS-5`**: the second-press half is covered, the phase sequence against the fake Railway is not. V-CS-7 is covered; V-CS-6 all but its trailing clause. Verified by: `pnpm test`.
- [ ] **T-CS-5 Origin check.** Result: a `live`-tagged test with a headless browser. Depends on: T-CS-3, `console-screen` T-SC-1. Acceptance: V-CS-9. **Not started** — no headless-browser test exists. Verified by: one logged run.
- [ ] **T-CS-6 Paperwork.** Result: parent T-4.3, T-4.4, T-6.1, T-6.2 marked done here; archive. Depends on: T-CS-5.
