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

Children of a change cite the parent's `V-N` unchanged and prefix their own
criteria and tasks with a two-letter code: `V-MW-N` / `T-MW-N` for
`monorepo-workspace`, `CV` for `container-verbs`, `CS` for `console-server`,
`SC` for `console-screen`, `DS` for `design-system`, `DC` for
`designmd-conformance`, `VC` for `vite-console`, `DR` for `deploy-on-railway`,
`SV` for `spec-validation`.

| Change | Status | What it proposes |
|---|---|---|
| [`railway-container-control/`](railway-container-control/) | proposed · **parent** | The product: one screen that spins one configured container up and down, the server-side layer, deployment, the demo. Its `design.md` and `verification.md` are the specification the children cite; its `tasks.md` is now an index. |
| [`monorepo-workspace/`](monorepo-workspace/) | **in implementation** · blocks all code | pnpm workspace + Turborepo: `apps/console` and four packages, `contracts ← container-core ← railway-client` plus `ui`; the provider port that breaks today's cycle; boundaries as resolution errors; per-package `typecheck`; CI. `D-OPS-2` and `D-OPS-3` ratified 2026-09-14; `Q-UI-5` and `Q-SEC-5` still open with their defaults applied. |
| [`container-verbs/`](container-verbs/) | proposed · blocked on `Q-API-2` | `up()` / `down()`, the port's verbs, the mutation documents. The only change whose body an agent may not write until the owner picks. |
| [`console-server/`](console-server/) | proposed | The runtime singleton, the four routes, SSE, the optional passphrase gate, and a fake Railway replaying the experiment's frames end to end. `GET` routes need only the workspace; `POST` routes need the verbs. |
| [`console-screen/`](console-screen/) | proposed | The one screen as a rendering of `ContainerState`, with the hook, the API client and the bundle check. Primitives come from `@repo/ui` (`D-OPS-2`); everything that knows what a container is stays in the feature folder. |
| [`design-system/`](design-system/) | proposed · Phase A implemented | The root `DESIGN.md` as the single source for every token, generated into `@repo/ui`'s `tokens.ts` and `theme.css`, with a validator that recomputes every contrast ratio and refuses drift. Adds `lineStrong` and the two accent states that measuring the palette showed were missing. `D-UI-6` awaits the owner; Phase B is the Vite import. |
| [`designmd-conformance/`](designmd-conformance/) | proposed · implemented | `DESIGN.md` moves from an invented schema to the published `@google/design.md` format, with a normalisation layer so the generator and validator stop reading raw frontmatter, and the format's linter as a second gate held to an allowlist. Compatible with documented extensions and one documented deviation — not conformant. Also replaces `V-DS-14`, which `vite-console` measured and found does not work. |
| [`vite-console/`](vite-console/) | proposed · implemented, awaiting signature | Next.js out, Vite + one long-lived Node process in; the operation contract the mutation, the poller and the stream all agree on; and the first code for `container-verbs`, `console-server` and `console-screen`. Carries `design-system`'s Phase B. `D-UI-5` and `D-OPS-4` await the owner. |
| [`deploy-on-railway/`](deploy-on-railway/) | proposed · owner-heavy | The workspace on Railway as a *shared* monorepo: build from the root, filtered start, watch paths; the target in project B; the manual checks. Closes `Q-OPS-3`. |
| [`spec-validation/`](spec-validation/) | proposed | The corpus checked by a script: identifiers unique and dense, references that resolve, every criterion traced to a task, links that resolve, closed vocabularies — errors; claim markers, credential slots and register filing — warnings. Registers `D-OPS-5`, the `planned` decision status, `Q-OPS-6` and `Q-OPS-7`. The one change that serves the specification rather than the product. |
