/**
 * Every refusal the server can send, as a sentence.
 *
 * `ux-brief` §6 fixes the four Railway ones. The rest exist because the error
 * set is closed (`Q-UI-7`) and a code with no sentence would reach a reader as
 * a raw identifier.
 *
 * One correction to the brief, recorded as an amendment rather than made
 * quietly: it gives the rate-limit line as *"Railway is rate-limiting us —
 * retrying in 30 s"*. Nothing retries — `V-12` forbids it for a non-idempotent
 * mutation — and the number is whatever Railway sent, not always 30. Promising
 * an automatic retry that will not happen is worse than saying nothing.
 */

import type { ConsoleError, ConsoleErrorCode } from '@repo/contracts';

const SENTENCES: Record<ConsoleErrorCode, string> = {
  'railway-not-authorized': 'The token is not permitted to do this',
  'railway-rate-limited': 'Railway is rate-limiting us',
  'railway-unavailable': 'Railway did not answer',
  'railway-rejected': 'Railway refused the request',
  'transition-in-flight': 'Another change is already in progress',
  'console-misconfigured': 'The console is not configured correctly',
  'not-found': 'The console asked for something that is not there',
  'no-deployment': 'There is no deployment to stop',
  unauthorized: 'This console needs its passphrase',
  'bad-request': 'The console sent something the server could not read',
  'forbidden-origin': 'That request did not come from this console',
  'payload-too-large': 'That was too much to send',
};

export function sentenceFor(error: ConsoleError): string {
  const base = SENTENCES[error.error];
  if (error.error === 'railway-rate-limited' && error.retryAfterSeconds !== undefined) {
    return `${base} — try again in ${error.retryAfterSeconds} seconds`;
  }
  return base;
}

/** `409` is informational, not a failure: `ux-brief` §7.3 says no red. */
export function noticeFor(transition: 'up' | 'down'): string {
  return transition === 'up' ? 'already starting' : 'already stopping';
}
