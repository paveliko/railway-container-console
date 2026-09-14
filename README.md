# railway-container-console

A small web console that spins a Railway container up and down through Railway's
public GraphQL API.

Built for Railway's take-home. The brief is short — *"build an application to spin
up and spin down a container using our GQL API… the app needs to have a UI
component"* — so the interesting part is not the feature. It is the decisions
around it, and whether they were made before or after the code.

## How this repository is organised

I work specification-first: the problem, the approach and the acceptance criteria
are written down and argued with before implementation, then a small working
version shows what the document got wrong. That happens here in the open, so the
reasoning is readable rather than reconstructed.

```
openspec/
├── _research/         source material, gathered before any decision
├── current/           what the thing is meant to be
├── changes/           one folder per proposed change
├── decisions.md       D-<CAP>-N, with the alternatives that were rejected
└── open-questions.md  Q-<CAP>-N, unresolved and tracked rather than smoothed over
```

Every factual claim in `_research/` is marked `[observed]`, `[inferred]` or
`[to-verify]`. Nothing is asserted that cannot be traced to a primary source.

## Status

Research and specification. **No product code yet.**

- The Railway API has been probed live, not just read about: subscriptions
  work over `graphql-transport-ws` (undocumented), CORS is pinned to
  `railway.com`, and "Not Authorized" is an HTTP 200 —
  [`openspec/_research/`](openspec/_research/).
- The minimal product — one screen, one container, up and down — is specified
  as a change with falsifiable acceptance criteria and an ordered task list —
  [`openspec/changes/railway-container-control/`](openspec/changes/railway-container-control/).
- What "spin down" should mean — stop the deployment, remove it, scale to zero
  or delete the service — is a choice with different consequences and is left
  to the owner, not made by an agent —
  [`openspec/open-questions.md`](openspec/open-questions.md) `Q-API-2`.

---

Pavel Rapoport · [rapoport.studio](https://rapoport.studio)
