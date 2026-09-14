# `@repo/console`

The only deployable. It owns the screen, the five routes, the process runtime,
and `Config` — the composition of the environment that `src/server/config.ts`
performs.

One process serves both halves. Vite builds the browser bundle to `dist/`; the
server is TypeScript that `tsx` runs directly, and in development it mounts Vite
as middleware rather than running a second process, so the event stream the
browser holds is written by the same code in development and in production.

It is the one package allowed to depend on all four others, which is why the
boundary that matters here points inward:

> **Everything the browser loads lives under `src/client/`.**

That sentence is the invariant `scripts/check-boundaries.mjs` seeds rule 4 on,
now that there is no `'use client'` directive to key on. Nothing under
`src/client/` may reach `@repo/container-core` or `@repo/railway-client` — the
browser sees `@repo/contracts` and `@repo/ui` — and the rule additionally checks
that `index.html` names a module inside that directory, because an entry pointed
elsewhere would leave the rule walking a tree the browser no longer loads.

```
src/client/   the browser: entry, router, query cache, the one screen
src/server/   the process: runtime, routes, stream, session, static
test/         a fake Railway, and a dev server that uses it
```

## Running it

```
pnpm --filter @repo/console dev     # :3000, reads ../../.env.local
pnpm --filter @repo/console build   # dist/, the browser bundle only
pnpm --filter @repo/console start   # the same process, serving dist/
```

`test/dev-server.ts` runs the whole thing against the fake Railway, so the
screen can be driven with no token and no live infrastructure:

```
PORT=4321 pnpm exec tsx test/dev-server.ts
```
