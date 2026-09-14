# Verification: `deploy-on-railway`

Prefix `V-DR-N`. Parent `V-50 … V-56` are performed here as written.

- V-DR-1 `manual` — The console service builds from the repository root with no Root Directory set; the build log shows `railway-client#check` passing before `console#build`.
- V-DR-2 `manual` — A commit touching only `openspec/**` triggers no console deploy; a commit touching `packages/contracts/**` does (watch paths).
- V-DR-3 `manual` — The deployed `GET /api/container/state` returns a `ContainerState` that parses with `containerStateSchema` (`V-52`, sharpened).
- V-DR-4 `manual` — `Q-OPS-3` is closed in `open-questions.md` with the observed build and start behaviour, dated.
- V-DR-5 `manual` — `V-56` before either project is deployed: the usage limit is set and visible.
