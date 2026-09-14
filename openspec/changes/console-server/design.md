# Design: `console-server`

The routes, the error shape and the sequences are parent
[design §8–§10](../railway-container-control/design.md). Deltas only.

## 1. Runtime singleton, lazily

```ts
// apps/console/src/server/runtime.ts
export function getRuntime(): Runtime;   // creates on first call: config → provider → poller.start() → actions
```

`next build` pre-renders nothing that calls `getRuntime()`; the four routes
are dynamic. So the build needs no `RAILWAY_*` variable, which is what CI has
(`monorepo-workspace` design §7), and a missing variable fails at the first
request with the `ConfigError` message from `V-3` / `V-4` — visible in the
deploy log as `V-55` requires.

## 2. SSE

`GET /api/container/events` returns a `ReadableStream`; on open it writes the
poller's current state (or nothing, if the first read has not landed), then
one `data:` line per state change, then a `: ping` comment every 15 s so
proxies keep the connection. Subscribing to the poller costs no Railway read
(`V-26`). Disconnect unsubscribes.

## 3. Errors

`RailwayRequestError.detail.kind` → `ConsoleError.error` and HTTP status per
parent §9. `TransitionInFlight` → `409`. `ConfigError` → `500` with the
message — it is the console's own text, not Railway's, so `V-14` holds.

## 4. Fake Railway

`apps/console/test/fake-railway.ts`: a `fetch` replacement keyed on the
operation name in the request body, returning frames from
`openspec/_research/experiment-2026-09-14/` in order, with a scripted list of
failures (`not-authorized` body, `429` with and without `Retry-After`, the
`numReplicas` validation body, a thrown `TypeError`). Injected through
`createRailwayProvider(..., fetchImpl)`.
