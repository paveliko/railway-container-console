# Verification: `container-verbs`

Prefix `V-CV-N`. Parent criteria cited by their `V-N`.

- V-CV-1 `unit` — With a fake provider whose `read` returns the observed post-stop view (`SUCCESS` / `deploymentStopped: true` / `[EXITED]`), `up()` calls `restart(<that id>)` exactly once and never `deploy()`.
- V-CV-2 `unit` — With `read` returning `{ hasEverDeployed: false, latestDeployment: null }`, `up()` calls `deploy()` exactly once and never `restart()`.
- V-CV-3 `unit` — With `read` returning the `REMOVED` view, `up()` calls `deploy()` — a removed deployment is not restarted.
- V-CV-4 `unit` — `down()` calls `stop(latestDeployment.id)` exactly once; with no deployment it rejects with `kind: 'no-deployment'` and calls nothing.
- V-CV-5 `unit` — After `up()` resolves, `poller.inFlight()` is `'up'`; after `down()`, `'down'` (`V-19` covers the clearing).
- V-CV-6 `unit` — While `inFlight()` is `'up'`, `up()` and `down()` both reject with `TransitionInFlight` and the fake provider records no call (`V-18`, provider half).
- V-CV-7 `unit` — When the provider rejects with `rate-limited` or `network`, the mutation was issued exactly once and `inFlight()` stays `null` (`V-12`).
- V-CV-8 `build` — The three mutation documents validate against the excerpt (`V-39`); a bogus field in `DeploymentStop.graphql` fails `pnpm turbo run check`.
- V-CV-9 `build` — Restated second half of `V-40`: `provider.stop`, `provider.restart`, `provider.deploy` are called only from `packages/container-core/src/actions.ts` (grep over `apps/` and `packages/`).
- V-CV-10 `manual` — `decisions.md` shows `D-API-5` as `ratified` with the pick, and `open-questions.md` shows `Q-API-2` resolved by it.
