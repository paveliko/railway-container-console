# Proposal: `console-screen`

**Status:** proposed · **Capabilities:** `UI` · **Parent change:**
[`../railway-container-control/`](../railway-container-control/), tasks T-5.1,
T-5.2. **Requirement served:** R-4 — *a UI component, not just a backend*.
**Blocked on:** [`../monorepo-workspace/`](../monorepo-workspace/); the two
`GET` routes of [`../console-server/`](../console-server/) for a real run,
though every component test runs against a fake server.

## The problem

`app/page.tsx` is a placeholder. The parent's design §1 tables seven phases,
their headline, detail line and control, and `D-UI-3` says the page is a
rendering of `ContainerState` and nothing else. None of it exists.

## The approach

One feature folder in `apps/console`, no shared `ui` package (`D-OPS-2`):

```
src/features/container-control/
  components/  ContainerPanel.tsx · ContainerStatus.tsx · ContainerActions.tsx · ConnectionIndicator.tsx · LastError.tsx
  hooks/       useContainerState.ts   — GET /state first, then EventSource; every event parsed with containerStateSchema
  api/         client.ts              — POST /up, /down; responses parsed with consoleErrorSchema on failure
```

`ContainerPanel` is the one client component `app/page.tsx` renders. State
enters through `useContainerState` and nowhere else; there is no store, no
`localStorage`, no optimistic flip (`D-UI-1`). Types come from
`@repo/contracts` only — the page never imports `container-core` or
`railway-client`, and a build-time grep proves it (`V-15`).

## Deliberately out

| Left out | Why |
|---|---|
| A `ui` package of Button / Badge / Card | set aside in `D-OPS-2` until a second screen exists |
| Names of project / environment / service, *last known at*, dashboard link | `Q-UI-4`, owner; each is one read and one line when decided |
| A design system, theming | one screen; system font, two colours, the phase in words |

## What "done" means

Parent `V-15`, `V-42 … V-49` pass; [`verification.md`](verification.md)
`V-SC-N` pass; `V-50`, `V-51` are performed in `deploy-on-railway`.
