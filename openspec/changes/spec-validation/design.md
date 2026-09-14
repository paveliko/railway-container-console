# Design: `spec-validation`

How `scripts/check-specs.mjs` reads the corpus, which rules it enforces, and —
just as load-bearing — what it cannot see.

---

## §1 Identifiers, and the four kinds of reference

An identifier is `V-<CODE>-<n>`, `T-<CODE>-<n>`, `Q-<CAP>-<n>` or
`D-<CAP>-<n>`. `<CAP>` is one of `API`, `UI`, `SEC`, `OPS`. `<CODE>` is a child
change's two-letter code from [`../README.md`](../README.md), or absent — the
parent change writes plain `V-26`. The number is `\d+[a-z]?`: the suffix is
real, `V-26a` exists.

The grammar's one deliberate consequence: **a template is not an identifier.**
`D-SEC-N`, `V-MW-N` and `Q-UI-N` appear 33 times as schema notation in headers
and prose. Because the number must be digits, the literal `N` never matches, so
templates need no exemption list to maintain. This is a property of the grammar,
not a special case, and it is the reason the grammar was written this way.

Four kinds of reference then remain, and the checker distinguishes them:

| Kind | Example | Treatment |
|---|---|---|
| **Ordinary** | `` `D-API-4` `` | Strict. Must resolve. |
| **Historical** | a `superseded` identifier | Resolves like any other — superseded rows stay in the register, which is what *superseded rather than edited* produces. |
| **Forward** | `` `D-SEC-2` `` at [`../railway-container-control/tasks.md`](../railway-container-control/tasks.md) | Reserved by a `planned` row in the register. See below. |
| **Example** | an identifier named in order to say it does not exist | Marked `example:`. See below. |

### Forward references are reserved, not renamed

`T-1.4` is `[~]`, *Owner*, and reads *"`Q-SEC-4` resolved by a `D-SEC-2`"*. The
number is deliberately claimed for a decision nobody has argued yet. Making the
reference resolve by renaming it to the template `D-SEC-N` would satisfy the
checker and destroy the sentence's meaning.

So `decisions.md` gains a fourth status, `planned`, and a row that reserves the
number and says what it is reserved for. A `planned` row is exempt from the
rejected-alternatives requirement — it has no argument yet, by definition. The
reservation is now visible in the register, which is where rule 3 says
everything unresolved belongs.

### The example convention, and why formatting cannot carry it

This change's own specification must name identifiers that do not exist: the
break-and-revert procedures in [`verification.md`](verification.md) say *write an
undefined decision id*, and §4 below quotes fixture identifiers. Written
plainly, the checker rejects its own specification.

**The exemption cannot be inferred from formatting.** Ordinary references live
in inline code, so skipping code spans would stop checking most of the corpus.
They also live in fenced blocks: all six identifiers inside fences are genuine
references — `T-4.2` and `D-API-7` label boxes in the architecture diagram,
`Q-SEC-4` annotates an environment variable, and `Q-UI-5`, `Q-API-2` and
`D-OPS-3` sit in code comments. Every one resolves. Skipping fences would
silently stop checking them.

The exemption is therefore a **positive marker**, written inside the code span:

> Break-and-revert: write an undefined decision id — `example:D-API-9` — into a
> design document; the check must fail naming the file, line and identifier;
> revert.

It is matched by a negative lookbehind on the identifier grammar, so its scope
is exactly this prefix and nothing else. Two guards keep it from decaying into a
general escape hatch:

- **`W-EXAMPLE`** warns when an `example:` marker names an identifier that does
  exist. Then it is not an example, and the marker is being used to silence a
  real reference.
- The pass line counts them, so their number is visible on every run rather than
  growing unnoticed.

---

## §2 What defines an identifier

The parsers' central distinction, and the one an earlier draft got wrong.

| Role | Syntax | Constraint |
|---|---|---|
| **Canonical definition** | a checkbox item, `- [x] **T-CS-1 Runtime singleton.** …` | at most one per identifier, globally |
| **Index entry** | a row of the parent's delegation table, `\| T-4.3 Runtime singleton \| not started \| …console-server/ T-CS-1 \| … \|`; the range row `T-7.1 – T-7.3` expands | at most one per identifier |
| **Group heading** | `## T-1 · Owner decisions …` | a prefix, not a task; `T-1` resolves when any `T-1.<m>` exists |
| **Criterion definition** | `- V-CS-2 \`unit\` — …`, also written `- **V-VC-1** \`unit\` — …` | at most one per identifier |
| **Reference** | anywhere else | must resolve |

A naive reading counts three places a `T-` is "defined" and reports false
duplicates, because in **one file** the same identifier legitimately appears
twice:

```
:46  | T-3.5 Close `Q-OPS-2` | not started | stays here … |      ← index entry
:58  - [ ] **T-3.5 Close `Q-OPS-2`.** Result: … Acceptance: …     ← canonical
```

`T-3.5` and `T-6.3` are both shaped this way: the row delegates to *this file*,
and the checkbox below is where the task actually lives. The mirror case is
`T-4.3`, which has **no canonical definition anywhere** — its row delegates to
`console-server` `T-CS-1`, and that change's `T-CS-6` refers back to it. Both
are correct, and only the canonical definition is subject to uniqueness.

This yields an invariant nothing checks today: **a delegation that points at
nothing is a lost task.** A `where` cell reading *stays here* requires a
canonical definition in the same file; any other cell must contain at least one
reference that resolves. The observed cells vary — `stays here`, a bare folder
link, a folder link plus `T-DR-0`, a change name plus `T-CS-3` — so the rule
accepts all of them and rejects only the cell that names nothing reachable.

### The two clauses `Acceptance:` needs

`Acceptance:` segments are parsed for the traceability graph, and two shapes
decide whether the rule is usable at all:

- **Ellipsis ranges** — `Acceptance: V-CV-1 … V-CV-7, V-CV-9.`
- **Mixed backticking** — ``Acceptance: V-DR-1, V-DR-2, `V-52`, `V-54`.``

Expanding the range and stripping the backticks is the difference between the
rule reporting eleven real gaps and sixty-six, most of them noise. The expander
has a green fixture of its own for that reason.

---

## §3 The rules

Each names the criterion it implements, so a failure points at a line in
[`verification.md`](verification.md) rather than at a regular expression.

| Rule | Severity | Criterion | What it checks |
|---|---|---|---|
| `R-STRUCT` | error | `V-SV-5` | Four files per change directory — extra files are fine; the index in `../README.md` lists exactly the directories present; every `D-`/`Q-` row sits in a table contiguous with its header |
| `R-ID` | error | `V-SV-6` | `Q-` and `D-` dense from 1 and unique per capability; at most one canonical definition and one index entry per `V-`/`T-`; plain `V-<n>` defined only by the parent change; capabilities and child codes from their declared vocabularies |
| `R-REF` | error | `V-SV-7` | Every reference resolves; every delegation cell resolves |
| `R-TRACE` | error | `V-SV-8` | Every criterion reaches a task |
| `R-LINK` | error | `V-SV-9` | Every relative link resolves to a file or directory |
| `R-VOCAB` | error | `V-SV-10` | Checkbox, criterion kind, decision status keyword, `**Amended by**` target |
| `W-CLAIM` | warning | `V-SV-11` | Research paragraphs that open a claim without a marker |
| `W-CRED` | warning | `V-SV-12` | Known credential slots carry a placeholder |
| `W-FILE` | warning | `V-SV-13` | A `D-`/`Q-` row sits under the heading naming its own capability |
| `W-EXAMPLE` | warning | `V-SV-14` | An `example:` marker names an identifier that exists |

### `R-TRACE` is reachability, not membership

An earlier draft counted a criterion discharged when a task's `Acceptance:`
claimed it **or** another criterion cited it. That admits a cycle: A cites B, B
cites A, no task exists anywhere, and both report green — a coverage guarantee
that guarantees nothing.

The rule is a reachability query instead. Nodes are criteria and tasks; there is
an edge from each criterion to every task whose `Acceptance:` claims it and to
every criterion that cites it. A criterion passes when it reaches **at least one
task node carrying an actual `Acceptance:` clause**. A cycle among criteria
terminates without reaching a task and is reported as a cycle, naming its
members.

Citing a neighbour is how children legitimately restate the parent —
`- V-SC-1 \`unit\` — \`V-42\`: one test per row…` — so the edge is real. What
changed is that an edge is no longer a destination.

**The name is deliberate.** A criterion that traces to a task proves somebody
signed up to meet it. It does not prove it is met. `verification.md` says
traceability for that reason.

### Status is prose, not a token

Decision statuses are written as
`**ratified 2026-09-14** — owner, amended on ratification`, and one runs to a
full clause. `R-VOCAB` reads the leading keyword and never matches the cell
whole.

---

## §4 The self-test

### Why the contract differs from `check-design.mjs`

The sibling's fixtures assert that some problem *contains a substring*. That is
enough for a checker whose failures are arithmetic. It is too weak here: a red
fixture can pass for the wrong reason, and the risk in this script lives in the
parsers — ranges, delegation tables, canonical versus index — not in the rules.

So problems are structured records, `{ rule, severity, file, line, id, message }`,
rendered to the siblings' text format for humans and asserted on by `rule` and
`id` for the self-test.

```
scripts/__fixtures__/specs/<case>/
├── <a miniature corpus>     the directory IS the root handed to checkCorpus()
└── expect.json              { "problems": [ { "rule": "R-TRACE", "id": "example:V-PR-2" } ] }
                             { "problems": [] } for a case that must stay clean
```

Every rule is tested in **both** directions. A green fixture failing means the
parser over-fires; a red fixture matching the wrong `rule` or `id` is reported
as its own failure, never as a pass.

The green cases are one per parser risk, and three of them exist only because
the corpus proved the risk real: an index entry beside a canonical definition
must not be a duplicate; a parent identifier with no canonical definition must
still resolve through its delegation; a reference inside a fenced block must
still be checked.

### Why the corpus root is a parameter

`checkCorpus(root)` takes the directory to read. The fixtures are deliberately
broken corpora, and they sit under `scripts/__fixtures__/specs/`, outside
`openspec/`. A real run never sees them, and a fixture run never sees the real
corpus. That separation is the reason for the parameter, and it is why a
fixture may contain a dangling reference without failing `pnpm check`.

### The fixture directory had to be split first

`check-design.mjs` read `scripts/__fixtures__/` and treated **every** entry as
one of its own, expecting a `DESIGN.md` and an `expect.txt`. A sibling directory
would have made each new case report `parse: ENOENT …/DESIGN.md` and fail
`V-DS-4` — a checker broken by the arrival of another checker's tests.

The ten design fixtures moved to `scripts/__fixtures__/design/`, and that script
now reads that path. `V-DS-4` and its neighbours name fixtures by name, never by
path, so the move leaves them true; the amendment is recorded on `V-DS-4`. The
move landed and was proved green **before** the first spec fixture existed, so
that run could not be ambiguous about what it proved.

---

## §5 `turbo.json` is deliberately unchanged

`globalDependencies` holds `tsconfig.base.json`, `DESIGN.md` and
`scripts/design-tokens.mjs` because a change to any of them changes a
*package's* output — `packages/ui/src/tokens.ts` is generated from `DESIGN.md`.

Nothing under `openspec/` is like that. The single exception, `railway-client`'s
operations gate reading `railway-schema-excerpt.graphql`, is already scoped as
an input on that one task. Adding `openspec/**` globally would invalidate every
`typecheck`, `test` and `build` hash on every prose edit — precisely the failure
`V-MW-27` was written to prevent.

So `check-specs.mjs` runs outside turbo, beside its three siblings, uncached and
cheap. The absence of an edit here is a decision, which is why it is written
down.

---

## §6 Considered and rejected

Each was measured against the corpus before it was dropped.

| Rejected | Hits | Why |
|---|---|---|
| **The converse of `R-TRACE`** — every task must name an `Acceptance:` | 38 of 91 | Fires on every paperwork, archive and owner task, and on all of `vite-console`'s terse style. The useful direction is criterion → task. |
| **Per-paragraph claim markers**, every prose block in `_research/` carrying its own | 37 | Mostly `## Sources` blocks and one-line notes like *"Recorded as `D-API-3`."* Noise at a ratio that would train a reader to ignore the output. |
| **Section-level claim markers**, one per `##` | 9 | Cannot see an unmarked claim standing beside a marked one, which is the failure worth catching. |
| **Entropy-based secret scanning** — no opaque run ≥ 40 characters | 2 | Railway forum slugs (`…-36befbe1`). The `[A-Za-z0-9_]{32,}` variant fires 3 times on GraphQL type names such as `EnvironmentServiceInstancesConnection`. |
| **Strikethrough, dated "Why it fell", signer + date on ratified rows** | 2 | Not rules the register states — only `D-API-1` is written that way. Enforcing them meant editing two ratified decisions to satisfy a linter. |
| **An `openspec/**` entry in `globalDependencies`** | — | §5. |

The claim rule that survived — a marker arms a run to the next heading, and the
first block after a heading is exempt — fires 4 times, and all four are real.
**It was not chosen because it fires least.** Choosing by hit count is selection
on the outcome; it is why the rule is a warning and why §7 states its limits
rather than letting the number stand as an argument.

---

## §7 What is not verified here

- **Whether a claim marker is true.** `W-CLAIM` sees a paragraph that opened a
  run without a mark. It cannot see a fresh claim *inside* an armed run — the
  second paragraph of `2026-09-14-railway-public-api.md` §1 is one — nor claims
  in tables, list items and blockquotes, which is where most of the domain model
  actually lives, nor the lede of any section. It catches an author who forgot
  to open a run, never one who marked something wrongly.
- **Whether a criterion is falsifiable, or a decision well argued.** `R-ID`
  checks that a decision carries rejected alternatives. Whether they are the
  real ones is review.
- **Whether a criterion is met.** §3, `R-TRACE`.
- **Rule 5 — that no agent moved a decision from `proposed` to `ratified`.**
  This needs a diff against a git base; the script is hermetic and sees one
  working tree. Registered as `Q-OPS-7` rather than approximated.
- **Leaked secrets.** `W-CRED` asserts that known slots carry placeholders. A
  credential written anywhere else is invisible to it. §6 records why the
  entropy heuristics that would have widened this were dropped.
- **That the corpus is in English.** Rule 7 is about the document's audience. A
  correct quotation or a proper name in another script is not a violation, and a
  codepoint check cannot tell one from a genuinely non-English paragraph.
- **Markdown anchors.** The corpus has zero relative anchor links, so the check
  would be untested by construction. `R-LINK` resolves files and directories
  only, and says so.
- **Archived changes.** `changes/archive/` does not exist. If it appears, the
  checker reports it as unknown rather than guessing at semantics. `Q-OPS-6`.
