import { Navigate, useNavigate } from 'react-router-dom';
import { useReading } from '../lib/useReading';
import { fmtMD } from '../lib/reading/pipeline';
import InstallPrompt from '../components/InstallPrompt';

function longDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

/** Home = ONE message card. Reads in ~30 seconds. Tap → full reading. */
export default function Home() {
  const { loading, profile, reading, date, error } = useReading();
  const navigate = useNavigate();

  if (loading) return <div className="page center"><p className="muted">Opening your Codex…</p></div>;
  if (error) return <div className="page center"><p className="error" role="alert">{error}</p></div>;
  if (!profile) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!profile.onboardingComplete || !profile.birthInput) return <Navigate to="/onboarding" replace />;
  if (!reading) return <div className="page center"><p className="muted">Building your reading…</p></div>;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Daily Codex</p>
        <h1>{longDate(date)}</h1>
        {reading.quietDay && <p className="quiet-flag">A quiet day</p>}
      </header>

      <InstallPrompt />

      <button type="button" className="message-card" onClick={() => navigate('/reading')} aria-label="Open today's full reading">
        <p className="message-body">{reading.homeMessage}</p>
        <span className="message-cta">Open the full reading →</span>
      </button>

      <p className="footnote">
        Computed {fmtMD(date)} from your birth data · {reading.primary ? `${reading.primary.systems.length} systems in convergence` : 'no strong convergence today'}
      </p>
    </div>
  );
}
