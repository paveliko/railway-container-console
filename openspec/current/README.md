# `current/`

What the console is meant to be, once it is decided.

Still empty by design, but no longer for the reason this file used to give.

It used to say that `Q-API-2` — what "spin down" leaves behind — would close
only once a real `deploymentStop` had been watched **through the subscription**.
That sentence is now wrong twice over. The experiment ran on 2026-09-14 and
closed `Q-API-6`; and `D-API-7` removed the subscription altogether, because a
project token cannot subscribe and a stop is invisible to a subscriber in any
case. `Q-API-1` and `Q-API-2` closed on 2026-09-15 against `D-API-5`, ratified
2026-09-14.

What keeps this directory empty now is signature, not knowledge. Of the
decisions the product rests on, only `D-API-5` and `D-OPS-2` are ratified; the
rest — including `D-UI-3`, `D-UI-5`, `D-API-7` and `D-OPS-4` — are `proposed`,
and a specification of what the console *is* should not be written from rows
that may still change. The whole of it is specified, change by change, in
[`../changes/`](../changes/); this directory is written once those are signed
and archived.
