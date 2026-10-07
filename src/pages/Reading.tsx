import { Navigate } from 'react-router-dom';
import { useReading } from '../lib/useReading';
import { fmtMD, type ThemeResult } from '../lib/reading/pipeline';
import PaywallGate from '../components/PaywallGate';

function ThemeCard({ theme, primary }: { theme: ThemeResult; primary: boolean }) {
  return (
    <section className={`card theme${primary ? ' primary-theme' : ''}`} aria-label={theme.name}>
      <p className="eyebrow">{primary ? 'Primary convergence' : 'Secondary convergence'}</p>
      <h2>{theme.name}</h2>
      <p className="weather">{theme.weather}</p>
      <p>{theme.phenomenon}</p>
      {theme.landings.length > 0 && (
        <div className="landings">
          <h3>Where it lands in you</h3>
          <ul>
            {theme.landings.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="manifest">
        <h3>Watch for</h3>
        <ul>
          {theme.manifestations.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
      <p className="systems-line">
        Converging systems: {theme.systems.join(' · ')}
      </p>
      {theme.geneKeyNotes.length > 0 && (
        <div className="genekeys">
          <h3>Gene Keys resonance</h3>
          <ul>
            {theme.geneKeyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PaidExplained({ tier }: { tier: 'free' | 'paid' }) {
  if (tier === 'paid') {
    return (
      <>
        <section className="card">
          <h2>Why this is primary</h2>
          <p className="muted">Paid-tier deep dive — beta stub. Selection criteria, candidate ranking, and excluded inputs will be explained here.</p>
        </section>
        <section className="card">
          <h2>Reinforces &amp; complicates</h2>
          <p className="muted">Paid-tier detail — beta stub. What strengthens and what complicates each theme.</p>
        </section>
        <section className="card">
          <h2>Evidence chain</h2>
          <p className="muted">Paid-tier detail — beta stub. Data → translation → landing → relationships → phenomenon → manifestations.</p>
        </section>
        <section className="card">
          <h2>Technical</h2>
          <p className="muted">Paid-tier detail — beta stub. Astrological contacts, HD activations, transit dates.</p>
        </section>
      </>
    );
  }
  return (
    <>
      <PaywallGate title="Why this is primary" />
      <PaywallGate title="Reinforces & complicates" />
      <PaywallGate title="Evidence chain" />
      <PaywallGate title="Technical" />
    </>
  );
}

export default function Reading() {
  const { loading, profile, reading, date, error } = useReading();

  if (loading) return <div className="page center"><p className="muted">Building your reading…</p></div>;
  if (error) return <div className="page center"><p className="error" role="alert">{error}</p></div>;
  if (!profile) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!profile.onboardingComplete || !profile.birthInput) return <Navigate to="/onboarding" replace />;
  if (!reading) return <div className="page center"><p className="muted">Building your reading…</p></div>;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Full reading · {fmtMD(date)}</p>
        <h1>What's happening</h1>
      </header>

      <section className="card" aria-label="Today's transits">
        <h2>Today's transits</h2>
        <ul className="astro-lines">
          {reading.astroLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      {reading.quietDay && (
        <section className="card quiet">
          <h2>A quiet day</h2>
          <p>No single pattern dominates today — nothing in your chart is being strongly activated by more than one system at once. Treat today as open field.</p>
        </section>
      )}

      {reading.primary && <ThemeCard theme={reading.primary} primary />}
      {reading.secondaries.map((s) => (
        <ThemeCard key={s.family} theme={s} primary={false} />
      ))}

      <section className="card observation" aria-label="Field observation">
        <p className="eyebrow">Field observation</p>
        <p className="observation-text">{reading.observationPrompt}</p>
      </section>

      <PaidExplained tier={profile.tier} />
    </div>
  );
}
