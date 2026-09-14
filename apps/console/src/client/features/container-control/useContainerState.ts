/**
 * All of the screen's state, and the rules for when a control is disabled.
 *
 * The browser does not decide when a press has finished. It cannot: it has no
 * read sequence, no operation epoch, and no way to tell a reading that answers
 * the press from one that merely arrived after it. The server has all three and
 * says so on the `operation` event, so the rule here is a rendering of that
 * answer rather than an inference from state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  containerStateSchema,
  operationEventSchema,
  type ConsoleError,
  type ContainerState,
  type Operation,
} from '@repo/contracts';

import { ApiError, fetchState, press as postPress } from '../../api/client';
import { CONTAINER_STATE_KEY } from '../../query-client';
import { noticeFor } from './messages';

export type Connection = 'live' | 'reconnecting';

/** After this long with no answer, say so — still not an error. `ux-brief` §7.2. */
const WAITING_AFTER_MS = 10_000;

export interface Screen {
  state: ContainerState | null;
  /** The first read has not answered yet. */
  loading: boolean;
  /** The first read failed; nothing is on screen and nothing is streaming. */
  firstPaintError: ConsoleError | null;
  connection: Connection;
  operation: Operation | null;
  lastError: ConsoleError | null;
  notice: string | null;
  waiting: boolean;
  needsPassphrase: boolean;
  disabled: boolean;
  press: (transition: 'up' | 'down') => void;
  retry: () => void;
  dismissPassphrase: () => void;
}

export function useContainerState(): Screen {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: CONTAINER_STATE_KEY, queryFn: fetchState });

  const [connection, setConnection] = useState<Connection>('reconnecting');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [lastError, setLastError] = useState<ConsoleError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  /** Our own request is out. Local knowledge, not a claim about the container. */
  const [posting, setPosting] = useState(false);

  const streamRef = useRef<EventSource | null>(null);

  // The stream opens only once the first read has answered — never in parallel
  // (`V-48`). Until then there is nothing for an event to update.
  useEffect(() => {
    if (!query.isSuccess) return;

    const source = new EventSource('/api/container/events');
    streamRef.current = source;

    source.onopen = () => setConnection('live');
    // EventSource reconnects on its own; the indicator says so meanwhile, and
    // the last known state stays on screen rather than being cleared.
    source.onerror = () => setConnection('reconnecting');

    source.onmessage = (event: MessageEvent<string>) => {
      const parsed = safeParse(event.data, containerStateSchema);
      if (parsed === undefined) return;      // ignore, keep the last state
      queryClient.setQueryData(CONTAINER_STATE_KEY, parsed);
      setLastError(null);                    // cleared by the next good state
    };

    source.addEventListener('operation', (event) => {
      const parsed = safeParse((event as MessageEvent<string>).data, operationEventSchema);
      if (parsed === undefined) return;
      setOperation(parsed);
      if (parsed === null || parsed.status !== 'in-flight') {
        setPosting(false);
        setWaiting(false);
        setNotice(null);
      }
    });

    // StrictMode mounts effects twice in development, so two EventSources exist
    // for a tick. That is harmless — the poller is indifferent to listener count
    // — and it is not worth a ref to "fix": the fix usually breaks the cleanup.
    return () => {
      source.close();
      streamRef.current = null;
    };
  }, [query.isSuccess, queryClient]);

  // The ten-second line. It is never promoted to an error.
  const inFlight = operation?.status === 'in-flight';
  useEffect(() => {
    if (!posting && !inFlight) return;
    const timer = setTimeout(() => setWaiting(true), WAITING_AFTER_MS);
    return () => clearTimeout(timer);
  }, [posting, inFlight]);

  const press = useCallback(
    (transition: 'up' | 'down') => {
      setPosting(true);
      setNotice(null);
      void postPress(transition)
        .then(() => setLastError(null))
        .catch((error: unknown) => {
          setPosting(false);
          if (!(error instanceof ApiError)) {
            setLastError({ error: 'railway-unavailable' });
            return;
          }
          if (error.detail.error === 'transition-in-flight') {
            // Not an error, and not styled as one. Usually a second tab.
            setNotice(noticeFor(transition));
            return;
          }
          if (error.detail.error === 'unauthorized') {
            setNeedsPassphrase(true);
            return;
          }
          setLastError(error.detail);
        });
    },
    [],
  );

  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const state = (query.data ?? null) as ContainerState | null;
  const firstPaintError =
    query.isError && query.error instanceof ApiError ? query.error.detail : null;

  /**
   * Three reasons to disable, and they are OR'd.
   *
   * Only the second and third say anything about the container. The first says
   * something about us: a request is out and has not answered. That is not an
   * optimistic transition — `D-UI-1` forbids guessing the container's state,
   * not knowing our own — and without it there is a window between the click
   * and the first `operation` event in which a second click would land.
   *
   * The third covers a transition this console did not start: the dashboard,
   * a crash, serverless sleep.
   */
  const disabled =
    posting || inFlight || state?.phase === 'starting' || state?.phase === 'stopping';

  return {
    state,
    loading: query.isPending,
    firstPaintError:
      firstPaintError ?? (query.isError ? { error: 'railway-unavailable' } : null),
    connection,
    operation,
    lastError,
    notice,
    waiting,
    needsPassphrase,
    disabled,
    press,
    retry,
    dismissPassphrase: useCallback(() => setNeedsPassphrase(false), []),
  };
}

function safeParse<T>(raw: string, schema: { parse: (value: unknown) => T }): T | undefined {
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    console.error('[stream] unreadable frame', error);
    return undefined;
  }
}
