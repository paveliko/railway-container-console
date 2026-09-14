import type { ReactNode } from 'react';

import { badgeBase, tone as toneClasses, type Tone } from './tokens';

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

/**
 * A short piece of status text. The caller decides what the tone means.
 *
 * The fill is a tint of the tone and the border is the tone at full strength:
 * a hairline alone reads faintly, and softening the border instead of tinting
 * the fill would drop it to 1.29:1 — the very number `lineStrong` exists to
 * avoid. The accent tone's label is `ink` rather than accent, because accent on
 * small text has no contrast margin (DESIGN.md §4).
 */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  const t = toneClasses[tone];
  return <span className={`${badgeBase} ${t.fill} ${t.border} ${t.text}`}>{children}</span>;
}
