import { Navigate } from 'react-router-dom';
import { useReading } from '../lib/useReading';
import { BODIES } from '../lib/engine/ephemeris';
import type { GeneKeysChart, GeneKeySphere, HDGate } from '../lib/engine/types';

function CenterChips({ title, centers, tone }: { title: string; centers: string[]; tone: 'defined' | 'open' }) {
  return (
    <div className="chip-group">
      <h3>{title}</h3>
      <div className="chips">
        {centers.length === 0 && <span className="muted small">None</span>}
        {centers.map((c) => (
          <span key={c} className={`chip ${tone}`}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function GateTable({ title, gates }: { title: string; gates: HDGate[] }) {
  return (
    <div className="sub-section">
      <h3>{title}</h3>
      <table className="data">
        <thead>
          <tr><th>Planet</th><th>Gate</th><th>Line</th><th>Center</th></tr>
        </thead>
        <tbody>
          {gates.map((g) => (
            <tr key={g.planet}>
              <td>{g.planet}</td>
              <td>{g.gate}</td>
              <td>{g.line}</td>
              <td>{g.center}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GeneKeySequence({ title, spheres }: { title: string; spheres: GeneKeySphere[] }) {
  return (
    <div className="sub-section">
      <h3>{title}</h3>
      {spheres.map((s) => (
        <div key={s.sphere} className="gk-row">
          <div className="gk-head">
            <strong>{s.sphere}</strong>
            <span className="gk-key">{s.key}.{s.line} · {s.gateName}</span>
          </div>
          <p className="gk-spectrum"><span className="shadow">{s.shadow}</span> → <span className="gift">{s.gift}</span> → <span className="siddhi">{s.siddhi}</span></p>
        </div>
      ))}
    </div>
  );
}

export default function Charts() {
  const { loading, profile, all, error } = useReading();

  if (loading) return <div className="page center"><p className="muted">Loading your charts…</p></div>;
  if (error) return <div className="page center"><p className="error" role="alert">{error}</p></div>;
  if (!profile) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!profile.onboardingComplete || !profile.birthInput) return <Navigate to="/onboarding" replace />;
  if (!all) return <div className="page center"><p className="muted">Computing your charts…</p></div>;

  const natal = all.natal;
  const houseKnown = !natal.missing.includes('birth_time');
  const placementRows = [...BODIES, 'MeanNode'].map((b) => natal.bodies[b]);
  const bodyNames = [...BODIES, 'MeanNode'];
  const gk: GeneKeysChart = all.geneKeys;
  const num = all.numerology;
  const dm = all.destinyMatrix;

  return (
    <div className="page narrow">
      <header className="date-header">
        <p className="eyebrow">My Charts</p>
        <h1>Your five systems</h1>
        <p className="muted small">Recomputed live from your birth data — {natal.meta.placeLabel} · {natal.meta.tz}</p>
      </header>

      <section className="card" aria-label="Astrology">
        <h2>Astrology</h2>
        {!houseKnown && (
          <p className="notice-inline" role="note">
            Birth time unknown — houses and angles can't be computed. Everything else below is complete.
          </p>
        )}
        <table className="data">
          <thead>
            <tr><th>Body</th><th>Sign</th><th>Degree</th><th>House</th><th>Gate</th></tr>
          </thead>
          <tbody>
            {placementRows.map((p, i) => (
              <tr key={bodyNames[i]}>
                <td>{bodyNames[i]}</td>
                <td>{p.sign}{p.retro ? ' ℞' : ''}</td>
                <td>{p.fmt}</td>
                <td>{p.house == null ? '—' : p.house}</td>
                <td>{p.gate}.{p.line}</td>
              </tr>
            ))}
            {natal.angles && (['ASC', 'MC', 'DSC', 'IC'] as const).map((a) => (
              <tr key={a} className="angle-row">
                <td>{a}</td>
                <td>{natal.angles![a].sign}</td>
                <td>{natal.angles![a].fmt}</td>
                <td>{natal.angles![a].house ?? '—'}</td>
                <td>{natal.angles![a].gate}.{natal.angles![a].line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" aria-label="Human Design">
        <h2>Human Design</h2>
        <dl className="kv">
          <div><dt>Type</dt><dd>{all.hd.type}</dd></div>
          <div><dt>Strategy</dt><dd>{all.hd.strategy}</dd></div>
          <div><dt>Authority</dt><dd>{all.hd.authority}</dd></div>
          <div><dt>Profile</dt><dd>{all.hd.profile}</dd></div>
          <div><dt>Definition</dt><dd>{all.hd.definition}</dd></div>
        </dl>
        <CenterChips title="Defined centers" centers={all.hd.definedCenters} tone="defined" />
        <CenterChips title="Undefined centers" centers={all.hd.undefinedCenters} tone="open" />
        <div className="sub-section">
          <h3>Channels ({all.hd.channels.length})</h3>
          <p className="channels">{all.hd.channels.map(([a, b]) => `${a}–${b}`).join(', ') || 'None'}</p>
        </div>
        <GateTable title="Personality" gates={all.hd.personality} />
        <GateTable title="Design" gates={all.hd.design} />
      </section>

      <section className="card" aria-label="Gene Keys">
        <h2>Gene Keys</h2>
        <GeneKeySequence title="Activation Sequence" spheres={gk.activation} />
        <GeneKeySequence title="Venus Sequence" spheres={gk.venus} />
        <GeneKeySequence title="Pearl Sequence" spheres={gk.pearl} />
        <GeneKeySequence title="Star Pearl" spheres={gk.starPearl} />
      </section>

      <section className="card" aria-label="Numerology">
        <h2>Numerology</h2>
        <p className="muted small">Pythagorean school · personal cycles as of {num.asOf}</p>
        <dl className="kv">
          <div><dt>Life Path</dt><dd>{num.dateDerived.lifePath}</dd></div>
          <div><dt>Birthday</dt><dd>{num.dateDerived.birthday}</dd></div>
          <div><dt>Attitude</dt><dd>{num.dateDerived.attitude}</dd></div>
          <div><dt>Personal Year</dt><dd>{num.dateDerived.personalYear}</dd></div>
          <div><dt>Personal Month</dt><dd>{num.dateDerived.personalMonth}</dd></div>
          <div><dt>Personal Day</dt><dd>{num.dateDerived.personalDay}</dd></div>
          <div><dt>Pinnacles</dt><dd>{num.dateDerived.pinnacles.join(' · ')}</dd></div>
          <div><dt>Challenges</dt><dd>{num.dateDerived.challenges.join(' · ')}</dd></div>
        </dl>
        <div className="sub-section">
          <h3>Name-derived numbers</h3>
          {num.nameDerived.awaitingInput ? (
            <p className="notice-inline" role="note">
              Add your birth name to unlock Soul Urge / Expression.
            </p>
          ) : (
            <dl className="kv">
              <div><dt>Expression</dt><dd>{num.nameDerived.expression}</dd></div>
              <div><dt>Soul Urge</dt><dd>{num.nameDerived.soulUrge}</dd></div>
              <div><dt>Personality</dt><dd>{num.nameDerived.personality}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <section className="card" aria-label="Destiny Matrix">
        <h2>Destiny Matrix</h2>
        <dl className="kv">
          {(['A', 'B', 'C', 'D', 'E'] as const).map((k) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{dm[k]} · {dm.names[k]}</dd>
            </div>
          ))}
          <div><dt>Personal Year</dt><dd>{dm.personalYear.value} · {dm.personalYear.name}</dd></div>
        </dl>
      </section>
    </div>
  );
}
