# Proposal: `container-verbs`

**Status:** proposed · **Capabilities:** `API` · **Parent change:**
[`../../railway-container-control/`](../../railway-container-control/), task T-4.2.
**Blocked on the owner for:** `Q-API-2` — what "down" does — and therefore
`D-API-5` moving to `ratified`. Also on
[`../2026-09-15-monorepo-workspace/`](../2026-09-15-monorepo-workspace/) landing, because the verbs
extend the `ContainerProvider` port that change introduces.

## The problem

The console has a read (`readContainer`), a derivation (`deriveContainerState`)
and a poller with an in-flight guard (`Poller.markInFlight`), and no way to
change anything. The two verbs are the only code in the whole product whose
body depends on a decision an agent may not take: the parent proposal lists
four candidate pairs and `D-API-5` recommends one, verified live —
`deploymentStop` for down, `deploymentRestart` when a stopped deployment
exists and `serviceInstanceDeployV2` otherwise for up.

## The approach

Three things, all in packages that exist after `monorepo-workspace`:

1. **The port grows two verbs.** `ContainerProvider` in `@repo/container-core`
   gains the operations the owner's pair needs. For the recommended pair:
   `stop(deploymentId)`, `restart(deploymentId)`, `deploy()`. A different pick
   changes these names and nothing else in the port.
2. **`up()` and `down()` in `@repo/container-core`** (`actions.ts`), per parent
   design §7: read the current view, decide, call the provider, then
   `poller.markInFlight(...)`. The `409` guard is `poller.inFlight()`. Mutations
   are never retried (`V-12`).
3. **The documents in `@repo/railway-client`** — one `.graphql` per verb,
   validated by the existing gate against the schema excerpt (`V-39`) — and
   the adapter methods that issue them.

## Deliberately out

| Left out | Why |
|---|---|
| Routes that call `up()` / `down()` | [`../../console-server/`](../../console-server/) |
| A live mutating test | It starts and stops a real container; the owner does that by hand in `deploy-on-railway` (parent T-7.3). A `test:live:mutate` gated on an explicit `RAILWAY_ALLOW_MUTATION=1` is the optional extension, not built |
| Restart / Redeploy / Rollback as separate verbs | parent design §12 |

## What "done" means

`V-12`, `V-18`, `V-19` and the second half of `V-40` pass;
[`verification.md`](verification.md) `V-CV-N` pass; `D-API-5` is `ratified`
with the pick written into it.
