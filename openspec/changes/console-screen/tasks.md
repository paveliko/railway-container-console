# Tasks: `console-screen`

- [ ] **T-SC-1 Hook and API client.** Result: `useContainerState.ts`, `api/client.ts`, parsing with the contracts' schemas. Depends on: `monorepo-workspace` T-MW-2.4. Acceptance: V-SC-3, V-SC-6. Verified by: `pnpm turbo run test --filter=@repo/console`.
- [ ] **T-SC-2 Components.** Result: the five components and `app/page.tsx` rendering `ContainerPanel`. Depends on: T-SC-1. Acceptance: V-SC-1, V-SC-2, V-SC-4, V-SC-5, V-SC-7, V-SC-9, V-SC-10. Verified by: `pnpm test`.
- [ ] **T-SC-3 Bundle check.** Result: the post-build grep script wired into the console's `build`. Depends on: T-SC-2. Acceptance: V-SC-8. Verified by: break-and-revert logged in the PR.
- [ ] **T-SC-4 Against the real server.** Result: `pnpm dev` with `.env.local` shows the real state of the stopped experiment service. Depends on: `console-server` T-CS-3. Acceptance: the page shows *Down · stopped*. Verified by: a screenshot in the PR. *Read-only.*
- [ ] **T-SC-5 Paperwork.** Result: parent T-5.1, T-5.2 marked done here; archive. Depends on: T-SC-4.
