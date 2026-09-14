/**
 * The real server, the real routes, the real stream — against the fake Railway.
 *
 * This exists so the screen can be driven end to end without a token and
 * without touching anybody's infrastructure. It is a harness, not a second
 * entry point: it imports the same `handle` and the same Vite middleware the
 * production entry does, and differs only in which provider the runtime holds.
 *
 * Scripted transitions run on a timer so a walk through the frames is
 * reproducible: press Start and the container really does move
 * down → starting → up, a couple of seconds apart.
 */

import { createServer } from 'node:http';

import { Poller } from '@repo/container-core';
import type { ContainerProvider } from '@repo/container-core';

import { handle, isApiRequest } from '../src/server/routes';
import { setRuntime } from '../src/server/runtime';
import { viteMiddleware } from '../src/server/dev';
import { RUNNING, STOPPED, type Frame } from './fake-railway';

const STARTING: Frame = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep-1', status: 'DEPLOYING', deploymentStopped: false, instances: [],
  },
};
const STOPPING: Frame = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep-1', status: 'SUCCESS', deploymentStopped: false,
    instances: [{ id: 'i-1', status: 'REMOVING' }],
  },
};
const FRAMES: Record<string, Frame> = { STOPPED, STARTING, RUNNING, STOPPING };

let frame: Frame = process.env.FRAME ? (FRAMES[process.env.FRAME] ?? STOPPED) : STOPPED;

function viewOf(f: Frame) {
  const latest = f.latestDeployment;
  return {
    hasEverDeployed: f.hasEverDeployed,
    latestDeployment:
      latest === null
        ? null
        : {
            id: latest.id,
            status: latest.status as never,
            deploymentStopped: latest.deploymentStopped,
            instances: latest.instances as never,
            ...(latest.url ? { url: latest.url } : {}),
          },
  };
}

const provider: ContainerProvider = {
  read: async () => viewOf(frame),
  up: async () => {
    frame = STARTING;
    setTimeout(() => { frame = RUNNING; }, 4_000);
    return { deploymentId: 'dep-1' };
  },
  down: async () => {
    frame = STOPPING;
    setTimeout(() => { frame = STOPPED; }, 4_000);
  },
};

const poller = new Poller({ provider, onReadError: (e) => console.error('[poller]', e) });
poller.start();

setRuntime({
  config: {
    credential: { kind: 'project', token: 'fake' },
    target: { projectId: 'p', environmentId: 'e', serviceId: 's' },
    ...(process.env.CONSOLE_PASSPHRASE ? { passphrase: process.env.CONSOLE_PASSPHRASE } : {}),
  },
  provider,
  poller,
  streams: new Set(),
});

const assets = await viteMiddleware();
const port = Number(process.env.PORT ?? 3000);

createServer((req, res) => {
  if (isApiRequest(req.url ?? '/')) {
    void handle(req, res);
    return;
  }
  assets(req, res);
}).listen(port, () => console.log(`fake console listening on :${port}`));
