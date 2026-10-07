/* Codex chart computation — all five systems, client-side.
 * Astrology (Whole Sign) + Human Design (Personality + 88° solar-arc Design)
 * + Gene Keys sequences + Pythagorean numerology + Ladini Destiny Matrix.
 *
 * Methodology rules enforced here:
 * - Never invent placements: unknown birth time → angles/houses are null and
 *   `missing` carries 'birth_time'. The UI must render explicit
 *   missing-data states, never filler.
 * - Mean lunar node only (engine limit); Chiron/Lilith not computable.
 */
import {
  BODIES, angDiff, dayNumber, degInSign, fmtLon,
  geoLongitude, moonPhase, rev, signOf, skySnapshot, wholeSignHouse,
} from './ephemeris';
import {
  CHANNELS, GATE_NAMES, GATE_TO_CENTER, GENE_KEYS,
  destinyMatrix, destinyPersonalYear, gateLine, lifePath,
  personalDay, personalMonth, personalYear, reduceNum,
} from './symbolic';
import { computeAngles } from './angles';
import { offsetMinutesAt } from './geo';
import type {
  AllCharts, AspectName, BirthInput, BodyPlacement, DestinyMatrixChart,
  GeneKeysChart, GeneKeySphere, HDChart, HDGate, HDType, NatalChart,
  NumerologyProfile, TransitBody, TransitContact,
} from './types';


/* ---------- date helpers ---------- */

export function parseYMD(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** 'YYYY-MM-DD' (UT date) from a Schlyter day-number. */
export function ymdFromD(dnum: number): string {
  const ms = Date.UTC(1999, 11, 31, 0, 0, 0) + dnum * 86400000;
  const dt = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function isoFromD(dnum: number): string {
  return new Date(Date.UTC(1999, 11, 31, 0, 0, 0) + dnum * 86400000).toISOString();
}

const HD_BODIES_13 = ['Sun', 'Earth', 'Moon', 'North Node', 'South Node',
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function lonOf13(planet: string, snap: Record<string, { lon: number }>): number {
  if (planet === 'Earth') return rev(snap.Sun.lon + 180);
  if (planet === 'North Node') return snap.MeanNode.lon;
  if (planet === 'South Node') return rev(snap.MeanNode.lon + 180);
  return snap[planet].lon;
}

function placement(lon: number, motion: number, house: number | null): BodyPlacement {
  const g = gateLine(lon);
  return {
    lon: rev(lon), sign: signOf(lon), degInSign: degInSign(lon), fmt: fmtLon(lon),
    retro: motion < 0, house, gate: g.gate, line: g.line, center: g.center, gateName: g.name,
  };
}

/* ---------- Natal chart ---------- */

export function computeNatal(input: BirthInput): NatalChart {
  const { y, m, d } = parseYMD(input.date);
  const missing: string[] = [];
  let utHours: number;
  if (!input.timeUnknown && input.time) {
    const [hh, mm] = input.time.split(':').map(Number);
    const off = offsetMinutesAt(input.tz, y, m, d, hh, mm);
    utHours = hh + mm / 60 - off / 60;
  } else {
    utHours = 12; // representative; angles/houses stay null
    missing.push('birth_time');
  }
  const dn = dayNumber(y, m, d, utHours);
  const snap = skySnapshot(dn);

  let ascLon: number | null = null, mcLon: number | null = null;
  if (!missing.includes('birth_time')) {
    const a = computeAngles(y, m, d, utHours, input.lat, input.lon);
    ascLon = a.asc; mcLon = a.mc;
  }

  const bodies: Record<string, BodyPlacement> = {};
  for (const b of [...BODIES, 'MeanNode']) {
    const house = ascLon == null ? null : wholeSignHouse(snap[b].lon, ascLon);
    bodies[b] = placement(snap[b].lon, snap[b].motion, house);
  }

  let angles: NatalChart['angles'] = null;
  if (ascLon != null && mcLon != null) {
    const a = computeAngles(y, m, d, utHours, input.lat, input.lon);
    const mk = (lon: number): BodyPlacement => {
      const g = gateLine(lon);
      return {
        lon: rev(lon), sign: signOf(lon), degInSign: degInSign(lon), fmt: fmtLon(lon),
        retro: false, house: wholeSignHouse(lon, ascLon as number),
        gate: g.gate, line: g.line, center: g.center, gateName: g.name,
      };
    };
    angles = { ASC: mk(a.asc), MC: mk(a.mc), DSC: mk(a.dsc), IC: mk(a.ic) };
  }

  return {
    bodies, angles, ascLon, mcLon, missing,
    meta: {
      utISO: isoFromD(dn), tz: input.tz, lat: input.lat, lon: input.lon,
      placeLabel: input.placeLabel,
    },
  };
}

/* ---------- Human Design (88° solar-arc Design) ---------- */

/** Day-number of the Design moment: Sun 88° before the natal Sun. */
export function designMomentD(birthD: number, natalSunLon: number): number {
  const target = rev(natalSunLon - 88);
  let best = birthD - 100, bestErr = Infinity;
  for (let d = birthD - 120; d <= birthD; d += 0.5) {
    const err = angDiff(geoLongitude('Sun', d), target);
    if (err < bestErr) { bestErr = err; best = d; }
  }
  // refine by bisection on the error
  let lo = best - 0.5, hi = best + 0.5;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const eLo = angDiff(geoLongitude('Sun', lo), target);
    const eHi = angDiff(geoLongitude('Sun', hi), target);
    void mid;
    // ternary-style shrink toward lower error
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (angDiff(geoLongitude('Sun', m1), target) < angDiff(geoLongitude('Sun', m2), target)) hi = m2;
    else lo = m1;
    void eLo; void eHi;
  }
  return (lo + hi) / 2;
}

const ALL_CENTERS = ['Head', 'Ajna', 'Throat', 'G', 'Heart', 'Solar Plexus', 'Sacral', 'Spleen', 'Root'];
const MOTORS = ['Heart', 'Solar Plexus', 'Sacral', 'Root'];

function hdGates(snap: Record<string, { lon: number }>): HDGate[] {
  return HD_BODIES_13.map((planet) => {
    const g = gateLine(lonOf13(planet, snap));
    return { planet, gate: g.gate, line: g.line, center: g.center };
  });
}

export function computeHD(natal: NatalChart, designD: number): HDChart {
  const designSnap = skySnapshot(designD);
  const personality: HDGate[] = HD_BODIES_13.map((planet) => {
    let gate: number, line: number, center: string;
    if (planet === 'Earth') {
      const g = gateLine(rev(natal.bodies.Sun.lon + 180));
      gate = g.gate; line = g.line; center = g.center;
    } else if (planet === 'North Node') {
      const b = natal.bodies.MeanNode; gate = b.gate; line = b.line; center = b.center;
    } else if (planet === 'South Node') {
      const g = gateLine(rev(natal.bodies.MeanNode.lon + 180));
      gate = g.gate; line = g.line; center = g.center;
    } else {
      const b = natal.bodies[planet]; gate = b.gate; line = b.line; center = b.center;
    }
    return { planet, gate, line, center };
  });
  const design = hdGates(designSnap);

  const gateSet = new Set([...personality, ...design].map((g) => g.gate));
  const channels = CHANNELS.filter(([a, b]) => gateSet.has(a) && gateSet.has(b)) as [number, number][];

  const centerOf = (gate: number) => GATE_TO_CENTER[gate];
  const definedCenters = ALL_CENTERS.filter((c) =>
    channels.some(([a, b]) => centerOf(a) === c || centerOf(b) === c));
  const undefinedCenters = ALL_CENTERS.filter((c) => !definedCenters.includes(c));

  // center connectivity graph through complete channels
  const adj = new Map<string, Set<string>>();
  for (const c of definedCenters) adj.set(c, new Set());
  for (const [a, b] of channels) {
    const ca = centerOf(a), cb = centerOf(b);
    if (ca !== cb && adj.has(ca) && adj.has(cb)) { adj.get(ca)!.add(cb); adj.get(cb)!.add(ca); }
  }
  const reach = (from: string): Set<string> => {
    const seen = new Set<string>([from]); const q = [from];
    while (q.length) { const c = q.pop()!; for (const n of adj.get(c) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    return seen;
  };
  const motorToThroat = definedCenters.includes('Throat') &&
    MOTORS.some((mt) => definedCenters.includes(mt) && reach(mt).has('Throat'));

  let type: HDType;
  if (definedCenters.length === 0) type = 'Reflector';
  else if (definedCenters.includes('Sacral')) type = motorToThroat ? 'Manifesting Generator' : 'Generator';
  else if (motorToThroat) type = 'Manifestor';
  else type = 'Projector';

  const authority = definedCenters.includes('Solar Plexus') ? 'Emotional – Solar Plexus'
    : definedCenters.includes('Sacral') ? 'Sacral'
    : definedCenters.includes('Spleen') ? 'Splenic'
    : definedCenters.includes('Heart') ? 'Ego'
    : definedCenters.includes('G') ? 'Self-Projected'
    : type === 'Reflector' ? 'Lunar' : 'Mental';

  const strategy: Record<HDType, string> = {
    Generator: 'Wait to Respond', 'Manifesting Generator': 'Wait to Respond',
    Projector: 'Wait for the Invitation', Manifestor: 'Inform', Reflector: 'Wait a Lunar Cycle',
  };

  const pSun = personality.find((g) => g.planet === 'Sun')!;
  const dSun = design.find((g) => g.planet === 'Sun')!;
  const profile = `${pSun.line}/${dSun.line}`;

  // definition: connected groups of defined centers
  const groups = new Set<string>();
  const seen = new Set<string>();
  let groupCount = 0;
  for (const c of definedCenters) {
    if (seen.has(c)) continue;
    groupCount++;
    for (const n of reach(c)) { seen.add(n); groups.add(n); }
  }
  const definition = groupCount === 0 ? 'No definition'
    : groupCount === 1 ? 'Single' : groupCount === 2 ? 'Split'
    : groupCount === 3 ? 'Triple Split' : 'Quadruple Split';

  return {
    type, strategy: strategy[type], authority, profile, definition,
    definedCenters, undefinedCenters, channels, personality, design,
    designMomentISO: isoFromD(designD),
  };
}

/* ---------- Gene Keys (planet→sphere mapping, verified against supplied record) ---------- */

type Side = 'P' | 'D';
const GK_MAP: Record<string, [string, Side, string][]> = {
  activation: [["Life's Work", 'P', 'Sun'], ['Evolution', 'P', 'Earth'], ['Radiance', 'D', 'Sun'], ['Purpose', 'D', 'Earth']],
  venus: [['Attraction', 'D', 'Moon'], ['IQ', 'P', 'Venus'], ['EQ', 'P', 'Mars'], ['SQ', 'D', 'Venus'], ['Core', 'D', 'North Node']],
  pearl: [['Vocation', 'D', 'Mars'], ['Culture', 'D', 'Jupiter'], ['Brand', 'P', 'Sun'], ['Pearl', 'P', 'Jupiter']],
  starPearl: [['Creativity', 'D', 'Uranus'], ['Relating', 'P', 'Mercury'], ['Stability', 'D', 'Saturn']],
};

export function computeGeneKeys(hd: HDChart): GeneKeysChart {
  const find = (side: Side, planet: string): HDGate => {
    const list = side === 'P' ? hd.personality : hd.design;
    const g = list.find((x) => x.planet === planet);
    if (!g) throw new Error(`Missing HD gate: ${side}-${planet}`);
    return g;
  };
  const sphere = ([name, side, planet]: [string, Side, string]): GeneKeySphere => {
    const g = find(side, planet);
    const [shadow, gift, siddhi] = GENE_KEYS[g.gate];
    return { sphere: name, key: g.gate, line: g.line, shadow, gift, siddhi, gateName: GATE_NAMES[g.gate] };
  };
  return {
    activation: GK_MAP.activation.map(sphere),
    venus: GK_MAP.venus.map(sphere),
    pearl: GK_MAP.pearl.map(sphere),
    starPearl: GK_MAP.starPearl.map(sphere),
  };
}

/* ---------- Numerology (Pythagorean) ---------- */

const LETTER_VALUES: Record<string, number> = {
  A: 1, J: 1, S: 1, B: 2, K: 2, T: 2, C: 3, L: 3, U: 3, D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5, F: 6, O: 6, X: 6, G: 7, P: 7, Y: 7, H: 8, Q: 8, Z: 8, I: 9, R: 9,
};
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function nameNumbers(fullName: string): { expression: number; soulUrge: number; personality: number } {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const hasVowel = letters.some((c) => VOWELS.has(c));
  const isVowel = (c: string) => VOWELS.has(c) || (c === 'Y' && !hasVowel);
  const sum = (cs: string[]) => cs.reduce((a, c) => a + (LETTER_VALUES[c] ?? 0), 0);
  return {
    expression: reduceNum(sum(letters)),
    soulUrge: reduceNum(sum(letters.filter(isVowel))),
    personality: reduceNum(sum(letters.filter((c) => !isVowel(c)))),
  };
}

export function computeNumerology(input: BirthInput, asOfYMD: string): NumerologyProfile {
  const { y, m, d } = parseYMD(input.date);
  const a = parseYMD(asOfYMD);
  const py = personalYear(y, m, d, a.y);
  const r = (n: number) => reduceNum(n, false);
  const name = (input.fullName ?? '').trim();
  const c1 = r(Math.abs(m - d)), c2 = r(Math.abs(d - y));
  return {
    asOf: asOfYMD,
    dateDerived: {
      lifePath: lifePath(y, m, d),
      birthday: reduceNum(d),
      attitude: reduceNum(m + d),
      personalYear: py,
      personalMonth: personalMonth(py, a.m),
      personalDay: personalDay(personalMonth(py, a.m), a.d),
      pinnacles: [r(m + d), r(d + y), r(r(m + d) + r(d + y)), r(m + y)],
      challenges: [c1, c2, r(Math.abs(c1 - c2)), r(Math.abs(m - y))],
    },
    nameDerived: name ? { awaitingInput: false, ...nameNumbers(name) } : { awaitingInput: true },
  };
}

/* ---------- Destiny Matrix (Ladini 22-arcana) ---------- */

export function computeDestinyMatrix(y: number, m: number, d: number, calYear: number): DestinyMatrixChart {
  const dm = destinyMatrix(y, m, d);
  return { ...dm, personalYear: destinyPersonalYear(y, m, d, calYear) };
}

/* ---------- All charts, one call (onboarding) ---------- */

export function computeAllCharts(input: BirthInput, asOfYMD: string): AllCharts {
  const natal = computeNatal(input);
  const { y, m, d } = parseYMD(input.date);
  const birthD = dayNumber(y, m, d, 12);
  const designD = designMomentD(birthD, natal.bodies.Sun.lon);
  const hd = computeHD(natal, designD);
  const a = parseYMD(asOfYMD);
  return {
    natal,
    hd,
    geneKeys: computeGeneKeys(hd),
    numerology: computeNumerology(input, asOfYMD),
    destinyMatrix: computeDestinyMatrix(y, m, d, a.y),
  };
}

/* ---------- Transits ---------- */

const ASPECT_DEFS: [AspectName, number][] = [
  ['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180],
];

function orbLimit(transitBody: string, natalTarget: string): number {
  if (natalTarget === 'ASC' || natalTarget === 'MC') return 5;
  if (transitBody === 'Sun' || transitBody === 'Moon' || natalTarget === 'Sun' || natalTarget === 'Moon') return 8;
  return 6;
}

/** Transit snapshot for a calendar date (local noon in `tz`). */
export function dailySky(dateYMD: string, tz: string): { bodies: TransitBody[]; moonPhase: string; d: number } {
  const { y, m, d } = parseYMD(dateYMD);
  const off = offsetMinutesAt(tz, y, m, d, 12, 0);
  const dn = dayNumber(y, m, d, 12 - off / 60);
  const snap = skySnapshot(dn);
  const bodies: TransitBody[] = BODIES.map((b) => {
    const g = gateLine(snap[b].lon);
    return {
      body: b, lon: rev(snap[b].lon), sign: signOf(snap[b].lon), fmt: fmtLon(snap[b].lon),
      retro: snap[b].motion < 0, gate: g.gate, line: g.line, center: g.center, gateName: g.name,
    };
  });
  return { bodies, moonPhase: moonPhase(dn).name, d: dn };
}

/** Scan ±45 days around centerD for the exact date of an aspect. */
export function findExactDate(transitBody: string, natalLon: number, aspectDeg: number, centerD: number): string | null {
  let best = centerD, bestOrb = Infinity;
  for (let k = -45; k <= 45; k++) {
    const orb = Math.abs(angDiff(geoLongitude(transitBody, centerD + k), natalLon) - aspectDeg);
    if (orb < bestOrb) { bestOrb = orb; best = centerD + k; }
  }
  for (let k = -1; k <= 1; k += 0.25) {
    const orb = Math.abs(angDiff(geoLongitude(transitBody, best + k), natalLon) - aspectDeg);
    if (orb < bestOrb) { bestOrb = orb; best = best + k; }
  }
  return ymdFromD(best);
}

/** Transit→natal contacts for the day. Natal targets: 10 planets + ASC/MC. */
export function aspectsToNatal(natal: NatalChart, dateYMD: string, tz: string): TransitContact[] {
  const sky = dailySky(dateYMD, tz);
  const targets: { name: string; lon: number }[] = BODIES.map((b) => ({ name: b, lon: natal.bodies[b].lon }));
  if (natal.ascLon != null && natal.mcLon != null) {
    targets.push({ name: 'ASC', lon: natal.ascLon }, { name: 'MC', lon: natal.mcLon });
  }
  const out: TransitContact[] = [];
  for (const t of sky.bodies) {
    for (const tgt of targets) {
      if (t.body === tgt.name) continue;
      for (const [aspect, deg] of ASPECT_DEFS) {
        const orb = Math.abs(angDiff(t.lon, tgt.lon) - deg);
        const limit = orbLimit(t.body, tgt.name);
        if (orb > limit) continue;
        const orbTomorrow = Math.abs(angDiff(geoLongitude(t.body, sky.d + 1), tgt.lon) - deg);
        out.push({
          transitBody: t.body, transitLon: t.lon,
          natalTarget: tgt.name, natalLon: tgt.lon,
          aspect, orb, applying: orbTomorrow < orb,
          exactDate: findExactDate(t.body, tgt.lon, deg, sky.d),
          transitRetro: t.retro,
        });
      }
    }
  }
  out.sort((a, b) => a.orb - b.orb);
  return out;
}
