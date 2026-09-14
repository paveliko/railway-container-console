import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { colors, radius, space, typography } from './tokens';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

/**
 * A button and nothing more. It does not know what pressing it means, which is
 * the whole point: the caller owns the label, the disabled state and the
 * handler, so the same component serves a screen this package has never heard
 * of.
 */
export function Button({
  variant = 'secondary',
  children,
  style,
  type = 'button',
  ...rest
}: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <button
      type={type}
      style={{
        font: `${typography.weight.medium} ${typography.size.md} ${typography.family}`,
        padding: `${space.sm} ${space.lg}`,
        borderRadius: radius.sm,
        border: `1px solid ${primary ? colors.accent : colors.line}`,
        background: primary ? colors.accent : colors.surface,
        color: primary ? colors.surface : colors.ink,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.55 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
