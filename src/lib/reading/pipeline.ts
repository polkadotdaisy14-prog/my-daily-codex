/* Daily reading pipeline.
 *
 * Layers (kept distinct by design):
 *   astronomical fact  → contacts (transit→natal aspects w/ orbs + exact dates),
 *                          transit gates, sky snapshot
 *   system reading     → the 12 theme families, tagged independently by each of
 *                          four systems (astrology, Human Design, numerology,
 *                          destiny matrix); Gene Keys never tags — it enriches
 *                          convergent gates with shadow → gift → siddhi
 *   synthesis          → convergence = a family tagged by ≥2 DISTINCT systems;
 *                          PRIMARY + ≤2 secondaries; phenomenon composed from
 *                          the actual contacts + landings, never from keywords
 *   field observation  → an invitation to notice the phenomenon, never to
 *                          confirm a transit
 *
 * Symbolic systems are treated as interpretive lenses, never as proven causal
 * mechanisms. Missing data (unknown birth time) is surfaced, never filled.
 */
import { aspectsToNatal, dailySky } from '../engine/charts';
import { wholeSignHouse } from '../engine/ephemeris';
import { CHANNELS, GATE_TO_CENTER } from '../engine/symbolic';
import type { AllCharts, BirthInput, TransitContact } from '../engine/types';

/* ------------------------------------------------------------------ */
/* 12 theme families — names + curated prose verbatim from the ontology */
/* ------------------------------------------------------------------ */

export type FamilyKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface FamilyDef {
  name: string;
  weather: string;
  pattern: string;
}

export const FAMILIES: Record<FamilyKey, FamilyDef> = {
  1: {
    name: 'IDENTITY / SELF-DEFINITION',
    weather: 'Attention is on how you define yourself right now.',
    pattern:
      "Identity isn't being decided today — it's being lit up. Notice which version of you gets illuminated.",
  },
  2: {
    name: 'EMOTIONAL WEATHER',
    weather: 'The emotional field is louder than usual.',
    pattern:
      'Feelings today are weather, not verdicts — especially with an open Solar Plexus, intensity may be borrowed.',
  },
  3: {
    name: 'MIND / MEANING',
    weather: 'Mental activity is foregrounded.',
    pattern:
      "The mind wants to resolve something today. With an open Ajna, watch for adopting other people's certainties.",
  },
  4: {
    name: 'ENERGY / RESPONSE',
    weather: 'Life-force and frustration signals are up.',
    pattern:
      "As a Generator with sacral authority, today's data is in your gut response, not your to-do list.",
  },
  5: {
    name: 'RELATIONSHIP / OTHER',
    weather: 'The relational field is active.',
    pattern:
      "Bonds, bargains, and boundaries are in the foreground — notice the deals you're implicitly making.",
  },
  6: {
    name: 'STRUCTURE / LIMIT / TIME',
    weather: 'Constraint is the teacher today.',
    pattern: 'Limits showing up now are information about form, not verdicts on worth.',
  },
  7: {
    name: 'EXPANSION / BELIEF',
    weather: 'The horizon is widening.',
    pattern:
      'Something wants to get bigger — a story, a plan, a belief. Check whether the expansion is real or just louder.',
  },
  8: {
    name: 'DISRUPTION / CHANGE',
    weather: 'The pattern-interrupt is on.',
    pattern: "Change today is mutation, not improvement — it won't ask permission.",
  },
  9: {
    name: 'DISSOLUTION / DREAM',
    weather: 'Boundaries are soft.',
    pattern: 'Clarity and confusion are hard to tell apart today — treat both as data.',
  },
  10: {
    name: 'DEPTH / POWER',
    weather: 'Something deep is moving.',
    pattern: "Pluto transits don't create intensity; they reveal where it already lives.",
  },
  11: {
    name: 'DIRECTION / PATH',
    weather: 'The compass is being recalibrated.',
    pattern: 'Direction questions are louder than destination answers today.',
  },
  12: {
    name: 'TENSION / INITIATION',
    weather: "There's grit in the gears.",
    pattern: 'Friction today is diagnostic — it shows where energy meets structure.',
  },
};

export type SystemName = 'Astrology' | 'Human Design' | 'Numerology' | 'Destiny Matrix';

interface Tag {
  system: SystemName;
  family: FamilyKey;
  weight: number;
  evidence: string; // precise (may carry specialist terms — paid Technical layer)
  contact: TransitContact | null;
  orb: number | null; // tightest orb backing this tag
}

export interface ThemeResult {
  family: FamilyKey;
  name: string;
  weather: string;
  phenomenon: string; // plain language, composed from actual contacts/landings
  landings: string[];
  manifestations: string[];
  systems: SystemName[];
  contacts: TransitContact[];
  evidence: string[]; // precise evidence lines
  geneKeyNotes: string[]; // shadow → gift → siddhi enrichment
}

export interface DailyReading {
  date: string;
  quietDay: boolean;
  homeMessage: string;
  primary: ThemeResult | null;
  secondaries: ThemeResult[];
  astroLines: string[];
  observationPrompt: string;
}

/* ----------------------------- helpers ----------------------------- */

export function todayYMD(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtMD(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Plain-language house domains — no unexplained jargon. */
const HOUSE_DOMAINS: Record<number, string> = {
  1: 'how you show up', 2: 'money and resources', 3: 'thinking and communication',
  4: 'home and roots', 5: 'creativity and play', 6: 'work and daily routines',
  7: 'partnerships', 8: 'shared resources and depth', 9: 'beliefs and horizons',
  10: 'career and public role', 11: 'community and friendships', 12: 'rest and the unseen',
};

const TARGET_LABELS: Record<string, string> = {
  ASC: 'Ascendant', MC: 'Midheaven', DSC: 'Descendant', IC: 'Imum Coeli',
};

function targetLabel(name: string): string {
  return TARGET_LABELS[name] ?? name;
}

const ASPECT_PLAIN: Record<TransitContact['aspect'], string> = {
  conjunction: 'a conjunction with',
  sextile: 'a sextile with',
  square: 'a square with',
  trine: 'a trine with',
  opposition: 'an opposition with',
};

/* --------------------------- family mapping --------------------------- */

/** Transit body → primary family. */
const BODY_FAMILY: Record<string, FamilyKey> = {
  Sun: 1, Moon: 2, Mercury: 3, Venus: 5, Mars: 4,
  Jupiter: 7, Saturn: 6, Uranus: 8, Neptune: 9, Pluto: 10,
};

/** HD center → family. */
const CENTER_FAMILY: Record<string, FamilyKey> = {
  Throat: 1, G: 1, Heart: 10, 'Solar Plexus': 2, Sacral: 4,
  Spleen: 3, Root: 12, Head: 3, Ajna: 3,
};

/** Personal-cycle number → family (1 beginnings/identity … 9 completion). */
const NUMBER_FAMILY: Record<number, FamilyKey> = {
  1: 1, 2: 5, 3: 1, 4: 6, 5: 8, 6: 6, 7: 3, 8: 10, 9: 9,
  11: 5, 22: 6, 33: 6,
};

const NUMBER_MEANING: Record<number, string> = {
  1: 'beginnings and identity', 2: 'balance and relationship', 3: 'expression and visibility',
  4: 'structure and work', 5: 'change and freedom', 6: 'home and responsibility',
  7: 'reflection', 8: 'power', 9: 'completion and release',
  11: 'intuition and balance', 22: 'masterful structure', 33: 'devoted responsibility',
};

/** Destiny-matrix personal-year arcana → nearest family. */
const ARCANA_FAMILY: Record<number, FamilyKey> = {
  1: 1, 2: 9, 3: 5, 4: 6, 5: 7, 6: 5, 7: 11, 8: 6, 9: 3,
  10: 8, 11: 10, 12: 9, 13: 8, 14: 6, 15: 10, 16: 8, 17: 7,
  18: 2, 19: 1, 20: 11, 21: 9, 22: 8,
};

/* ------------------------------ tagging ------------------------------ */

function tagAstro(all: AllCharts, contacts: TransitContact[], tags: Tag[]): void {
  const houseKnown = all.natal.ascLon != null;
  for (const c of contacts) {
    const base = BODY_FAMILY[c.transitBody];
    if (!base) continue;
    const w = c.orb <= 1.5 ? 2 : c.orb <= 3 ? 1.5 : 1;
    const exact = c.exactDate ? ` — exact ${fmtMD(c.exactDate)}` : '';
    const dir = c.applying ? 'closing in on' : 'moving away from';
    tags.push({
      system: 'Astrology', family: base, weight: w,
      evidence: `The ${c.transitBody} is ${dir} ${ASPECT_PLAIN[c.aspect]} your natal ${targetLabel(c.natalTarget)} (orb ${c.orb.toFixed(1)}°${exact})`,
      contact: c, orb: c.orb,
    });
    // ontology triggers
    if (['Sun', 'ASC', 'MC'].includes(c.natalTarget)) {
      tags.push({ system: 'Astrology', family: 1, weight: 1, evidence: `Transit touches your ${targetLabel(c.natalTarget)} — an identity point`, contact: c, orb: c.orb });
    }
    if (c.transitBody === 'Moon' || c.natalTarget === 'Moon') {
      tags.push({ system: 'Astrology', family: 2, weight: 1, evidence: 'Moon contact — emotional weather is activated', contact: c, orb: c.orb });
    }
    if (
      (c.aspect === 'square' || c.aspect === 'opposition') &&
      ['Mars', 'Saturn', 'Uranus'].some((b) => b === c.transitBody || b === c.natalTarget)
    ) {
      tags.push({ system: 'Astrology', family: 12, weight: 1.5, evidence: `Hard ${c.aspect} involving ${c.transitBody}/${c.natalTarget} — friction is diagnostic`, contact: c, orb: c.orb });
    }
    if (houseKnown) {
      const h = wholeSignHouse(c.transitLon, all.natal.ascLon as number);
      const houseFam: Partial<Record<number, FamilyKey>> = { 7: 5, 9: 7, 12: 9, 8: 10 };
      const f = houseFam[h];
      if (f) {
        tags.push({ system: 'Astrology', family: f, weight: 1, evidence: `The ${c.transitBody} is moving through your ${ordinal(h)} house (${HOUSE_DOMAINS[h]})`, contact: c, orb: c.orb });
      }
    }
    const watery = ['Cancer', 'Scorpio', 'Pisces'];
    const sign = signOfLon(c.transitLon);
    if (watery.includes(sign)) {
      tags.push({ system: 'Astrology', family: 2, weight: 0.75, evidence: `The ${c.transitBody} is moving through watery ${sign} — emotional undercurrent`, contact: c, orb: c.orb });
    }
    if (sign === 'Pisces') {
      tags.push({ system: 'Astrology', family: 9, weight: 0.75, evidence: `The ${c.transitBody} in Pisces — boundaries soften`, contact: c, orb: c.orb });
    }
    if (sign === 'Scorpio') {
      tags.push({ system: 'Astrology', family: 10, weight: 0.75, evidence: `The ${c.transitBody} in Scorpio — depth themes surface`, contact: c, orb: c.orb });
    }
  }
}

/* Minimal local sign lookup to avoid an extra import cycle. */
function signOfLon(lon: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[Math.floor((((lon % 360) + 360) % 360) / 30)];
}

interface HDEvent {
  body: string;
  gate: number;
  kind: 'completing' | 'amplification' | 'conditioning';
  detail: string;
}

function tagHD(all: AllCharts, dateYMD: string, tags: Tag[], hdEvents: HDEvent[]): void {
  const { bodies } = dailySky(dateYMD, all.natal.meta.tz);
  const natalGates = new Set([...all.hd.personality, ...all.hd.design].map((g) => g.gate));
  const seenChannel = new Set<string>();
  const seenCenter = new Set<string>();

  for (const tb of bodies) {
    // completed channels: transit gate + a natal gate form a full channel
    for (const [a, b] of CHANNELS) {
      const partner = a === tb.gate ? b : b === tb.gate ? a : null;
      if (partner == null || !natalGates.has(partner)) continue;
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (seenChannel.has(key)) continue;
      seenChannel.add(key);
      const centers: string[] = [GATE_TO_CENTER[a], GATE_TO_CENTER[b]];
      const fam = CENTER_FAMILY[centers[0]] ?? CENTER_FAMILY[centers[1]];
      const detail = `Gate ${tb.gate} (today's ${tb.body}) completes channel ${a}–${b} with your natal Gate ${partner}`;
      hdEvents.push({ body: tb.body, gate: tb.gate, kind: 'completing', detail });
      if (fam) {
        tags.push({ system: 'Human Design', family: fam, weight: 2, evidence: detail, contact: null, orb: null });
      }
    }
    // amplification (defined center) vs conditioning (undefined center)
    const cKey = `${tb.center}:${all.hd.definedCenters.includes(tb.center) ? 'd' : 'u'}`;
    if (!seenCenter.has(cKey)) {
      seenCenter.add(cKey);
      const defined = all.hd.definedCenters.includes(tb.center);
      const fam = CENTER_FAMILY[tb.center];
      const kind = defined ? 'amplification' : 'conditioning';
      const detail = `Today's ${tb.body} activates Gate ${tb.gate} in your ${defined ? 'defined' : 'undefined'} ${tb.center} center — ${defined ? 'amplification of your own signal' : 'conditioning from the field'}`;
      hdEvents.push({ body: tb.body, gate: tb.gate, kind, detail });
      if (fam) {
        tags.push({ system: 'Human Design', family: fam, weight: defined ? 1 : 0.75, evidence: detail, contact: null, orb: null });
      }
    }
  }
}

function tagNumerology(all: AllCharts, tags: Tag[]): void {
  const dd = all.numerology.dateDerived;
  const trio: [string, number][] = [
    ['Personal Day', dd.personalDay],
    ['Personal Month', dd.personalMonth],
    ['Personal Year', dd.personalYear],
  ];
  const counts = new Map<FamilyKey, number>();
  for (const [, n] of trio) {
    const f = NUMBER_FAMILY[n];
    if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  for (const [f, count] of counts) {
    const parts = trio
      .filter(([, n]) => NUMBER_FAMILY[n] === f)
      .map(([label, n]) => `${label} ${n} (${NUMBER_MEANING[n] ?? ''})`)
      .join(', ');
    tags.push({
      system: 'Numerology', family: f, weight: count,
      evidence: parts, contact: null, orb: null,
    });
  }
}

function tagDestiny(all: AllCharts, tags: Tag[]): void {
  const py = all.destinyMatrix.personalYear;
  const f = ARCANA_FAMILY[py.value];
  if (!f) return;
  tags.push({
    system: 'Destiny Matrix', family: f, weight: 2,
    evidence: `Personal-year arcana: ${py.name} (${py.value})`,
    contact: null, orb: null,
  });
}

/* --------------------------- composition --------------------------- */

function landingFor(all: AllCharts, c: TransitContact): string {
  const angle = all.natal.angles?.[c.natalTarget as 'ASC' | 'MC' | 'DSC' | 'IC'];
  const body = all.natal.bodies[c.natalTarget];
  const p = angle ?? body;
  if (!p) return `${targetLabel(c.natalTarget)} (not in your chart)`;
  const label = targetLabel(c.natalTarget);
  if (p.house == null) return `${label} in ${p.sign} (house unknown — birth time not provided)`;
  return `${label} in ${p.sign} in the ${ordinal(p.house)}`;
}

function contactClause(c: TransitContact | null): string {
  if (!c) return '';
  const dir = c.applying ? 'is closing in on' : 'is moving away from';
  const exact = c.exactDate ? ` (exact ${fmtMD(c.exactDate)})` : '';
  return `${c.transitBody} ${dir} your ${targetLabel(c.natalTarget)}${exact}`;
}

/** Plain-language phenomenon per family, filled with the actual signals. */
function composePhenomenon(
  f: FamilyKey,
  all: AllCharts,
  first: TransitContact | null,
): string {
  const def = FAMILIES[f];
  const clause = contactClause(first);
  const spOpen = all.hd.undefinedCenters.includes('Solar Plexus');
  const ajnaOpen = all.hd.undefinedCenters.includes('Ajna');
  const sacralAuth = all.hd.authority.toLowerCase().includes('sacral');
  const isGenerator = all.hd.type === 'Generator' || all.hd.type === 'Manifesting Generator';

  switch (f) {
    case 1:
      return `${def.pattern}${clause ? ` ${clause}, so` : ''} attention keeps landing on how you define yourself. Which self-description feels most alive today — and which feels like a costume?`;
    case 2:
      return `${spOpen ? 'Feelings today are weather, not verdicts — intensity in the room may be borrowed rather than yours.' : 'Feelings run strong and close to the surface today; treat them as weather, not verdicts.'}${clause ? ` ${clause}.` : ''} Is this feeling mine, or am I amplifying the room?`;
    case 3:
      return `${clause ? `${clause} — ` : ''}the mind wants to resolve something today.${ajnaOpen ? ' Watch for adopting other people\u2019s certainties as your own.' : ''} What are you trying to figure out before you have the information?`;
    case 4:
      return `${def.weather}${clause ? ` ${clause}.` : ''}${isGenerator && sacralAuth ? " Today's data is in your gut response, not your to-do list." : ''} What gave you energy today versus what drained it?`;
    case 5:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What unspoken agreement is shaping an interaction today?`;
    case 6:
      return `${def.pattern}${clause ? ` ${clause} —` : ''} constraint is the teacher today. What limitation is asking for a better container rather than more effort?`;
    case 7:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What are you telling a bigger story about than the facts support?`;
    case 8:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What routine cracked today, and what got in through the crack?`;
    case 9:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What are you romanticizing, and what are you refusing to see?`;
    case 10:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What are you pretending not to know?`;
    case 11:
      return `${def.pattern}${clause ? ` ${clause}.` : ''} What direction feels correct even though you can't justify it yet?`;
    case 12:
      return `${def.pattern}${clause ? ` ${clause} —` : ''} friction is diagnostic. Where is the friction actually pointing?`;
  }
}

/** One concrete manifestation per family — plain language, chart-specific. */
function composeManifestation(f: FamilyKey, _c: TransitContact | null): string {
  switch (f) {
    case 1:
      return `You catch yourself rehearsing how to introduce yourself — notice which version of you comes out first.`;
    case 2:
      return `Your mood shifts noticeably with the room you're in; check who was there when it changed.`;
    case 3:
      return `A conversation or message replays on a loop — catch the exact sentence your mind repeats.`;
    case 4:
      return `A small task either flies or feels like wading through mud; your gut knew which before you started.`;
    case 5:
      return `You soften a boundary to keep the peace — note what it costs you an hour later.`;
    case 6:
      return `A rule, deadline, or budget pushes back; describe its shape precisely before trying to solve it.`;
    case 7:
      return `A plan quietly doubles in scope — pause and check whether the bigger version is real or just louder.`;
    case 8:
      return `Something you counted on changes without warning; note one thing it displaced.`;
    case 9:
      return `A situation feels either magical or muddled and you can't tell which — hold both readings for now.`;
    case 10:
      return `You notice yourself gripping for control (or being gripped) — name what it was protecting.`;
    case 11:
      return `A "where am I headed" question surfaces that you can't answer yet — let it stay a question.`;
    case 12:
      return `Irritation spikes over something small — pause 60 seconds and name the unmet need underneath.`;
  }
}

/** Gene Keys enrichment: convergent gates that sit in the user's sequences. */
function geneKeyNotesFor(all: AllCharts, hdEvents: HDEvent[]): string[] {
  const seq = [...all.geneKeys.activation, ...all.geneKeys.venus, ...all.geneKeys.pearl, ...all.geneKeys.starPearl];
  const byGate = new Map<number, { sphere: string; shadow: string; gift: string; siddhi: string }>();
  for (const s of seq) {
    if (!byGate.has(s.key)) byGate.set(s.key, { sphere: s.sphere, shadow: s.shadow, gift: s.gift, siddhi: s.siddhi });
  }
  const notes: string[] = [];
  const seen = new Set<number>();
  for (const e of hdEvents) {
    if (e.kind !== 'completing') continue;
    const gk = byGate.get(e.gate);
    if (gk && !seen.has(e.gate)) {
      seen.add(e.gate);
      notes.push(`Gate ${e.gate} — your ${gk.sphere} key: ${gk.shadow} → ${gk.gift} → ${gk.siddhi}`);
    }
  }
  return notes.slice(0, 3);
}

/* ------------------------------ pipeline ------------------------------ */

export interface FamilyScore {
  family: FamilyKey;
  systems: SystemName[];
  weight: number;
  tightestOrb: number;
  tags: Tag[];
}

interface Analysis {
  contacts: TransitContact[];
  tags: Tag[];
  hdEvents: HDEvent[];
}

function analyze(all: AllCharts, input: BirthInput, dateYMD: string): Analysis {
  const contacts = aspectsToNatal(all.natal, dateYMD, input.tz);
  const tags: Tag[] = [];
  const hdEvents: HDEvent[] = [];
  tagAstro(all, contacts, tags);
  tagHD(all, dateYMD, tags, hdEvents);
  tagNumerology(all, tags);
  tagDestiny(all, tags);
  return { contacts, tags, hdEvents };
}

/** Score every family by its tags. Convergence (used by buildDailyReading):
 * ≥2 distinct systems, sky-grounded (≥1 astrology/HD tag), and combined
 * weight ≥ CONVERGENCE_WEIGHT. Exported for the paid "why this is primary"
 * candidate ranking (v2). */
export const CONVERGENCE_WEIGHT = 4;

export function scoreFamilies(all: AllCharts, input: BirthInput, dateYMD: string): FamilyScore[] {
  const { tags } = analyze(all, input, dateYMD);

  const byFamily = new Map<FamilyKey, Tag[]>();
  for (const t of tags) {
    const arr = byFamily.get(t.family) ?? [];
    arr.push(t);
    byFamily.set(t.family, arr);
  }

  const scored: FamilyScore[] = [];
  for (const [family, ts] of byFamily) {
    const systems = [...new Set(ts.map((t) => t.system))];
    // Per-system strength = the SINGLE strongest tag from that system.
    // Five weak Moon contacts must not outshout one tight Saturn conjunction.
    const perSystemMax = new Map<SystemName, number>();
    for (const t of ts) {
      perSystemMax.set(t.system, Math.max(perSystemMax.get(t.system) ?? 0, t.weight));
    }
    const weight = [...perSystemMax.values()].reduce((a, b) => a + b, 0);
    const orbs = ts.map((t) => t.orb).filter((o): o is number => o != null);
    scored.push({ family, systems, weight, tightestOrb: orbs.length ? Math.min(...orbs) : Infinity, tags: ts });
  }
  scored.sort((a, b) =>
    b.systems.length - a.systems.length ||
    b.weight - a.weight ||
    a.tightestOrb - b.tightestOrb,
  );
  return scored;
}

/** The subset of scoreFamilies that counts as genuine convergence. */
export function convergentFamilies(all: AllCharts, input: BirthInput, dateYMD: string): FamilyScore[] {
  return scoreFamilies(all, input, dateYMD).filter((s) => {
    if (s.systems.length < 2) return false; // convergence needs ≥2 distinct systems
    // …and real signal strength: weak single tags from two systems must not
    // manufacture a "pattern". At least one tag must come from the sky
    // (astrology or Human Design activations), and the combined weight must
    // clear a bar that quiet days genuinely miss.
    const skyGrounded = s.tags.some((t) => t.system === 'Astrology' || t.system === 'Human Design');
    return skyGrounded && s.weight >= CONVERGENCE_WEIGHT;
  });
}

export function buildDailyReading(all: AllCharts, input: BirthInput, dateYMD: string): DailyReading {
  const { contacts, hdEvents } = analyze(all, input, dateYMD);
  const scored = convergentFamilies(all, input, dateYMD);

  const quietDay = scored.length === 0;
  const geneKeys = geneKeyNotesFor(all, hdEvents);

  const toTheme = (s: FamilyScore): ThemeResult => {
    const astroTags = s.tags.filter((t) => t.system === 'Astrology' && t.contact);
    const first = astroTags.sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99))[0]?.contact ?? null;
    const contactSet = new Map<string, TransitContact>();
    for (const t of s.tags) {
      if (t.contact) contactSet.set(`${t.contact.transitBody}-${t.contact.natalTarget}-${t.contact.aspect}`, t.contact);
    }
    const themeContacts = [...contactSet.values()].sort((a, b) => a.orb - b.orb).slice(0, 4);
    const landings = themeContacts.map((c) => landingFor(all, c));
    return {
      family: s.family,
      name: FAMILIES[s.family].name,
      weather: FAMILIES[s.family].weather,
      phenomenon: composePhenomenon(s.family, all, first),
      landings: [...new Set(landings)].slice(0, 3),
      manifestations: [composeManifestation(s.family, first)],
      systems: s.systems,
      contacts: themeContacts,
      evidence: [...new Set(s.tags.map((t) => t.evidence))].slice(0, 6),
      geneKeyNotes: geneKeys,
    };
  };

  const primary = scored.length ? toTheme(scored[0]) : null;
  const secondaries = scored.slice(1, 3).map(toTheme);

  const astroLines = contacts.slice(0, 8).map((c) => {
    const dir = c.applying ? 'moving toward' : 'moving away from';
    const exact = c.exactDate ? ` — exact ${fmtMD(c.exactDate)}` : '';
    return `The ${c.transitBody} is ${dir} ${ASPECT_PLAIN[c.aspect]} your natal ${targetLabel(c.natalTarget)}${exact}.`;
  });

  const obsCore = primary ? primary.phenomenon.split('. ')[0].replace(/\.$/, '') : '';
  const observationPrompt = primary
    ? (/today/i.test(obsCore)
        ? `Notice: ${obsCore}. ${primary.manifestations[0]} What else could explain what you notice?`
        : `Notice ${obsCore[0].toLowerCase() + obsCore.slice(1)} today. ${primary.manifestations[0]} What else could explain what you notice?`)
    : 'Notice what draws your attention today. What keeps recurring — and what else could explain it?';

  const homeMessage = primary
    ? composeHomeMessage(primary)
    : `No single pattern dominates today. The sky is still moving — ${contacts.length > 0 ? astroLines[0].replace(/\.$/, '').toLowerCase() : 'no major aspects to your chart are exact'} — but nothing in your chart is being strongly activated by more than one system at once. Treat today as open field: notice what actually draws your attention rather than what a chart highlights, and log one honest observation. The full reading below lists today's transits.`;

  return { date: dateYMD, quietDay, homeMessage, primary, secondaries, astroLines, observationPrompt };
}

/** ~120–180 words, zero unexplained specialist terms. */
function composeHomeMessage(p: ThemeResult): string {
  const famLower = p.name.toLowerCase().replace(/\s*\/\s*/g, ' and ');
  const phenomenon = p.phenomenon;
  const watch = p.manifestations[0];
  const where = p.landings.length
    ? ` In your chart this lands in ${p.landings.map((l) => l.replace(/\s*\(house unknown[^)]*\)/, '')).join('; ')}.`
    : '';
  return (
    `Today's pattern is ${famLower} — ${p.weather.charAt(0).toLowerCase() + p.weather.slice(1)} ` +
    `${phenomenon} ` +
    `What to watch: ${watch.charAt(0).toLowerCase() + watch.slice(1)}${where} ` +
    `This reading comes from several systems pointing at the same pattern at once — not from any single one. ` +
    `Open the full reading for the breakdown, and log what you actually notice today.`
  );
}
