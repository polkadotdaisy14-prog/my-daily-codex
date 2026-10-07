/* Shared types for the Codex engine. */

export interface BirthInput {
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM' 24h local wall time, or null when unknown */
  time: string | null;
  timeUnknown: boolean;
  /** IANA zone, e.g. 'America/New_York' */
  tz: string;
  /** decimal degrees; lon EAST-positive (Columbus OH = -82.9988) */
  lat: number;
  lon: number;
  placeLabel: string;
  /** optional full birth name — enables name-derived numerology */
  fullName?: string;
}

export interface BodyPlacement {
  lon: number; // 0..360
  sign: string;
  degInSign: number;
  fmt: string; // e.g. 'Libra 26°11′'
  retro: boolean;
  /** Whole Sign house, or null when birth time is unknown */
  house: number | null;
  gate: number;
  line: number;
  center: string;
  gateName: string;
}

export interface NatalChart {
  bodies: Record<string, BodyPlacement>; // Sun..Pluto + MeanNode
  ascLon: number | null;
  mcLon: number | null;
  /** angle placements (ASC/MC/DSC/IC) with gates, or null when time unknown */
  angles: Record<'ASC' | 'MC' | 'DSC' | 'IC', BodyPlacement> | null;
  /** missing-data flags, e.g. ['birth_time'] */
  missing: string[];
  meta: { utISO: string; tz: string; lat: number; lon: number; placeLabel: string };
}

export interface HDGate { planet: string; gate: number; line: number; center: string; }

export type HDType = 'Generator' | 'Manifesting Generator' | 'Projector' | 'Manifestor' | 'Reflector';

export interface HDChart {
  type: HDType;
  strategy: string;
  authority: string;
  profile: string;
  definition: 'Single' | 'Split' | 'Triple Split' | 'Quadruple Split' | 'No definition';
  definedCenters: string[];
  undefinedCenters: string[];
  channels: [number, number][];
  personality: HDGate[];
  design: HDGate[];
  /** ISO string of the computed Design (88° solar arc) moment, UT */
  designMomentISO: string;
}

export interface GeneKeySphere {
  sphere: string;
  key: number;
  line: number;
  shadow: string;
  gift: string;
  siddhi: string;
  gateName: string;
}

export interface GeneKeysChart {
  activation: GeneKeySphere[];
  venus: GeneKeySphere[];
  pearl: GeneKeySphere[];
  starPearl: GeneKeySphere[];
}

export interface NumerologyProfile {
  asOf: string; // 'YYYY-MM-DD' the personal cycles were computed for
  dateDerived: {
    lifePath: number;
    birthday: number;
    attitude: number;
    personalYear: number;
    personalMonth: number;
    personalDay: number;
    pinnacles: number[];
    challenges: number[];
  };
  nameDerived:
    | { awaitingInput: false; expression: number; soulUrge: number; personality: number }
    | { awaitingInput: true };
}

export interface DestinyMatrixChart {
  A: number; B: number; C: number; D: number; E: number;
  names: Record<string, string>;
  personalYear: { value: number; name: string };
}

export interface AllCharts {
  natal: NatalChart;
  hd: HDChart;
  geneKeys: GeneKeysChart;
  numerology: NumerologyProfile;
  destinyMatrix: DestinyMatrixChart;
}

/* ---------- Transits ---------- */

export type AspectName = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface TransitBody {
  body: string;
  lon: number;
  sign: string;
  fmt: string;
  retro: boolean;
  gate: number;
  line: number;
  center: string;
  gateName: string;
}

export interface TransitContact {
  transitBody: string;
  transitLon: number;
  natalTarget: string; // body or angle name
  natalLon: number;
  aspect: AspectName;
  orb: number; // degrees, 0..orb limit
  applying: boolean;
  /** YYYY-MM-DD of exact aspect (scanned), or null */
  exactDate: string | null;
  transitRetro: boolean;
}

export interface DailySky {
  date: string;
  bodies: TransitBody[];
  moonPhase: string;
  contacts: TransitContact[];
}
