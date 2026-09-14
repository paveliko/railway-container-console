# UX brief: `console-screen` — what to draw in Figma

**Status:** input for design, not a decision. Everything marked `[spec]` is
already ratified or specified elsewhere and must not be changed in Figma;
everything marked `[proposed]` is this brief's own suggestion and needs the
owner's signature before it becomes design intent; everything marked `[open]`
cannot be drawn yet and is named so the file does not silently invent it.

**Sources this brief only renders, never overrides:**
[parent `design.md` §1](../railway-container-control/design.md) (the phase
table), `D-UI-1`, `D-UI-3`, `D-UI-4`, `D-OPS-2` in
[`decisions.md`](../../decisions.md), the phase model in parent `design.md` §6,
the HTTP boundary in §9, and the token file that already exists in code,
[`packages/ui/src/tokens.ts`](../../../packages/ui/src/tokens.ts).

---

## 1. What the screen is

One page. One configured container — no project picker, no navigation, no
tabs, no settings. The page is a *rendering of one value*, `ContainerState`,
and holds no state of its own (`D-UI-3`). A person opens it to answer three
questions in this order:

1. Is it up? — and is that answer *confirmed*, or is the console guessing?
2. Can I act, and did my press land?
3. Did the operation actually finish?

**The design's one job:** keep *pressed*, *accepted* and *completed* visibly
distinct. They are three different events, and the whole product exists
because Railway's own API blurs them (journey §2, `_research/…-cjm.md`).

**The user** (`D-UI-4`): a developer managing a test environment. Not a
dashboard, not an ops console. Someone who will look at this for eight seconds,
press once, and look again a minute later.

**Tone:** the console never claims more than the API said. No optimistic
green, no success confetti, no "it should be ready in a moment". If the state
is unrecognised, the screen says *Unknown* and shows the literal values.

---

## 2. Frame inventory — the deliverable

Nine screen states, desktop and mobile. Each is a required frame; a reviewer
should be able to hold a frame next to the phase table and see them agree.

| # | Frame name | Phase | What it must show |
|---|---|---|---|
| 1 | `down / stopped` | `down` | **Down** · `stopped` · **Start** enabled |
| 2 | `down / never-deployed` | `down` | **Down** · `never deployed` · **Start** enabled |
| 3 | `starting` | `starting` | **Starting…** · `deploying` · control disabled, spinner |
| 4 | `starting / waiting` | `starting` | as above plus `waiting for Railway…` on the detail line — **not** an error |
| 5 | `up` | `up` | **Up** · URL as a link · **Stop** enabled |
| 6 | `stopping` | `stopping` | **Stopping…** · no detail · control disabled, spinner |
| 7 | `failed` | `failed` | **Failed** · `CRASHED` · **Start** enabled |
| 8 | `sleeping` | `sleeping` | **Sleeping** · `serverless sleep — wakes on traffic` · **Stop** enabled |
| 9 | `unknown` | `unknown` | **Unknown** · the literal statuses · **Start** *and* **Stop**, both enabled |

Four overlay conditions, drawn on top of a phase frame — they do not replace
the phase, they are added lines. Draw each once, on the phase named:

| # | Frame name | On | What is added |
|---|---|---|---|
| 10 | `error / refused` | `up` | error line: `Railway refused the request · trace 6317…` — phase, detail and control unchanged |
| 11 | `error / permissions` | `down` | error line worded as *permissions*, not as a fault of the service |
| 12 | `in-flight / already-starting` | `starting` | `already starting` on the detail line — **no error styling** (`409` is not an error) |
| 13 | `connection / reconnecting` | `up` | the connection indicator reads `reconnecting`; the last known state stays on screen |

One more, `[proposed]` and not in the spec: `first-paint`, before
`GET /api/container/state` resolves. The spec does not say what is on screen
for that ~200 ms. Draw it (a skeleton, or the card with a spinner in place of
the headline) and flag it — it is a real state the code will have to render.

---

## 3. Layout

`[proposed]` — the spec fixes the content, not the geometry.

```
┌─────────────────────────────── page (bg: colors.raised) ───────────────────────────────┐
│                                                                                        │
│                      ┌──────────── Card (surface, 1px line, r=8) ────────────┐         │
│                      │  Container                              [ Badge ]      │         │
│                      │                                                        │         │
│                      │  Up                                    ← headline xl   │         │
│                      │  https://target.up.railway.app         ← detail md     │         │
│                      │                                                        │         │
│                      │  [ Stop ]                              ← primary ctrl  │         │
│                      │  ────────────────────────────────────  ← hairline      │         │
│                      │  ● live                                ← connection sm │         │
│                      │  Railway refused the request · trace 6317…  ← error sm │         │
│                      └────────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- Card width `480px` max, centred, `padding: 24` (`space.xl`).
- Vertical rhythm inside the card: `24` between blocks, `8` between headline
  and detail, `12` above the hairline, `8` below it.
- Desktop frame `1440 × 900`; mobile frame `390 × 844`, card full width minus
  `16` on each side. Nothing else changes between them — one column either way.
- The card does not jump between phases. **Reserve the height of the detail
  line and of the footer lines** so that a transition does not move the button
  under the user's cursor. This is the one layout rule that is not cosmetic.

---

## 4. Foundations — build these as Figma variables, named exactly

They are generated from [`DESIGN.md`](../../../DESIGN.md) into
[`packages/ui/src/tokens.ts`](../../../packages/ui/src/tokens.ts) (`D-UI-6`).
Use the same names so handoff is a lookup, not a translation. Do not invent a
thirteenth colour; if a state needs one, that is a change to `DESIGN.md` and a
line in this brief — which is what happened to the three marked *added* below.

| Figma variable | Value | Used for |
|---|---|---|
| `color/ink` | `#111418` | headline, body text |
| `color/muted` | `#5b6672` | detail line, connection indicator, neutral badge |
| `color/line` | `#dfe3e8` | card border, hairline, spinner track — **decoration only** |
| `color/lineStrong` | `#7e8895` | *added.* Any border that identifies a control — the secondary button, the neutral badge. `line` measures 1.29:1 and cannot do this job |
| `color/surface` | `#ffffff` | card background, primary button label |
| `color/raised` | `#f6f7f9` | page background |
| `color/accent` | `#2f6feb` | primary button, spinner arc, `starting` / `stopping` |
| `color/accentHover` | `#2a63d4` | *added.* Primary button, hover |
| `color/accentActive` | `#2559bd` | *added.* Primary button, pressed |
| `color/positive` | `#177245` | `up` |
| `color/caution` | `#8a5a00` | `sleeping`, `unknown` |
| `color/danger` | `#b3261e` | `failed`, error line |

Type — one family, four sizes, three weights. Family:
`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial`
(in Figma: **Inter** or **SF Pro** as the stand-in; the product ships the system
stack, so do not design anything that depends on a specific face). Monospace,
for the `traceId` only: `ui-monospace, SFMono-Regular, Menlo, Consolas`.

| Figma text style | Size | Weight | Used for |
|---|---|---|---|
| `text/sm` | 13 px | 500 | badge, connection, error line |
| `text/md` | 15 px | 400 | detail line, button label (500) |
| `text/lg` | 18 px | 600 | card title |
| `text/xl` | 24 px | 600 | headline |

Spacing `4 · 8 · 12 · 16 · 24` (`xs sm md lg xl`) — no other values. Radius
`4` (button), `8` (card), `999` (badge).

**Contrast, checked:** every pair below is recomputed by
`scripts/check-design.mjs` on every run; the numbers here are that script's
output, not an assertion.

`accent` on `surface` is 4.57:1 — it passes AA for normal text with nothing to
spare, and on `raised` it is **4.26:1, which fails**. So: do not use `accent`
for the 13 px lines, do not use it for body text on the page background, and do
not lighten it. `muted` on `surface` is 5.85:1 and is safe everywhere. `line` at
1.29:1 is decoration and never a control's boundary — that is what
`color/lineStrong` is for.

---

## 5. Components

Two tiers, and the line between them is a ratified boundary (`D-OPS-2`), not a
preference. Mirror it in the Figma file: **`@repo/ui` primitives know nothing
about containers**; anything that knows what a phase is lives in the feature
page.

### 5.1 Primitives — page `Primitives`, one component set each

| Component | Variants | Notes |
|---|---|---|
| `Button` | `variant = primary \| secondary` × `state = default \| hover \| active \| focus \| disabled` | primary: `accent` fill, `surface` label; hover `accentHover`, pressed `accentActive`. secondary: `surface` fill, **`lineStrong`** border, `ink` label; hover and pressed `raised` fill. **Disabled differs by variant** — the 55 % applies to fill and border only, and the label switches to `ink` (primary) or `muted` (secondary) at full strength. Min height `44`, padding `8 / 16`, radius `4`, label `text/md` 500 |
| `Badge` | `tone = neutral \| accent \| positive \| caution \| danger` | 1 px border in the tone colour over a **10 % tint of it**, radius `999`, padding `4 / 8`, `text/sm`. The `accent` tone's label is **`ink`**, not accent — accent is barred from 13 px text |
| `Card` | `title = on \| off` | `surface`, 1 px `line`, radius `8`, padding `24` |
| `Spinner` | `size = sm (16) \| md (24)` | track `line`, arc `accent`, 0.9 s rotation, still under `prefers-reduced-motion`; the text label is **required**, not defaulted |

~~`[proposed]` **`hover` and `focus` do not exist in the code today**~~ —
**resolved 2026-09-15 by `design-system` (`D-UI-6`).** `hover`, `active` and
`focus-visible` now exist on `Button`, with the focus ring drawn outside the
control's own border so the two are never confused. Draw all five states.

**Why the disabled row changed.** `opacity: 55 %` applied to the whole control
put a primary label at **1.56:1**. By `D-UI-3` that label reads *Starting…* or
*Stopping…* and is the only thing on screen naming the transition, so the 55 %
was narrowed to the fill and border and the label now switches colour instead —
8.49:1 on primary, 5.85:1 on secondary. WCAG exempts inactive controls; this
product does not, and `DESIGN.md` records that as a house rule rather than as a
standard.

### 5.2 Feature components — page `Container control`

Named as the code names them, so a review can hold the two side by side:

| Component | Renders | Variants to draw |
|---|---|---|
| `ContainerPanel` | the whole card | one per frame in §2 |
| `ContainerStatus` | headline + detail line + badge | 7 phases × the detail variants of §6 |
| `ContainerActions` | the control row | `start` · `stop` · `disabled-starting` · `disabled-stopping` · `both` (the `unknown` case) |
| `ConnectionIndicator` | `● live` / `● reconnecting` | 2 |
| `LastError` | `<sentence> · trace <id>` | 2 (present / absent) |

---

## 6. Copy deck — the exact strings

`[spec]` for everything in the parent's §1 table. Do not paraphrase these in
Figma; the component tests assert them (`V-SC-1`).

| Phase | Headline | Detail line | Control label | Enabled |
|---|---|---|---|---|
| `down` | `Down` | `never deployed` / `stopped` / `removed` | `Start` | yes |
| `starting` | `Starting…` | the deployment status, humanised: `building`, `deploying` | `Starting…` | **no** |
| `up` | `Up` | the deployment URL, as a link; `n replicas` when n > 1 | `Stop` | yes |
| `stopping` | `Stopping…` | — | `Stopping…` | **no** |
| `failed` | `Failed` | `FAILED` / `CRASHED` | `Start` | yes |
| `sleeping` | `Sleeping` | `serverless sleep — wakes on traffic` | `Stop` | yes |
| `unknown` | `Unknown` | the literal statuses observed | `Start` **and** `Stop` | both |

Added lines, always below the control:

| Line | String | Styling |
|---|---|---|
| connection, healthy | `live` | `text/sm`, `muted`, `positive` dot |
| connection, degraded | `reconnecting` | `text/sm`, `muted`, `caution` dot |
| press with no answer after 10 s | detail line adds `waiting for Railway…` | `muted` — **not** an error |
| press refused as `409` | `already starting` / `already stopping` | `muted` — **not** an error |
| error | `<human sentence> · trace <traceId>` | `text/sm`, `danger`; the id in mono |

`[proposed]` Human sentences per error code from parent `design.md` §9. The
spec fixes only the shape and one example; these are suggestions, and the
research asks that the permissions case read as permissions, not as a fault:

| Code | Sentence |
|---|---|
| `railway-not-authorized` | `The token is not permitted to do this` |
| `railway-rate-limited` | `Railway is rate-limiting us — retrying in 30 s` |
| `railway-unavailable` | `Railway did not answer` |
| `railway-rejected` | `Railway refused the request` |

`[proposed]` The card title. `Container` is the honest minimum, since the
names of project, environment and service are `Q-UI-4` and undecided. Draw the
card title as a component slot wide enough for
`project · environment · service` so that answering `Q-UI-4` is a content
change, not a redesign.

---

## 7. Behaviour the design must encode

`[spec]`, all of it — these are the rules a still frame has to make visible.

1. **No optimistic transition** (`D-UI-1`). The control disables on press and
   re-enables only when a new state arrives from the server. Nothing on screen
   ever turns green before Railway said so. There is no "Stopping…" that the
   browser invented.
2. **Pressed ≠ accepted ≠ completed.** Press → the control goes disabled
   (accepted). A new phase arrives → the headline changes (completed). After
   10 s with neither, `waiting for Railway…` appears, still not an error.
3. **`409` is not an error.** A second press — usually from a second tab —
   produces `already starting`. Muted, informational, no red.
4. **An error never changes the phase.** The error line is additive; headline,
   detail and control stay exactly as they were. It clears on the next
   successful state.
5. **`unknown` shows two enabled buttons.** Not one, not none. The user knows
   more than the table does.
6. **Refresh mid-transition shows the transition**, not a reset — so the
   `starting` frame is also what a fresh page load can look like.
7. **Changes the console did not make** — someone pressed Stop in the Railway
   dashboard, the container crashed, serverless sleep — arrive over the same
   channel and render through the same table. **Nothing in the design may
   distinguish "we did this" from "this happened"**, because the API does not.
   No toast saying "your action succeeded".
8. **Detection is bounded at 30 s.** The console polls. Do not draw anything
   that promises instantaneity ("live" refers to the browser↔server stream,
   not to Railway).

---

## 8. Accessibility — non-negotiable

- The headline is a live region: a phase change must be announced, not only
  seen. Annotate it in Figma (`aria-live="polite"`).
- The spinner never carries meaning alone — it is always next to the words
  `Starting…` / `Stopping…`. The code gives it `role="status"` and a text
  label; keep the label in the design.
- State is never colour alone: `up`, `failed` and `sleeping` differ in words
  first, colour second. A greyscale print of any frame must still be readable.
- Focus is visible on the control — see the `[proposed]` note in §5.1.
- The URL on `up` is a real link: underlined or otherwise distinguishable
  without hovering.
- Touch targets ≥ 44 px on the mobile frames.

---

## 9. Out of scope — do not draw these

| Not in the design | Why |
|---|---|
| A project / environment / service **picker** | `D-API-6` rejected it; one configured container, by design |
| Logs, metrics, restart, redeploy, rollback, image choice | parent `design.md` §12 — extensions, each one route and one operation, none in the MVP |
| Sign-in, avatars, an account menu | there is no user model; `Q-SEC-4` may add a *passphrase* gate, which is one field, not an identity |
| Dark mode | the token file is light only; adding it is a change to `@repo/ui` |
| A toast / notification system | rule 7 in §7 — the console does not celebrate its own actions |
| Any second screen | one page, and the routes to fill a second one do not exist |

---

## 10. What cannot be drawn yet — `[open]`

These are real gaps, not omissions. Draw *around* them; do not resolve them in
Figma.

| Open | Question | Effect on the design |
|---|---|---|
| Names of project / environment / service; `last known at HH:MM` on `reconnecting`; a link to the deployment in the Railway dashboard | `Q-UI-4` | §6's card-title slot and a reserved second line in the footer are there so that a *yes* costs a content change |
| What **Stop** actually does — and therefore whether it needs a confirmation dialog, and what that dialog must warn about ("will my data survive?") | `Q-API-2`, owner | **If a confirmation is needed, it is a modal this brief has not specified.** Draw the `up` frame both ways — with and without a confirm step — and mark the second as conditional on `Q-API-2` |
| Whether a passphrase gate exists at all | `Q-SEC-4` | if yes: one field, one button, one error line, on the same card. Out of scope until answered |
| `first-paint`, before the first state arrives | not registered yet — candidate `Q-UI-6` | §2 frame 14; the design proposes, the owner signs |

---

## 11. Acceptance — how the Figma file is checked

Falsifiable, in this repository's sense: each line is a thing a reviewer can
confirm or refute by opening the file.

- **D-1** Every row of §2 exists as a named frame, desktop and mobile.
- **D-2** Every string on screen matches §6 character for character, including
  the ellipses and the middle dot in the error line.
- **D-3** No colour, size, spacing or radius appears that is not in §4. (§4 is
  itself generated from `DESIGN.md`, so the authority is that file; the table
  above is a copy for the designer's convenience.)
- **D-4** Every button, badge, card and spinner in the screen frames is an
  instance of a §5.1 primitive — no detached, hand-drawn one. (The code
  equivalent, `V-SC-10`, greps for a stray `<button>`.)
- **D-5** No primitive's name or variant refers to a container, a phase or a
  deployment — the `D-OPS-2` boundary, visible in the layer names.
- **D-6** The `409` and `waiting for Railway…` frames carry no `danger`
  colour anywhere.
- **D-7** The error frames differ from their base frame in exactly one added
  line.
- **D-8** Frames 1 → 3 → 5 → 6 → 1, flipped in sequence, move nothing except
  text and the control's label — the card does not resize, the button does not
  shift.
- **D-9** Converted to greyscale, every phase frame is still unambiguous.
- **D-10** Each `[proposed]` and `[open]` item this file names is marked in the
  Figma file where it appears, so the owner signs it deliberately.
