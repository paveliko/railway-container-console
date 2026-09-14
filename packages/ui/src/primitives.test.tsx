/**
 * V-MW-24. Each primitive renders from props alone — no provider, no context,
 * no store. That is the property that makes them reusable, so it is the
 * property worth testing; everything visual is left to the eye.
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
  it('announces itself as a status with a default label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeDefined();
  });

  it('takes a caller-supplied label', () => {
    render(<Spinner label="Waiting" />);
    expect(screen.getByRole('status', { name: 'Waiting' })).toBeDefined();
  });
});
