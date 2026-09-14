# `current/`

What the console is meant to be, once it is decided.

Still empty by design. `Q-API-1` is narrowed — the candidates are read off the
live schema — but `Q-API-2`, what "spin down" leaves behind, closes only after a
real `deploymentStop` has been watched through the subscription (`Q-API-6`). The
connection layer that does not depend on that answer is specified in
[`../changes/railway-container-control/`](../changes/railway-container-control/); the product is not.
