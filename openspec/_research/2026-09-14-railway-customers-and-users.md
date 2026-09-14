# Who Railway is for — customers, users, and what they ask

> Gathered 2026-09-14 from Railway's own pages (positioning, pricing, docs,
> changelog, support forum) and from two secondary sources for numbers. Marks:
> `[observed]` read on a Railway page · `[observed — secondary]` read in a
> third-party source that quotes Railway · `[inferred]` reasoned from the above ·
> `[to-verify]` not confirmed.
>
> Companion to the owner's hypotheses in
> [`2026-09-14-user-hypotheses-and-cjm.md`](2026-09-14-user-hypotheses-and-cjm.md).
> This document is the evidence; that one is the design.

## 1. Who Railway says it is for

`[observed]` Docs, *About Railway*: *"an all-in-one intelligent cloud provider
that makes it easy to provision infrastructure, develop locally, and deploy to
the cloud"*, for developers, with *"sane defaults"* first and *"plenty of knobs
and switches to optimize as needed"* later.

`[observed]` Pricing page, one line per plan — the clearest segment statement
Railway publishes:

| Plan | Railway's own words | Notable limit |
|---|---|---|
| Free | *"For getting started with minimal usage"* | 1 member, 1 project |
| Hobby, $5 | *"For solo developers and side projects"* | 3 members |
| Pro, $20 | *"For teams shipping to production"* — *"Seats are unlimited and included — the fee is per workspace, not per seat."* | unlimited members |
| Enterprise | *"For production applications requiring compliance and SLAs"* | SSO, RBAC, HIPAA BAAs, dedicated VMs, audit logs |

`[observed]` Changelog 2026-08-21, *"Railway for Everyone"*: sites and
databases can now be created at `railway.com/new` / `dev.new` **without an
account**, with 60 minutes to build before claiming; Railway says it plans to
*"extend this to more and more parts of the product … to get the next 100
million builders on the platform."*

`[observed]` Fetching `railway.com/` with a non-browser client returns a page
titled *Railway for AI Agents*: setup via `agents.railway.com`, a local MCP
server, `railway up -y` that *"signs up, creates a project, and deploys the
current directory in one command"*, and a rule that *"destructive actions
require approval"*. The changelog for July–September 2026 is dominated by
agents: Cloud Agents beta, Railway Agent in Slack and Discord, plugins for
ChatGPT and Grok, MCP connectors.

`[observed — secondary]` VentureBeat, 2026-01-22, on the $100M Series B,
quoting the CEO: *"The notion of a developer is melting before our eyes. You
don't have to be an engineer to engineer things anymore — you just need
critical thinking."*

`[inferred]` Three audiences, in the order Railway itself now lists them:
**developers** (the historical core — solo on Hobby, teams on Pro),
**"builders" who are not engineers** (the accountless flow, the CEO quote),
and **AI agents acting for either** (MCP, agent skills, an agent-facing
homepage). The console in this repository speaks to the first; its HTTP
boundary would be usable by the third without change, which is worth one
sentence in the interview and nothing in the MVP.

## 2. Who pays, and at what scale

`[observed — secondary]` VentureBeat, 2026-01-22, figures attributed to
Railway: **2 million developers**, **10 million deployments a month**, 3.5×
revenue growth in the prior year, **31 % of Fortune 500 companies** use the
platform (*"deployments range from company-wide infrastructure to individual
team projects"*). Named: G2X (federal-contractor platform, infrastructure bill
from ~$15 000 to ~$1 000/month), Bilt, Intuit's GoCo, TripAdvisor's Cruise
Critic, MGM Resorts, Kernel (YC; *"runs its entire customer-facing system on
Railway for $444 per month"*).

`[observed — secondary]` Contrary Research, updated 2023-05-11: Railway
targets *"everyone from independent developers to startups that have raised
series C or D funding"*, with *"early success in smaller companies that are
just starting or have smaller codebases"* and *"companies that work on new
projects a lot, like product studios or consulting agencies."* Competitors
named: Render, Zeet; Heroku, Elastic Beanstalk, App Service, App Engine.
(300K users in February 2023 → 2M in January 2026, per the two sources.)

`[observed]` Railway's own customers page names Bilt Rewards, Arcol, G2X,
Vendora, Mappa; the case-study bodies did not render to a text fetch, and the
`/customers/g2x` URL returned 404 — `[to-verify]` by opening the page in a
browser.

`[inferred]` The paying customer is a **team on Pro** (per-workspace pricing
is designed for adding people) or an **enterprise** buying compliance; the
individual on Hobby is the funnel. The "Fortune 500" figure counts *any* team
inside the company — it says Railway is present in large organisations, not
that it runs them. For a take-home, the reviewer's frame of reference is most
likely the Pro team: several people, several environments, production plus
staging.

## 3. What people deploy

`[observed]` Templates page: the most deployed templates are databases
(Postgres, MySQL, Redis, MongoDB), **n8n** automation, AI tools (Ollama, Open
WebUI, LibreChat), Telegram/WhatsApp bots, and **Linux boxes with SSH**
(Ubuntu, Debian, Kali). Twelve categories; AI is the largest at 954 templates.
Railway's phrase: things that run on *"always-on servers"*.

`[inferred]` A large share of what runs on Railway is a **long-lived process
that someone wants on for a while and off for a while** — a bot, an
automation, a database for a side project, a Linux box. That is precisely the
population that asks the question in §4.

## 4. What people ask for — the support forum on "stop" and "pause"

Railway's *Central Station* is public. The thread family below is the single
most relevant piece of user evidence for this console. All are
`[observed]` — read directly — and secondary in the sense that they are
individual users and employees, not documentation.

| Date | Thread | Who asks, for what | Railway's answer |
|---|---|---|---|
| 2022-09-03 | *Scale to Zero (Pause Services)* — feature request, status **Completed** | *"Save money by pausing unused test/staging projects without deleting them"*; manual pause/resume for services *"only needed during specific times"*; 22+ replies comparing to Heroku dynos and Cloud Run | Employee (Angelo Saraceno, 2023-02-06): *"we think we have an elegant answer to this … in line with adding spend caps"*; employee (Brody): *"a general pause button would be welcomed, for saving money or just to pause (for example) a bot"* |
| 2024-04-19 | *Stopping a service without removing it* | can a service be stopped without deletion? | Employee (brody): *"Remove the active deployment from it's 3-dot menu, when you want the service to come back online simply click redeploy in the removed deployments 3-dot menu."* Adds: *"we would still charge for volume storage, if you have one."* **Unanswered in thread:** the difference between `deploymentStop` and `deploymentRemove` in the API and their cost; whether this is safe for database services |
| — | *How to stop or pause my project and postgres service to save my credits* | an inventory project + Postgres, not needed right now | Employee (brody): first app sleeping, then *"Remove the active deployment … redeploy it from the removed deployments 3-dot menu."* **Unanswered:** whether data survives; whether config is retained on redeploy |
| 2025-05-16 | *Add pause option for services* | *"stop incurring costs, hide it from the web temporarily, making breaking updates, testing other services"*; wants to *freeze indefinitely*, not auto-sleep | Employee (nico): *"If you want to 'pause' (scale to 0 and don't scale back up) then remove the deploy."* Declined to escalate; pointed to the feedback channel |
| — | *api* — temporarily disable a web service via the Public API, without deletion, to restart later | a developer using the API | Employee (brody): *"you probably want `deploymentStop` and `deploymentRestart`"*. Asker: both mutations returned success. **Noted:** after the calls the dashboard still showed *Active* — the UI lagged, or did not reflect, the API's state |

`[inferred]` Five things follow, and they are the reason this document exists:

1. **The need is real and recurring.** Across four years, the same request:
   pause a test or side project to save credits, keep everything, bring it
   back later. It comes from the owner's second and, partly, third user
   (*"hide it from the web temporarily"*).
2. **Railway's dashboard answer is a workaround.** *Remove the deployment,
   redeploy later.* The feature request is marked *Completed*, but the
   employee answers in 2024 and 2025 still say *remove* — `[inferred]`
   *Completed* refers to serverless sleeping, which is not what the askers
   wanted (one says so explicitly).
3. **The consequences are what users actually ask about, and they go
   unanswered.** Do volumes survive? Is it safe for a database? Is
   configuration kept? What is billed while stopped? That is stage 6 of the
   draft journey — *"What exactly will stop? Will data survive?"* — word for
   word, and it is `Q-API-2` / `Q-OPS-2` in this repository.
4. **The API has a verb the dashboard does not expose.** `deploymentStop` +
   `deploymentRestart`, recommended by an employee, keep the deployment and
   its id. A console that exposes *that* honestly — with the state read from
   the instances, since the dashboard itself was seen showing *Active* after
   the API said otherwise — is a small but genuine product gap, not a toy.
   This is the strongest "why this app, and how would you extend it" story
   the research has produced.
5. **The dashboard-lags-the-API observation is independent confirmation of
   `D-API-4`**: a status of *Active* / `SUCCESS` does not mean the container
   is running.

`[to-verify]` Everything in the last column is an employee's forum answer, not
documentation; the `Q-API-6` experiment is what turns it into `[observed]`.

## 5. Evidence against the owner's four hypotheses

| Hypothesis | Evidence for | Evidence against / missing |
|---|---|---|
| Prototype developer | the accountless *Railway for Everyone* flow and the templates page are built for exactly this person | nothing on the forum about "running vs ready" as a confusion; `[to-verify]` |
| **Developer managing a test environment** | the whole of §4; Pro's per-workspace pricing and ephemeral environments are built for teams with several environments | none found |
| QA engineer / designer | *"hide it from the web temporarily"*; Access Groups (RBAC) shipped 2026-08-14, i.e. Railway is adding non-owner roles | no forum voice from a non-developer; `[to-verify]` |
| Incident engineer | Railway ships observability panels, DNS logs, diagnosis-first agents (*"inspect before modifying"*) — the persona exists on the platform | nothing in the stop/pause threads; this person's tools are logs and restart, not start/stop |
| *(added)* AI agent | agent-facing homepage, MCP, Cloud Agents, *"destructive actions require approval"* | out of scope for the MVP; the HTTP boundary already suits it |

`[inferred]` The owner's choice of the second user is the one the public
evidence supports best. The others are not wrong; they are unevidenced.

## 6. What this changes in the specification

- `Q-API-2` gains a fifth candidate, `deploymentStop` ↔ `deploymentRestart`,
  with a Railway employee's recommendation behind it — recorded in
  `decisions.md` `D-API-5` (d) and in the operations document §2.
- The stage-6 question — what stops, what survives, what is billed — is now
  known to be the users' own question, unanswered on the forum. The console's
  button label and its one-line consequence note (*"stops the container;
  keeps the service, its settings and its volume; the volume is still
  billed"*) are the product, not decoration. Pending the owner's verb.
- `D-UI-4` (primary user) is supported by §4; `Q-UI-3` (interviews) remains
  open because forum threads are not interviews.

## Sources — read 2026-09-14

- `https://docs.railway.com/overview/about-railway` — positioning
- `https://railway.com/pricing` — plan descriptions and limits
- `https://railway.com/changelog` and
  `https://railway.com/changelog/2026-08-20-railway-anon` — *Railway for
  Everyone*, Cloud Agents, Access Groups
- `https://railway.com/` as served to a non-browser client — *Railway for AI
  Agents*
- `https://railway.com/templates` — what is deployed
- `https://railway.com/customers` — names only; bodies `[to-verify]` in a browser
- `https://station.railway.com/feedback/scale-to-zero-pause-services-62e211b4`
- `https://station.railway.com/questions/stopping-a-service-without-removing-it-36befbe1`
- `https://station.railway.com/questions/how-to-stop-or-pause-my-project-and-post-e38d800d`
- `https://station.railway.com/questions/add-pause-option-for-services-36aaf573`
- `https://station.railway.com/questions/api-e1907ad4`
- Secondary: VentureBeat, *Railway secures $100 million…*, 2026-01-22;
  Contrary Research, *Railway*, updated 2023-05-11.
