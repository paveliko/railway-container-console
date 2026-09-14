# Railway public GraphQL API — what is established

> Gathered 2026-09-14 from `docs.railway.com/reference/public-api`.
> Marks: `[observed]` read directly from the source · `[inferred]` reasoned from
> what was read · `[to-verify]` not yet confirmed against the live API.

## Endpoint and transport

`[observed]` A single GraphQL endpoint: `https://backboard.railway.com/graphql/v2`.
POST, `Content-Type: application/json`.

`[observed]` Introspection is supported. The documentation points at Postman and
Insomnia for fetching the schema, and offers a GraphiQL playground with an
`Authorization` header set from the Headers tab.

`[inferred]` Introspection being open means the exact mutation names for this task
do not have to be guessed — they can be read off the schema as soon as a token
exists. See `Q-API-1`.

## Tokens — three kinds, and they do not authenticate the same way

`[observed]`

| Token | Scope | Intended for |
|---|---|---|
| Account | All resources and workspaces of one person | Personal scripts, local development |
| Workspace | A single workspace | Team CI/CD, shared automation |
| Project | **A single environment within a project** | Deployments, service-specific automation |

There is also OAuth, for an application acting on behalf of a user, where
permissions follow the scopes the user approved.

`[observed]` **The header differs by token type.** Account, workspace and OAuth
tokens go in `Authorization: Bearer <token>`. A **project token uses the
`Project-Access-Token` header instead** — not `Authorization: Bearer`.

`[inferred]` This is the first thing likely to cost an hour on a wrong assumption,
because a project token sent as a bearer token will fail as an auth error rather
than as a "wrong header" error. It belongs in the console's error handling as a
named case, not a generic 401.

`[observed]` A smoke query that proves an account token works:

```
query { me { name email } }
```

`[observed]` It cannot be used with a workspace or project token — the data it
returns is scoped to a personal account.

## Rate limits

`[observed]`

| | Free | Hobby | Pro |
|---|---|---|---|
| Requests per hour | 100 | 1 000 | 10 000 |
| Requests per second | — | 10 | 50 |

Enterprise is custom.

`[inferred]` 100 requests per hour on a free account is low enough to matter for a
console that polls deployment status. Polling once a second while a container
starts would exhaust an hour's budget in under two minutes. Whatever this console
does to reflect state, naive polling is not it. Registered as `Q-UI-1`.

## What is not yet established

`[to-verify]` Which mutations actually correspond to "spin up" and "spin down" a
container. Candidates suggested by Railway's own vocabulary — services,
deployments, environments — but the mapping is unconfirmed and must be read from
the schema rather than assumed.

`[to-verify]` Whether "spin down" means stopping a deployment, removing it, or
scaling a service to zero, and whether the reverse operation restores the same
container or creates a new one. This distinction changes what the UI can honestly
claim to have done.

`[to-verify]` What the API returns while a container is transitioning, and whether
there is a subscription or event stream that would remove the need to poll.

## Source

`https://docs.railway.com/reference/public-api` — read 2026-09-14.
GraphiQL playground: `https://railway.com/graphiql`.
