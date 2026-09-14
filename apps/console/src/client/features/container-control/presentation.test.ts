/**
 * `V-SC-1`, `V-42`, `V-44`: the copy deck of `ux-brief` §6, asserted as data.
 *
 * Nine renderings over seven phases, because `down` says three different things
 * depending on why it is down.
 */

import { describe, expect, it } from 'vitest';
import type { ContainerState } from '@repo/contracts';

import { frameFor } from './presentation';

const labels = (state: ContainerState) => frameFor(state).controls.map((c) => c.label);

describe('the nine frames', () => {
  it('down / stopped', () => {
    const frame = frameFor({ phase: 'down', reason: 'stopped' });
    expect(frame.headline).toBe('Down');
    expect(frame.detail).toBe('stopped');
    expect(labels({ phase: 'down', reason: 'stopped' })).toEqual(['Start']);
  });

  it('down / never-deployed', () => {
    expect(frameFor({ phase: 'down', reason: 'never-deployed' }).detail).toBe('never deployed');
  });

  it('down / removed', () => {
    expect(frameFor({ phase: 'down', reason: 'removed' }).detail).toBe('removed');
  });

  it('starting — humanised status, control disabled', () => {
    const state: ContainerState = { phase: 'starting', deploymentId: 'd', status: 'DEPLOYING' };
    const frame = frameFor(state);
    expect(frame.headline).toBe('Starting…');
    expect(frame.detail).toBe('deploying');
    expect(frame.transitional).toBe(true);
    expect(labels(state)).toEqual(['Starting…']);
  });

  it('up — the URL as a link', () => {
    const state: ContainerState = {
      phase: 'up', deploymentId: 'd', url: 'https://x.up.railway.app', replicas: 1,
    };
    const frame = frameFor(state);
    expect(frame.headline).toBe('Up');
    expect(frame.href).toBe('https://x.up.railway.app');
    expect(labels(state)).toEqual(['Stop']);
  });

  it('up — replica count takes the detail line when there is more than one', () => {
    expect(frameFor({ phase: 'up', deploymentId: 'd', replicas: 3 }).detail).toBe('3 replicas');
  });

  it('stopping — no detail, control disabled', () => {
    const state: ContainerState = { phase: 'stopping', deploymentId: 'd' };
    expect(frameFor(state).detail).toBeNull();
    expect(frameFor(state).transitional).toBe(true);
    expect(labels(state)).toEqual(['Stopping…']);
  });

  it('failed — the status verbatim', () => {
    const state: ContainerState = { phase: 'failed', deploymentId: 'd', status: 'CRASHED' };
    expect(frameFor(state).headline).toBe('Failed');
    expect(frameFor(state).detail).toBe('CRASHED');
    expect(labels(state)).toEqual(['Start']);
  });

  it('sleeping — says what serverless sleep is', () => {
    const state: ContainerState = { phase: 'sleeping', deploymentId: 'd' };
    expect(frameFor(state).detail).toBe('serverless sleep — wakes on traffic');
    expect(labels(state)).toEqual(['Stop']);
  });

  it('unknown — both controls, and the literal observation — V-44', () => {
    const state: ContainerState = { phase: 'unknown', observed: 'status=SKIPPED instances=[]' };
    const frame = frameFor(state);
    expect(frame.headline).toBe('Unknown');
    expect(frame.detail).toBe('status=SKIPPED instances=[]');
    expect(labels(state)).toEqual(['Start', 'Stop']);
  });

  it('is total — every phase produces a frame and none throws', () => {
    const states: ContainerState[] = [
      { phase: 'down', reason: 'stopped' },
      { phase: 'starting', deploymentId: 'd', status: 'BUILDING' },
      { phase: 'up', deploymentId: 'd', replicas: 1 },
      { phase: 'stopping', deploymentId: 'd' },
      { phase: 'failed', deploymentId: 'd', status: 'FAILED' },
      { phase: 'sleeping', deploymentId: 'd' },
      { phase: 'unknown', observed: 'x' },
    ];
    for (const state of states) expect(() => frameFor(state)).not.toThrow();
  });
});
