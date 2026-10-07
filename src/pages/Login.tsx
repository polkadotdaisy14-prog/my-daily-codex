import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { localMode, user, loading, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (localMode) return <Navigate to="/" replace />;
  if (loading) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'in' ? signInWithPassword : signUpWithPassword;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="page narrow">
      <header className="brand">
        <Mark />
        <h1>My Daily Codex</h1>
        <p className="muted">Your daily identity-navigation reading.</p>
      </header>

      <button
        type="button"
        className="btn secondary full"
        disabled={busy}
        onClick={async () => {
          setError(null);
          const { error: err } = await signInWithGoogle();
          if (err) setError(err);
        }}
      >
        Continue with Google
      </button>

      <div className="divider"><span>or</span></div>

      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn primary full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="center muted">
        {mode === 'in' ? (
          <>New here? <button type="button" className="link" onClick={() => setMode('up')}>Create an account</button></>
        ) : (
          <>Already have an account? <button type="button" className="link" onClick={() => setMode('in')}>Sign in</button></>
        )}
      </p>
    </div>
  );
}

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
    </svg>
  );
}
