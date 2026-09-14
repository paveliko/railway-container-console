import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { ContainerPanel } from './features/container-control/ContainerPanel';

/**
 * One screen, one route, declared in code.
 *
 * File-based routing would add a plugin, a generated route tree to commit, and
 * a codegen step in the dev server — for a single route. The router earns its
 * place as the seam the extensions in parent design §12 would use (`/logs`,
 * `/history`), not as machinery today's screen needs.
 */
const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ContainerPanel,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  // Nothing to preload, and a preload is a request the reader did not ask for.
  defaultPreload: false,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
