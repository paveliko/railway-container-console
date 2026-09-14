# Raw frames from the `Q-API-6` experiment, 2026-09-14

Primary evidence for
[`../2026-09-14-experiment-stop-and-start.md`](../2026-09-14-experiment-stop-and-start.md).
Nothing here is edited; timestamps are UTC as returned or recorded.

| File | What it holds |
|---|---|
| `01-serviceCreate.json` | `serviceCreate` with a **project token** — proves the permission |
| `02-after-create.json` | state immediately after create: `hasEverDeployed=false`, `latestDeployment=null` |
| `frames.jsonl` | first `serviceInstanceDeployV2`, and the **project token's subscription being refused** |
| `stop-frames.jsonl` | the `deploymentStop` transition: `SUCCESS`/`stopped=true`/`EXITED`, and the subscription failing to report it |
| `03-restart.json` | `deploymentRestart` on a **stopped** deployment returning `true` |
| `fidelity.jsonl` | a second deploy watched over an account-token subscription: `DEPLOYING→SUCCESS` on the new deployment, `REMOVING→REMOVED` on the old |
| `04-replicas0.json` | `numReplicas: 0` rejected — `"Error in numReplicas - Invalid input"` |

No token appears in any of these files.
