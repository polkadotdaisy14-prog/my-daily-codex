/* My Daily Codex — astronomical engine (client-side, no network needed).
 * TypeScript port of the validated research implementation
 * (~/workspace/codex/research/engine.js): Paul Schlyter's
 * "Computing planetary positions", validated against Swiss Ephemeris
 * (pyswisseph): worst-case |error| < 2.5 arcminutes across 7 test dates
 * (1995-2030) for Sun, Moon, Mercury..Pluto.
 * Mean lunar node only (true-node corrections not in Schlyter's method).
 * Chiron / Lilith / asteroids: NOT computable here — natal values only.
 * Port rule: no logic changes vs the research file; TypeScript types only.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function rev(x: number): number {
  return x - Math.floor(x / 360.0) * 360.0;
}
function sind(x: number): number { return Math.sin(x * D2R); }
function cosd(x: number): number { return Math.cos(x * D2R); }

/** Days since 2000 Jan 0.0 (= 1999 Dec 31.0 TT). `ut` = UT hours. */
export function dayNumber(y: number, m: number, d: number, ut = 0): number {
  const dd = 367 * y - Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4)
    + Math.floor((275 * m) / 9) + d - 730530;
  return dd + ut / 24.0;
}

function keplerE(M: number, e: number): number {
  M = rev(M);
  let E = M + e * R2D * sind(M) * (1 + e * cosd(M));
  for (let k = 0; k < 4; k++) {
    E = E - (E - e * R2D * sind(E) - M) / (1 - e * cosd(E));
  }
  return E;
}

/* ---------- Sun ---------- */
function sunElements(d: number) {
  return {
    w: 282.9404 + 4.70935e-5 * d,
    e: 0.016709 - 1.151e-9 * d,
    M: rev(356.0470 + 0.9856002585 * d),
    a: 1.0,
  };
}
function sunPos(d: number) {
  const el = sunElements(d);
  const E = keplerE(el.M, el.e);
  const x = cosd(E) - el.e, y = Math.sqrt(1 - el.e * el.e) * sind(E);
  const v = Math.atan2(y, x) * R2D, r = Math.hypot(x, y);
  return { lon: rev(v + el.w), lat: 0, r };
}

/* ---------- Moon ---------- */
function moonPos(d: number) {
  const N = rev(125.1228 - 0.0529538083 * d), i = 5.1454;
  const w = rev(318.0634 + 0.1643573223 * d), a = 60.2666, e = 0.054900;
  const M = rev(115.3654 + 13.0649929509 * d);
  const E = keplerE(M, e);
  const x = a * (cosd(E) - e), y = a * Math.sqrt(1 - e * e) * sind(E);
  const v = Math.atan2(y, x) * R2D, r = Math.hypot(x, y);
  const xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
  const yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
  const zh = r * sind(v + w) * sind(i);
  let lon = rev(Math.atan2(yh, xh) * R2D);
  let lat = Math.atan2(zh, Math.hypot(xh, yh)) * R2D;
  const se = sunElements(d);
  const Ms = se.M, Mm = M, Nm = N, ws = se.w, wm = w;
  const Ls = Ms + ws, Lm = Mm + wm + Nm, D = Lm - Ls, F = Lm - Nm;
  lon += (-1.274 * sind(Mm - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms)
    - 0.059 * sind(2 * Mm - 2 * D) - 0.057 * sind(Mm - 2 * D + Ms)
    + 0.053 * sind(Mm + 2 * D) + 0.046 * sind(2 * D - Ms) + 0.041 * sind(Mm - Ms)
    - 0.035 * sind(D) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * D)
    + 0.011 * sind(Mm - 4 * D));
  lat += (-0.173 * sind(F - 2 * D) - 0.055 * sind(Mm - F - 2 * D)
    - 0.046 * sind(Mm + F - 2 * D) + 0.033 * sind(F + 2 * D)
    + 0.017 * sind(2 * Mm + F));
  const rr = r - 0.58 * cosd(Mm - 2 * D) - 0.46 * cosd(2 * D);
  return { lon: rev(lon), lat, r: rr, meanNode: N };
}

/* ---------- Planets ---------- */
interface PlanetEl { N: [number, number]; i: [number, number]; w: [number, number]; a: [number, number]; e: [number, number]; M: [number, number]; }
const PLANET_EL: Record<string, PlanetEl> = {
  Mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.0e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  Venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
  Mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
  Jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
  Saturn: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] },
  Uranus: { N: [74.0005, 1.3978e-5], i: [0.7733, 1.9e-8], w: [96.6612, 3.0565e-5], a: [19.18171, -1.55e-8], e: [0.047318, 7.45e-9], M: [142.5905, 0.011725806] },
  Neptune: { N: [131.7806, 3.0173e-5], i: [1.77, -2.55e-7], w: [272.8461, -6.027e-6], a: [30.05826, 3.313e-8], e: [0.008606, 2.15e-9], M: [260.2471, 0.005995147] },
};

function pertJSU(name: string, Mj: number, Ms: number, Mu: number): [number, number] {
  let dl = 0, dlat = 0;
  if (name === 'Jupiter') {
    dl = (-0.332 * sind(2 * Mj - 5 * Ms - 67.6) - 0.056 * sind(2 * Mj - 2 * Ms + 21)
      + 0.042 * sind(3 * Mj - 5 * Ms + 21) - 0.036 * sind(Mj - 2 * Ms)
      + 0.022 * cosd(Mj - Ms) + 0.023 * sind(2 * Mj - 3 * Ms + 52)
      - 0.016 * sind(Mj - 5 * Ms - 69));
  } else if (name === 'Saturn') {
    dl = (+0.812 * sind(2 * Mj - 5 * Ms - 67.6) - 0.229 * cosd(2 * Mj - 4 * Ms - 2)
      + 0.119 * sind(Mj - 2 * Ms - 3) + 0.046 * sind(2 * Mj - 6 * Ms - 69)
      + 0.014 * sind(Mj - 3 * Ms + 32));
    dlat = -0.02 * cosd(2 * Mj - 4 * Ms - 2) + 0.018 * sind(2 * Mj - 6 * Ms - 49);
  } else if (name === 'Uranus') {
    dl = (+0.04 * sind(Ms - 2 * Mu + 6) + 0.035 * sind(Ms - 3 * Mu + 33)
      - 0.015 * sind(Mj - Mu + 20));
  }
  return [dl, dlat];
}

function planetHelio(name: string, d: number) {
  const el = PLANET_EL[name];
  const N = rev(el.N[0] + el.N[1] * d), i = el.i[0] + el.i[1] * d;
  const w = rev(el.w[0] + el.w[1] * d), a = el.a[0] + el.a[1] * d;
  const e = el.e[0] + el.e[1] * d, M = rev(el.M[0] + el.M[1] * d);
  const E = keplerE(M, e);
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
  const v = Math.atan2(yv, xv) * R2D, r = Math.hypot(xv, yv);
  const xh0 = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
  const yh0 = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
  const zh0 = r * sind(v + w) * sind(i);
  let lonecl = rev(Math.atan2(yh0, xh0) * R2D);
  let latecl = Math.atan2(zh0, Math.hypot(xh0, yh0)) * R2D;
  if (name === 'Jupiter' || name === 'Saturn' || name === 'Uranus') {
    const Mj = rev(19.8950 + 0.0830853001 * d);
    const Ms = rev(316.9670 + 0.0334442282 * d);
    const Mu = rev(142.5905 + 0.011725806 * d);
    const [dl, dlat] = pertJSU(name, Mj, Ms, Mu);
    lonecl = rev(lonecl + dl); latecl += dlat;
  }
  const xh = r * cosd(lonecl) * cosd(latecl);
  const yh = r * sind(lonecl) * cosd(latecl);
  const zh = r * sind(latecl);
  return { xh, yh, zh, r, M };
}

function plutoHelio(d: number) {
  const S = 50.03 + 0.033459652 * d, P = 238.95 + 0.003968789 * d;
  const lonecl = (238.9508 + 0.00400703 * d
    - 19.799 * sind(P) + 19.848 * cosd(P) + 0.897 * sind(2 * P) - 4.956 * cosd(2 * P)
    + 0.61 * sind(3 * P) + 1.211 * cosd(3 * P) - 0.341 * sind(4 * P) - 0.19 * cosd(4 * P)
    + 0.128 * sind(5 * P) - 0.034 * cosd(5 * P) - 0.038 * sind(6 * P) + 0.031 * cosd(6 * P)
    + 0.02 * sind(S - P) - 0.01 * cosd(S - P));
  const latecl = (-3.9082 - 5.453 * sind(P) - 14.975 * cosd(P)
    + 3.527 * sind(2 * P) + 1.673 * cosd(2 * P) - 1.051 * sind(3 * P) + 0.328 * cosd(3 * P)
    + 0.179 * sind(4 * P) - 0.292 * cosd(4 * P) + 0.019 * sind(5 * P) + 0.1 * cosd(5 * P)
    - 0.031 * sind(6 * P) - 0.026 * cosd(6 * P) + 0.011 * cosd(S - P));
  const r = (40.72 + 6.68 * sind(P) + 6.9 * cosd(P) - 1.18 * sind(2 * P) - 0.03 * cosd(2 * P)
    + 0.15 * sind(3 * P) - 0.14 * cosd(3 * P));
  const xh = r * cosd(lonecl) * cosd(latecl);
  const yh = r * sind(lonecl) * cosd(latecl);
  const zh = r * sind(latecl);
  return { xh, yh, zh, r };
}

/** Geocentric ecliptic longitude (Schlyter section 11: xg = xh + xs). */
export function geoLongitude(name: string, d: number): number {
  const s = sunPos(d);
  if (name === 'Sun') return s.lon;
  const xs = s.r * cosd(s.lon), ys = s.r * sind(s.lon);
  if (name === 'Moon') return moonPos(d).lon;
  const h = name === 'Pluto' ? plutoHelio(d) : planetHelio(name, d);
  const xg = h.xh + xs, yg = h.yh + ys;
  return rev(Math.atan2(yg, xg) * R2D);
}

export function meanNode(d: number): number {
  return rev(125.1228 - 0.0529538083 * d);
}

/** Signed daily motion in degrees (negative = retrograde). */
export function dailyMotion(name: string, d: number): number {
  const a = geoLongitude(name, d - 0.5), b = geoLongitude(name, d + 0.5);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

export interface SkyBody { lon: number; motion: number; }
export function skySnapshot(d: number): Record<string, SkyBody> {
  const out: Record<string, SkyBody> = {};
  for (const b of BODIES) {
    out[b] = { lon: geoLongitude(b, d), motion: dailyMotion(b, d) };
  }
  out.MeanNode = { lon: meanNode(d), motion: -0.0529538083 };
  return out;
}

/* ---------- Presentation helpers ---------- */
export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function signOf(lon: number): string {
  return SIGNS[Math.floor(rev(lon) / 30) % 12];
}
export function degInSign(lon: number): number { return rev(lon) % 30; }
export function fmtLon(lon: number): string {
  const l = rev(lon), s = signOf(l), dd = degInSign(l);
  const d = Math.floor(dd), m = Math.floor((dd - d) * 60);
  return `${s} ${d}°${String(m).padStart(2, '0')}′`;
}
/** Whole Sign house of `lon` given ASC longitude. */
export function wholeSignHouse(lon: number, asc: number): number {
  const ascSign = Math.floor(rev(asc) / 30);
  const diff = (Math.floor(rev(lon) / 30) - ascSign + 12) % 12;
  return diff + 1;
}

/** Moon phase: 8 names by elongation. */
export function moonPhase(d: number): { name: string; elongation: number; lunarDay: number } {
  const elong = rev(geoLongitude('Moon', d) - geoLongitude('Sun', d));
  const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const idx = Math.floor(((elong + 22.5) % 360) / 45);
  return { name: names[idx], elongation: elong, lunarDay: (elong / 360) * 29.530588853 };
}

/** Smallest angular separation between two longitudes (0..180). */
export function angDiff(a: number, b: number): number {
  const d = Math.abs(rev(a) - rev(b)) % 360;
  return d > 180 ? 360 - d : d;
}
