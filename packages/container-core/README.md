# `@repo/container-core`

The domain: what a container's state *is* (`deriveContainerState`), how it is
kept current (`Poller`), and the `ContainerProvider` port that says what the
domain needs to read. Later it grows the two verbs (`container-verbs`).

**Must not know:** HTTP, GraphQL, `fetch`, React, Next.js, or any symbol from
`@repo/railway-client`. The arrow points the other way: `railway-client`
implements the port declared here, which is what lets these tests run against
a fake provider and never see Railway.
