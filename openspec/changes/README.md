# `changes/`

One folder per proposed change. The folder name is a bare slug — the date prefix
is added only when it moves to `archive/`.

```
openspec/changes/<slug>/
├── proposal.md       the problem, the approach, what is deliberately out of scope
├── design.md         architecture, scenarios, states; decisions with their rejected alternatives
├── verification.md   falsifiable acceptance criteria, one per line
└── tasks.md          ordered, checkable tasks — result, dependencies, acceptance, how verified
```

| Change | Status | What it proposes |
|---|---|---|
| [`railway-container-control/`](railway-container-control/) | proposed | The minimal product: one screen that spins one configured container up and down, the server-side layer that talks to Railway, deployment of the console on Railway, and the demo. Everything except the bodies of the two mutations, which wait on the owner's answer to `Q-API-2`. |
