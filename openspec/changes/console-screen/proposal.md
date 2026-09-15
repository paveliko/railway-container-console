# Proposal: `console-screen`

**Status:** proposed · **Capabilities:** `UI` · **Parent change:**
[`../railway-container-control/`](../railway-container-control/), tasks T-5.1,
T-5.2. **Requirement served:** R-4 — *a UI component, not just a backend*.
**Blocked on:** [`../archive/2026-09-15-monorepo-workspace/`](../archive/2026-09-15-monorepo-workspace/); the two
`GET` routes of [`../console-server/`](../console-server/) for a real run,
though every component test runs against a fake server.

## The problem

`app/page.tsx` is a placeholder. The parent's design §1 tables seven phases,
their headline, detail line and control, and `D-UI-3` says the page is a
rendering of `ContainerState` and nothing else. None of it exists.

## The approach

One feature folder in `apps/console`, drawing its primitives from `@repo/ui`
(`D-OPS-2`, ratified 2026-09-14 — the shared presentation package exists and
holds `Button`, `Badge`, `Card`, `Spinner` and the colour and type tokens):

```
src/features/container-control/
  components/  ContainerPanel.tsx · ContainerStatus.tsx · ContainerActions.tsx · ConnectionIndicator.tsx · LastError.tsx
  hooks/       useContainerState.ts   — GET /state first, then EventSource; every event parsed with containerStateSchema
  api/         client.ts              — POST /up, /down; responses parsed with consoleErrorSchema on failure
```

`ContainerPanel` is the one client component `app/page.tsx` renders. State
enters through `useContainerState` and nowhere else; there is no store, no
`localStorage`, no optimistic flip (`D-UI-1`). Types come from
`@repo/contracts` and presentation from `@repo/ui` — those two and nothing
else: the page never imports `container-core` or `railway-client`, a boundary
check proves it statically (`V-MW-25`) and a build-time grep proves it in the
bundle (`V-15`).

The division is the one `D-OPS-2` draws. `@repo/ui` does not know what a
container is, so every component here that renders a *phase*, a *deployment*
or an up/down control stays in this feature folder and composes the
primitives. If a component in this folder turns out to know nothing about the
product and a second caller wants it, it moves to `@repo/ui` then — not
before.

## Deliberately out

| Left out | Why |
|---|---|
| Adding further primitives to `@repo/ui` | `D-OPS-2` grows it one component at a time, on real need; this change consumes the four that exist |
| Names of project / environment / service, *last known at*, dashboard link | `Q-UI-4`, owner; each is one read and one line when decided |
| A design system, theming | one screen; system font, two colours, the phase in words |

## What "done" means

Parent `V-15`, `V-42 … V-49` pass; [`verification.md`](verification.md)
`V-SC-N` pass; `V-50`, `V-51` are performed in `deploy-on-railway`.
