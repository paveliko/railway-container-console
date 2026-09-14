# `_research/`

Source material gathered before any decision was made, so the decisions can be
checked against what was actually known at the time.

| Document | What it establishes |
|---|---|
| [`2026-09-14-the-brief.md`](2026-09-14-the-brief.md) | What was asked, what it constrains, and how the review is structured |
| [`2026-09-14-railway-public-api.md`](2026-09-14-railway-public-api.md) | From the docs alone: endpoint, the three token types and their differing auth headers, rate limits, and what remained unverified |
| [`2026-09-14-railway-graphql-surface.md`](2026-09-14-railway-graphql-surface.md) | From the live endpoint: subscriptions exist and work (undocumented), CORS is pinned to `railway.com`, auth errors are HTTP 200, the rate-limit headers actually returned, and the mutations that matter for up/down |
| [`2026-09-14-railway-domain-model.md`](2026-09-14-railway-domain-model.md) | The object graph, where "the container" is in it, the two status enums that disagree about "stopped", and why nothing brings back the same container |
| [`2026-09-14-railway-operations-and-cost.md`](2026-09-14-railway-operations-and-cost.md) | Where tokens are made and what they reach; what the dashboard calls the actions (*Remove*, not *Stop*); plans, rates and what a container costs; retries, double presses, idempotency |
| [`2026-09-14-railway-customers-and-users.md`](2026-09-14-railway-customers-and-users.md) | Who Railway says it is for, who pays, what people deploy, and what they ask on the support forum — including how often they ask for a pause button and what Railway tells them |
| [`2026-09-14-user-hypotheses-and-cjm.md`](2026-09-14-user-hypotheses-and-cjm.md) | The owner's four user hypotheses, the chosen primary user, a draft seven-stage journey, and a stage-by-stage map onto the specification with the gaps named |
| [`railway-schema-excerpt.graphql`](railway-schema-excerpt.graphql) | Verbatim excerpt of the live schema — the types, queries, mutations and subscriptions the console touches. The selection is editorial; the text is not |

Every factual claim carries `[observed]`, `[inferred]` or `[to-verify]`.

If you are looking for the four conventional research topics:

| Topic | Lives in |
|---|---|
| the assignment and its sources | `2026-09-14-the-brief.md` (requirement register `R-N` / `A-N` inside) |
| the domain — entities and how they relate | `2026-09-14-railway-domain-model.md` |
| the users — who they are, what they ask for | `2026-09-14-railway-customers-and-users.md`, `2026-09-14-user-hypotheses-and-cjm.md` |
| the API — confirmed capabilities and limits | `2026-09-14-railway-public-api.md`, `2026-09-14-railway-graphql-surface.md`, `railway-schema-excerpt.graphql`, `2026-09-14-railway-operations-and-cost.md` |
| open questions, assumptions, questions for Railway | [`../open-questions.md`](../open-questions.md) — one register for the whole repository |
