import { useState } from 'react';
import { Field, Panel } from '../../workspace/shared';
import { Button } from '../../../components/ui';
import { portalRpc } from '../../../services/db/portalData';
export default function StudentCheckinPage() {
  const [token] = useState(() =>
    /^#[0-9a-f-]{36}$/i.test(location.hash) ? location.hash.slice(1) : '',
  );
  const [code, setCode] = useState('');
  const [useQR, setUseQR] = useState(!!token);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="workspace-page mx-auto max-w-md">
      <header>
        <h1>Lecture check-in</h1>
        <p>Use the QR or eight-digit code displayed by your instructor.</p>
      </header>
      <Panel title={useQR ? 'Scanned lecture' : 'Session code'}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage('');
            try {
              setMessage(
                await portalRpc<string>('lecture_checkin', {
                  credential: useQR ? token : code,
                }),
              );
            } catch (err) {
              setMessage(
                err instanceof Error
                  ? err.message
                  : 'Unable to connect. Ask your instructor to mark you manually.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {useQR ? (
            <button
              type="button"
              onClick={() => {
                setUseQR(false);
                setMessage('');
              }}
            >
              Enter a numeric code instead
            </button>
          ) : (
            <Field label="Eight-digit code">
              <input
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]{8}"
                required
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
          )}
          <Button
            type="submit"
            disabled={busy || (!useQR && !/^\d{8}$/.test(code))}
          >
            {busy ? 'Checking…' : 'Check in'}
          </Button>
          <p role="status">{message}</p>
        </form>
        <p className="workspace-note">
          If you cannot check in, your instructor can mark you manually.
        </p>
      </Panel>
    </div>
  );
}
