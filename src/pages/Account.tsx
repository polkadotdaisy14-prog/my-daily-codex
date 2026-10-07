import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { loadProfile, saveProfile, type Profile } from '../lib/profile';
import { isPushSupported, isSubscribed, subscribePush, unsubscribePush } from '../lib/push';
import InstallPrompt from '../components/InstallPrompt';

export default function Account() {
  const { user, localMode, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [tierBusy, setTierBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadProfile(user.id).then(setProfile);
    void isSubscribed().then(setPushOn).catch(() => undefined);
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const togglePush = async () => {
    setPushBusy(true);
    setPushMsg(null);
    try {
      if (pushOn) {
        await unsubscribePush(user.id);
        setPushOn(false);
      } else {
        const ok = await subscribePush(user.id);
        setPushOn(ok);
        if (!ok) setPushMsg('Push is not available in this browser yet.');
      }
    } catch {
      setPushMsg('Could not change the push setting. Try again.');
    } finally {
      setPushBusy(false);
    }
  };

  const toggleTier = async () => {
    if (!profile) return;
    setTierBusy(true);
    try {
      const next: Profile = { ...profile, tier: profile.tier === 'free' ? 'paid' : 'free' };
      await saveProfile(user.id, next);
      setProfile(next);
    } finally {
      setTierBusy(false);
    }
  };

  const b = profile?.birthInput;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Account</p>
        <h1>Settings</h1>
      </header>

      {localMode && (
        <div className="card notice" role="note">
          <strong>Local beta mode</strong>
          <p>No Supabase configured — your profile and log live in this browser only.</p>
        </div>
      )}

      <InstallPrompt />

      <section className="card">
        <h2>Plan</h2>
        <div className="row spread">
          <div>
            <strong>{profile?.tier === 'paid' ? 'Paid' : 'Free'}</strong>
            <p className="muted small">
              {profile?.tier === 'paid'
                ? 'The full explained version is unlocked (beta stub).'
                : 'What\u2019s happening and what to watch — free.'}
            </p>
          </div>
          <button type="button" className="btn ghost" disabled={tierBusy || !profile} onClick={toggleTier}>
            {profile?.tier === 'paid' ? 'Switch to free (beta)' : 'Preview paid (beta)'}
          </button>
        </div>
        <p className="muted small">Paid subscriptions ($3.99/mo via Stripe) land in v2, when the Stripe account is ready.</p>
      </section>

      <section className="card">
        <h2>Birth data</h2>
        {b ? (
          <dl className="kv">
            <div><dt>Date</dt><dd>{b.date}</dd></div>
            <div><dt>Time</dt><dd>{b.timeUnknown ? 'Unknown' : b.time}</dd></div>
            <div><dt>Place</dt><dd>{b.placeLabel}</dd></div>
            <div><dt>Timezone</dt><dd>{b.tz}</dd></div>
            <div><dt>Birth name</dt><dd>{b.fullName?.trim() ? b.fullName : '— not provided —'}</dd></div>
          </dl>
        ) : (
          <p className="muted">No birth data yet.</p>
        )}
        <button type="button" className="btn ghost" onClick={() => navigate('/onboarding')}>
          Re-run onboarding
        </button>
      </section>

      <section className="card">
        <h2>Notifications</h2>
        <div className="row spread">
          <div>
            <strong>Daily reading reminder</strong>
            <p className="muted small">A morning nudge when your Codex is ready. The daily push job ships in v1.5.</p>
          </div>
          <button type="button" className="btn ghost" disabled={pushBusy || !isPushSupported()} onClick={togglePush}>
            {pushOn ? 'Turn off' : 'Turn on'}
          </button>
        </div>
        {!isPushSupported() && <p className="muted small">Push needs HTTPS and a VAPID key (VITE_VAPID_PUBLIC_KEY).</p>}
        {pushMsg && <p className="error">{pushMsg}</p>}
      </section>

      <button
        type="button"
        className="btn ghost danger full"
        onClick={() => {
          void signOut().then(() => navigate('/login', { replace: true }));
        }}
      >
        {localMode ? 'Reset local data' : 'Sign out'}
      </button>
      {localMode && (
        <p className="muted small center">
          In local beta mode this clears the in-memory session; stored data stays in this browser.
        </p>
      )}
    </div>
  );
}
