import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Input } from '../../../components/ui';
import { PageLoader } from '../../../components/common/PageLoader';

const demoAccounts = [
  { id: 'user-amcec-admin', label: 'Demo administrator' },
  { id: 'user-amcec-teacher', label: 'Demo faculty' },
  { id: 'user-amcec-student', label: 'Demo student' },
];

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reset, setReset] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (reset) {
        await auth.requestPasswordReset(email);
        setMessage('If this email has an account, you will receive a password reset link.');
      } else {
        await auth.login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-subtle px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-7 space-y-5">
        <h1 className="text-2xl font-semibold text-primary">{reset ? 'Reset your password' : 'Sign in to Academic Portal'}</h1>
        {(error || auth.error) && <p role="alert" className="text-sm text-red-700">{error || auth.error}</p>}
        {auth.error && <Button type="button" variant="secondary" onClick={auth.retry}>Retry connection</Button>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        {auth.selectDemoAccount ? (
          <div className="space-y-3">
            <p className="text-sm text-secondary">Fictional demonstration · Changes last until you reload.</p>
            {demoAccounts.map(({ id, label }) => <Button key={id} className="w-full" onClick={() => auth.selectDemoAccount?.(id)}>{label}</Button>)}
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-4">
              <Input label="Institutional email" type="email" autoComplete="username" required value={email}
                onChange={(event) => setEmail(event.target.value)} />
              {!reset && <Input label="Password" type="password" autoComplete="current-password" required
                value={password} onChange={(event) => setPassword(event.target.value)} />}
              <Button type="submit" className="w-full" isLoading={busy}>{reset ? 'Send reset link' : 'Sign in'}</Button>
            </form>
            <button type="button" className="text-sm text-brand-700 underline" onClick={() => {
              setReset(!reset);
              setError('');
              setMessage('');
            }}>{reset ? 'Back to sign in' : 'Forgot password?'}</button>
          </>
        )}
      </section>
    </main>
  );
}

export function PasswordSetupPage() {
  const { error, isLoading, canSetPassword, setPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setValue] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) return <PageLoader />;

  return (
    <main className="min-h-screen grid place-items-center bg-subtle px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-7 space-y-5">
        <h1 className="text-2xl font-semibold">Set your password</h1>
        {(failure || error) && <p className="text-sm text-red-700" role="alert">{failure || error}</p>}
        {canSetPassword ? (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            setFailure('');
            setBusy(true);
            try {
              await setPassword(password);
              navigate('/login', { replace: true });
            } catch (err) {
              setFailure(err instanceof Error ? err.message : 'Unable to update your password.');
            } finally {
              setBusy(false);
            }
          }}>
            <Input label="New password" type="password" required minLength={12} autoComplete="new-password"
              value={password} onChange={(event) => setValue(event.target.value)} />
            <Button type="submit" isLoading={busy}>Save password</Button>
          </form>
        ) : <p className="text-sm text-secondary">Open an invitation or request a new password reset link.</p>}
        {!canSetPassword && <Link to="/login" className="text-sm underline">Back to sign in</Link>}
      </section>
    </main>
  );
}
