import { Badge, Spinner } from '@repo/ui';

import type { Frame } from './presentation';

/**
 * The headline, the badge and the detail line.
 *
 * The detail row reserves a whole line, so flipping between phases does not
 * move the control under the reader's cursor — `ux-brief` §3 calls this the one
 * layout rule that is not cosmetic.
 *
 * It reserves it with a non-breaking space rather than a `min-height`, and the
 * difference matters twice. A fixed minimum has to guess the line box, and
 * guessing 16px for a 15px font is 6px short — measured, and the button moved.
 * And a guess in pixels stops being right the moment a reader enlarges their
 * text, where a reserved line simply grows with it.
 */
export function ContainerStatus({
  frame,
  waiting,
  notice,
}: {
  frame: Frame;
  waiting: boolean;
  notice: string | null;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-md">
        <h1 className="m-0 font-sans text-xl font-bold text-ink">{frame.headline}</h1>
        <Badge tone={frame.tone}>
          {frame.transitional ? (
            <>
              <Spinner size="sm" label={frame.headline} />
              {frame.headline}
            </>
          ) : (
            frame.headline
          )}
        </Badge>
      </div>

      <p className="m-0 font-sans text-md text-muted">
        {frame.detail === null && notice === null && !waiting ? '\u00A0' : null}
        {frame.href !== null ? (
          <a className="text-ink underline focus-ring" href={frame.href}>
            {frame.href}
          </a>
        ) : (
          frame.detail
        )}
        {notice === null ? null : <span>{frame.detail === null ? '' : ' · '}{notice}</span>}
        {waiting ? <span>{' · waiting for Railway…'}</span> : null}
      </p>
    </div>
  );
}
