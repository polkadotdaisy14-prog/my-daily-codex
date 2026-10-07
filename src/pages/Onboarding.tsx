import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { loadProfile, saveProfile, type Profile } from '../lib/profile';
import { computeAllCharts } from '../lib/engine/charts';
import { geocodePlace, tzForLatLon, type GeoResult } from '../lib/engine/geo';
import { todayYMD } from '../lib/reading/pipeline';
import type { AllCharts, BirthInput } from '../lib/engine/types';

const STEPS = ['Birth date', 'Birth time', 'Birth name', 'Birth place', 'Confirm'];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [fullName, setFullName] = useState('');

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeoResult[]>([]);
  const [place, setPlace] = useState<GeoResult | null>(null);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const [computed, setComputed] = useState<AllCharts | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadProfile(user.id).then((p) => setProfile(p));
  }, [authLoading, user]);

  const tz = useMemo(
    () => (place ? tzForLatLon(place.lat, place.lon) : null),
    [place],
  );

  const birthInput: BirthInput | null = useMemo(() => {
    if (!date || !place || !tz) return null;
    return {
      date,
      time: timeUnknown ? null : time || null,
      timeUnknown,
      tz,
      lat: place.lat,
      lon: place.lon,
      placeLabel: place.label,
      fullName: fullName.trim() ? fullName.trim() : undefined,
    };
  }, [date, time, timeUnknown, fullName, place, tz]);

  // debounced place search (~300ms)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = placeQuery.trim();
    if (q.length < 2 || place) {
      setPlaceResults([]);
      return;
    }
    setPlaceBusy(true);
    setPlaceError(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await geocodePlace(q);
        setPlaceResults(results);
        setDropdownOpen(true);
        if (results.length === 0) setPlaceError('No places found — try a nearby city.');
      } catch {
        setPlaceError('Place search is unavailable right now (Nominatim rate limit). Wait a moment and try again.');
        setPlaceResults([]);
      } finally {
        setPlaceBusy(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [placeQuery, place]);

  // "Computing your charts…" step
  useEffect(() => {
    if (step !== 4 || !birthInput || computed || computeError) return;
    const t = window.setTimeout(() => {
      try {
        setComputed(computeAllCharts(birthInput, todayYMD()));
        setStep(5);
      } catch (e) {
        setComputeError(e instanceof Error ? e.message : 'Could not compute your charts.');
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [step, birthInput, computed, computeError]);

  if (authLoading) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboardingComplete) return <Navigate to="/home" replace />;

  const canNext = (): boolean => {
    if (step === 0) return date.length === 10;
    if (step === 1) return timeUnknown || time.length === 5;
    if (step === 2) return true;
    if (step === 3) return place !== null || placeResults.length === 1;
    return false;
  };

  // On the place step, a single unambiguous result is accepted as the selection.
  const handleContinue = () => {
    if (step === 3 && !place && placeResults.length === 1) {
      setPlace(placeResults[0]);
    }
    setStep(step + 1);
  };

  const confirm = async () => {
    if (!birthInput || !user) return;
    setComputeError(null);
    setSaving(true);
    try {
      const next: Profile = { tier: profile?.tier ?? 'free', birthInput, onboardingComplete: true };
      await saveProfile(user.id, next);
      navigate('/home', { replace: true });
    } catch (e) {
      setComputeError(e instanceof Error ? e.message : 'Could not save your profile.');
      setSaving(false);
    }
  };

  return (
    <div className="page narrow">
      <ol className="steps" aria-label="Onboarding progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === Math.min(step, 4) ? 'active' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="dot" />
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="stack">
          <h1>When were you born?</h1>
          <p className="muted">Your birth date anchors every calculation in your Codex.</p>
          <label className="field">
            <span>Birth date</span>
            <input type="date" required value={date} max={todayYMD()} onChange={(e) => setDate(e.target.value)} />
          </label>
        </section>
      )}

      {step === 1 && (
        <section className="stack">
          <h1>What time were you born?</h1>
          <p className="muted">Birth time sets your houses and angles. If you don't know it, that's fine — everything else still computes.</p>
          <label className="field">
            <span>Birth time (local to your birthplace)</span>
            <input type="time" value={time} disabled={timeUnknown} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="toggle prominent">
            <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
            <span className="toggle-label">I don't know my birth time</span>
          </label>
          {timeUnknown && (
            <p className="note">Without a birth time, houses and angles can't be computed. Placements, Human Design, Gene Keys, numerology, and the Destiny Matrix all still work.</p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <h1>What's your full birth name?</h1>
          <label className="field">
            <span>
              Full birth name — used for your numerology profile (Soul Urge, Expression, etc.) <em>(optional)</em>
            </span>
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. Jordan Lee Ellis"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <p className="note">Only used to compute your numerology numbers. You can add it later.</p>
        </section>
      )}

      {step === 3 && (
        <section className="stack">
          <h1>Where were you born?</h1>
          <p className="muted">Start typing and pick your birthplace from the list.</p>
          <div className="field autocomplete">
            <span>Birth place</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="City, State/Region, Country"
              value={place ? place.label : placeQuery}
              onChange={(e) => {
                setPlace(null);
                setPlaceQuery(e.target.value);
              }}
              onFocus={() => placeResults.length > 0 && setDropdownOpen(true)}
              aria-expanded={dropdownOpen}
              role="combobox"
            />
            {placeBusy && <p className="muted small">Searching…</p>}
            {placeError && <p className="error" role="alert">{placeError}</p>}
            {dropdownOpen && placeResults.length > 0 && (
              <ul className="dropdown" role="listbox">
                {placeResults.map((r, i) => (
                  <li key={`${r.lat},${r.lon},${i}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => {
                        setPlace(r);
                        setDropdownOpen(false);
                        setPlaceError(null);
                      }}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {place && tz && (
            <p className="note">Selected: {place.label}<br />Timezone: {tz}</p>
          )}
          {!place && !placeBusy && placeResults.length > 1 && (
            <p className="note">Tap a suggestion above to select your birthplace.</p>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="stack center">
          <div className="spinner" aria-hidden="true" />
          <h1>Computing your charts…</h1>
          <p className="muted">Ephemeris, gates, numbers, and arcana — all on your device.</p>
          {computeError && (
            <>
              <p className="error" role="alert">{computeError}</p>
              <button type="button" className="btn ghost" onClick={() => { setComputeError(null); setStep(3); }}>
                Back to birth place
              </button>
            </>
          )}
        </section>
      )}

      {step === 5 && computed && birthInput && (
        <section className="stack">
          <h1>Is this your chart?</h1>
          <div className="card">
            <dl className="kv">
              <div><dt>Sun</dt><dd>{computed.natal.bodies.Sun.fmt}</dd></div>
              <div><dt>Moon</dt><dd>{computed.natal.bodies.Moon.fmt}</dd></div>
              <div><dt>Rising</dt><dd>{computed.natal.angles ? computed.natal.angles.ASC.fmt : '— unknown —'}</dd></div>
              <div><dt>Mercury</dt><dd>{computed.natal.bodies.Mercury.fmt}</dd></div>
              <div><dt>Venus</dt><dd>{computed.natal.bodies.Venus.fmt}</dd></div>
              <div><dt>Mars</dt><dd>{computed.natal.bodies.Mars.fmt}</dd></div>
              {computed.natal.angles && (
                <>
                  <div><dt>ASC</dt><dd>{computed.natal.angles.ASC.fmt}</dd></div>
                  <div><dt>MC</dt><dd>{computed.natal.angles.MC.fmt}</dd></div>
                </>
              )}
            </dl>
          </div>
          {computed.natal.missing.includes('birth_time') && (
            <div className="card notice" role="note">
              <strong>Birth time unknown</strong>
              <p>Houses and angles can't be computed. Everything else below is complete.</p>
            </div>
          )}
          {computed.numerology.nameDerived.awaitingInput && (
            <div className="card notice" role="note">
              <strong>Name-derived numbers pending</strong>
              <p>Add your birth name later to unlock Soul Urge / Expression.</p>
            </div>
          )}
          <button type="button" className="btn primary full" disabled={saving} onClick={confirm}>
            {saving ? 'Saving…' : 'Yes — this is my chart'}
          </button>
          {computeError && (
            <p className="error" role="alert">{computeError}</p>
          )}
          <button type="button" className="btn ghost full" onClick={() => { setComputed(null); setStep(0); }}>
            Start over
          </button>
        </section>
      )}

      {step < 4 && (
        <div className="row sticky-bottom">
          {step > 0 && (
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button type="button" className="btn primary grow" disabled={!canNext()} onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
