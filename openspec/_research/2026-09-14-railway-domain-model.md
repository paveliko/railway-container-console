# Railway's domain model — where "the container" is

> Gathered 2026-09-14 by introspecting the live schema at
> `backboard.railway.com/graphql/v2` (the relevant part is reproduced verbatim in
> [`railway-schema-excerpt.graphql`](railway-schema-excerpt.graphql)) and reading
> `docs.railway.com/integrations/api/*`.
> Marks: `[observed]` read from the schema or the docs · `[inferred]` reasoned from
> what was read · `[to-verify]` not yet confirmed against a live service.

## The object graph

`[observed]` Six levels, read off the root `Query` and the object types:

```
Workspace
└── Project                       project(id) · projects(workspaceId)
    ├── Environment               environments(projectId)      "production", ephemeral PR envs
    └── Service                   service(id)                  a name, an icon, a source
         └── ServiceInstance      serviceInstance(serviceId, environmentId)
              └── Deployment     deployment(id) · deployments(input)
                   └── DeploymentInstance   deployment.instances[]
```

| Level | What it holds | Where the console reads it |
|---|---|---|
| **Project** | `environments`, `services`, `workspaceId`, `isPublic` | not needed once IDs are known |
| **Environment** | `serviceInstances`, `deployments`, `isEphemeral` | scoping only |
| **Service** | identity: `name`, `icon`, `projectId`, `deletedAt` | identity only |
| **ServiceInstance** | the *configuration* of one service in one environment: `source`, `startCommand`, `numReplicas`, `region`, `restartPolicyType`, `sleepApplication`, `cronSchedule` — and `latestDeployment`, `activeDeployments`, `hasEverDeployed` | **the entry point for state** |
| **Deployment** | one attempt at running that configuration: `status`, `instances`, `deploymentStopped`, `url`, `canRedeploy`, `canRollback`, `statusUpdatedAt` | **the thing to subscribe to** |
| **DeploymentInstance** | one replica: `id`, `status` | **the only place a container is actually running or not** |

`[observed]` `Service.deployments` and `Service.serviceInstances` are deprecated —
*"Use environment.deployments for properly scoped access control"*. The
environment-scoped and the `(serviceId, environmentId)` paths are the current ones.

`[inferred]` The unit of identity the console should show is the **service**; the
unit of state is the **deployment**; and the truth about whether anything is
running is in the **instances**. Three levels, three different questions.

## The schema has no type called Container

`[observed]` There is no `Container` type. The word appears once, as a step in the
deployment lifecycle: `DeploymentEventStep.CREATE_CONTAINER`.

`[inferred]` So the brief's "spin up a container" has three legitimate readings,
one per level, and they are different products:

| Reading | Up | Down | What survives a down |
|---|---|---|---|
| **Service** | `serviceCreate(source: {image})` | `serviceDelete(id)` | nothing — *"This will delete the service and all its deployments"* `[observed]` |
| **Deployment** | `serviceInstanceDeployV2` / `deploymentRedeploy` | `deploymentStop(id)` | the service, its config, its deployment history |
| **Replica** | `serviceInstanceUpdate(numReplicas: n)` | `serviceInstanceUpdate(numReplicas: 0)` | everything — if `0` is accepted `[to-verify]` |

Which reading is the right one is `Q-API-2`, and it is the **owner's** choice —
the rows differ in what survives, so an agent does not pick. The candidates are
now enumerated from the schema rather than guessed, which is what `Q-API-1`
asked for. The dashboard's own verb for the middle row is *Remove*
(`deploymentRemove`), not *Stop* — see
[`2026-09-14-railway-operations-and-cost.md`](2026-09-14-railway-operations-and-cost.md) §2.

## Two status enums, and they disagree about "stopped"

`[observed]` `DeploymentStatus` — the status of a *deployment*:

```
BUILDING · CRASHED · DEPLOYING · FAILED · INITIALIZING · NEEDS_APPROVAL · QUEUED
REMOVED · REMOVING · SKIPPED · SLEEPING · SUCCESS · WAITING
```

**There is no `STOPPED` in it.**

`[observed]` `DeploymentInstanceStatus` — the status of a *replica*:

```
CRASHED · CREATED · EXITED · INITIALIZING · REMOVED · REMOVING · RESTARTING
RUNNING · SKIPPED · STOPPED
```

**`STOPPED` is here.** So are `EXITED` and `RUNNING`.

`[observed]` `Deployment.deploymentStopped: Boolean!` — *"Check if a deployment's
instances have all stopped"*.

`[inferred]` Put together: a deployment that has been stopped keeps
`status: SUCCESS` and reports the stop through its instances and through
`deploymentStopped`. A console that reads `deployment.status === "SUCCESS"` as
"the container is up" would show a stopped container as running. This is the
fact `D-UI-1` (*never lie about whether it is up*) turns on, and it is recorded
as `D-API-4`.

`[to-verify]` The exact values after a real `deploymentStop` — whether `status`
stays `SUCCESS`, whether every instance reads `STOPPED` or `EXITED`, and how
quickly the `deployment` subscription reflects it — have not been observed on a
live service. Registered as `Q-API-6`.

## What the documentation says the statuses mean

`[observed]` From `docs.railway.com/integrations/api/manage-deployments`:

| Status | Docs' gloss |
|---|---|
| `BUILDING` | under construction |
| `DEPLOYING` | currently rolling out |
| `SUCCESS` | actively running |
| `FAILED` | build or deploy unsuccessful |
| `CRASHED` | terminated unexpectedly |
| `REMOVED` | purged from records |
| `SLEEPING` | dormant / inactive |
| `SKIPPED` | bypassed |
| `WAITING` | approval pending |
| `QUEUED` | scheduled |

`[observed]` The docs table omits `INITIALIZING`, `NEEDS_APPROVAL` and `REMOVING`,
all three of which are in the live enum.

`[inferred]` "`SUCCESS` — actively running" is the gloss that the previous section
shows to be incomplete. The docs describe the happy path; the schema describes
the state space.

## The lifecycle of a deployment

`[observed]` `subscription deploymentEvents(id)` yields `DeploymentEvent { step,
createdAt, completedAt, payload }`, where `step` is:

```
SNAPSHOT_CODE → BUILD_IMAGE → PUBLISH_IMAGE → WAIT_FOR_DEPENDENCIES →
MIGRATE_VOLUMES → PRE_DEPLOY_COMMAND → CREATE_CONTAINER → CONFIGURE_NETWORK →
HEALTHCHECK → DRAIN_INSTANCES
```

(order as listed in the enum; `[inferred]` that it is also the execution order.)

`[inferred]` An image-sourced service has nothing to snapshot or build, so
`SNAPSHOT_CODE`/`BUILD_IMAGE`/`PUBLISH_IMAGE` should be skipped or trivial, which
makes "up" fast. `[to-verify]` on a live service.

`[inferred]` These steps are what the console can honestly show *during* a start,
instead of a spinner: "creating container", "configuring network", "health check".

## Sources: image or repo

`[observed]` `ServiceSourceInput { image: String, repo: String }`. `serviceCreate`
takes `source`, `variables`, `registryCredentials`, and an optional
`environmentId` (*"If the specified environment is a fork, the service will only
be created in it. Otherwise it will [be] created in all environments"*).

`[inferred]` For a console whose whole job is to spin a container up and down, a
public image is the source that involves the least machinery — no repo, no
build, no watch patterns. The choice of image is a UI/OPS decision, not an API
one.

## Volumes and images, for completeness

`[observed]` A **volume** is persistent storage mounted into a service at a
path; *"each service can only have a single volume"*; it persists across
redeploys; it is billed per GB-month. An **image** is one of a service's two
sources (`ServiceSourceInput.image`), from Docker Hub, GHCR, Quay, GitLab or
MCR; private registries need the Pro plan.

`[inferred]` Neither the console nor the target container needs a volume —
nothing persists. The target *should* be an image, for the reasons in
"Sources" above. Costs and limits are in
[`2026-09-14-railway-operations-and-cost.md`](2026-09-14-railway-operations-and-cost.md).

## Sleep is not stop

`[observed]` `ServiceInstance.sleepApplication: Boolean` and
`DeploymentStatus.SLEEPING`. The docs call this serverless sleeping: the
container sleeps on inactivity and wakes on traffic.

`[inferred]` It is traffic-driven, not on demand, so it is not a candidate for
"spin down" as an *action*. It is, however, a way the container can go down
without the console having asked — which is exactly `Q-UI-2`. A service used by
this console should have sleep off unless the UI is prepared to show `sleeping`
as its own state.

## Which verbs keep the deployment id, and which make a new one

`[observed]` `serviceInstanceDeployV2` *"Returns a deployment ID"* — a new one.
`deploymentRedeploy(id, usePreviousImageTag)` returns a `Deployment!` — the new
one (`[inferred]` from the return type; the docs say it *"rebuilds an existing
deployment instance"*). `deploymentRestart(id)` returns `Boolean!` and acts on
the id it is given — *"Restart a running deployment without rebuilding"*.

`[inferred]` Deploy and redeploy produce a new deployment id and new instance
ids; restart keeps the deployment id and (`[to-verify]`) gives it new
instances. Whether `deploymentRestart` works on a deployment that was
**stopped** with `deploymentStop` — as opposed to a running one — is not in the
docs; a Railway employee recommended exactly that pair on the support forum
and the asker reported both calls returning successfully
([`2026-09-14-railway-customers-and-users.md`](2026-09-14-railway-customers-and-users.md) §4,
secondary source). It goes into the `Q-API-6` experiment.

`[inferred]` Either way the console should present the **service** as the
stable thing that is up or down, and the deployment as the mechanism. Whether
the UI may say "the same container came back" depends on the verb the owner
picks in `Q-API-2` — with stop/restart it is defensible at the deployment
level; with any deploy it is not.

## The identifiers the console needs

`[observed]` Every state read and every candidate mutation is addressed by some
subset of `(projectId, environmentId, serviceId, deploymentId)`. A project token
is bound to one `(projectId, environmentId)` and can report them via
`query { projectToken { projectId environmentId } }`.

`[inferred]` A console that manages one container needs exactly one
`(projectId, environmentId, serviceId)` triple, supplied by configuration. It
does not need a project browser. That is a scope decision and is recorded in the
`railway-container-control` change rather than here.

## Sources

- Live introspection, 2026-09-14 — excerpt in
  [`railway-schema-excerpt.graphql`](railway-schema-excerpt.graphql).
- `https://docs.railway.com/integrations/api/manage-services` — read 2026-09-14.
- `https://docs.railway.com/integrations/api/manage-deployments` — read 2026-09-14.
- `https://docs.railway.com/integrations/api/api-cookbook` — read 2026-09-14.
