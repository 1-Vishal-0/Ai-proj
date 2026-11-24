import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContext } from '../../../hooks/useAuth';
import { authService } from '../../../services/auth.service';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { db } from '../../../services/db/database';
import { clearPortalData, getPortalRefreshError, portalRpc, refreshPortalData } from '../../../services/db/portalData';
import { demoMode, requireSupabase, supabase } from '../../../services/supabaseClient';

const resetPath = '/auth/reset';
const resetMarker = 'attendance-password-setup';
const sessionError = (cause: unknown) => cause instanceof Error ? cause.message : 'Unable to open your portal session.';
let verification: Promise<void> | undefined;

function verifyPasswordLink() {
  if (window.location.pathname !== resetPath) return;
  const params = new URLSearchParams(window.location.search);
  const token_hash = params.get('token_hash');
  const code = params.get('code');
  const type = params.get('type');
  if (!(token_hash || code) && !params.has('error')) return verification;
  verification ??= (async () => {
    window.history.replaceState(window.history.state, '', resetPath);
    const client = requireSupabase();
    if (params.has('error')) throw new Error('This password link is invalid or expired.');
    if (token_hash && type !== 'recovery' && type !== 'invite') throw new Error('This password link is invalid.');
    const response = token_hash && (type === 'recovery' || type === 'invite')
      ? await client.auth.verifyOtp({ token_hash, type })
      : await client.auth.exchangeCodeForSession(code!);
    if (response.error || !response.data.session) throw new Error('This password link is invalid or expired.');
    sessionStorage.setItem(resetMarker, response.data.session.user.id);
  })();
  return verification;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useDatabaseVersion();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(demoMode || !!supabase);
  const configurationError = demoMode || supabase ? null : 'This portal has no Supabase connection. Contact your administrator.';
  const [error, setError] = useState<string | null>(null);
  const [canSetPassword, setCanSetPassword] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let running = true;
    if (import.meta.env.VITE_PORTAL_MODE === 'demo') {
      void import('../../../services/db/seedData').then(({ demoSeed }) => {
        if (running) {
          db.startDemo(demoSeed);
          setLoading(false);
        }
      }).catch((err) => {
        if (running) {
          setError(sessionError(err));
          setLoading(false);
        }
      });
      return () => { running = false; };
    }
    if (!supabase) return;
    const client = supabase;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    let activeUser: string | undefined;
    let initialized = false;
    let profileReady = false;

    const apply = async (session: Session | null) => {
      const nextUser = session?.user.id;
      const needsPassword = !!nextUser && sessionStorage.getItem(resetMarker) === nextUser;
      if (initialized && nextUser === activeUser && !needsPassword && (!nextUser || (profileReady && !getPortalRefreshError()))) return;
      initialized = true;
      activeUser = nextUser;
      profileReady = false;
      const request = ++generation;
      clearPortalData();
      setProfileId(null);
      setError(null);
      setCanSetPassword(needsPassword);
      if (!session || needsPassword) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const id = await portalRpc<string | null>('portal_profile_id');
        if (!running || request !== generation) return;
        if (!id) throw new Error('Your account has not been authorized for this portal.');
        await refreshPortalData(id);
        if (running && request === generation) {
          profileReady = true;
          setProfileId(id);
        }
      } catch (err) {
        if (running && request === generation) setError(sessionError(err));
      } finally {
        if (running && request === generation) setLoading(false);
      }
    };

    let ready = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!ready || !running) return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (running) void apply(session); }, 0);
    });

    void (async () => {
      try {
        await verifyPasswordLink();
        const result = await client.auth.getSession();
        if (result.error) throw result.error;
        if (running) {
          ready = true;
          await apply(result.data.session);
        }
      } catch (err) {
        if (running) {
          ready = true;
          setError(sessionError(err));
          setLoading(false);
        }
      }
    })();

    const refreshOnFocus = () => {
      if (ready) void refreshPortalData().catch(() => undefined);
    };
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      running = false;
      clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener('focus', refreshOnFocus);
      clearPortalData();
    };
  }, [attempt]);

  const login = async (email: string, password: string) => {
    setError(null);
    await authService.signIn(email, password);
  };

  const logout = useCallback(async () => {
    if (!demoMode) {
      await authService.signOut();
      sessionStorage.removeItem(resetMarker);
      clearPortalData();
    }
    setProfileId(null);
    setCanSetPassword(false);
    setError(null);
  }, []);

  const requestPasswordReset = async (email: string) => {
    await authService.requestPasswordReset(email, new URL(resetPath, window.location.origin).href);
  };

  const setPassword = async (password: string) => {
    if (!canSetPassword) throw new Error('Open a valid invitation or password reset link.');
    const { error: failure } = await requireSupabase().auth.updateUser({ password });
    if (failure) throw failure;
    await authService.signOut('global');
    sessionStorage.removeItem(resetMarker);
    verification = undefined;
    clearPortalData();
    setCanSetPassword(false);
    setProfileId(null);
  };

  const currentUser = profileId ? db.getUserById(profileId) ?? null : null;
  const currentStudent = currentUser?.role === 'student'
    ? db.getEnrichedStudents().find((student) => student.user_id === currentUser.id) ?? null
    : null;
  const currentTeacher = currentUser?.role === 'teacher'
    ? db.getEnrichedTeachers().find((teacher) => teacher.user_id === currentUser.id) ?? null
    : null;

  return (
    <AuthContext.Provider value={{
      currentUser, currentStudent, currentTeacher, error: configurationError ?? error ?? getPortalRefreshError(), isLoading,
      login, logout, canSetPassword, setPassword, requestPasswordReset,
      retry: () => {
        if (configurationError) return;
        setLoading(true);
        setError(null);
        setAttempt((value) => value + 1);
      },
      selectDemoAccount: demoMode ? (id) => {
        if (db.getUserById(id)) setProfileId(id);
      } : undefined,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
