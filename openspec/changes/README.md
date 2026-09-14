# `changes/`

One folder per proposed change. The folder name is a bare slug — the date prefix
is added only when it moves to `archive/`.

```
openspec/changes/<slug>/
├── proposal.md       the problem, the approach, what is deliberately out of scope
├── design.md         decisions taken, each with its rejected alternatives
└── verification.md   falsifiable acceptance criteria, one per line
```

Nothing here yet. The open questions in
[`../open-questions.md`](../open-questions.md) are resolved first, because
`Q-API-1` and `Q-API-2` decide what the change is actually proposing.
