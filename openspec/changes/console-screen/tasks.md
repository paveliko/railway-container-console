# Tasks: `console-screen`

Checked here on 2026-09-15 against the tree that `vite-console` (PR #8) left,
and checked again the same day once the five unrun criteria had runs.

The screen exists — the hook, the API client and six components under
`apps/console/src/client/features/container-control/`. A row is checked only
where every criterion in its **Acceptance** has a run, and `vite-console`
verified its own `V-VC-N` rather than these, which is why this was the largest
verification debt of the three changes. `V-SC-3` … `V-SC-8` are now covered, so
T-SC-1, T-SC-2 and T-SC-3 close; the runs are named per criterion in
[`verification.md`](verification.md).

`T-SC-3` turned out to be a task nobody had started rather than one nobody had
verified — the grep its Result claimed was already present did not exist. See
its row, and design §3.

- [x] **T-SC-1 Hook and API client.** Result: `useContainerState.ts`, `api/client.ts`, parsing with the contracts' schemas — all three exist, written by `vite-console` T-VC-4.2. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-SC-3, V-SC-6. **Closed 2026-09-15:** the read is held open on a promise so the `EventSource`'s absence during the read is measured, not assumed; and an SSE body that fails `containerStateSchema` — malformed and well-formed-but-wrong both — is ignored, logged, and leaves the last state on screen. Verified by: `pnpm turbo run test --filter=@repo/console`.
- [x] **T-SC-2 Components.** Result: the components and the client entry rendering `ContainerPanel` — `ConnectionIndicator`, `ContainerActions`, `ContainerPanel`, `ContainerStatus`, `LastError`, `PassphraseForm`, reached from `main.tsx` / `router.tsx`. *(The Result originally named `app/page.tsx`; `vite-console` T-VC-5.1 deleted `app/` with Next.js.)* Written by `vite-console` T-VC-4.1, T-VC-4.3 and T-VC-4.4. Depends on: T-SC-1. Acceptance: V-SC-1, V-SC-2, V-SC-4, V-SC-5, V-SC-7, V-SC-9, V-SC-10. **Closed 2026-09-15:** a `down` after an `up` leaves neither the link nor the host text; a `409` lands on the detail line with the alert row still blank and a `502` renders its `traceId` with headline and control unchanged; and storage is measured in jsdom after mount, press and event rather than inferred from the source not naming the API. Verified by: `pnpm test`.
- [x] **T-SC-3 Bundle check.** Result: the post-build grep of design §3 — `scripts/check-bundle.mjs`, run from `@repo/console`'s `build` script after `vite build`, reading every file under `dist/`, sourcemaps included, for Railway's host and for a build-time `RAILWAY_TOKEN` sentinel, printing neither; `check:bundle` in the root `package.json` beside its four siblings, and the script added to `turbo.json`'s `globalDependencies` so a change to the check invalidates the build it guards. Depends on: T-SC-2. Acceptance: V-SC-8. Verified by: break-and-revert logged in the PR — the green build prints `Bundle check passed`, importing `RAILWAY_GRAPHQL_ENDPOINT` into a client component fails it with exit 1 naming the chunk and the map, reverted and green again. **This Result was rewritten, and the old one was false.** It read *"present at `apps/console/vite.config.ts:29`, written by `vite-console` T-VC-5.1"*. Line 29 was a comment describing the grep; no grep over built assets existed anywhere in the repository, and design §3 still specified the Next.js form over `.next/static/`. So this row was not a verification gap — it was the task itself, unstarted and recorded as done. Both the design and the step are corrected here — including where it lives: the first draft was a Vite plugin, and `check-boundaries.mjs` rule 1 rejected it, because `V-MW-9` allows Railway's host exactly one file and a grep for the host has to name it. Design §3 records that and the two ways out that were dropped.
- [ ] **T-SC-4 Against the real server.** Result: `pnpm dev` with `.env.local` shows the real state of the stopped experiment service. Depends on: `console-server` T-CS-3. Acceptance: the page shows *Down · stopped*. Verified by: a screenshot in the PR. *Read-only.*
- [ ] **T-SC-5 Paperwork.** Result: parent T-5.1, T-5.2 marked done here; archive. Depends on: T-SC-4.
