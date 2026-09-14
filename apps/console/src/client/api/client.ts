/**
 * Everything the browser knows how to ask for. Four calls, one error shape.
 *
 * A failed request is turned into a `ConsoleError` here rather than at each
 * call site, because the screen renders errors by code — and a response that
 * does not parse as one is itself a defect worth surfacing as an unavailable
 * console rather than a blank page.
 */

import { consoleErrorSchema, containerStateSchema, type ConsoleError, type ContainerState } from '@repo/contracts';

export class ApiError extends Error {
  constructor(readonly detail: ConsoleError, readonly status: number) {
    super(detail.error);
    this.name = 'ApiError';
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const parsed = consoleErrorSchema.safeParse(body);
  return new ApiError(
    parsed.success ? parsed.data : { error: 'railway-unavailable' },
    response.status,
  );
}

export async function fetchState(): Promise<ContainerState | null> {
  const response = await fetch('/api/container/state', { headers: { accept: 'application/json' } });
  if (!response.ok) throw await toApiError(response);
  const body = (await response.json()) as unknown;
  if (body === null) return null;
  return containerStateSchema.parse(body);
}

export async function press(transition: 'up' | 'down'): Promise<void> {
  const response = await fetch(`/api/container/${transition}`, {
    method: 'POST',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw await toApiError(response);
}

export async function openSession(passphrase: string): Promise<void> {
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ passphrase }),
  });
  if (!response.ok) throw await toApiError(response);
}
