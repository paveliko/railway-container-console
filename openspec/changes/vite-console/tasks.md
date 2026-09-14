# Tasks: `vite-console`

`[x]` done · `[ ]` not started · `[~]` blocked, on whom is stated.

## T-VC-0 — the paperwork that has to come first

- [x] **T-VC-0.1** Rebase onto `main` and re-verify ID occupancy before writing any `D-` or `Q-`. Result: `D-UI-5`, `D-OPS-4`, `Q-UI-7`, `Q-UI-8`, `Q-SEC-6`, `Q-OPS-4`, `Q-OPS-5` free; `D-UI-6` taken by `design-system`; `Q-UI-6` earmarked for `first-paint` and taken here for exactly that.
- [~] **T-VC-0.2** Owner ratifies `D-UI-5` and `D-OPS-4`, and confirms the `D-API-5` ratification recorded from the migration brief. **Owner.** Everything below is written against them.

## T-VC-1 — the operation lifecycle

- [x] **T-VC-1.1** `Operation` and its schema in `@repo/contracts`.
- [x] **T-VC-1.2** `Poller`: owned guard, five outcomes, target-checked resolution, sequence and epoch, independent operation deadline, read deadline released in `finally`. 23 tests. Acceptance: `V-VC-1` … `V-VC-12`.
- [x] **T-VC-1.3** The two defects this surfaced in `@repo/container-core` are fixed with the change, not around it: terminal-state release, and the replayed snapshot.

## T-VC-2 — the verbs (`container-verbs`)

- [x] **T-VC-2.1** `up()` / `down()` on the port; the port split so the poller is handed only the read half.
- [x] **T-VC-2.2** Three documents — `StopDeployment`, `RestartDeployment`, `DeployServiceInstance` — all through the schema gate. `no-deployment` added for `V-CV-4`.

## T-VC-3 — the server (`console-server`)

- [x] **T-VC-3.1** `runtime.ts`, `routes.ts`, `errors.ts`, `http.ts`, `session.ts`, `static.ts`, `dev.ts`, `main.ts`.
- [x] **T-VC-3.2** The `RailwayError → ConsoleError` mapping, which existed nowhere. Acceptance: `V-VC-18`.
- [x] **T-VC-3.3** SSE with the second `operation` event. Acceptance: `V-VC-13`, `V-VC-14`.
- [x] **T-VC-3.4** `test/fake-railway.ts`, and `test/dev-server.ts` so the screen can be driven without a token.

## T-VC-4 — the screen (`console-screen`)

- [x] **T-VC-4.1** `presentation.ts` and `messages.ts` — the copy deck as data. Acceptance: `V-VC-17`.
- [x] **T-VC-4.2** `useContainerState`, and the three disable rules. Acceptance: `V-VC-16`.
- [x] **T-VC-4.3** The components, `@repo/ui` only, no raw `<button>`, no `style`, no hex.
- [x] **T-VC-4.4** `first-paint` and `first-paint / failed` with a working retry; the passphrase form.

## T-VC-5 — the migration itself

- [x] **T-VC-5.1** Vite, three tsconfigs, `index.html`, the manifest; `app/`, `next.config.ts`, `next-env.d.ts`, `.next/` deleted.
- [x] **T-VC-5.2** Boundary rule 4 reseeded on `src/client/` with the entry assertion. Acceptance: `V-VC-15`, verified by break-and-revert three ways.
- [x] **T-VC-5.3** `turbo.json`, root `engines`, `.gitignore`.

## T-VC-6 — the design system's Phase B

- [x] **T-VC-6.1** (`T-DS-8`) `@tailwindcss/vite` beside `react()`; the stylesheet's three lines.
- [x] **T-VC-6.2** (`T-DS-9`) `DESIGN.md` and the generator in Turborepo's `globalDependencies`.
- [x] **T-VC-6.3** (`T-DS-10`) every `Spinner` call site passes the now-required `label`.
- [x] **T-VC-6.4** (`T-DS-11`) the computed-style measurements, before merge. Acceptance: `V-VC-21` … `V-VC-23`.

## T-VC-7 — still open

- [~] **T-VC-7.1** `Q-UI-8`: the card's maximum width is `max-w-[30rem]`, an arbitrary value, because `DESIGN.md` has no layout token. **Owner**, then either the token or a written exemption.
- [~] **T-VC-7.2** `Q-UI-7`, `Q-SEC-6`, `Q-OPS-5`. **Owner.**
- [ ] **T-VC-7.3** `Q-OPS-4`: the clean-install and symlink check against Railway's actual image, and whether its edge buffers `text/event-stream`. Closes with the first deploy.
- [ ] **T-VC-7.4** Archive, once merged.
