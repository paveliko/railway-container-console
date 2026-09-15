# Design: `container-verbs`

Everything about *which* verbs is in the parent's
[design §7](../railway-container-control/design.md) and `D-API-5`. This
document only fixes where the pieces live in the workspace.

**Amended by `vite-console`, recorded 2026-09-15.** §1 and §2 below describe a
shape that was *not* built, and the difference is not cosmetic. What PR #8
implemented instead is §5; the sections it replaces are kept rather than
deleted, because a design whose rejected shape is invisible cannot be argued
with. `V-CV-5` … `V-CV-7` and `V-CV-9` were written against §1 and §2 and are
reworded in `verification.md` to name where the behaviour actually lives.

## 1. The port, extended — *superseded by §5*

```ts
// packages/container-core/src/provider.ts   (recommended pair; names follow the owner's pick)
export interface ContainerProvider {
  read(): Promise<ContainerView>;
  stop(deploymentId: string): Promise<void>;
  restart(deploymentId: string): Promise<void>;
  deploy(): Promise<{ deploymentId: string }>;
}
```

## 2. The verbs — *superseded by §5*

```ts
// packages/container-core/src/actions.ts
export function createActions(provider: ContainerProvider, poller: Poller): {
  up(): Promise<{ deploymentId: string }>;   // restart if derive(read) is down/stopped and a deployment exists, else deploy
  down(): Promise<void>;                     // stop(latestDeployment.id); rejects with `no-deployment` if there is none
  inFlight(): 'up' | 'down' | null;          // poller.inFlight()
};
```

`up()` and `down()` throw a `TransitionInFlight` error when `inFlight()` is not
null **before** touching the provider — the `409` in the routes is a mapping of
that error, and the guard lives where the mutation is issued (`D-UI-3`).

## 3. The documents

`packages/railway-client/operations/`: `DeploymentStop.graphql`,
`DeploymentRestart.graphql`, `ServiceInstanceDeployV2.graphql` — verbatim field
names from the excerpt, inlined in `documents.ts` as today, gate-checked.
`provider.ts` gains the three methods, each one `execute(...)` call.

## 4. Fixtures

The four mutation responses recorded in the experiment
(`_research/experiment-2026-09-14/01-serviceCreate.json`, `03-restart.json`,
`04-replicas0.json`, and the `deploymentStop → true` frame in
`stop-frames.jsonl`) are the fake provider's replies in tests.

## 5. What was built instead, and why

Recorded 2026-09-15 from the tree, after `vite-console` landed.

| §1 / §2 said | The tree has |
|---|---|
| `ContainerProvider` with `stop` / `restart` / `deploy` | `ContainerProvider` with `up()` / `down()`, split from a read-only `ContainerReader` — `packages/container-core/src/provider.ts` |
| `createActions(provider, poller)` in `packages/container-core/src/actions.ts` | no such file; `startContainer` / `stopContainer` in `packages/railway-client/src/verbs.ts`, calling `execute` from `./transport` |
| the guard asserted by `inFlight()` inside the actions | the poller's claim (`Poller`, `#ambiguous`, `finish(id, 'indeterminate')`) plus the `409` in `apps/console/src/server/routes.ts` |
| the provider's verbs called from `actions.ts` | called from exactly two lines, `routes.ts:73` and `routes.ts:82` |

**Why the shape moved.** `D-API-5`'s pair is not two independent mutations: *up*
must read first to decide between `deploymentRestart` — same deployment id, ~8 s
— and `serviceInstanceDeployV2`, which mints a new one. That read is a Railway
read, against a Railway document, classified by Railway's error rules. Putting
the branch in `container-core` would have required the domain to hold a second
provider call and interpret its result, which is the coupling `D-OPS-2`'s port
exists to prevent. So the choice went to the Railway side of the port, and the
port stayed at the two verbs the screen actually presses. `up()` returning
`{ deploymentId }` is what survives of the branch: the poller needs to know
*which* deployment this press is waiting for, which is `V-VC-11`.

**What this costs.** The port is no longer a literal transcription of the
mutation set, so "which Railway verb ran" is answered by reading `verbs.ts`
rather than by reading the port. That is the trade `D-API-5` implies and it is
recorded here rather than left to be rediscovered.

**Left unverified.** `V-CV-3` — that a **removed** deployment is deployed rather
than restarted — has no test: `verbs.test.ts` carries `STOPPED`, `RUNNING` and
`NEVER` fixtures and no `REMOVED` one. The branch in `verbs.ts` reads
`state.reason === 'stopped'`, so the behaviour follows, but following is not
verifying. `T-CV-3` stays open on it.
