/**
 * The port. `@repo/container-core` says what it needs;
 * `@repo/railway-client` supplies it.
 *
 * This is the edge that used to be a cycle: `readContainer.ts` imported
 * `ContainerView` from the container layer while `state.ts` imported the
 * status enums from the Railway layer. Inverting it here — the domain owns the
 * shape, the adapter produces it — keeps the domain testable without a token,
 * a network, or a GraphQL document (`V-MW-12`).
 *
 * Split in two because the poller reads and never writes. Handing it a port it
 * cannot use the write half of is not ceremony: it is what makes "the poller
 * issues no mutation" a fact about the types rather than a claim in a comment.
 */

import type { ContainerView } from './state';

export interface ContainerReader {
  /**
   * The `signal` is a courtesy, not a guarantee: the poller races every read
   * against its own deadline regardless, because an adapter that ignores the
   * signal must not be able to wedge the loop. An implementation that honours
   * it simply frees the socket sooner.
   */
  read(signal?: AbortSignal): Promise<ContainerView>;
}

export interface ContainerProvider extends ContainerReader {
  /**
   * Start the container. Resolves with the deployment the press is aimed at —
   * `deploymentRestart` keeps the existing id, a fresh deploy returns a new
   * one — which is what lets the poller tell this operation's arrival from the
   * previous deployment's lingering state.
   */
  up(signal?: AbortSignal): Promise<{ deploymentId: string }>;

  /** Stop the container. There is no target to name: `down` carries no id. */
  down(signal?: AbortSignal): Promise<void>;
}
