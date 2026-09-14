# `@repo/console`

The only deployable: the Next.js app. It owns the screen, the four route
handlers, the process runtime, and `Config` — the composition of the
environment that `src/server/config.ts` performs.

It is the one package allowed to depend on all four others, which is why the
boundary that matters here points inward: nothing under `src/features/`, and no
file carrying `'use client'`, may import `@repo/container-core` or
`@repo/railway-client`. The browser sees `@repo/contracts` and `@repo/ui`.
