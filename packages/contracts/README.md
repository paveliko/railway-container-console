# `@repo/contracts`

What the browser and the console's server agree on, and nothing else: the
`ContainerState` union, the `ConsoleError` shape, and the two Railway status
enums (`Q-UI-5`). Every shape is a Zod schema with its TypeScript type
inferred, so the value that crosses HTTP is parsed rather than cast.

**Must not know:** React, Next.js, Railway's endpoint, any token,
`ContainerView`. Its only dependency is `zod`.
