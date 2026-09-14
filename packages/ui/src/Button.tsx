import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { buttonBase, buttonVariant, type ButtonVariant } from './tokens';

export type { ButtonVariant };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

/**
 * A button and nothing more. It does not know what pressing it means, which is
 * the whole point: the caller owns the label, the disabled state and the
 * handler, so the same component serves a screen this package has never heard
 * of.
 *
 * The two variants carry their own disabled treatment rather than sharing one.
 * A shared rule reads as tidier and is wrong: dimming the whole control puts a
 * primary label at 1.56:1, and applying the primary's dimmed fill to the
 * secondary variant turns a white button blue. DESIGN.md §5 has the table.
 */
export function Button({
  variant = 'secondary',
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [buttonBase, buttonVariant[variant], className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
