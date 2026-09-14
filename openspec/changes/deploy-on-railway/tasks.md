# Tasks: `deploy-on-railway`

- [~] **T-DR-0 Usage limit.** *Owner.* Parent T-2.3, `V-56`. Acceptance: V-DR-5. Nothing below before this.
- [ ] **T-DR-1 Config as code.** Result: `railway.json` per design §2, or the documented reason it must be service settings. Depends on: every other change landed. Acceptance: it is what the dashboard shows after linking. Verified by: the dashboard.
- [~] **T-DR-2 Target service.** *Owner.* Parent T-7.1. Acceptance: `V-53`.
- [~] **T-DR-3 Console service.** *Owner deploys, agent prepares.* Parent T-7.2. The variables of parent design §3, `CONSOLE_PASSPHRASE` included and set (`D-SEC-2`); its value is chosen in the dashboard and delivered privately with the demo link, never committed. Acceptance: V-DR-1, V-DR-2, V-DR-3, V-DR-6, `V-52`, `V-54`, `V-55`.
- [~] **T-DR-4 Cycle once, by hand.** *Owner.* Result: parent T-7.3 — the deployed console cycled once by hand, two tabs and a refresh mid-transition. Acceptance: V-50, V-51. Verified by: screenshots in the PR.
- [ ] **T-DR-5 Close `Q-OPS-3`.** Result: the register updated. Depends on: T-DR-3. Acceptance: V-DR-4.
- [ ] **T-DR-6 Paperwork.** Result: parent T-7.\* marked done here; archive. Depends on: T-DR-5.
