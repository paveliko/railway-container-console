import type { ReactNode } from 'react';

import { cardBase } from './tokens';

export interface CardProps {
  title?: ReactNode;
  children: ReactNode;
}

/**
 * A bordered box with an optional heading. No layout opinions beyond padding
 * and the rhythm DESIGN.md §3 fixes: 8px between lines that belong together.
 *
 * The border is decorative — it does not identify a control — so it stays
 * `line` at 1.20:1 against the page behind it. That is recorded rather than
 * hidden: `card/default/default/border` carries `identifying: false`.
 */
export function Card({ title, children }: CardProps) {
  return (
    <section className={cardBase}>
      {title === undefined ? null : (
        <h2 className="mt-0 mb-md font-sans text-lg font-bold text-ink">{title}</h2>
      )}
      <div className="flex flex-col gap-sm">{children}</div>
    </section>
  );
}
