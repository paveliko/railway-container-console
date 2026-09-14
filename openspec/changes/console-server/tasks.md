# Tasks: `console-server`

- [ ] **T-CS-1 Runtime singleton.** Result: `src/server/runtime.ts` per design §1, `config.ts` from `monorepo-workspace`. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-CS-1, V-CS-2. Verified by: `pnpm turbo run build test --filter=@repo/console`.
- [ ] **T-CS-2 Fake Railway.** Result: `test/fake-railway.ts` per design §4, replaying the experiment's frames and the scripted failures. Depends on: T-CS-1. Acceptance: it can drive the read path to `down / stopped` and `up`. Verified by: its own test.
- [ ] **T-CS-3 `GET /state` and `GET /events`.** Result: the two routes; SSE per design §2. Depends on: T-CS-2. Acceptance: V-CS-3, V-CS-4, V-CS-8. Verified by: `pnpm test`. *Does not wait on `Q-API-2`.*
- [ ] **T-CS-4 `POST /up`, `POST /down`, the gate.** Result: the two routes, `POST /api/session`, cookie check behind `CONSOLE_PASSPHRASE`. Depends on: T-CS-3, `container-verbs` T-CV-3. Acceptance: V-CS-5, V-CS-6, V-CS-7. Verified by: `pnpm test`.
- [ ] **T-CS-5 Origin check.** Result: a `live`-tagged test with a headless browser. Depends on: T-CS-3, `console-screen` T-SC-1. Acceptance: V-CS-9. Verified by: one logged run.
- [ ] **T-CS-6 Paperwork.** Result: parent T-4.3, T-4.4, T-6.1, T-6.2 marked done here; archive. Depends on: T-CS-5.
