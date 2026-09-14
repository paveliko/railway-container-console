/**
 * The adapter. `@repo/container-core` declares `ContainerProvider`; this is the
 * one implementation of it, and the only place in the repository where the
 * domain meets Railway.
 *
 * It is deliberately thin. All it does is bind a credential and a target to
 * `readContainer`, because the mapping that must be right —
 * `toContainerView` — belongs in this package, next to its tests, and not in
 * the deployable.
 *
 * The two verbs join this object in the `container-verbs` change, once
 * `Q-API-2` is signed. Nothing here guesses at them.
 */

import type { ContainerProvider } from '@repo/container-core';

import type { Credential, Target } from './credential';
import { readContainer } from './read-container';

export function createRailwayProvider(
  credential: Credential,
  target: Target,
  fetchImpl?: typeof fetch,
): ContainerProvider {
  return {
    read: () => readContainer(credential, target, fetchImpl),
  };
}
