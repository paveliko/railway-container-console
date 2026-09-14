/**
 * Types taken from the live schema excerpt in
 * `openspec/_research/railway-schema-excerpt.graphql`.
 *
 * Hand-written rather than generated: there are two enums and one object
 * shape, and a codegen pipeline for that is more machinery than it saves.
 * `scripts/check-operations.ts` validates every operation document against
 * the excerpt at build time, which is the part that actually prevents drift.
 */

/** Status of a *deployment*. Note there is no `STOPPED` — see `DeploymentInstanceStatus`. */
export type DeploymentStatus =
  | 'BUILDING'
  | 'CRASHED'
  | 'DEPLOYING'
  | 'FAILED'
  | 'INITIALIZING'
  | 'NEEDS_APPROVAL'
  | 'QUEUED'
  | 'REMOVED'
  | 'REMOVING'
  | 'SKIPPED'
  | 'SLEEPING'
  | 'SUCCESS'
  | 'WAITING';

/** Status of one replica. This is the only place a container is really running or not. */
export type DeploymentInstanceStatus =
  | 'CRASHED'
  | 'CREATED'
  | 'EXITED'
  | 'INITIALIZING'
  | 'REMOVED'
  | 'REMOVING'
  | 'RESTARTING'
  | 'RUNNING'
  | 'SKIPPED'
  | 'STOPPED';

export const DEPLOYMENT_STATUSES: readonly DeploymentStatus[] = [
  'BUILDING', 'CRASHED', 'DEPLOYING', 'FAILED', 'INITIALIZING', 'NEEDS_APPROVAL',
  'QUEUED', 'REMOVED', 'REMOVING', 'SKIPPED', 'SLEEPING', 'SUCCESS', 'WAITING',
];

export const DEPLOYMENT_INSTANCE_STATUSES: readonly DeploymentInstanceStatus[] = [
  'CRASHED', 'CREATED', 'EXITED', 'INITIALIZING', 'REMOVED', 'REMOVING',
  'RESTARTING', 'RUNNING', 'SKIPPED', 'STOPPED',
];
