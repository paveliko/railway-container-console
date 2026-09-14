import { colors } from './tokens';

export interface SpinnerProps {
  /** Pixels. The only knob, because there is only one use for it. */
  size?: number;
  label?: string;
}

/**
 * A busy indicator that announces itself. `role="status"` with a text label is
 * what makes it legible to a screen reader; a bare spinning div is not.
 */
export function Spinner({ size = 16, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} style={{ display: 'inline-flex' }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <path
          d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 8 8"
            to="360 8 8"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </span>
  );
}
