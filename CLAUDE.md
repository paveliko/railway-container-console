# CLAUDE.md

Instructions for agents working in this repository.

## What this is

A take-home for Railway: a web console that spins a container up and down through
the Railway public GraphQL API. The repository is **public** — Railway will read it.

## Hard rules

1. **Specification before code.** No product code is written until the change it
   belongs to has a `proposal.md` with falsifiable acceptance criteria.
2. **Mark every factual claim** in `_research/` as `[observed]`, `[inferred]` or
   `[to-verify]`. A secondary summary is not a primary source.
3. **Unresolved stays visible.** Anything undecided is registered as `Q-<CAP>-N`
   in `open-questions.md`, never smoothed over in prose.
4. **Decisions record their rejected alternatives.** A `D-<CAP>-N` without the
   alternatives that lost is not a decision, it is a note.
5. **Agents prepare, the owner signs.** An agent does not move a decision from
   `proposed` to `ratified`.
6. **Never commit a token.** Railway API tokens go in `.env`, which is ignored.
   `.env.example` carries the names only.
7. **English throughout.** The audience for this repository is a reviewer.

## Conventions

- Change folders are bare slugs; the date prefix is added only on archival.
- Capability prefixes: `API` (Railway API surface), `UI` (console), `SEC`
  (tokens and secrets), `OPS` (deployment of this app itself).
