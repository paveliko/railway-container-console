/**
 * A Railway that answers from a script, so every test in this package runs
 * against the real transport, the real documents and the real error
 * classification — without a token and without touching anybody's
 * infrastructure.
 *
 * `console-server` design §4. It replaces `fetch`, keyed on the operation name
 * in the request body, and records what was asked. Recording the calls is not a
 * convenience: half the criteria here are about a request *not* being made.
 */

export interface DeploymentFrame {
  id: string;
  status: string;
  deploymentStopped: boolean;
  url?: string | null;
  instances: { id: string; status: string }[];
}

export interface Frame {
  hasEverDeployed: boolean;
  latestDeployment: DeploymentFrame | null;
}

/** The stopped shape recorded live on 2026-09-14. */
export const STOPPED: Frame = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep-1', status: 'SUCCESS', deploymentStopped: true, url: null,
    instances: [{ id: 'i-1', status: 'EXITED' }],
  },
};

export const RUNNING: Frame = {
  hasEverDeployed: true,
  latestDeployment: {
    id: 'dep-1', status: 'SUCCESS', deploymentStopped: false,
    url: 'https://target.up.railway.app',
    instances: [{ id: 'i-1', status: 'RUNNING' }],
  },
};

export type Failure =
  | 'not-authorized'
  | 'rate-limited'
  | 'rate-limited-no-header'
  | 'validation'
  | 'network';

export interface FakeOptions {
  /** The current frame. Mutable, so a test can change it mid-flight. */
  frame?: () => Frame;
  /** Applied to mutations only; reads keep working. */
  failMutationsWith?: () => Failure | null;
  /** Called with the operation name before answering. */
  onCall?: (name: string) => void;
  /** Delays the mutation's answer, in ms, for the timeout cases. */
  mutationDelayMs?: () => number;
}

function body(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function fakeRailway(options: FakeOptions = {}) {
  const calls: string[] = [];
  let frame = options.frame ?? (() => STOPPED);

  const fetchImpl = async (_url: unknown, init?: RequestInit): Promise<Response> => {
    const request = JSON.parse(String(init?.body)) as { query: string };
    const name = /\b(?:query|mutation)\s+(\w+)/.exec(request.query)?.[1] ?? 'anonymous';
    calls.push(name);
    options.onCall?.(name);

    if (name === 'ReadServiceInstance') {
      const current = frame();
      return body({
        data: {
          serviceInstance: {
            hasEverDeployed: current.hasEverDeployed,
            latestDeployment:
              current.latestDeployment === null
                ? null
                : { ...current.latestDeployment, url: current.latestDeployment.url ?? null,
                    canRedeploy: true },
          },
        },
      });
    }

    const delay = options.mutationDelayMs?.() ?? 0;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

    switch (options.failMutationsWith?.() ?? null) {
      case 'not-authorized':
        return body({ errors: [{ message: 'Not Authorized', traceId: 'trace-abc' }] });
      case 'rate-limited':
        return body({ errors: [{ message: 'slow down' }] }, 429, { 'Retry-After': '30' });
      case 'rate-limited-no-header':
        return body({ errors: [{ message: 'slow down' }] }, 429);
      case 'validation':
        return body({
          errors: [{
            message: 'Error in numReplicas - Invalid input',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          }],
        });
      case 'network':
        throw new TypeError('fetch failed');
      default:
        break;
    }

    if (name === 'DeployServiceInstance') return body({ data: { serviceInstanceDeployV2: 'dep-new' } });
    if (name === 'RestartDeployment') return body({ data: { deploymentRestart: true } });
    return body({ data: { deploymentStop: true } });
  };

  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    calls,
    setFrame: (next: Frame) => { frame = () => next; },
    countOf: (name: string) => calls.filter((c) => c === name).length,
  };
}
