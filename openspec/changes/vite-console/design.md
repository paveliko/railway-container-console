# Design: `vite-console`

## 1. The operation lifecycle

The centre of this change. "The mutation, the poller and the stream agree" is
the whole risk, and four earlier drafts of this section were wrong in four
different ways, each recorded below with what it got wrong.

### 1.1 Five outcomes

| Outcome | Means | Frees the guard |
|---|---|---|
| `succeeded` | the poller observed the operation's target state | at once |
| `failed` | it ran and ended badly — the target deployment reached `failed` | at once |
| `refused` | Railway said no. A definite answer | at once |
| `indeterminate` | the call failed without saying whether it took effect | **no** — held to the deadline |
| `timed-out` | the deadline passed with nothing resolving | at the deadline |

**`failed` is not `succeeded`.** Reporting a crashed start as a completed one is
a lie about the only thing this console exists to say.

**`indeterminate` is not `refused`.** A refusal is knowledge. An ambiguous
failure means the press may have landed, and since the mutations are not
idempotent, freeing the guard would invite a second one over a first that may
still be running. It is reported (`reportIndeterminate`), not finished; the
poller keeps looking, and the press can still resolve as a success if the
container arrives where it was aimed.

**`unknown` is not an outcome at all.** An earlier draft counted the `unknown`
*phase* as completion. It means the console could not establish the result — the
opposite of an answer. The screen shows Unknown at once, as `D-UI-1` requires,
and the guard is held to the deadline.

### 1.2 Resolution is checked against the operation's target

An earlier draft used `isTerminal(next) && !sameState(origin, next)` — "the
state changed", which is not "the press finished". A `Stop` would have resolved
the moment a replica count changed or a URL appeared.

| Operation | `succeeded` | `failed` | still running |
|---|---|---|---|
| `up` | `up` or `sleeping`, **`deploymentId === target`** | `failed`, **`deploymentId === target`** | everything else, including `up` on a *different* deployment |
| `down` | `down` | — | everything else |

`POST /api/container/up` answers `202 { deploymentId }`, so the operation knows
its target: `deploymentRestart` keeps the id, `serviceInstanceDeployV2` returns
a new one. Without that check the previous deployment's leftovers resolve the
new press. A start with no target yet declines to resolve at all.

### 1.3 The guard is owned

`clearInFlight()` was unconditional, which allowed: A hangs, its deadline fires,
the user starts B, A finally rejects and frees **B's** guard. So `claim` returns
an id and every release is keyed to it — `finish(id, …)` is a no-op unless that
id still owns the guard.

### 1.4 Reads are ordered three ways, and all three are needed

1. **Non-reentrant.** Two callers share one read, so a browser asking for first
   paint mid-poll costs no second request (`V-26a`).
2. **Sequenced.** A read that outlived its deadline may still resolve, after a
   later one has been applied. Applying it walks the screen backwards — `up`,
   then `down`, then `up` again. Older results are discarded entirely.
3. **Epoched.** Sequencing orders reads against *each other*. It says nothing
   about a single read that began before `claim()`: that one is the newest there
   is, and would be applied. Its stale epoch is the only thing that stops it
   answering for a press it predates.

### 1.5 Deadlines, plural

The **operation** deadline is its own `setTimeout`, armed at `claim`. Evaluating
it after `await pollOnce()` — as the poller once did — means a read that never
settles is also a guard that never releases.

Each **read** has a deadline too, and the poller races it rather than trusting
the `AbortSignal` it passes: an adapter that ignores the signal must not be able
to hold the non-reentrant flag forever and stop polling altogether. The flag is
released in a `finally`; the orphaned read, if it ever answers, is discarded by
sequence.

### 1.6 The server is the only authority

The browser cannot judge completion: no sequence, no epoch, no way to tell a
reading that answers the press from one that merely arrived after it. So the
stream carries a second, **named** event with its own schema:

```
event: operation
data: {"id":"op_7f3…","transition":"down","status":"in-flight","since":1757…}
data: null
```

The unnamed event still carries a bare `ContainerState` and still replaces the
whole value — `V-47` is untouched, which is why this is a second event rather
than a wrapper.

**The browser disables a control when any of three things holds**, and the first
is local:

1. our own `POST` is out and unanswered — not a claim about the container, a
   fact about us. Without it there is a window between the click and the first
   event in which a second click lands;
2. the server reports an operation in flight;
3. the phase is `starting` or `stopping` — which also covers a transition
   nobody here started.

A reconnect frees nothing: rule 1 is local and survives, and the server resends
the operation snapshot on connect.

## 2. Layout, and the invariant that replaces `'use client'`

Everything the browser loads lives under `apps/console/src/client/`. Vite has no
directive to key on, so the seed for boundary rule 4 is a directory — and the
rule additionally asserts that `index.html` names a module inside it, because an
entry pointed elsewhere would leave the rule walking a tree the browser no
longer loads, passing while checking nothing.

## 3. Vite

No aliases, no `optimizeDeps.exclude`, no `fs.allow`, no `preserveSymlinks`: the
`exports` maps already point at source, and Vite keeps linked workspace packages
out of pre-bundling by itself. `resolve.dedupe` is insurance against a second
React, not a fix for one.

`@source` in the stylesheet is not optional, and **`V-DS-14`'s chosen probes do
not detect its absence.** Measured: without it, `min-h-touch` and
`border-line-strong` are still emitted, while the state variants
(`hover:bg-accent-hover`, `disabled:bg-accent/55`, `bg-muted/10`) silently
vanish. The probes should be state variants; recorded for `design-system`.

## 4. The server

`node:http`, not Hono: two production dependencies for five routes, SSE wants
the raw `ServerResponse` regardless, and Vite's development middleware is
connect-style `(req, res, next)` — one line here, a bridge in both directions
from anything Fetch-shaped.

The `RailwayError → ConsoleError` mapping did not exist anywhere:
`@repo/railway-client` deliberately does not know what an HTTP status means to a
browser. It lives in the deployable, with the status table of parent §9, and it
forwards no Railway prose — only `traceId`.

## 5. Misconfiguration

Fail fast, naming the variable, as `V-55` asks. That makes `V-CS-2` — the first
read answering `500 console-misconfigured` — unreachable, because a process that
exits answers nothing. The two criteria genuinely conflict; `Q-OPS-5` puts it to
the owner rather than resolving it by quietly changing behaviour.

## 6. Production

`dist/` is the browser build only. `start` runs `tsx src/server/main.ts`, so the
container needs `src/server/**` *and* the workspace packages' TypeScript at
runtime — they are dependencies, not build inputs. A deploy that prunes sources
boots and dies on the first import.
