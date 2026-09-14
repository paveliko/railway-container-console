/**
 * The whole design system: two neutrals, four semantic hues, one type scale.
 *
 * Plain objects rather than CSS variables or a styling library, because the
 * console is one screen and the components below are the only consumers. When
 * a second consumer wants theming, this file becomes the place that answers
 * it — which is the reason it exists as a named export rather than as literals
 * scattered through the components.
 */

export const colors = {
  ink: '#111418',
  muted: '#5b6672',
  line: '#dfe3e8',
  surface: '#ffffff',
  raised: '#f6f7f9',

  accent: '#2f6feb',
  positive: '#177245',
  caution: '#8a5a00',
  danger: '#b3261e',
} as const;

export const typography = {
  family:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  size: { sm: '0.8125rem', md: '0.9375rem', lg: '1.125rem', xl: '1.5rem' },
  weight: { regular: 400, medium: 500, bold: 600 },
} as const;

export const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
} as const;

export const radius = { sm: '4px', md: '8px', pill: '999px' } as const;

export type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'danger';

export const toneColor: Record<Tone, string> = {
  neutral: colors.muted,
  accent: colors.accent,
  positive: colors.positive,
  caution: colors.caution,
  danger: colors.danger,
};
