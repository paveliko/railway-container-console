import { useState, type FormEvent } from 'react';
import { Button } from '@repo/ui';

import { openSession } from '../../api/client';

/**
 * Shown when the server answers `401`.
 *
 * `Q-SEC-4` is unsigned, so `CONSOLE_PASSPHRASE` is normally absent and this is
 * never drawn. It exists because the alternative is worse than the ambiguity: a
 * server-side gate with no way to pass it makes the console unusable from a
 * browser, which is a half-built feature rather than a deferred one.
 */
export function PassphraseForm({ onOpened }: { onOpened: () => void }) {
  const [value, setValue] = useState('');
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setRefused(false);
    void openSession(value)
      .then(() => {
        setValue('');
        onOpened();
      })
      .catch(() => setRefused(true))
      .finally(() => setBusy(false));
  };

  return (
    <form className="flex flex-col gap-sm" onSubmit={submit}>
      <label className="font-sans text-sm text-muted" htmlFor="passphrase">
        This console needs its passphrase
      </label>
      <div className="flex flex-wrap gap-sm">
        <input
          id="passphrase"
          type="password"
          autoComplete="current-password"
          className="min-h-touch flex-1 rounded-sm border-hairline border-line-strong bg-surface px-md font-sans text-md text-ink focus-ring"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={busy || value === ''}>
          Unlock
        </Button>
      </div>
      <p className="m-0 min-h-lg font-sans text-sm text-danger" role="alert">
        {refused ? 'That passphrase was not accepted' : null}
      </p>
    </form>
  );
}
