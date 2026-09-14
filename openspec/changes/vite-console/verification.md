# Verification: `vite-console`

`unit` needs no network. `build` runs at build time. `manual` is a numbered
procedure a second person can repeat. Nothing here touches live Railway: every
start and stop runs against `test/fake-railway.ts`.

## The operation lifecycle — the twelve of `design.md` §1.6

- **V-VC-1** `unit` — two claims in one tick: one wins, one is refused; over HTTP, one mutation reaches the fake and the other gets `409` having issued no Railway request. *(`V-18`)*
- **V-VC-2** `unit` — `Stop` does not resolve on `up{replicas:2}` → `up{replicas:3}`, nor on a URL appearing. It resolves on `down`.
- **V-VC-3** `unit` — `Start` does not resolve on a `down` → `down` reason change.
- **V-VC-4** `unit` — an `unknown` phase mid-operation is rendered at once, the guard is held, and only the deadline releases it.
- **V-VC-5** `unit` — a read begun before `claim()` and landing after it updates the state but does not resolve the operation.
- **V-VC-6** `unit` — a read that outlived its deadline cannot overwrite a newer one: `up` applied after `down` leaves `down` on screen.
- **V-VC-7** `unit` — A times out, B is claimed, A then rejects: B's guard survives.
- **V-VC-8** `unit` — a `provider.read()` that never settles still produces the deadline's `operation` event, and **polling resumes** rather than wedging on the non-reentrant flag.
- **V-VC-9** `unit` — an ambiguous verb holds the guard to the deadline and reports `indeterminate`, not `timed-out`; a definite refusal frees it at once; an ambiguous one still resolves as `succeeded` if the container arrives.
- **V-VC-10** `unit` — a subscriber joining mid-press is told the press is running, in its first message.
- **V-VC-11** `unit` — `Start` does not resolve on `up` or `failed` carrying a different `deploymentId` than the `202` returned.
- **V-VC-12** `unit` — a target reaching `failed` resolves as `failed`, not `succeeded`.

## The stream

- **V-VC-13** `unit` — every unnamed event parses with `containerStateSchema`; every `operation` event parses with `operationEventSchema`; a `: ping` is written inside 20 s; a disconnect unsubscribes and costs nothing thereafter. *(`V-CS-4`, `V-47`)*
- **V-VC-14** `unit` — with the container state never changing, the deadline still reaches the browser as an `operation` event. A state-only protocol would leave the control disabled forever, and this is the test that would catch it.

## The boundary

- **V-VC-15** `manual` — rule 4 fails three ways and passes once reverted: a file under `src/client/` importing `@repo/railway-client`; the same two hops away through a helper; and `index.html` repointed outside `/src/client/`. *(`V-MW-25`)*

## The browser

- **V-VC-16** `unit` — the control is disabled by each of the three rules independently, and a resolving `ContainerState` arriving **without** an `operation` event does not re-enable it.
- **V-VC-17** `unit` — the nine frames of `ux-brief` §2 render the copy of §6; `unknown` renders both controls enabled. *(`V-42`, `V-44`, `V-SC-1`)*
- **V-VC-18** `unit` — every code in `consoleErrorCodeSchema` has a sentence; the rate-limit sentence names a wait and never promises a retry.

## The build

- **V-VC-19** `build` — `vite build` emits `dist/` and no `.next/`; the built JavaScript contains neither `backboard.railway.com` nor a sentinel `RAILWAY_TOKEN`. *(`V-15`)*
- **V-VC-20** `build` — the built CSS contains classes that originate in `@repo/ui`. **The probe must be a state variant** (`hover:bg-accent-hover`, `disabled:bg-accent/55`): measured, `min-h-touch` and `border-line-strong` survive a missing `@source` and would pass a broken build. *(amends `V-DS-14`)*

## Appearance, on the real screen — `T-DS-11`

- **V-VC-21** `manual` — read through `getComputedStyle` / `getBoundingClientRect`, not class names, at 375 px and desktop: every control ≥ 44 px; card padding 24 px; headline-to-detail 8 px; blocks 24 px; border 1 px in `rgb(223, 227, 232)`; page `rgb(246, 247, 249)`; focus ring 2 px accent at 2 px offset on every control; spinner `animation-duration` 0.9 s with the reduced-motion override present in the shipped stylesheet. *(`V-DS-19`)*
- **V-VC-22** `manual` — flipping `down → starting → up → stopping → down` moves nothing: one distinct button position, one distinct card height. *(`ux-brief` D-8)*
- **V-VC-23** `manual` — at 375 px the card keeps 16 px each side and the page does not scroll horizontally; at 200 % text zoom a full error sentence with a `traceId` grows its row rather than being clipped. *(WCAG 1.4.4)*

## The process

- **V-VC-24** `manual` — with `RAILWAY_TOKEN` unset, `start` exits non-zero and the log names the variable. *(`V-55`; `V-CS-2` is blocked on `Q-OPS-5`)*
- **V-VC-25** `manual` — from a clean production install, `start` resolves the workspace sources through their symlinks and honours `PORT`; `SIGTERM` ends every open stream.
