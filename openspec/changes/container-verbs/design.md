# Design: `container-verbs`

Everything about *which* verbs is in the parent's
[design §7](../railway-container-control/design.md) and `D-API-5`. This
document only fixes where the pieces live in the workspace.

## 1. The port, extended

```ts
// packages/container-core/src/provider.ts   (recommended pair; names follow the owner's pick)
export interface ContainerProvider {
  read(): Promise<ContainerView>;
  stop(deploymentId: string): Promise<void>;
  restart(deploymentId: string): Promise<void>;
  deploy(): Promise<{ deploymentId: string }>;
}
```

## 2. The verbs

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
