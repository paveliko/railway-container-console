# Railway GraphQL API — the live surface, probed

> 2026-09-14. Probed with `curl` and a 20-line Node script against the live
> endpoint, using an account token from the local Railway CLI session. The token
> is not in this repository and none of the outputs below contain it.
> Marks: `[observed]` seen in a response · `[inferred]` reasoned from a response ·
> `[to-verify]` not yet confirmed.
>
> This document extends
> [`2026-09-14-railway-public-api.md`](2026-09-14-railway-public-api.md), which
> was written from the documentation alone. Where the two differ, the live
> endpoint wins.

## Size of the surface

`[observed]` Introspection succeeds with an account token. 656 types.
`Query` 163 fields (7 deprecated), `Mutation` 255 fields (11 deprecated),
`Subscription` 13 fields (1 deprecated). The parts this console touches are
reproduced verbatim in [`railway-schema-excerpt.graphql`](railway-schema-excerpt.graphql).

## 1. Subscriptions exist, work, and are undocumented

`[observed]` The schema has a `Subscription` root. The fields relevant here:

```graphql
deployment(id: String!): Deployment!                       # "Subscribe to updates for a specific deployment"
deploymentEvents(id: String!): DeploymentEvent!            # "Subscribe to deployment events for a specific deployment"
deploymentLogs(deploymentId: String!, filter: String, limit: Int): [Log!]!
buildLogs(deploymentId: String!, filter: String, limit: Int): [Log!]!
environmentLogs(environmentId: String!, ...): [Log!]!
httpLogs(deploymentId: String!, ...): [HttpLog!]!
```

`[observed]` Neither `docs.railway.com/reference/public-api` nor the API cookbook
mentions subscriptions or WebSockets.

`[observed]` The handshake, step by step:

| Step | Sent | Received |
|---|---|---|
| Upgrade over **HTTP/2** | `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Protocol: graphql-transport-ws` | `HTTP/2 400` · body `{"errors":[{"message":"Problem processing request"}]}` |
| Upgrade over **HTTP/1.1** | same | `HTTP/1.1 101 Switching Protocols` · `sec-websocket-protocol: graphql-transport-ws` |
| then nothing for ~15 s | — | close, code **4408**, reason `Connection initialisation timeout` |
| `{"type":"connection_init","payload":{"Authorization":"Bearer <token>"}}` | — | `{"type":"connection_ack"}` |
| `{"id":"1","type":"subscribe","payload":{"query":"subscription { … }"}}` | — | accepted; no error frame |

`[inferred]` This is the `graphql-ws` protocol (`graphql-transport-ws`
subprotocol), with authentication carried in the `connection_init` payload —
the standard pattern for that protocol, and the reason no custom HTTP header
is needed on the upgrade. Code 4408 is the protocol's *Connection initialisation
timeout*. `wss://backboard.railway.com/graphql/v2` is the same path as the HTTP
endpoint.

`[inferred]` This resolves `Q-API-3` (a stream exists) and dissolves `Q-UI-1`
(no polling is needed for state). A console can hold one socket and receive
`deployment` updates as they happen; the rate limit stops being a design
constraint on *reflecting* state and remains one only on *acting*.

`[to-verify]` Whether a `Project-Access-Token` key in the `connection_init`
payload authenticates a project token the same way; whether subscription
traffic is counted against the hourly request budget; how long the server keeps
an idle socket open; and — for Railway to answer — whether they consider this a
supported surface (`Q-API-7`).

## 2. CORS is pinned to `railway.com`

`[observed]` Preflight from a foreign origin:

```
> OPTIONS /graphql/v2
> Origin: https://example.com
> Access-Control-Request-Method: POST
> Access-Control-Request-Headers: content-type,authorization

< HTTP/2 204
< vary: Origin
< access-control-allow-origin: https://railway.com
< access-control-allow-credentials: true
< access-control-allow-methods: GET,HEAD,PUT,POST,DELETE,PATCH
< access-control-allow-headers: content-type,authorization
```

The same `access-control-allow-origin: https://railway.com` comes back for
`Origin: https://railway.com`. The header does not echo the requesting origin.
`[to-verify]` whether a request with no `Origin` header gets the same value — not
checked, and irrelevant to a browser, which always sends one.

`[inferred]` A page served from any origin other than `https://railway.com`
cannot call this API from the browser — the browser will block the response.
`D-SEC-1` (calls are made from a server the console owns) was proposed on
security grounds; it is now also the only option the transport allows. The
"just call it from the frontend" reading of the brief is not available.

## 3. Errors arrive as HTTP 200

`[observed]` The `me` query with no token:

```
HTTP 200
{"errors":[{"message":"Not Authorized",
            "locations":[{"line":1,"column":9}],
            "path":["me"],
            "extensions":{"code":"INTERNAL_SERVER_ERROR"},
            "traceId":"6317…"}],
 "data":null}
```

`[observed]` An unknown field, with a valid token:

```
HTTP 200
{"errors":[{"message":"Cannot query field \"nope\" on type \"Query\".",
            "extensions":{"code":"GRAPHQL_VALIDATION_FAILED"},
            "traceId":"8722…"}]}
```

`[observed]` Both carry a `traceId` on the error object itself (not under
`extensions`).

`[inferred]` Three consequences for a client:

1. The HTTP status carries no information about authentication. A client that
   branches on `response.ok` will treat "Not Authorized" as success and then
   fail on `data === null`.
2. `extensions.code` for the auth case is `INTERNAL_SERVER_ERROR`, which is
   misleading; the message string `"Not Authorized"` is the only discriminator.
   That is fragile, and the fragility should be visible in the code, not hidden
   in a regex. Registered as `Q-SEC-3`.
3. `traceId` is the one thing worth keeping on every error — it is what one
   would quote to Railway.

Recorded as `D-API-3`.

`[inferred]` Combined with the header difference between token types (see the
earlier document): a project token sent as `Authorization: Bearer` will come
back as HTTP 200, `"Not Authorized"`, code `INTERNAL_SERVER_ERROR`. Nothing in
that response says "wrong header".

## 4. Rate-limit headers, as actually returned

`[observed]` Every response — 200, 204, 400 — carries:

```
ratelimit-policy: "default";q=1000;w=3600
```

on this account, which is on the Hobby plan. That matches the documented
1 000 requests per hour.

`[observed]` The CORS exposure list names five headers —
`RateLimit-Policy, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset,
Retry-After` — but the successful responses observed carried only
`ratelimit-policy`. No `X-RateLimit-Remaining` was present.

`[to-verify]` When `X-RateLimit-Remaining` / `X-RateLimit-Reset` appear —
possibly only near the limit, or only on a `429`. A client cannot rely on
reading its remaining budget from every response.

## 5. The operations that matter for up and down

`[observed]` Signatures from the live schema; glosses from the docs where they
exist.

| Mutation | Signature | Docs |
|---|---|---|
| `serviceCreate` | `(input: ServiceCreateInput!): Service!` | *Create Service from Docker Image* — `source: { image }` |
| `serviceDelete` | `(id: String!, environmentId: String): Boolean!` | *"This will delete the service and all its deployments."* |
| `serviceInstanceDeployV2` | `(serviceId!, environmentId!, commitSha?): String!` | *"Returns the deployment ID"* |
| `serviceInstanceDeploy` | `(serviceId!, environmentId!, commitSha?, latestCommit?): Boolean!` | the V1; returns no id |
| `serviceInstanceRedeploy` | `(serviceId!, environmentId!): Boolean!` | *"Reuses existing commit"* |
| `serviceInstanceUpdate` | `(serviceId!, environmentId?, input!): Boolean!` | `numReplicas`, `sleepApplication`, `restartPolicyType` … |
| `deploymentStop` | `(id: String!): Boolean!` | *"Halts a currently running instance."* |
| `deploymentRestart` | `(id: String!): Boolean!` | *"Restart a running deployment without rebuilding."* |
| `deploymentRedeploy` | `(id: String!, usePreviousImageTag: Boolean): Deployment!` | *"rebuilds an existing deployment instance"* |
| `deploymentRemove` | `(id: String!): Boolean!` | *"Remove a deployment from the history."* |
| `deploymentCancel` | `(id: String!): Boolean!` | *"Cancels builds or queued deployments."* |
| `environmentTriggersDeploy` | `(input: {projectId!, environmentId!, serviceId!}): Boolean!` | *Deploy service* (manage-deployments page) |

`[observed]` The cookbook — Railway's own "23 things you would do with the API" —
has **no recipe for stopping or removing anything**. Deploy and rollback are the
only lifecycle verbs it shows.

`[inferred]` The mutations that return the thing the console then needs to
subscribe to are `serviceInstanceDeployV2` (a deployment id as a string) and
`deploymentRedeploy` (a `Deployment`). The V1 `serviceInstanceDeploy`,
`serviceInstanceRedeploy` and `environmentTriggersDeploy` return `Boolean` and
would force a follow-up read to learn what was created — one more request and
one more race.

`[inferred]` The narrowest pair for `Q-API-2` is `serviceInstanceDeployV2` ↔
`deploymentStop`: both documented, both keep the service and its history, and
one returns the id the other needs. Note that the dashboard's own documented
verb is *Remove* (`deploymentRemove`), not *Stop* — see
[`2026-09-14-railway-operations-and-cost.md`](2026-09-14-railway-operations-and-cost.md) §2.
Recorded as `D-API-5` — a *recommendation* for the owner's decision on
`Q-API-2`, not a choice made here.

## 6. Reading state

`[observed]`

```graphql
serviceInstance(serviceId, environmentId) {
  hasEverDeployed            # "…including deployments that have since been removed"
  latestDeployment { … }     # "The most recent deployment for this service instance"
  activeDeployments { … }    # "All currently active (deployed and running) deployments"
  numReplicas sleepApplication restartPolicyType
}
deployment(id) { status instances { id status } deploymentStopped url statusUpdatedAt }
deployments(input: { serviceId, environmentId, status: { in / notIn } }, first)
```

`[inferred]` `serviceInstance` is the one-shot read that answers "what is the
state right now" at startup and after a reconnect; `subscription deployment(id)`
is the stream that keeps it current. Two operations cover the whole read side.

## 7. Telling token types apart

`[observed]` `query { projectToken { projectId environmentId } }` — *"Get a single
project token by the value in the header"*. `query { me { … } }` works for
account tokens only (earlier document).

`[inferred]` A client *could* detect what kind of token it was given by which of
these succeeds. It should not: the header must be chosen before the first
request, so the kind must be declared, not discovered. Recorded as `D-API-2`.

## Reproduction

All commands are read-only. `$TOKEN` is an account token; it is read from the
local CLI session and never written anywhere.

```bash
# schema — the excerpt in this folder was cut from this output
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data '{"query":"query { __schema { subscriptionType { name } types { name kind } } }"}'

# CORS
curl -sS -i -X OPTIONS https://backboard.railway.com/graphql/v2 \
  -H 'Origin: https://example.com' -H 'Access-Control-Request-Method: POST'

# auth error shape — no token on purpose
curl -sS -i -X POST https://backboard.railway.com/graphql/v2 \
  -H 'Content-Type: application/json' --data '{"query":"query { me { id } }"}'

# websocket upgrade — HTTP/1.1 is required
curl -sS -i --http1.1 --max-time 20 https://backboard.railway.com/graphql/v2 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  -H 'Sec-WebSocket-Protocol: graphql-transport-ws'
```

```js
// connection_init → connection_ack, Node ≥ 21 (global WebSocket)
const ws = new WebSocket('wss://backboard.railway.com/graphql/v2', 'graphql-transport-ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'connection_init',
  payload: { Authorization: `Bearer ${process.env.TOKEN}` } }));
ws.onmessage = (e) => console.log(e.data);   // {"type":"connection_ack"}
```

## Sources

- Live responses from `https://backboard.railway.com/graphql/v2`, 2026-09-14.
- `https://docs.railway.com/reference/public-api` — read 2026-09-14.
- `https://docs.railway.com/integrations/api/manage-deployments`,
  `…/manage-services`, `…/api-cookbook` — read 2026-09-14.
- graphql-ws protocol, for the meaning of `graphql-transport-ws` and close code
  4408: `https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md`
  `[to-verify]` — cited from memory of the protocol, not re-read today.
