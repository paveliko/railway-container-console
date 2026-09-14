# Verification: `console-screen`

Prefix `V-SC-N`. Parent criteria cited by their `V-N`.

- V-SC-1 `unit` — `V-42`: one test per row of parent §1, asserting headline, detail line and control label from a `ContainerState` fixture.
- V-SC-2 `unit` — `V-43`, `V-44`: disabled for `starting` / `stopping`; both controls enabled for `unknown`.
- V-SC-3 `unit` — `V-48`: with a fake `fetch` and a fake `EventSource`, the `GET` result renders before the first SSE event and the `EventSource` is constructed after the `GET` resolves.
- V-SC-4 `unit` — `V-47`: an SSE event for `down` after `up` leaves no URL on screen.
- V-SC-5 `unit` — `V-45`, `V-46`: a `409` renders *already starting* with no error styling; a `502` with `traceId` renders the error line containing it and leaves headline and control unchanged.
- V-SC-6 `unit` — An SSE event whose body fails `containerStateSchema` is ignored and logged; the previous state stays rendered.
- V-SC-7 `unit` — `V-49`: after mount, press and one event, `localStorage.length` and `sessionStorage.length` are 0 and `document.cookie` is empty (jsdom).
- V-SC-8 `build` — `V-15`: the grep step of design §3 passes; it fails when the sentinel is deliberately imported into a client component (break-and-revert, logged).
- V-SC-9 `build` — No file under `apps/console/src/features/` imports `@repo/container-core` or `@repo/railway-client` (grep).
