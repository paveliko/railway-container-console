# `@repo/railway-client`

The only code in the repository that knows Railway exists: the credential and
its header, the transport, the error classification, the operation documents,
and `createRailwayProvider` — the implementation of `@repo/container-core`'s
`ContainerProvider` port.

**Must not know:** React, Next.js, the console's routes, or
`CONSOLE_PASSPHRASE` — that is a console concern (`Q-SEC-4`), and it lives in
`apps/console/src/server/config.ts`.

`pnpm check` validates every `operations/*.graphql` against the schema excerpt
in `openspec/_research/` and against the inlined copy in `documents.ts`. The
console's build depends on it.
