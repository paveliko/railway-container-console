# Open Questions

> **Schema:** `| ID | Priority | Owner | Question | Source |`
>
> **Prefix by capability:** `Q-API-N` (Railway API surface), `Q-UI-N` (console),
> `Q-SEC-N` (tokens and secrets), `Q-OPS-N` (deploying this app).
>
> **Lifecycle.** A question closes either by registering the `D-<CAP>-N` that
> resolves it, or by being marked `withdrawn` with a reason. Questions are not
> edited in place — the resolution is appended, pointing at the closing decision.
>
> Numbering is dense. Numbers are not skipped and not reused.

---

## Railway API — `Q-API-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-API-1 | high | me | Which mutations actually spin a container up and down? Introspection is open, so this is read from the schema rather than guessed — but it needs a token first. | `_research/2026-09-14-railway-public-api.md` |
| Q-API-2 | high | me | Does "spin down" mean stopping a deployment, removing it, or scaling a service to zero — and does the reverse restore the same container or create a new one? The UI can only claim what the API actually did. | same |
| Q-API-3 | medium | me | Is there a subscription or event stream for deployment state, or is polling the only option? Determines whether the console can reflect state honestly within the rate limit. | same |
| Q-API-4 | medium | **Railway** | Which token type do you expect a candidate to use for this exercise — account, workspace or project? A project token is scoped to one environment and uses a different auth header, which changes the app's shape. | to ask before the interview |

## Console — `Q-UI-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-UI-1 | high | me | How does the console reflect a container transitioning without naive polling? 100 requests/hour on a free account is exhausted in under two minutes at 1 Hz. | `_research/2026-09-14-railway-public-api.md` |
| Q-UI-2 | medium | me | What does the UI show when the container is in a state it did not initiate — started or stopped from the Railway dashboard while the console is open? | `_research/2026-09-14-the-brief.md` |

## Tokens and secrets — `Q-SEC-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-SEC-1 | high | me | Where does the token live at runtime? A public repository and a deployed demo mean it cannot be in the client bundle, which forces a server side whether or not the brief asks for one. | `_research/2026-09-14-the-brief.md` |
| Q-SEC-2 | medium | **Railway** | Should the deployed demo be usable by a reviewer with my token, or should they supply their own? The first is convenient and leaks capability; the second is safer and adds a step. | to ask before the interview |

## Deployment — `Q-OPS-N`

| ID | Priority | Owner | Question | Source |
|---|---|---|---|---|
| Q-OPS-1 | medium | me | Can the console spin containers within the same Railway project it is itself deployed to, or does that create a loop worth avoiding? | `_research/2026-09-14-the-brief.md` |
