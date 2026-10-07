import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { deleteEntry, getEntry, getEntryForDate, listEntries, saveEntry, ASSESSMENT_OPTIONS, type Assessment, type LogEntry } from '../lib/log';
import { useReading } from '../lib/useReading';
import { fmtMD } from '../lib/reading/pipeline';

/** Log list — newest first, editable. */
export default function Log() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    listEntries(user.id)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load entries.'))
      .finally(() => setLoading(false));
  }, [user]);

  const remove = async (id: string) => {
    if (!user || !window.confirm('Delete this entry?')) return;
    try {
      await deleteEntry(user.id, id);
      setEntries((es) => es.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the entry.');
    }
  };

  const assessmentLabel = (a: string) => ASSESSMENT_OPTIONS.find((o) => o.value === a)?.label ?? a;

  if (loading) return <div className="page center"><p className="muted">Loading your log…</p></div>;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Pattern Log</p>
        <h1>Field notes</h1>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="button" className="btn primary full" onClick={() => navigate('/log/new')}>
        New entry for today
      </button>

      {entries.length === 0 && (
        <p className="muted center">No entries yet. Your observations live here — newest first.</p>
      )}

      <ul className="log-list">
        {entries.map((e) => (
          <li key={e.id} className="card log-entry">
            <div className="log-head">
              <strong>{fmtMD(e.log_date)}</strong>
              {e.assessment && <span className="chip">{assessmentLabel(e.assessment)}</span>}
            </div>
            {e.what_occurred && <p>{e.what_occurred}</p>}
            <div className="row">
              <Link className="btn ghost" to={`/log/${e.id}`}>Edit</Link>
              <button type="button" className="btn ghost danger" onClick={() => void remove(e.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Entry form — used for /log/new and /log/:id. Fields in the mandated order. */
export function LogForm({ entryId }: { entryId?: string }) {
  const { user } = useAuth();
  const { reading, date } = useReading();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<LogEntry | null>(null);
  const [loaded, setLoaded] = useState(!entryId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logDate, setLogDate] = useState(date);
  const [what, setWhat] = useState('');
  const [competing, setCompeting] = useState('');
  const [meaning, setMeaning] = useState('');
  const [assessment, setAssessment] = useState<Assessment | ''>('');

  useEffect(() => {
    if (!user || !entryId) return;
    getEntry(user.id, entryId)
      .then((e) => {
        if (e) {
          setExisting(e);
          setLogDate(e.log_date);
          setWhat(e.what_occurred);
          setCompeting(e.competing_explanation);
          setMeaning(e.personal_meaning);
          setAssessment(e.assessment);
        }
      })
      .catch((er) => setError(er instanceof Error ? er.message : 'Could not load the entry.'))
      .finally(() => setLoaded(true));
  }, [user, entryId]);

  // for a new entry, prefill today's existing draft if one exists
  useEffect(() => {
    if (!user || entryId || !loaded) return;
    void getEntryForDate(user.id, date).then((e) => {
      if (e) {
        setExisting(e);
        setWhat(e.what_occurred);
        setCompeting(e.competing_explanation);
        setMeaning(e.personal_meaning);
        setAssessment(e.assessment);
      }
    });
  }, [user, entryId, loaded, date]);

  const prompt = existing?.observation_prompt || reading?.observationPrompt || '';

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveEntry(user.id, {
        id: existing?.id,
        log_date: logDate,
        observation_prompt: prompt,
        what_occurred: what.trim(),
        competing_explanation: competing.trim(),
        personal_meaning: meaning.trim(),
        assessment,
      });
      navigate('/log', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the entry.');
      setSaving(false);
    }
  };

  if (!loaded) return <div className="page center"><p className="muted">Loading…</p></div>;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">Pattern Log</p>
        <h1>{existing ? 'Edit entry' : 'New entry'}</h1>
      </header>

      {prompt && (
        <section className="card observation" aria-label="Today's observation prompt">
          <p className="eyebrow">Today's observation prompt</p>
          <p className="observation-text">{prompt}</p>
        </section>
      )}

      <div className="stack">
        <label className="field">
          <span>Date</span>
          <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
        </label>
        <label className="field">
          <span>What occurred</span>
          <textarea rows={4} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="What did you actually notice today?" />
        </label>
        <label className="field">
          <span>Competing explanation</span>
          <textarea rows={3} value={competing} onChange={(e) => setCompeting(e.target.value)} placeholder="What else could explain what you noticed?" />
        </label>
        <label className="field">
          <span>Personal meaning <em>(optional)</em></span>
          <textarea rows={3} value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="What does it mean to you, if anything?" />
        </label>
        <label className="field">
          <span>Assessment</span>
          <select value={assessment} onChange={(e) => setAssessment(e.target.value as Assessment | '')}>
            <option value="">Choose…</option>
            {ASSESSMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => navigate('/log')}>Cancel</button>
          <button type="button" className="btn primary grow" disabled={saving || !logDate} onClick={save}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
