import { Card, Spinner } from '@repo/ui';

import { sentenceFor } from './messages';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ContainerActions } from './ContainerActions';
import { ContainerStatus } from './ContainerStatus';
import { LastError } from './LastError';
import { PassphraseForm } from './PassphraseForm';
import { frameFor } from './presentation';
import { useContainerState } from './useContainerState';

/**
 * The whole screen.
 *
 * The card is bounded and centred on the page, and its internal rhythm is the
 * 24 / 8 / 12 / 8 of `ux-brief` §3. Nothing here invents a colour or a measure:
 * every class resolves to a token generated from `DESIGN.md`.
 */
export function ContainerPanel() {
  const screen = useContainerState();

  return (
    <main className="min-h-dvh bg-raised">
      <div className="mx-auto w-full max-w-[30rem] px-lg py-xl">
        <Card title="Container">
          {screen.needsPassphrase ? (
            <PassphraseForm onOpened={screen.dismissPassphrase} />
          ) : screen.loading ? (
            // first-paint, `Q-UI-6`: the card exists, the headline does not yet.
            <div className="flex min-h-touch items-center gap-sm font-sans text-md text-muted">
              <Spinner size="md" label="Reading the container's state" />
              Reading the container…
            </div>
          ) : screen.state === null ? (
            // first-paint / failed. Nothing is streaming, so offer the read again.
            <div className="flex flex-col gap-md">
              <p className="m-0 font-sans text-md text-danger">
                {sentenceFor(screen.firstPaintError ?? { error: 'railway-unavailable' })}
              </p>
              <ContainerActions
                frame={{
                  headline: '',
                  detail: null,
                  href: null,
                  tone: 'neutral',
                  transitional: false,
                  controls: [{ transition: 'up', label: 'Try again', primary: true }],
                }}
                disabled={false}
                onPress={screen.retry}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-xl">
              <ContainerStatus
                frame={frameFor(screen.state)}
                waiting={screen.waiting}
                notice={screen.notice}
              />
              <ContainerActions
                frame={frameFor(screen.state)}
                disabled={screen.disabled}
                onPress={screen.press}
              />
              <div className="flex flex-col gap-sm border-t-hairline border-line pt-md">
                <ConnectionIndicator connection={screen.connection} />
                <LastError error={screen.lastError} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
