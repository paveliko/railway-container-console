# Proposal: `vite-console`

## The problem

`apps/console` is a Next.js application that uses one Next.js feature.

The framework was chosen by `D-UI-2` for two reasons, and `D-API-7` has since
removed both: a long-lived WebSocket to Railway, and server-sent events from the
same process. There is no socket — a project token cannot open one, and a stop
is invisible to it anyway. What is left is one screen, five routes and one
poller, and the only part of Next.js the repository actually depends on is
`transpilePackages`, which exists to work around a problem Vite does not have.

Meanwhile three specified changes have no code at all — `container-verbs`,
`console-server`, `console-screen` — and `Q-API-2`, which blocked the first of
them, is now signed as `D-API-5`.

## The approach

Replace the framework and, on the smaller surface that leaves, build the three
changes that were waiting for it.

- **Vite + React 19 + TanStack Router/Query**, served by one long-lived
  `node:http` process in the same package, one port in development and in
  production. Vite runs in middleware mode inside that process, so the stream
  the browser holds is written by the same code in both, with no proxy in
  between. `D-UI-5`.
- **Just-in-Time consumption survives verbatim** — `exports` at source, no
  `dist/` in any package, no per-package build. Only the compiler changes: Vite
  for the browser, `tsx` for the server. `D-OPS-4`.
- **An operation contract** that the mutation, the poller and the stream all
  agree on. This is the substance of the change and most of its risk; it is
  `design.md` §1 and is summarised below.
- **The design system's Phase B** — `T-DS-8` … `T-DS-11` — because that change
  landed first and its primitives render nothing without the stylesheet wiring
  that lives in this tree.

## What this fixes that was already broken

Two defects in `@repo/container-core`, pre-existing and unreachable until this
change became its first consumer:

1. `pollOnce` cleared the in-flight guard on *any* terminal state, and
   `markInFlight` re-read immediately — so a stop released the guard within
   milliseconds, on a reading taken before Railway had done anything. `V-18` and
   `V-23` both failed.
2. `subscribe` replays the current state to every new listener, so a reconnect
   redelivered a snapshot the browser would have read as an answer.

## Deliberately out of scope

| Out | Why |
|---|---|
| Server-side rendering | One screen whose content is a live value. There is nothing to render ahead of time. |
| File-based routing | A plugin and a generated route tree, for one route. |
| A second process for the API | The topology `D-UI-2` rejected, and still rejected. |
| Live Railway mutations | Every check here runs against `test/fake-railway.ts`. A real stop or restart is a separate, explicitly authorised experiment. |
| Deployment | `deploy-on-railway` owns it. This change records what the runtime needs. |

## What changes in the specification

| Document | Change |
|---|---|
| `decisions.md` | `D-UI-5` and `D-OPS-4` proposed; `D-UI-2` and `D-OPS-3` superseded; `D-API-5` ratified with its basis recorded |
| parent `design.md` §9, `console-server` §2 | the stream gains a second, named `operation` event |
| `console-screen/ux-brief.md` §6 | the rate-limit sentence no longer promises a retry that `V-12` forbids |
| `console-server/verification.md` `V-CS-1` | the `runtime`/`dynamic` grep is meaningless without Next.js |

## What "done" means

`verification.md`, `V-VC-1` … `V-VC-16`. The load-bearing ones: the twelve
lifecycle cases of `design.md` §1.6, the boundary rule that must fail when the
client graph is broken *and* when the entry point is repointed, and the two
greps — one over the built JavaScript, one over the built CSS — that check
different things and are both necessary.
