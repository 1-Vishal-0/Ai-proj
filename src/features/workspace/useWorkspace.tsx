import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/db/database';
import { portalRpc, writePortal } from '../../services/db/portalData';
import { demoMode } from '../../services/supabaseClient';
import { useDatabaseVersion } from '../../hooks/useDatabase';

export function useWorkspace() {
  useDatabaseVersion();
  const { currentUser } = useAuth();
  const settings = db.getSettings();
  return {
    settings,
    admin: currentUser?.role === 'admin',
    canRegister:
      !demoMode &&
      (currentUser?.role === 'admin' ||
        (currentUser?.role === 'hod' && !!settings.hod_roster_management)),
  };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState(false);
  const run = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await operation();
      setFailure(false);
      setNotice(message);
    } catch (error) {
      setFailure(true);
      setNotice(
        error instanceof Error
          ? error.message
          : 'The change could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    run,
    feedback: notice && (
      <p
        role={failure ? 'alert' : 'status'}
        className={failure ? 'workspace-error' : 'workspace-success'}
      >
        {notice}
      </p>
    ),
  };
}

export const mutate = (name: string, args: Record<string, unknown>) =>
  writePortal(() => portalRpc(name, args));

