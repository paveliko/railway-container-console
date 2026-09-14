/**
 * The adapter. `@repo/container-core` declares `ContainerProvider`; this is the
 * one implementation of it, and the only place in the repository where the
 * domain meets Railway.
 *
 * It is deliberately thin. All it does is bind a credential and a target to the
 * read and the two verbs, because the mappings that must be right —
 * `toContainerView`, and `D-API-5`'s choice between restart and deploy — belong
 * in this package next to their tests, not in the deployable.
 */

import type { ContainerProvider } from '@repo/container-core';

import type { Credential, Target } from './credential';
import { readContainer } from './read-container';
import { startContainer, stopContainer } from './verbs';

export function createRailwayProvider(
  credential: Credential,
  target: Target,
  fetchImpl?: typeof fetch,
): ContainerProvider {
  const options = (signal?: AbortSignal) => ({
    ...(fetchImpl ? { fetchImpl } : {}),
    ...(signal ? { signal } : {}),
  });

  return {
    read: () => readContainer(credential, target, fetchImpl),
    up: (signal) => startContainer(credential, target, options(signal)),
    down: (signal) => stopContainer(credential, target, options(signal)),
  };
}
