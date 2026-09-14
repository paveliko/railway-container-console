/**
 * Whether the container is up.
 *
 * This is the file the whole console exists for, so it is worth saying plainly
 * why it is shaped like this. `deployment.status` does not answer the question.
 * After a real `deploymentStop` the deployment reads `SUCCESS` indefinitely and
 * the stop is visible only in `deploymentStopped` and in the instances, as
 * `EXITED` — measured, not guessed
 * (`_research/2026-09-14-experiment-stop-and-start.md`). A console that read
 * `status === 'SUCCESS'` as "up" would show a stopped container as running,
 * forever.
 *
 * `decisions.md` D-API-4, D-UI-1.
 */

import type {
  ContainerState,
  DeploymentInstanceStatus,
  DeploymentStatus,
  DownReason,
} from '@repo/contracts';

/**
 * `ContainerState` and `DownReason` are declared exactly once, as a Zod schema
 * in `@repo/contracts`, because they are what crosses HTTP to the browser.
 * They are re-exported here so that the domain reads as one vocabulary and so
 * that no caller has to know which package a name came from. A re-export is
 * not a second declaration — `V-MW-15`.
 */
export type { ContainerState, DownReason };

export interface DeploymentInstanceView {
  id: string;
  status: DeploymentInstanceStatus;
}

export interface DeploymentView {
  id: string;
  status: DeploymentStatus;
  deploymentStopped: boolean;
  url?: string;
  instances: DeploymentInstanceView[];
}

/** Exactly what the one read operation returns. */
export interface ContainerView {
  hasEverDeployed: boolean;
  latestDeployment: DeploymentView | null;
}

/** Phases from which nothing more is expected without a new action. */
export function isTerminal(state: ContainerState): boolean {
  return state.phase !== 'starting' && state.phase !== 'stopping';
}

const STARTING_STATUSES: readonly DeploymentStatus[] = [
  'QUEUED', 'WAITING', 'NEEDS_APPROVAL', 'BUILDING', 'DEPLOYING', 'INITIALIZING',
];
const STOPPED_INSTANCE_STATUSES: readonly DeploymentInstanceStatus[] = ['STOPPED', 'EXITED'];
const STARTING_INSTANCE_STATUSES: readonly DeploymentInstanceStatus[] = [
  'CREATED', 'INITIALIZING', 'RESTARTING',
];

/**
 * Pure and total. Rows are tried in order and the first match wins.
 *
 * **The order is load-bearing.** A deployment that has not started yet reports
 * `deploymentStopped: true` with no instances at all, because the field means
 * "no instance is running" rather than "someone stopped this" — observed. Rows
 * 4–7 match on `status` before row 8 ever looks at `deploymentStopped`, which
 * is the only reason a starting container is not reported as down. Reordering
 * this function is a behaviour change; `state.test.ts` guards it.
 */
export function deriveContainerState(view: ContainerView): ContainerState {
  const deployment = view.latestDeployment;

  // 1–2. No deployment at all.
  if (deployment === null) {
    return { phase: 'down', reason: view.hasEverDeployed ? 'removed' : 'never-deployed' };
  }

  const id = deployment.id;
  const statuses = deployment.instances.map((instance) => instance.status);

  // 3–7. Decided by the deployment's own status, before any instance is read.
  switch (deployment.status) {
    case 'REMOVED':
      return { phase: 'down', reason: 'removed' };
    case 'REMOVING':
      return { phase: 'stopping', deploymentId: id };
    case 'FAILED':
    case 'CRASHED':
      return { phase: 'failed', deploymentId: id, status: deployment.status };
    case 'SLEEPING':
      return { phase: 'sleeping', deploymentId: id };
    default:
      if (STARTING_STATUSES.includes(deployment.status)) {
        return { phase: 'starting', deploymentId: id, status: deployment.status };
      }
  }

  if (deployment.status === 'SUCCESS') {
    // 8. Railway's own "have all the instances stopped" flag.
    if (deployment.deploymentStopped) {
      return { phase: 'down', reason: 'stopped' };
    }
    // 9. Every instance stopped, but the flag disagrees. Believe the instances.
    if (statuses.length > 0 && statuses.every((s) => STOPPED_INSTANCE_STATUSES.includes(s))) {
      return { phase: 'down', reason: 'stopped' };
    }
    // 10–11. Mid-flight instances.
    if (statuses.includes('REMOVING')) {
      return { phase: 'stopping', deploymentId: id };
    }
    if (statuses.some((s) => STARTING_INSTANCE_STATUSES.includes(s))) {
      return { phase: 'starting', deploymentId: id, status: deployment.status };
    }
    // 12. Something is actually running.
    const replicas = statuses.filter((s) => s === 'RUNNING').length;
    if (replicas > 0) {
      return {
        phase: 'up',
        deploymentId: id,
        replicas,
        ...(deployment.url ? { url: deployment.url } : {}),
      };
    }
  }

  // 13. Say so rather than round to the nearest happy state — D-UI-1.
  return { phase: 'unknown', observed: describe(deployment) };
}

function describe(deployment: DeploymentView): string {
  const instances = deployment.instances.length
    ? deployment.instances.map((i) => i.status).join(', ')
    : 'no instances';
  return `status=${deployment.status} deploymentStopped=${deployment.deploymentStopped} instances=[${instances}]`;
}

/** Structural equality, so the poller can emit only on real change. */
export function sameState(a: ContainerState | undefined, b: ContainerState): boolean {
  return a !== undefined && JSON.stringify(a) === JSON.stringify(b);
}
