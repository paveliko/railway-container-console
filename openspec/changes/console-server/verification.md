# Verification: `console-server`

Prefix `V-CS-N`. Parent criteria cited by their `V-N`.

- V-CS-1 `build` — `pnpm turbo run build` succeeds with no `RAILWAY_*` variable set; **Amended by `vite-console`:** there is no framework to ask for a runtime. The equivalent guarantee is that `vite build` succeeds with no `RAILWAY_*` variable set — the build never imports the server — and that `start` runs one long-lived process.
- V-CS-2 `unit` — `toConsoleError` maps a `ConfigError` raised by a missing `RAILWAY_TOKEN_KIND` to `500` with the body `{ error: 'console-misconfigured' }`; the body carries no variable name and no other prose, the variable is named in the server log, and no Railway request is made (fake `fetch` records zero calls). *(Reworded 2026-09-15 by `D-OPS-6`. It previously asserted that the first `GET /api/container/state` answers this, which `V-55` makes impossible — the process exits before it listens — and it claimed a `message` in the body that `consoleErrorSchema` has no field for.)*
- V-CS-3 `unit` — Two `EventSource` clients and a third that reconnects each receive the current state as their first event; the fake `fetch` records the same number of reads as with zero clients (`V-26`, `V-26a`).
- V-CS-4 `unit` — A `: ping` comment is written at least once per 20 s of fake time on an open stream; closing the response unsubscribes (listener count returns to its previous value).
- V-CS-5 `unit` — Driving Start → starting → up → second press → Stop → down → `GET /state` against the fake Railway produces exactly the sequence of `ContainerState` phases the experiment recorded, and the second press is a `409` with no fake-Railway call (`V-17`, `V-18`).
- V-CS-6 `unit` — Each scripted failure — not-authorized, `429` with `Retry-After: 30`, `429` without, the `numReplicas` validation body, a thrown `fetch` — yields the status and `ConsoleError` of parent §9, and the state served by `GET /state` afterwards is the last known one (`V-13`, `V-14`, `V-25`).
- V-CS-7 `unit` — With `CONSOLE_PASSPHRASE=x`: `POST /up` without the cookie → `401`; `POST /api/session` with the wrong passphrase → `401`; with the right one → `204` + `Set-Cookie` (HttpOnly, SameSite=Strict); then `POST /up` → not `401`. Without the variable, `POST /up` needs no cookie (`V-20`).
- V-CS-8 `unit` — Every `ConsoleError` body the routes can produce parses with `consoleErrorSchema` from `@repo/contracts` (snapshot over all kinds, `V-13`).
- V-CS-9 `live` — `V-16`: a headless browser loading the running console makes requests to its own origin only.
