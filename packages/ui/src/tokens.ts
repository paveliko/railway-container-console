/* Generated from DESIGN.md by scripts/design-tokens.mjs — do not edit. */
/* Run `node scripts/design-tokens.mjs` after changing the specification. */

/**
 * The design system as the code sees it: the names from the specification,
 * and the complete class strings that render them.
 *
 * Class strings are whole literals on purpose. A name assembled at runtime is
 * invisible to the CSS scanner, so the utility never ships and the element
 * renders unstyled with nothing failing loudly.
 */

export type TokenColor = 'ink' | 'muted' | 'line' | 'lineStrong' | 'surface' | 'raised' | 'accent' | 'accentHover' | 'accentActive' | 'positive' | 'caution' | 'danger';

export type TokenSize = 'sm' | 'md' | 'lg' | 'xl';

export type TokenSpace = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'touch';

export type TokenRadius = 'sm' | 'md' | 'pill';

export type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'danger';

export type ButtonVariant = 'primary' | 'secondary';

export type SpinnerSize = 'sm' | 'md';

/** Raw values. Prefer the class strings below; these exist for consumers
  * that have not moved to the generated stylesheet yet. */
export const colors: Record<TokenColor, string> = {
  ink: '#111418',
  muted: '#5b6672',
  line: '#dfe3e8',
  lineStrong: '#7e8895',
  surface: '#ffffff',
  raised: '#f6f7f9',
  accent: '#2f6feb',
  accentHover: '#2a63d4',
  accentActive: '#2559bd',
  positive: '#177245',
  caution: '#8a5a00',
  danger: '#b3261e',
};

export const typography = {
  family: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  size: {
    sm: '0.8125rem',
    md: '0.9375rem',
    lg: '1.125rem',
    xl: '1.5rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    bold: 600,
  },
} as const;

export const space: Record<TokenSpace, string> = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  touch: '44px',
};

export const radius: Record<TokenRadius, string> = {
  sm: '4px',
  md: '8px',
  pill: '999px',
};

/** Utility classes per tone: a tinted fill, a full-strength border, a label
  * chosen so it clears 4.5 on that fill. */
export const tone: Record<Tone, { fill: string; text: string; border: string }> = {
  neutral: { fill: 'bg-muted/10', text: 'text-muted', border: 'border-line-strong' },
  accent: { fill: 'bg-accent/10', text: 'text-ink', border: 'border-accent' },
  positive: { fill: 'bg-positive/10', text: 'text-positive', border: 'border-positive' },
  caution: { fill: 'bg-caution/10', text: 'text-caution', border: 'border-caution' },
  danger: { fill: 'bg-danger/10', text: 'text-danger', border: 'border-danger' },
};

/** The tone of a label, kept for callers still reading a bare colour. */
export const toneColor: Record<Tone, string> = {
  neutral: colors.muted,
  accent: colors.accent,
  positive: colors.positive,
  caution: colors.caution,
  danger: colors.danger,
};

/** Every state of one button variant, in one literal. The two variants
  * differ in all four states; sharing a disabled rule would give the
  * secondary variant an accent fill. */
export const buttonVariant: Record<ButtonVariant, string> = {
  primary: 'bg-accent border-accent text-surface hover:bg-accent-hover active:bg-accent-active disabled:bg-accent/55 disabled:border-accent/55 disabled:text-ink',
  secondary: 'bg-surface border-line-strong text-ink hover:bg-raised active:bg-raised disabled:bg-surface disabled:border-line-strong/55 disabled:text-muted',
};

/** Structural classes shared by both button variants. */
export const buttonBase = 'inline-flex items-center justify-center gap-sm min-h-touch px-lg py-sm border-hairline rounded-sm font-sans text-md font-medium cursor-pointer disabled:cursor-not-allowed focus-ring';

export const badgeBase = 'inline-flex items-center gap-xs px-sm py-xs border-hairline rounded-pill font-sans text-sm font-medium';

export const cardBase = 'bg-surface border-hairline border-line rounded-md p-xl font-sans text-md text-ink';

export const spinnerBase = 'inline-block spin';

/** The rendered size of a busy indicator, as a class rather than a number. */
export const spinnerSize: Record<SpinnerSize, string> = {
  sm: 'spinner-sm',
  md: 'spinner-md',
};

export const spinnerStroke = 'spinner-stroke';
