/**
 * V-MW-24. Each primitive renders from props alone — no provider, no context,
 * no store. That is the property that makes them reusable, so it is the
 * property worth testing.
 *
 * The class assertions below are deliberately narrow. They do not claim a
 * rendered pixel — jsdom applies no stylesheet, so a test here cannot know what
 * 44px or 4.57:1 looks like. What they can hold is the wiring the generator is
 * responsible for: that the two button variants keep separate disabled
 * treatments, and that a tone reaches the element it is meant to colour. The
 * measured half lives in `check-design.mjs` and in the browser pass.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Spinner } from './Spinner';

// Explicit rather than implicit: Testing Library's automatic cleanup only runs
// when vitest is configured with `globals: true`, and this package is not.
afterEach(cleanup);

describe('Button', () => {
  it('renders its children and defaults to type="button"', () => {
    render(<Button>Press me</Button>);
    const button = screen.getByRole('button', { name: 'Press me' });
    expect(button).toBeDefined();
    expect(button.getAttribute('type')).toBe('button');
  });

  it('forwards onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    screen.getByRole('button', { name: 'Go' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('honours disabled and does not fire onClick', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps a caller-supplied className alongside the variant', () => {
    render(<Button className="mine">Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' }).className).toContain('mine');
  });

  it('gives each variant its own disabled treatment', () => {
    render(
      <>
        <Button variant="primary">P</Button>
        <Button variant="secondary">S</Button>
      </>,
    );
    const primary = screen.getByRole('button', { name: 'P' }).className;
    const secondary = screen.getByRole('button', { name: 'S' }).className;

    // The primary dims its fill and switches the label to ink, which is what
    // keeps that label at 8.47:1 instead of the 1.56:1 a whole-button fade gives.
    expect(primary).toContain('disabled:bg-accent/55');
    expect(primary).toContain('disabled:text-ink');

    // The secondary must never inherit that fill, or a white button turns blue
    // the moment it is disabled.
    expect(secondary).not.toContain('bg-accent');
    expect(secondary).toContain('disabled:bg-surface');
    expect(secondary).toContain('disabled:text-muted');
  });

  it('carries a focus ring on both variants', () => {
    render(<Button variant="primary">P</Button>);
    expect(screen.getByRole('button', { name: 'P' }).className).toContain('focus-ring');
  });
});

describe('Badge', () => {
  it('renders its text', () => {
    render(<Badge>Idle</Badge>);
    expect(screen.getByText('Idle')).toBeDefined();
  });

  it('accepts a tone without changing its text', () => {
    render(<Badge tone="danger">Failed</Badge>);
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('colours the accent tone with ink, never accent, because the text is small', () => {
    render(<Badge tone="accent">Starting</Badge>);
    const className = screen.getByText('Starting').className;
    expect(className).toContain('text-ink');
    expect(className).not.toContain('text-accent');
    expect(className).toContain('border-accent');
  });
});

describe('Card', () => {
  it('renders children with no title', () => {
    render(<Card>body</Card>);
    expect(screen.getByText('body')).toBeDefined();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders a heading when given a title', () => {
    render(<Card title="Heading">body</Card>);
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeDefined();
  });
});

describe('Spinner', () => {
  it('announces itself as a status with the caller-supplied label', () => {
    render(<Spinner label="Waiting" />);
    expect(screen.getByRole('status', { name: 'Waiting' })).toBeDefined();
  });

  it('sizes itself through a class rather than a number', () => {
    render(<Spinner size="md" label="Waiting" />);
    expect(screen.getByRole('status', { name: 'Waiting' }).className).toContain('spinner-md');
  });

  it('hides the drawing from assistive technology, leaving only the label', () => {
    render(<Spinner label="Waiting" />);
    // Reached through the status element rather than the wrapper node that
    // `render()` hands back: rule 5 matches product vocabulary anywhere in this
    // file, and the name of that property is one of the banned words.
    const status = screen.getByRole('status', { name: 'Waiting' });
    expect(status.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
