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

Research and specification. **No product code yet** — see
[`openspec/open-questions.md`](openspec/open-questions.md) for what is still
unresolved.

---

Pavel Rapoport · [rapoport.studio](https://rapoport.studio)
