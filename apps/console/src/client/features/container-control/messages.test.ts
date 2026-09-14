/**
 * Every code in the closed set has a sentence (`Q-UI-7`), and the rate-limit
 * line says what the console actually does.
 */

import { describe, expect, it } from 'vitest';
import { consoleErrorCodeSchema } from '@repo/contracts';

import { sentenceFor, noticeFor } from './messages';

describe('sentences', () => {
  it('covers every code in the schema — a code with no sentence is not in the set', () => {
    for (const code of consoleErrorCodeSchema.options) {
      const sentence = sentenceFor({ error: code });
      expect(sentence, code).toBeTruthy();
      expect(sentence, code).not.toBe(code);
    }
  });

  it('names the wait instead of promising a retry that never happens', () => {
    const sentence = sentenceFor({ error: 'railway-rate-limited', retryAfterSeconds: 45 });
    expect(sentence).toContain('try again in 45 seconds');
    expect(sentence).not.toContain('retrying');
  });

  it('says nothing about a number Railway did not send', () => {
    const sentence = sentenceFor({ error: 'railway-rate-limited' });
    expect(sentence).toBe('Railway is rate-limiting us');
  });

  it('reads the permissions case as permissions, not as a fault of the service', () => {
    expect(sentenceFor({ error: 'railway-not-authorized' })).toBe(
      'The token is not permitted to do this',
    );
  });

  it('phrases a 409 as information, not failure', () => {
    expect(noticeFor('up')).toBe('already starting');
    expect(noticeFor('down')).toBe('already stopping');
  });
});
