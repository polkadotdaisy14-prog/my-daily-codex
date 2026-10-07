# Engine API — `src/lib/engine/`

Client-side Codex engine. Pure functions, no network (except `geo.ts`).
Validated: `npx vitest run src/lib/engine/` — 17 tests, including Autumn's
Swiss-Ephemeris-verified natal chart (planets ±2.5′, ASC/MC ±6′).

## Modules

### `ephemeris.ts` — port of research/engine.js (no logic changes)
`dayNumber(y,m,d,utHours)`, `geoLongitude(body, d)`, `meanNode(d)`,
`dailyMotion(body, d)` (negative = retrograde), `skySnapshot(d)` →
`Record<body, {lon, motion}>` (includes `MeanNode`), `moonPhase(d)`,
`wholeSignHouse(lon, ascLon)`, `fmtLon(lon)` → `'Libra 26°11′'`,
`signOf(lon)`, `degInSign(lon)`, `angDiff(a,b)` (0..180), `rev(x)`,
`BODIES` (10), `SIGNS`.

### `symbolic.ts` — port of research/symbolic.js (no logic changes)
`gateLine(lon)` → `{gate, line, center, name}`, `GATE_NAMES`, `GENE_KEYS`
(`[shadow, gift, siddhi]`), `CHANNELS` (36 pairs), `GATE_TO_CENTER`,
`GATE_CENTERS`, `digitSum`, `reduceNum(n, keepMasters?)`,
`lifePath(y,m,d)`, `personalYear(y,m,d,calYear)`, `personalMonth(py,calMonth)`,
`personalDay(pm,calDay)`, `ARCANA`, `red22`, `destinyMatrix(y,m,d)`,
`destinyPersonalYear(y,m,d,calYear)`.

### `angles.ts` — NEW (validated vs verified ASC 152.983°/MC 58.317°)
`computeAngles(y,m,d,utHours,lat,lonEast)` → `{asc, mc, dsc, ic}` degrees.
`lonEast` is EAST-positive (Columbus OH = −82.9988).

### `geo.ts`
`geocodePlace(query)` → `Promise<GeoResult[]>` (`{label, lat, lon}`; lon EAST-positive).
Throttled to ~1 req/s, localStorage-cached, throws on network failure.
`tzForLatLon(lat, lon)` → IANA string (offline `tz-lookup`).
`offsetMinutesAt(tz, y,m,d,hh,mm)` → minutes, `UT = local − offset`, DST-aware.

### `charts.ts` — the main entry point
```ts
import { computeAllCharts, aspectsToNatal, dailySky } from './charts';

const input: BirthInput = {
  date: '2000-10-19', time: '03:24', timeUnknown: false,
  tz: 'America/New_York', lat: 39.9612, lon: -82.9988,
  placeLabel: 'Columbus, Ohio, USA', fullName: '...' // optional
};
const all: AllCharts = computeAllCharts(input, '2026-10-06'); // asOf for personal cycles
// all.natal      NatalChart  — bodies Sun..Pluto+MeanNode, angles?, ascLon/mcLon?, missing[]
// all.hd         HDChart     — type, strategy, authority, profile, definition,
//                              definedCenters, undefinedCenters, channels,
//                              personality[13], design[13], designMomentISO
// all.geneKeys   GeneKeysChart — activation[4], venus[5], pearl[4], starPearl[3]
//                              each {sphere, key, line, shadow, gift, siddhi, gateName}
// all.numerology NumerologyProfile — asOf, dateDerived{lifePath, birthday, attitude,
//                              personalYear/Month/Day, pinnacles[4], challenges[4]},
//                              nameDerived: {awaitingInput:false, expression, soulUrge,
//                              personality} | {awaitingInput:true}
// all.destinyMatrix DestinyMatrixChart — A,B,C,D,E, names{}, personalYear{value,name}

const contacts: TransitContact[] = aspectsToNatal(all.natal, '2026-10-06', input.tz);
// TransitContact: {transitBody, transitLon, natalTarget, natalLon, aspect
//   ('conjunction'|'sextile'|'square'|'trine'|'opposition'), orb, applying,
//   exactDate ('YYYY-MM-DD'|null), transitRetro}
// Sorted by orb ascending. Natal targets: 10 planets + ASC/MC (when known).

const sky = dailySky('2026-10-06', input.tz);
// {bodies: TransitBody[] (lon, sign, fmt, retro, gate, line, center, gateName),
//  moonPhase: string, d: number(dayNumber, internal)}
```

### `types.ts` — `BirthInput`, `NatalChart`, `BodyPlacement`, `HDChart`,
`HDGate`, `GeneKeysChart`, `GeneKeySphere`, `NumerologyProfile`,
`DestinyMatrixChart`, `AllCharts`, `TransitContact`, `DailySky`, etc.

## Missing-data rules (methodology — UI MUST honor)
- `timeUnknown: true` → `natal.angles === null`, `ascLon/mcLon === null`,
  every `body.house === null`, `missing: ['birth_time']`. Gates, HD, numerology,
  destiny matrix still compute. UI renders explicit "birth time unknown" states —
  never invents houses/angles, never filler.
- `fullName` absent → `numerology.nameDerived.awaitingInput === true`; UI shows
  date-derived numbers + "add your birth name to unlock Soul Urge" state.

## Notes
- Node = mean lunar node (engine limit). Chiron/Lilith not computable.
- `findExactDate(body, natalLon, aspectDeg, centerD)` also exported (used internally).
- Longitude convention: 0–360°, EAST-positive for geo lon inputs.
