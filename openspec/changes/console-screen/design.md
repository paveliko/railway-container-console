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

`V-15` is a step after the build: grep everything emitted for
`backboard.railway.com` and for a sentinel value passed as `RAILWAY_TOKEN` at
build time; both must be absent.

**Amended by `vite-console`, recorded 2026-09-15.** This section read *"a script
step after `next build`: grep the client chunks under `.next/static/`"*. Next.js
is gone (`D-OPS-4`) and that path has not existed since. Worse, the step went
with it: for a while `vite.config.ts` carried a **comment** saying `V-15` greps
the built assets, sitting where the grep should have been, and
`verification.md` cited that comment's line number as the implementation. A
comment is not a check. The step is now real, and four things about its shape
are deliberate:

- **Part of the build, not a later gate.** `scripts/check-bundle.mjs` runs from
  `@repo/console`'s `build` script, immediately after `vite build`, so a leak
  fails `pnpm build` at the moment it is created rather than at something a
  hurried run can skip. It is added to `turbo.json`'s `globalDependencies` for
  the same reason `scripts/design-tokens.mjs` is already there: a change to the
  check must invalidate the build it guards. That is a build input, and is not
  the widening `spec-validation` design §5 argues against, which is about prose.
- **A script, not a Vite plugin — and the reason is a rule.** The first draft
  was a `closeBundle` plugin inside `apps/console/vite.config.ts`, and
  `check-boundaries.mjs` rule 1 rejected it: `V-MW-9` says Railway's host
  appears in **exactly one file** under `packages/railway-client/src/`, and a
  check that writes the host down in order to grep for it is the second. Two
  ways out were tried and dropped — exempting the config file, which is the
  maintained exemption list this repository keeps refusing; and importing
  `RAILWAY_GRAPHQL_ENDPOINT` to derive the host, which is prettier and does not
  work, because Vite loads its config in Node and the workspace `exports` point
  at raw `.ts`. The resolution is where the rule already puts such a file:
  `check-boundaries.mjs` *itself* names the host, and is not counted, because
  rule 1 searches `apps/` and `packages/` and a checker is neither. So this one
  sits beside it.
- **Everything under `dist/`, sourcemaps included.** `build.sourcemap` is on and
  the map is served beside the chunk it describes, so a secret in the map is a
  secret served. Checking only `.js` would be checking the smaller half — and
  the break-and-revert bears this out: the host lands in both.
- **The needle is never printed.** A failure names the file and *what* was
  found — "the RAILWAY_TOKEN value present at build time" — and not the value.
  A check that echoes a credential into the build log has become the leak it
  was written to catch. A sentinel shorter than eight characters is ignored, for
  the obvious reason.

This is one of three things that together make up `V-15`, and it is the only one
that reads what the browser is actually sent. The other two are
`check-boundaries.mjs` rule 4, which walks the client import graph in the
source, and the absence of `define` and of any widened `envPrefix` in the config.
