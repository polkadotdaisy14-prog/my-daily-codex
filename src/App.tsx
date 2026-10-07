import { Navigate, Outlet, Route, BrowserRouter, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { useReading } from './lib/useReading';
import BottomNav from './components/BottomNav';
import Fab from './components/Fab';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Charts from './pages/Charts';
import Log, { LogForm } from './pages/Log';
import Account from './pages/Account';
import privacyText from '../legal/privacy-policy-DRAFT.md?raw';
import termsText from '../legal/terms-of-service-DRAFT.md?raw';

/** Redirects to /login when Supabase is configured and there's no session.
 * In local beta mode everyone passes through. */
function RequireAuth() {
  const { localMode, user, loading } = useAuth();
  if (loading) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!localMode && !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Authenticated shell: dev banner + bottom nav + persistent log FAB. */
function Shell() {
  const { localMode } = useAuth();
  return (
    <div className="shell">
      {localMode && (
        <p className="dev-banner" role="note">Local beta mode — no Supabase configured</p>
      )}
      <main className="shell-main">
        <Outlet />
      </main>
      <Fab />
      <BottomNav />
    </div>
  );
}

/** Root: send first-timers to onboarding, everyone else home. */
function IndexRoute() {
  const { localMode, user, loading: authLoading } = useAuth();
  const { loading, profile } = useReading();
  if (authLoading || loading) return <div className="page center"><p className="muted">Opening your Codex…</p></div>;
  if (!localMode && !user) return <Navigate to="/login" replace />;
  if (!profile || !profile.onboardingComplete || !profile.birthInput) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to="/home" replace />;
}

function Legal({ title, body }: { title: string; body: string }) {
  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Legal</p>
        <h1>{title}</h1>
      </header>
      <article className="card legal">
        <pre>{body}</pre>
      </article>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route index element={<IndexRoute />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/legal/privacy" element={<Legal title="Privacy Policy (draft)" body={privacyText} />} />
            <Route path="/legal/terms" element={<Legal title="Terms of Service (draft)" body={termsText} />} />
            <Route element={<Shell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/reading" element={<Reading />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/log" element={<Log />} />
              <Route path="/log/new" element={<LogForm />} />
              <Route path="/log/:id" element={<LogEditRoute />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LogEditRoute() {
  const { id } = useParams();
  return <LogForm entryId={id} />;
}
