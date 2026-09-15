# Tasks: `container-verbs`

Checked here on 2026-09-15 against the tree that `vite-console` (PR #8) left. A
row is checked only where every criterion in its **Acceptance** has a run; the
run is named on the criterion's own line in [`verification.md`](verification.md).
The body of this change was written by `vite-console` T-VC-2.1 and T-VC-2.2,
which is cited rather than repeated.

- [x] **T-CV-0 Decide `Q-API-2`.** *Owner.* Result: `D-API-5` ratified with the pair — done 2026-09-14: down = `deploymentStop(latestDeployment.id)`, up = `deploymentRestart(id)` when a stopped deployment exists, else `serviceInstanceDeployV2`; `Q-API-2` closed by it 2026-09-15. Acceptance: V-CV-10. Verified by: reading the two registers.
- [x] **T-CV-1 Extend the port.** Result: `ContainerProvider` with `up()` / `down()`, split from a read-only `ContainerReader` so the poller is handed only the half it can use — `packages/container-core/src/provider.ts`. *(The Result originally read "the verbs the pick needs"; the pick put the branch on the Railway side of the port — design §5.)* Delivered by `vite-console` T-VC-2.1. Depends on: T-CV-0, `monorepo-workspace` T-MW-2.2. Acceptance: typecheck. Verified by: `pnpm turbo run typecheck`, green.
- [x] **T-CV-2 Documents and adapter methods.** Result: `packages/railway-client/operations/` — `StopDeployment.graphql`, `RestartDeployment.graphql`, `DeployServiceInstance.graphql` and the `ReadServiceInstance.graphql` the branch reads; inlined copies in `documents.ts`; `startContainer` / `stopContainer` in `verbs.ts`. Delivered by `vite-console` T-VC-2.2. Depends on: T-CV-1. Acceptance: V-CV-8. Verified by: `pnpm turbo run check test --filter=@repo/railway-client`.
- [ ] **T-CV-3 The verbs, fully covered.** Result: the branch and the guard, per design §5 — `verbs.ts` in `@repo/railway-client`, the claim in `Poller`, the `409` in `routes.ts`. *(The Result originally named `createActions` in `packages/container-core/src/actions.ts`, which was not built — design §5 records why.)* Written by `vite-console` T-VC-2.1 / T-VC-2.2. Depends on: T-CV-1. Acceptance: V-CV-1 … V-CV-7, V-CV-9. **Open on `V-CV-3`**, which has no run: `verbs.test.ts` has no `REMOVED` fixture, so "a removed deployment is deployed, not restarted" is unverified. Every other criterion in the list is covered — see `verification.md`. Verified by: `pnpm turbo run test --filter=@repo/railway-client`, plus the poller and route cases named there.
- [ ] **T-CV-4 Paperwork.** Result: parent `tasks.md` T-4.2 marked done here; archive this folder. Depends on: T-CV-3.
