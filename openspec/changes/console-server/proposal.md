# Proposal: `console-server`

**Status:** proposed · **Capabilities:** `UI` (the HTTP boundary), `SEC` (the
optional gate) · **Parent change:**
[`../railway-container-control/`](../railway-container-control/), tasks T-4.3,
T-4.4, T-6.1, T-6.2.
**Blocked on:** [`../archive/2026-09-15-monorepo-workspace/`](../archive/2026-09-15-monorepo-workspace/) for
everything; [`../archive/2026-09-15-container-verbs/`](../archive/2026-09-15-container-verbs/) for the two `POST`
routes only. The two `GET` routes, the runtime singleton and the fake Railway
can be built before `Q-API-2` is signed.

## The problem

The packages can read, derive and poll, but nothing runs them. There is no
process that owns one `Poller`, no way for a browser to learn the state, and
the parent's promises about refresh, second tabs and double presses (`D-UI-3`,
design §8) are promises about a server that does not exist.

## The approach

Inside `apps/console` only:

- `src/server/runtime.ts` — the process singleton from parent design §10:
  built lazily on first use, never at `next build` time; holds one
  `createRailwayProvider(...)`, one `Poller`, the actions; fans state out to
  SSE subscribers.
- `app/api/container/{state,events,up,down}/route.ts` — the four routes of
  parent design §9, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`; errors
  in the `ConsoleError` shape from `@repo/contracts` and nothing else.
- `POST /api/session` and the cookie check on the two `POST` routes, active
  only when `CONSOLE_PASSPHRASE` is set. The variable stays optional in code,
  and `D-SEC-2` sets it on the deployed demo, so the gate is on there and
  normally off in local development.
- A fake Railway in tests: an in-process `fetch` that replays the experiment's
  recorded frames, so the whole chain from route to derived state runs without
  the network (parent T-6.1) and every failure shape from the research is
  driven end to end (parent T-6.2).

## Deliberately out

| Left out | Why |
|---|---|
| The page | [`../console-screen/`](../console-screen/) |
| Passphrase decided | `Q-SEC-4` is the owner's; the gate is built behind the variable either way, which is the parent's stated default |
| Persisting anything | parent proposal, "Persistence: none" |

## What "done" means

Parent `V-13`, `V-14`, `V-16`, `V-17`, `V-18`, `V-20`, `V-23`, `V-25`,
`V-26`, `V-26a` pass; [`verification.md`](verification.md) `V-CS-N` pass.
