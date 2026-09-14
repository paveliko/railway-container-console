# Tasks: `container-verbs`

- [~] **T-CV-0 Decide `Q-API-2`.** *Owner.* Result: `D-API-5` ratified with the pair. Acceptance: V-CV-10. Nothing below starts before this.
- [ ] **T-CV-1 Extend the port.** Result: `ContainerProvider` with the verbs the pick needs; fake provider helper for tests. Depends on: T-CV-0, `monorepo-workspace` T-MW-2.2. Acceptance: typecheck. Verified by: `pnpm turbo run typecheck`.
- [ ] **T-CV-2 Documents and adapter methods.** Result: the `.graphql` files, inlined copies, adapter methods in `railway-client`. Depends on: T-CV-1. Acceptance: V-CV-8. Verified by: `pnpm turbo run check test --filter=@repo/railway-client`.
- [ ] **T-CV-3 `actions.ts`.** Result: `createActions` per design §2 with named test cases from the experiment's frames. Depends on: T-CV-1. Acceptance: V-CV-1 … V-CV-7, V-CV-9. Verified by: `pnpm turbo run test --filter=@repo/container-core`.
- [ ] **T-CV-4 Paperwork.** Result: parent `tasks.md` T-4.2 marked done here; archive this folder. Depends on: T-CV-3.
