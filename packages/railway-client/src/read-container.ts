import type { Credential, Target } from './credential';
import { READ_SERVICE_INSTANCE } from './documents';
import { execute } from './transport';
import type { ContainerView, DeploymentView } from '@repo/container-core';
import type { DeploymentInstanceStatus, DeploymentStatus } from '@repo/contracts';

export interface ReadServiceInstanceData {
  serviceInstance: {
    hasEverDeployed: boolean;
    latestDeployment: null | {
      id: string;
      status: string;
      deploymentStopped: boolean;
      url: string | null;
      canRedeploy: boolean;
      instances: { id: string; status: string }[];
    };
  };
}

/**
 * The single read the whole console is built on. Enum values arrive as plain
 * strings; they are passed through unchecked on purpose — an enum value Railway
 * adds tomorrow should reach `deriveContainerState` and come out as
 * `phase: 'unknown'` with the literal text, not be coerced into something
 * familiar.
 */
export async function readContainer(
  credential: Credential,
  target: Target,
  fetchImpl?: typeof fetch,
): Promise<ContainerView> {
  const data = await execute<ReadServiceInstanceData>(
    READ_SERVICE_INSTANCE,
    { serviceId: target.serviceId, environmentId: target.environmentId },
    { credential, ...(fetchImpl ? { fetchImpl } : {}) },
  );
  return toContainerView(data);
}

export function toContainerView(data: ReadServiceInstanceData): ContainerView {
  const instance = data.serviceInstance;
  const latest = instance.latestDeployment;
  if (latest === null) {
    return { hasEverDeployed: instance.hasEverDeployed, latestDeployment: null };
  }
  const deployment: DeploymentView = {
    id: latest.id,
    status: latest.status as DeploymentStatus,
    deploymentStopped: latest.deploymentStopped,
    instances: latest.instances.map((i) => ({
      id: i.id,
      status: i.status as DeploymentInstanceStatus,
    })),
    ...(latest.url ? { url: latest.url } : {}),
  };
  return { hasEverDeployed: instance.hasEverDeployed, latestDeployment: deployment };
}
