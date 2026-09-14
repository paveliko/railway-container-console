# Design: `console-screen`

The screen itself is parent [design §1](../railway-container-control/design.md).
Deltas only.

## 1. Data flow

```
useContainerState()
  mount → GET /api/container/state → containerStateSchema.parse → setState
        → new EventSource('/api/container/events') → onmessage → parse → setState (whole value replaced)
        → onerror → connection = 'reconnecting' (EventSource reconnects itself)
```

`ContainerPanel` receives `{ state, connection, lastError, press }` and
renders the table row for `state.phase`. `press('up' | 'down')` posts,
disables the control until the next SSE event, maps `409` to the *already
starting / already stopping* detail (not an error), and everything else to
`lastError` with the `traceId`. Ten seconds after an accepted press with no new
state, the detail line adds *waiting for Railway…*.

## 2. Testing

Component tests with `@testing-library/react` under vitest's `jsdom`
environment, one test file per component plus one for the hook with a fake
`fetch` and a fake `EventSource`. These are the only new dev dependencies
this change adds to `apps/console`.

## 3. Bundle hygiene

`V-15` is a script step after `next build`: grep the client chunks under
`.next/static/` for `backboard.railway.com` and for a sentinel value passed as
`RAILWAY_TOKEN` at build time; both must be absent.
