import { QueryClient } from '@tanstack/react-query';

/** Declared once, so nothing writes the cache by string literal. */
export const CONTAINER_STATE_KEY = ['container', 'state'] as const;

/**
 * After the first paint the stream is the only writer.
 *
 * Every automatic refetch is therefore off — not tuned, off. A refetch would be
 * a second source of truth for the one value `D-UI-3` says has exactly one, and
 * it would cost a Railway read that `V-26a` says must not exist. Mutations do
 * not retry either: they are not idempotent, and a start issued twice is a
 * second deployment (`V-12`).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        retry: false,
      },
      mutations: { retry: 0 },
    },
  });
}
