# `changes/`

One folder per proposed change. The folder name is a bare slug — the date prefix
is added only when it moves to `archive/`.

`archive/` is a container, not a change: it holds no four files of its own and
has no row in the table below, because that table lists what is live. What it
holds *is* a change — `archive/<YYYY-MM-DD>-<slug>/`, four files intact, its
identifiers still resolving and still traced. `spec-validation` design §8 and
`Q-OPS-6` record why, and `scripts/check-specs.mjs` enforces it.

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
`SV` for `spec-validation`. The codes of archived changes stay: the legend is
keyed on the bare slug, and `MW`'s and `CV`'s criteria are still defined, still
checked and still referred to from here.

| Change | Status | What it proposes |
|---|---|---|
| [`railway-container-control/`](railway-container-control/) | proposed · **parent** | The product: one screen that spins one configured container up and down, the server-side layer, deployment, the demo. Its `design.md` and `verification.md` are the specification the children cite; its `tasks.md` is now an index. |
| [`console-server/`](console-server/) | proposed · implemented, verification partial | The runtime singleton, the four routes, SSE, the optional passphrase gate, and a fake Railway replaying the experiment's frames end to end. `GET` routes need only the workspace; `POST` routes need the verbs. Built by `vite-console` T-VC-3.\*; `V-CS-2`, `V-CS-5` and `V-CS-8` were run 2026-09-15, closing T-CS-1, T-CS-3 and T-CS-4. Only the `live` `V-CS-9` has none — it needs a headless browser, which is the owner's call. |
| [`console-screen/`](console-screen/) | proposed · implemented, verification partial | The one screen as a rendering of `ContainerState`, with the hook, the API client and the bundle check. Primitives come from `@repo/ui` (`D-OPS-2`); everything that knows what a container is stays in the feature folder. Built by `vite-console` T-VC-4.\*; the five criteria that had no run — `V-SC-3` … `V-SC-8` — were closed 2026-09-15, and `V-SC-8` turned out to describe a bundle grep that did not exist, so `scripts/check-bundle.mjs` was written. Only T-SC-4 is open, on `.env.local`. |
| [`design-system/`](design-system/) | proposed · Phase A implemented | The root `DESIGN.md` as the single source for every token, generated into `@repo/ui`'s `tokens.ts` and `theme.css`, with a validator that recomputes every contrast ratio and refuses drift. Adds `lineStrong` and the two accent states that measuring the palette showed were missing. `D-UI-6` awaits the owner; Phase B is the Vite import. |
| [`designmd-conformance/`](designmd-conformance/) | proposed · implemented | `DESIGN.md` moves from an invented schema to the published `@google/design.md` format, with a normalisation layer so the generator and validator stop reading raw frontmatter, and the format's linter as a second gate held to an allowlist. Compatible with documented extensions and one documented deviation — not conformant. Also replaces `V-DS-14`, which `vite-console` measured and found does not work. |
| [`vite-console/`](vite-console/) | proposed · implemented, awaiting signature | Next.js out, Vite + one long-lived Node process in; the operation contract the mutation, the poller and the stream all agree on; and the first code for `container-verbs`, `console-server` and `console-screen`. Carries `design-system`'s Phase B. `D-UI-5` and `D-OPS-4` await the owner. |
| [`deploy-on-railway/`](deploy-on-railway/) | proposed · owner-heavy | The workspace on Railway as a *shared* monorepo: build from the root, filtered start, watch paths; the target in project B; the manual checks. Closes `Q-OPS-3`. Registers `Q-OPS-8` — Railway deprecated Config as Code and closed it to new services, so the choice is `.railway/railway.ts` against dashboard settings, and no configuration file is written until the owner picks. |
| [`spec-validation/`](spec-validation/) | proposed · implemented, awaiting signature | The corpus checked by a script: identifiers unique and dense, references that resolve, every criterion traced to a task, links that resolve, closed vocabularies — errors; claim markers, credential slots and register filing — warnings. Registers `D-OPS-5`, the `planned` decision status, `Q-OPS-6` and `Q-OPS-7`. `Q-OPS-6` closed 2026-09-15: `archive/` is a container and not a change, an entry in it keeps its four files and its date prefix but loses its index row, and neither `R-REF` nor `R-TRACE` stops at its edge — design §8. The one change that serves the specification rather than the product. |

## Archived

Work finished, folder moved, date prefix added. Their criteria and tasks are
still referred to from the live corpus and are checked exactly as before —
archiving records that somebody met a criterion, it does not excuse them from
having traced it.

| Change | Archived | What it proposed |
|---|---|---|
| [`archive/2026-09-15-monorepo-workspace/`](archive/2026-09-15-monorepo-workspace/) | 2026-09-15 · `T-MW-4.2` | pnpm workspace + Turborepo: `apps/console` and four packages, `contracts ← container-core ← railway-client` plus `ui`; the provider port that breaks today's cycle; boundaries as resolution errors; per-package `typecheck`; CI. `D-OPS-2` and `D-OPS-3` ratified 2026-09-14; `Q-UI-5` and `Q-SEC-5` still open with their defaults applied. |
| [`archive/2026-09-15-container-verbs/`](archive/2026-09-15-container-verbs/) | 2026-09-15 · `T-CV-4` | `up()` / `down()`, the port's verbs, the mutation documents. It was blocked on `Q-API-2` — the one change whose body an agent could not write until the owner picked — and `D-API-5` picked, ratified 2026-09-14: stop ↔ restart, falling back to `serviceInstanceDeployV2` for the first up. `vite-console` wrote the body against that pair — though not the shape design §1/§2 specified; §5 records what was built and why. `V-CV-3` was run 2026-09-15 — a `REMOVED` fixture — which closed the last open task and is why this folder could be archived. |
