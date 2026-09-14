import type { ReactNode } from 'react';

import { colors, radius, space, typography } from './tokens';

export interface CardProps {
  title?: ReactNode;
  children: ReactNode;
}

/** A bordered box with an optional heading. No layout opinions beyond padding. */
export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.line}`,
        borderRadius: radius.md,
        padding: space.xl,
        font: `${typography.weight.regular} ${typography.size.md} ${typography.family}`,
        color: colors.ink,
      }}
    >
      {title === undefined ? null : (
        <h2
          style={{
            margin: `0 0 ${space.md}`,
            font: `${typography.weight.bold} ${typography.size.lg} ${typography.family}`,
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
