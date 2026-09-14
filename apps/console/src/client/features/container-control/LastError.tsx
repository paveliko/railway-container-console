import type { ConsoleError } from '@repo/contracts';

import { sentenceFor } from './messages';

/**
 * `<sentence> · trace <id>`, and nothing about the phase. An error is additive:
 * headline, detail and control stay exactly as they were (`ux-brief` §7.4).
 *
 * The row is reserved with a non-breaking space, not a fixed height: it keeps
 * the card from jumping when an error appears, and it still grows for a long
 * sentence, a full trace id, or a reader at 200% text zoom rather than clipping
 * them (WCAG 1.4.4).
 */
export function LastError({ error }: { error: ConsoleError | null }) {
  return (
    <p className="m-0 font-sans text-sm text-danger" role="alert">
      {error === null ? '\u00A0' : (
        <>
          {sentenceFor(error)}
          {error.traceId === undefined ? null : (
            <>
              {' · trace '}
              <span className="font-mono">{error.traceId}</span>
            </>
          )}
        </>
      )}
    </p>
  );
}
