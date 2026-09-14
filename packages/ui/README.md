# `@repo/ui`

Presentation primitives: `Button`, `Badge`, `Card`, `Spinner`, and the colour
and type tokens they share. Plain function components, props in, markup out —
no provider, no context, no state that outlives a render.

**Must not know:** Railway, `@repo/contracts`, `@repo/container-core`,
`@repo/railway-client`, `fetch`, or any route of the console. Its only
dependency is `react`, as a peer. The boundary is checked, not merely
intended — see `scripts/check-boundaries.mjs` and `V-MW-21`, `V-MW-22`.

**How it grows.** One component at a time, when a *second* caller needs one and
the component does not know the product (`D-OPS-2`). Anything that renders a
phase, a deployment or an up/down control is not a primitive and belongs in
`apps/console/src/features/container-control/`.
