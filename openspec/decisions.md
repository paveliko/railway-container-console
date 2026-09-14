# Decisions

> **Schema:** `| ID | Status | Statement |`
>
> **Prefix by capability:** `D-API-N`, `D-UI-N`, `D-SEC-N`, `D-OPS-N`.
>
> **Statuses.** `ratified` — signed off. `proposed` — follows from research but not
> yet signed. `superseded` — replaced by a successor.
>
> **Mutation rule.** A ratified decision is not edited. It is superseded by a new
> `D-<CAP>-N` that references it. An agent does not move `proposed` to `ratified`.
>
> Every decision records the alternatives that were rejected. A decision without
> them is a note, not a decision.

---

## Tokens and secrets — `D-SEC-N`

| ID | Status | Statement |
|---|---|---|
| D-SEC-1 | proposed | The Railway API token is never exposed to the browser. Calls to `backboard.railway.com` are made from a server the console owns, and the client talks only to that server.<br><br>**Rejected:** calling the GraphQL endpoint directly from the browser with the token in an environment variable. It is fewer moving parts and it is what the brief's wording could be read to permit, but a deployed public demo would hand a working credential to anyone who opened devtools. **Rejected:** asking the reviewer to paste their own token into the UI — safer, but it puts a credential prompt in front of someone evaluating the work, which is a worse first thirty seconds. Resolves `Q-SEC-1`. |

## Console — `D-UI-N`

| ID | Status | Statement |
|---|---|---|
| D-UI-1 | proposed | The console shows the state the API actually reports, including the intermediate one, and never an optimistic guess about whether a container is up.<br><br>**Rejected:** flipping the toggle immediately and reconciling later. It reads as faster and it is how most consoles are built, but this product's whole subject is whether infrastructure is really running — a UI that lies for two seconds about that is lying about the only thing it exists to say. Depends on `Q-API-3` and `Q-UI-1` for how state is obtained. |
