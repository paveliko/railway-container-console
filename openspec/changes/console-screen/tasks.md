# Tasks: `console-screen`

Checked here on 2026-09-15 against the tree that `vite-console` (PR #8) left.
The screen exists — the hook, the API client and six components under
`apps/console/src/client/features/container-control/`, with 21 tests — but a row
is checked only where every criterion in its **Acceptance** has a run, and
`vite-console` verified its own `V-VC-N` rather than these. Five criteria were
left unrun, so no row here can be checked yet; the runs and the gaps are named
per criterion in [`verification.md`](verification.md). This is the largest
verification debt of the three changes, and it is the reason `T-5.1` reads
*implemented · verification partial* in the parent index.

- [ ] **T-SC-1 Hook and API client.** Result: `useContainerState.ts`, `api/client.ts`, parsing with the contracts' schemas — all three exist, written by `vite-console` T-VC-4.2. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-SC-3, V-SC-6. **Open on both:** nothing asserts the `EventSource` is constructed only after the `GET` resolves, and nothing emits an SSE body that fails `containerStateSchema`. Verified by: `pnpm turbo run test --filter=@repo/console`.
- [ ] **T-SC-2 Components.** Result: the components and the client entry rendering `ContainerPanel` — `ConnectionIndicator`, `ContainerActions`, `ContainerPanel`, `ContainerStatus`, `LastError`, `PassphraseForm`, reached from `main.tsx` / `router.tsx`. *(The Result originally named `app/page.tsx`; `vite-console` T-VC-5.1 deleted `app/` with Next.js.)* Written by `vite-console` T-VC-4.1, T-VC-4.3 and T-VC-4.4. Depends on: T-SC-1. Acceptance: V-SC-1, V-SC-2, V-SC-4, V-SC-5, V-SC-7, V-SC-9, V-SC-10. **Open on `V-SC-4`, `V-SC-5` and `V-SC-7`:** no case clears a URL on a `down` after an `up`; none renders a `502` with a `traceId`; none measures `localStorage` / `sessionStorage` / `document.cookie` after mount, press and event. V-SC-1, V-SC-2, V-SC-9 and V-SC-10 are covered. Verified by: `pnpm test`.
- [ ] **T-SC-3 Bundle check.** Result: the post-build grep of design §3 — present at `apps/console/vite.config.ts:29`, written by `vite-console` T-VC-5.1. Depends on: T-SC-2. Acceptance: V-SC-8. **Open:** the Acceptance is a *logged* break-and-revert and none is logged. Verified by: break-and-revert logged in the PR.
- [ ] **T-SC-4 Against the real server.** Result: `pnpm dev` with `.env.local` shows the real state of the stopped experiment service. Depends on: `console-server` T-CS-3. Acceptance: the page shows *Down · stopped*. Verified by: a screenshot in the PR. *Read-only.*
- [ ] **T-SC-5 Paperwork.** Result: parent T-5.1, T-5.2 marked done here; archive. Depends on: T-SC-4.
