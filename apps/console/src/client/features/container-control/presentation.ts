/**
 * `ContainerState` → what the card says. Pure, total, and the only place the
 * copy deck of `ux-brief` §6 is written down.
 *
 * Kept apart from the components so the nine frames can be asserted as data.
 * A component test that read these strings out of rendered markup would be
 * testing React; this way `V-SC-1` tests the copy.
 */

import type { ContainerState } from '@repo/contracts';

export type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'danger';

export interface Control {
  transition: 'up' | 'down';
  label: string;
  /** The primary control of the frame; at most one is. */
  primary: boolean;
}

export interface Frame {
  headline: string;
  /** Plain text, or a link when the container has a URL to offer. */
  detail: string | null;
  href: string | null;
  tone: Tone;
  controls: Control[];
  /** True while the phase itself is a transition — `ux-brief` §2 frames 3 and 6. */
  transitional: boolean;
}

const START: Control = { transition: 'up', label: 'Start', primary: true };
const STOP: Control = { transition: 'down', label: 'Stop', primary: true };

/** `BUILDING` → `building`. The finer step needs a subscription we cannot open. */
function humanise(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

export function frameFor(state: ContainerState): Frame {
  switch (state.phase) {
    case 'down':
      return {
        headline: 'Down',
        detail:
          state.reason === 'never-deployed'
            ? 'never deployed'
            : state.reason === 'stopped'
              ? 'stopped'
              : 'removed',
        href: null,
        tone: 'neutral',
        controls: [START],
        transitional: false,
      };

    case 'starting':
      return {
        headline: 'Starting…',
        detail: humanise(state.status),
        href: null,
        tone: 'accent',
        controls: [{ transition: 'up', label: 'Starting…', primary: true }],
        transitional: true,
      };

    case 'up':
      return {
        headline: 'Up',
        detail: state.replicas > 1 ? `${state.replicas} replicas` : (state.url ?? null),
        href: state.url ?? null,
        tone: 'positive',
        controls: [STOP],
        transitional: false,
      };

    case 'stopping':
      return {
        headline: 'Stopping…',
        detail: null,
        href: null,
        tone: 'accent',
        controls: [{ transition: 'down', label: 'Stopping…', primary: true }],
        transitional: true,
      };

    case 'failed':
      return {
        headline: 'Failed',
        detail: state.status,
        href: null,
        tone: 'danger',
        controls: [START],
        transitional: false,
      };

    case 'sleeping':
      return {
        headline: 'Sleeping',
        detail: 'serverless sleep — wakes on traffic',
        href: null,
        tone: 'caution',
        controls: [STOP],
        transitional: false,
      };

    case 'unknown':
      // Both, enabled. The user knows more than the table does — `V-44`.
      return {
        headline: 'Unknown',
        detail: state.observed,
        href: null,
        tone: 'caution',
        controls: [
          { ...START, primary: false },
          { ...STOP, primary: false },
        ],
        transitional: false,
      };
  }
}
