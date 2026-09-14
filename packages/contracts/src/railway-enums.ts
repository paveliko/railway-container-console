/**
 * Types taken from the live schema excerpt in
 * `openspec/_research/railway-schema-excerpt.graphql`.
 *
 * Hand-written rather than generated: there are two enums and one object
 * shape, and a codegen pipeline for that is more machinery than it saves.
 * `packages/railway-client/scripts/check-operations.ts` validates every
 * operation document against the excerpt at build time, which is the part that
 * actually prevents drift.
 *
 * **They live in `@repo/contracts` because of `Q-UI-5`'s registered default,
 * and that question is still open.** `ContainerState.starting.status` and
 * `ContainerState.failed.status` carry a `DeploymentStatus` to the browser, so
 * the browser contract already contains it. If the owner decides the other
 * way, this file moves to `@repo/railway-client` and `container-state.ts`
 * declares `status: z.string()`.
 */

import { z } from 'zod';

/** Status of a *deployment*. Note there is no `STOPPED` — see `DeploymentInstanceStatus`. */
export const deploymentStatusSchema = z.enum([
  'BUILDING',
  'CRASHED',
  'DEPLOYING',
  'FAILED',
  'INITIALIZING',
  'NEEDS_APPROVAL',
  'QUEUED',
  'REMOVED',
  'REMOVING',
  'SKIPPED',
  'SLEEPING',
  'SUCCESS',
  'WAITING',
]);

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;

/** Status of one replica. This is the only place a container is really running or not. */
export const deploymentInstanceStatusSchema = z.enum([
  'CRASHED',
  'CREATED',
  'EXITED',
  'INITIALIZING',
  'REMOVED',
  'REMOVING',
  'RESTARTING',
  'RUNNING',
  'SKIPPED',
  'STOPPED',
]);

export type DeploymentInstanceStatus = z.infer<typeof deploymentInstanceStatusSchema>;

export const DEPLOYMENT_STATUSES: readonly DeploymentStatus[] = deploymentStatusSchema.options;

export const DEPLOYMENT_INSTANCE_STATUSES: readonly DeploymentInstanceStatus[] =
  deploymentInstanceStatusSchema.options;
