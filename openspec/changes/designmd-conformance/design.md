# Design: `designmd-conformance`

## 1. The published format, and the gap

```yaml
version: alpha
name: <string>
colors:     { <name>: <hex | rgb() | oklch() | named> }
typography: { <name>: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } }
rounded:    { <level>: <Dimension> }
spacing:    { <level>: <Dimension | number> }
components: { <name>: { backgroundColor, textColor, typography, rounded, padding, size, height, width } }
```

Sections in a fixed order: Overview · Colors · Typography · Layout ·
Elevation & Depth · Shapes · Components · Do's and Don'ts.

What it cannot hold, measured against the linter rather than assumed:

| Needed here | In the format |
|---|---|
| a border colour | **no** — `borderColor` is not a valid component sub-token |
| component states | **no** — components are flat property maps |
| an alpha | **no** |
| a weight scale | **no** — weight is bundled into each typography token |
| the 4px grid, contrast thresholds, house rules | **no** |

Its `contrast-ratio` rule reads only opaque `backgroundColor`/`textColor` pairs.
It is a second opinion on a subset, not a replacement for `check-design.mjs`.

## 2. The normalisation layer

`scripts/design-model.mjs` parses `DESIGN.md` and returns one model with stable
paths. The generator and the validator consume the model and never the
frontmatter, which is what made the conversion a change to one file rather than
to three.

```
DESIGN.md ── design-model.mjs ──┬── design-tokens.mjs ── tokens.ts + theme.css
                                └── check-design.mjs  ── contrast, grid, coverage, drift
```

Three properties earn it its place:

- **The extension block has a declared schema.** An unrecognised key under
  `implementation` is an error. A typo there would otherwise silently switch off
  whichever rule was meant to read it — the same failure `grid.exempt` already
  guards against, now guarded for everything else. Fixture:
  `implementation-typo`.
- **One font family, asserted.** The format wants `fontFamily` on every
  typography token; the console has one, written once with a YAML anchor. If the
  tokens ever declare two, the model throws rather than picking one.
- **The published `components` block is derived.** `derivePublishedComponents()`
  projects the implementation matrix into what the schema can hold, and
  `check-design.mjs` fails if the committed block differs. The alternative —
  writing it by hand beside the matrix — is two copies of the same values with
  nothing keeping them equal.

The projection is deliberately lossy and deliberately pessimistic: a badge's
declared `backgroundColor` is its *ground*, not its 10% tint, because a tint only
ever raises the ratio. The linter's reading is therefore conservative rather than
flattering.

## 3. What changed in the frontmatter, and what did not

| Was | Is |
|---|---|
| `tokens: { colors, typography, spacing, radius, … }` | top-level `colors`, `typography`, `rounded`, `spacing` |
| `typography: { sans, mono, size: {sm…}, weight }` | `typography: { sm: {fontFamily, fontSize}, … }`, with `mono` and `weight` in `implementation` |
| `components: { button: {variants, states} }` | `implementation.components` keeps the matrix; published `components` is derived |
| `grid`, `contrast` | unchanged except `radius.*` → `rounded.*` |

**Typography token names stay `sm` / `md` / `lg` / `xl`.** The format does not
care what they are called, and keeping them means `--text-md` keeps its name and
every `text-md` in the codebase keeps working. Naming them `body-md` would have
been more idiomatic and would have renamed 50+ classes for nothing.

## 4. Proving the conversion lost nothing

Two independent proofs, because neither alone is sufficient.

1. **The generated files are byte-identical to `main`.** `tokens.ts` and
   `theme.css` are produced from the model; if any value moved, they change.
   This is what guarantees no class renamed and no component needed touching.
2. **The normalised models are identical.** Both files parsed, canonicalised and
   compared field by field: 12 colours, 6 spacings, 3 radii, 6 grid exemptions,
   4 component matrices and 31 contrast checks, all equal.

`design.md diff` was run and is **not** one of the proofs. It reports all twelve
colours as *added*, because the old file's `tokens:` wrapper meant the tool saw
zero colours in it. That is correct behaviour for a tool comparing standard
groups, and it is exactly why it cannot answer this question.

## 5. `V-DS-14` was wrong, and is now executable

The criterion claimed that grepping the built CSS for `min-h-touch` and
`border-line-strong` would catch a missing `@source`. `vite-console` measured it
and it does not: both classes appear in the application's own source too, so they
survive the failure. What vanishes is the **state variants** — `hover:`,
`disabled:`, an alpha modifier — which only ever appear inside `@repo/ui`'s
generated class strings.

`scripts/check-styles.mjs` builds the client and asserts five of those. Its
`--self-test` removes `@source`, forces a clean rebuild, and fails if the check
still passes; `styles.css` is restored in a `finally`, so an interrupted run
cannot leave the application broken. The rebuild is never cached, because a
cached `dist/` would sail through and prove nothing.

Writing it turned up a second way to be wrong: Tailwind escapes `:` and `/` in
selectors, so a probe searched in its unescaped spelling finds nothing and
reports every class as missing — a false alarm indistinguishable from the real
one. The first version of this check did exactly that.

## 6. The linter as a gate, not a printout

`scripts/check-designmd.mjs` runs the pinned CLI and holds its findings to an
**allowlist in code**. Errors always fail. A warning outside the list fails. A
warning *inside* the list that stops appearing also fails, because the reason
recorded beside it has gone stale.

Seven are accepted: `missing-primary` ×1, `token-like-ignored` on
`implementation` ×1, and `orphaned-tokens` ×5 for `line`, `lineStrong`, `raised`,
`accentHover` and `accentActive` — each used as a border, a ground or a state.

The dependency is pinned exactly and invoked through `node_modules`, never
`npx`, which would fetch at run time and make the gate depend on the network.

## 7. Rejected alternatives

**`design.md export --format css-tailwind` as the emitter.** It works, and its
camelCase variables resolve (`--color-lineStrong` → `border-lineStrong`, and
`/55` composites). Rejected on cost and capability: 50+ hardcoded class
occurrences across `@repo/ui` and six shipping feature files would rename, and
`font-bold` / `font-medium` have no equivalent at all, because the format bundles
weight into each typography token. It also cannot emit the `@layer components`
utilities that carry focus and spinner geometry. **Becomes the choice** if the
format grows a weight scale, or if this repository ever gains a second consumer
that needs tokens without the utility layer.

**Renaming `accent` to `primary`.** Satisfies a normative requirement, and is
the only thing standing between this file and conformance. Rejected because
`D-UI-6`, `ux-brief.md` §4 and 50+ class names call it `accent`; renaming the
token in the frontmatter alone hides the disagreement rather than resolving it.
Recorded so that the owner can overrule it in one line.

**Keeping the invented format and adding only the style check.** Cheapest, and
fixes the defect that actually bites. Rejected: it leaves a file that claims to
be a DESIGN.md and is not readable as one, which is the condition this change
exists to end.

**A sidecar file for the extensions.** Keeps `DESIGN.md` free of anything the
schema does not recognise. Rejected: it splits the single source of truth in two
to avoid one accurate warning.
