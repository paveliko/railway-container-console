import { useState, type FormEvent } from 'react';
import { Button } from '@repo/ui';

import { openSession } from '../../api/client';

/**
 * Shown when the server answers `401`.
 *
 * `D-SEC-2` sets `CONSOLE_PASSPHRASE` on the deployed demo, so on the demo this
 * is the first thing a reviewer sees, not a rarity. It is normally absent in
 * local development, where there is nothing to protect and this is never drawn.
 * It was written before that decision, on the reasoning that a server-side gate
 * with no way to pass it from a browser is a half-built feature rather than a
 * deferred one.
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
