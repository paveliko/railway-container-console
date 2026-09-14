import type { Connection } from './useContainerState';

/**
 * `live` refers to the browser↔server stream, never to Railway — detection is
 * bounded at 30 s and `ux-brief` §7.8 forbids implying otherwise.
 *
 * The dot is decoration: the word carries the meaning, so a reader who cannot
 * distinguish the two colours loses nothing.
 */
export function ConnectionIndicator({ connection }: { connection: Connection }) {
  const live = connection === 'live';
  return (
    <p className="m-0 flex min-h-lg items-center gap-sm font-sans text-sm text-muted">
      <span
        aria-hidden="true"
        className={`inline-block size-xs rounded-pill ${live ? 'bg-positive' : 'bg-caution'}`}
      />
      {live ? 'live' : 'reconnecting'}
    </p>
  );
}
