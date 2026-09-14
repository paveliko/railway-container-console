import { spinnerBase, spinnerSize, spinnerStroke, type SpinnerSize } from './tokens';

export interface SpinnerProps {
  size?: SpinnerSize;
  /**
   * Required, not defaulted. A spinner with a generic label is a spinner whose
   * caller never thought about what it is waiting for, and the words are what a
   * screen reader actually conveys — the rotation conveys nothing.
   */
  label: string;
}

/**
 * A busy indicator that announces itself. `role="status"` with a text label is
 * what makes it legible to a screen reader; a bare spinning element is not.
 *
 * The rotation rides on the wrapper, which is also where the reduced-motion
 * override sits. Putting that override on the arc would read correctly and do
 * nothing, because the arc is not what turns.
 *
 * The numbers in the SVG are viewBox coordinates — shape, not measure. The one
 * value that is a measure, the stroke width, comes from the stylesheet.
 */
export function Spinner({ size = 'sm', label }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={`${spinnerBase} ${spinnerSize[size]}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="block size-full">
        <circle cx="8" cy="8" r="6.5" fill="none" className={`${spinnerStroke} stroke-line`} />
        <path
          d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
          fill="none"
          strokeLinecap="round"
          className={`${spinnerStroke} stroke-accent`}
        />
      </svg>
    </span>
  );
}
