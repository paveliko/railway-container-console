import { Button } from '@repo/ui';

import type { Frame } from './presentation';

/**
 * The control, or two of them when the phase is `unknown` — `V-44`: not one,
 * not none, because the user knows more than the derivation table does.
 *
 * Every button here comes from `@repo/ui`. `V-SC-10` greps this folder for a
 * raw `<button>` and must find none: the touch target, the focus ring and the
 * disabled contrast are all decisions that live in the design system, and a
 * hand-rolled button would quietly opt out of all three.
 */
export function ContainerActions({
  frame,
  disabled,
  onPress,
}: {
  frame: Frame;
  disabled: boolean;
  onPress: (transition: 'up' | 'down') => void;
}) {
  return (
    <div className="flex flex-wrap gap-sm">
      {frame.controls.map((control) => (
        <Button
          key={control.transition}
          variant={control.primary ? 'primary' : 'secondary'}
          disabled={disabled || frame.transitional}
          onClick={() => onPress(control.transition)}
        >
          {control.label}
        </Button>
      ))}
    </div>
  );
}
