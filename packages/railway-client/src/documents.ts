/**
 * Operation documents, inlined as strings so they ship with the server bundle.
 * The `.graphql` files next to this one are the source of truth for
 * `scripts/check-operations.ts`, which validates them against the schema
 * excerpt at build time; these constants must stay identical to them, and the
 * check enforces that too.
 */

export const READ_SERVICE_INSTANCE = /* GraphQL */ `
  query ReadServiceInstance($serviceId: String!, $environmentId: String!) {
    serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
      hasEverDeployed
      latestDeployment {
        id
        status
        deploymentStopped
        url
        canRedeploy
        instances {
          id
          status
        }
      }
    }
  }
`;

export const STOP_DEPLOYMENT = /* GraphQL */ `
  mutation StopDeployment($id: String!) {
    deploymentStop(id: $id)
  }
`;

export const RESTART_DEPLOYMENT = /* GraphQL */ `
  mutation RestartDeployment($id: String!) {
    deploymentRestart(id: $id)
  }
`;

export const DEPLOY_SERVICE_INSTANCE = /* GraphQL */ `
  mutation DeployServiceInstance($environmentId: String!, $serviceId: String!) {
    serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId)
  }
`;
