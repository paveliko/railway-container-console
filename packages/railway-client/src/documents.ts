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
