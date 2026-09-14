# User hypotheses and a draft journey — the owner's, 2026-09-14

> Written by the owner as design hypotheses, **not** as interview results.
> Everything in §1–§3 is therefore `[to-verify]` by default; the marks below say
> what is already supported by other research and what is not. §4 maps each
> stage onto the specification so the gaps are visible. The public-source view
> of who Railway's users are is in
> [`2026-09-14-railway-customers-and-users.md`](2026-09-14-railway-customers-and-users.md).

## 1. Four users, by task and situation — not by job title

The split is by *what the person is trying to do right now*: the same
developer checks a prototype in the morning and takes apart a production
failure in the evening.

| User and situation | Arrives with | Needs to | Pain | Success |
|---|---|---|---|---|
| **Prototype developer** | wants to show a working idea | start the app, wait until it is ready, open it | does not understand the infrastructure, nor the difference between *running* and *ready to take requests* | got a working URL and checked the app |
| **Developer verifying a change** | needs to test a specific version | pick the right environment, start the service, check, stop | easy to pick the wrong environment; unclear whether the operation has finished | verified the right version, touched nothing else |
| **QA engineer or designer** | was handed a link to a test environment | bring it up and open it | does not know service names, does not want technical logs | opened the right product on their own |
| **Engineer working an incident** | a service is down or misbehaving | establish the current state and take a permitted action | unclear whether the fault is in the app, the operation, or the console itself; afraid of making it worse | understood what happened and got confirmation of the action's result |

`[to-verify]` All four. `[inferred]` The second and third have direct
counterparts in Railway's own support forum — people asking how to *pause* a
test project to save credits, and "hide it from the web temporarily" — see the
customers document §4. The first and fourth are plausible but have no
independent evidence yet.

**Chosen for the MVP: the second — a developer managing a test environment.**
A clear start/stop task, and a scenario that does not require promising
production-incident management. Recorded as `D-UI-4` (proposed).

Not four interfaces. First check whether one scenario with clear names, states
and feedback is enough.

## 2. Draft journey for the primary user

Scenario: *"I need to start a test app, verify a change, and stop it when I'm
done."*

| Stage | User action | Their question | Likely difficulty | What the interface must give |
|---|---|---|---|---|
| **1. Find the right one** | opens the console, picks the resource | "Is this the environment I mean?" | similar names, several projects | project, environment, service **names** and the current status |
| **2. Read the state** | looks at what is running | "Do I need to start it, or can I already open it?" | stale or ambiguous status | a *confirmed* state; a separate message if it could not be obtained |
| **3. Start** | presses *Start* | "Was the request accepted?" | no reaction; repeated clicks | immediate feedback; protection from accidental repeats |
| **4. Wait** | watches progress | "Still starting, or stuck?" | a long wait with no explanation | the operation's state, updates, and an understandable path to diagnosis |
| **5. Check the app** | opens its address | "Is it really reachable?" | process up, app not yet ready | the link; a readiness check if the implementation has one |
| **6. Stop** | finishes | "What exactly will stop? Will data survive?" | unclear consequences | a precise description of the action; confirmation when the consequences warrant it |
| **7. Confirm the result** | checks the outcome | "Did the stop really complete?" | the UI showed success too early | a confirmed final state, or an explained error |

**The key point: pressing the button, the request being accepted, and the
operation completing are three different events.** The user must know which
of the three the system is at.

## 3. Four branches off the main path

- **No access** — explain the permissions problem; do not present it as a
  service fault.
- **Connection lost** — the state is *unknown*; do not substitute *stopped*.
- **User refreshed the page** — restore the current state; do not restart the
  scenario.
- **Someone else acted** — show the change and align the available buttons
  with the new state.

## 4. How the draft maps onto the specification

Where a stage is already covered, the reference; where it is not, the gap and
the register entry that tracks it.

| Stage / branch | Covered by | Gap |
|---|---|---|
| 1 names of project / environment / service | — | **Not covered.** `D-API-6` fixes one configured triple and shows no names; `design.md` §1 shows only the phase. Showing the three *names* costs three one-shot reads at startup and no decision; *choosing* among environments is the picker `D-API-6` rejected. Registered as `Q-UI-4`. |
| 1 current status | `design.md` §1, `D-API-4` | — |
| 2 confirmed state; separate message if unavailable | `D-UI-1`; `phase: unknown` (row 13); SSE indicator `live / reconnecting` | The "could not obtain state" case is the `reconnecting` indicator plus the last known state — it should say *last known at HH:MM*, which §1 does not yet specify. Folded into `Q-UI-4`. |
| 3 accepted vs. completed; repeat clicks | `202` on accept, SSE on completion (§8); `409 transition-in-flight` (`D-UI-3`, V-18) | — |
| 4 still starting or stuck; path to diagnosis | `DeploymentEventStep` on the detail line (§1); *waiting for Railway…* after 10 s | "Path to diagnosis" is a logs pane — `deploymentLogs` subscription exists; listed as optional (§12). For the primary user, a link to the deployment in the Railway dashboard is the zero-cost version. Folded into `Q-UI-4`. |
| 5 really reachable | `url` on `phase: up`; `HEALTHCHECK` step precedes `SUCCESS` when a healthcheck is configured | Readiness is Railway's healthcheck, not ours; if the target has none, *up* means the container started. The target service should have a healthcheck path configured (`D-OPS-1`, T-7.1). |
| 6 what exactly stops; will data survive | **This is `Q-API-2`.** | The button's label and any confirmation dialog cannot be written until the owner picks the verb. The forum evidence (customers doc §4) says users ask precisely this question and get *"remove the deployment; volumes are still billed"*. |
| 7 confirmed final state | `D-UI-1`, `D-API-4` rows 8–9 (`to-verify`, `Q-API-6`) | — |
| No access | `RailwayError.not-authorized` → `502 railway-not-authorized` → *Railway refused the request · trace …* (§8) | The wording should say *permissions*, not *error*; §9's error names already separate it from `railway-unavailable`. |
| Connection lost | `reconnecting` indicator; state kept, never reset (`D-API-1`) | as stage 2 |
| Refresh | `GET /state` then SSE, no browser storage (`D-UI-3`, V-48, V-51) | — |
| Someone else acted | same stream, same table (`D-UI-3`, `Q-UI-2` resolved) | — |

## 5. Turning the draft into a verified journey

Talk to **3–5 potential users from the chosen segment** — not one per type.
Ask about the last real case:

1. What did you need to start or stop, and why?
2. How did you pick the environment?
3. How did you know the operation had finished?
4. Where did you have to look at logs or ask a colleague?
5. What could have gone wrong, and what were you afraid of?

Registered as `Q-UI-3`; owner. Until it runs, `D-UI-4` stays *proposed* and
this document stays a hypothesis.

And before the interface is detailed, confirm in the API **what stopping means
and what it does to the resource and its data** — `Q-API-2`, `Q-API-6`,
`Q-OPS-2`. Button labels, warnings and the end of the journey all depend on it.
