/**
 * The two verbs, per `D-API-5`.
 *
 *   down = deploymentStop(latestDeployment.id)
 *   up   = deploymentRestart(id) when a stopped deployment exists,
 *          else serviceInstanceDeployV2()
 *
 * Both read first. That is not a round trip anybody would add for elegance: a
 * stop needs the deployment's id, and a start needs to know whether there is a
 * stopped deployment worth reviving — ~8 s and the same id — or whether it must
 * pay ~16 s for a new one. The read is the thing that decides.
 *
 * Neither verb retries. The mutations are not idempotent, and a start issued
 * twice is a second deployment (`V-12`).
 */

import { deriveContainerState } from '@repo/container-core';

import type { Credential, Target } from './credential';
import { DEPLOY_SERVICE_INSTANCE, RESTART_DEPLOYMENT, STOP_DEPLOYMENT } from './documents';
import { RailwayRequestError } from './errors';
import { readContainer } from './read-container';
import { execute } from './transport';

interface VerbOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** `exactOptionalPropertyTypes` is on: an explicit `undefined` is not the same as absent. */
function executeOptions(credential: Credential, options: VerbOptions) {
  return {
    credential,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };
}

/**
 * Start the container, and say which deployment to watch for.
 *
 * The returned id is the whole reason this function returns anything at all.
 * A restart keeps the existing deployment's id and a fresh deploy mints a new
 * one; either way the caller needs to know which, because "something is up" is
 * not the same claim as "the thing I just started is up".
 */
export async function startContainer(
  credential: Credential,
  target: Target,
  options: VerbOptions = {},
): Promise<{ deploymentId: string }> {
  const view = await readContainer(credential, target, options.fetchImpl);
  const state = deriveContainerState(view);
  const latest = view.latestDeployment;

  // Only a deployment that is *stopped* can be revived. A removed or failed one
  // cannot, which is what the reason check is doing here — `down` alone is not
  // specific enough to decide.
  if (latest !== null && state.phase === 'down' && state.reason === 'stopped') {
    await execute<{ deploymentRestart: boolean }>(
      RESTART_DEPLOYMENT,
      { id: latest.id },
      executeOptions(credential, options),
    );
    return { deploymentId: latest.id };
  }

  const data = await execute<{ serviceInstanceDeployV2: string }>(
    DEPLOY_SERVICE_INSTANCE,
    { environmentId: target.environmentId, serviceId: target.serviceId },
    executeOptions(credential, options),
  );
  return { deploymentId: data.serviceInstanceDeployV2 };
}

/** Stop the container. Nothing to stop is a refusal, not a silent success. */
export async function stopContainer(
  credential: Credential,
  target: Target,
  options: VerbOptions = {},
): Promise<void> {
  const view = await readContainer(credential, target, options.fetchImpl);
  const latest = view.latestDeployment;
  if (latest === null) throw new RailwayRequestError({ kind: 'no-deployment' });

  await execute<{ deploymentStop: boolean }>(
    STOP_DEPLOYMENT,
    { id: latest.id },
    executeOptions(credential, options),
  );
}
