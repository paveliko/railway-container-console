/**
 * The port. `@repo/container-core` says what it needs to read;
 * `@repo/railway-client` supplies it.
 *
 * This is the edge that used to be a cycle: `readContainer.ts` imported
 * `ContainerView` from the container layer while `state.ts` imported the
 * status enums from the Railway layer. Inverting it here — the domain owns the
 * shape, the adapter produces it — keeps the domain testable without a token,
 * a network, or a GraphQL document (`V-MW-12`).
 */

import type { ContainerView } from './state';

export interface ContainerProvider {
  read(): Promise<ContainerView>;
  // up() / down() are added by the `container-verbs` change, once Q-API-2 is
  // signed. Nothing here guesses at their shape.
}
