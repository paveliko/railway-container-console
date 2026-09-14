import type { ReactNode } from 'react';

import { radius, space, toneColor, typography, type Tone } from './tokens';

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

/** A short piece of status text. The caller decides what the tone means. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  const color = toneColor[tone];
  return (
    <span
      style={{
        font: `${typography.weight.medium} ${typography.size.sm} ${typography.family}`,
        display: 'inline-block',
        padding: `${space.xs} ${space.md}`,
        borderRadius: radius.pill,
        border: `1px solid ${color}`,
        color,
      }}
    >
      {children}
    </span>
  );
}
