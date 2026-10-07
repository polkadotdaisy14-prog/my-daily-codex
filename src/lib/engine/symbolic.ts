/* My Daily Codex — symbolic data layer.
 * TypeScript port of the validated research implementation
 * (~/workspace/codex/research/symbolic.js). No logic changes.
 *
 * Human Design: gate wheel sequence verified against published zodiacal
 * references (Gate 25 = 28°15' Pisces–3°52'30' Aries; Gate 41 = 2°–7°37'30"
 * Aquarius; Rave New Year ~Jan 22 = Sun enters Gate 41). Gate width 5.625°,
 * line width 0.9375°. Gate->center and 36 channels per standard HD bodygraph.
 * Gene Keys: Shadow/Gift/Siddhi per key verified against the published
 * "64 Gene Keys: Spectrum of Consciousness" table (two independent sources).
 * Numerology: standard Pythagorean reductions (master numbers 11/22 kept).
 * Destiny Matrix: 22-arcana method per Ladini-school sources
 * (A=day, B=month, C=year-digit-sum, D=A+B+C, E=center=A+B+C+D, reduce >22).
 */

/* Zodiacal gate order starting at 0° Aries. Gate 25 spans 358.25°–3.875°. */
export const GATE_SEQ = [25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53,
  62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5,
  26, 11, 10, 58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36];
export const GATE_START = 358.25, GATE_W = 5.625, LINE_W = 0.9375;

export const GATE_CENTERS: Record<string, number[]> = {
  Head: [61, 63, 64], Ajna: [47, 24, 4, 17, 43, 11],
  Throat: [62, 23, 56, 35, 12, 45, 33, 8, 20, 31, 16],
  G: [1, 2, 7, 10, 13, 15, 25, 46], Heart: [21, 40, 26, 51],
  'Solar Plexus': [6, 37, 22, 36, 30, 55, 49],
  Sacral: [5, 14, 29, 9, 3, 42, 27, 34, 59],
  Spleen: [48, 57, 44, 50, 32, 28, 18],
  Root: [41, 19, 39, 52, 60, 53, 54, 38, 58],
};
export const GATE_TO_CENTER: Record<number, string> = {};
for (const [c, gs] of Object.entries(GATE_CENTERS)) for (const g of gs) GATE_TO_CENTER[g] = c;

export const CHANNELS: [number, number][] = [[1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48], [17, 62], [18, 58],
  [19, 49], [20, 34], [20, 57], [21, 45], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41],
  [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [43, 23], [47, 64], [61, 24], [25, 51]];

export const GATE_NAMES: Record<number, string> = {1:'The Creative',2:'The Receptive',3:'Difficulty at the Beginning',
  4:'Youthful Folly',5:'Waiting',6:'Conflict',7:'The Army',8:'Holding Together',
  9:'The Taming Power of the Small',10:'Treading',11:'Peace',12:'Standstill',
  13:'Fellowship',14:'Possession in Great Measure',15:'Modesty',16:'Enthusiasm',
  17:'Following',18:'Work on the Decayed',19:'Approach',20:'Contemplation',
  21:'Biting Through',22:'Grace',23:'Splitting Apart',24:'Return',25:'Innocence',
  26:'The Taming Power of the Great',27:'Nourishment',28:'Great Excess',
  29:'The Abysmal',30:'Clinging Fire',31:'Influence',32:'Duration',33:'Retreat',
  34:'Great Power',35:'Progress',36:'Darkening of the Light',37:'The Family',
  38:'Opposition',39:'Obstruction',40:'Deliverance',41:'Decrease',42:'Increase',
  43:'Breakthrough',44:'Coming to Meet',45:'Gathering Together',46:'Pushing Upward',
  47:'Oppression',48:'The Well',49:'Revolution',50:'The Cauldron',51:'The Arousing',
  52:'Keeping Still',53:'Development',54:'The Marrying Maiden',55:'Abundance',
  56:'The Wanderer',57:'The Gentle',58:'The Joyous',59:'Dispersion',60:'Limitation',
  61:'Inner Truth',62:'Preponderance of the Small',63:'After Completion',
  64:'Before Completion'};

/* [shadow, gift, siddhi] */
export const GENE_KEYS: Record<number, [string, string, string]> = {1:['Entropy','Freshness','Beauty'],2:['Dislocation','Orientation','Unity'],
  3:['Chaos','Innovation','Innocence'],4:['Intolerance','Understanding','Forgiveness'],
  5:['Impatience','Patience','Timelessness'],6:['Conflict','Diplomacy','Peace'],
  7:['Division','Guidance','Virtue'],8:['Mediocrity','Style','Exquisiteness'],
  9:['Inertia','Determination','Invincibility'],10:['Self-Obsession','Naturalness','Being'],
  11:['Obscurity','Idealism','Light'],12:['Vanity','Discrimination','Purity'],
  13:['Discord','Discernment','Empathy'],14:['Compromise','Competence','Bounteousness'],
  15:['Dullness','Magnetism','Florescence'],16:['Indifference','Versatility','Mastery'],
  17:['Opinion','Far-Sightedness','Omniscience'],18:['Judgement','Integrity','Perfection'],
  19:['Co-Dependence','Sensitivity','Sacrifice'],20:['Superficiality','Self Assurance','Presence'],
  21:['Control','Authority','Valour'],22:['Dishonour','Graciousness','Grace'],
  23:['Complexity','Simplicity','Quintessence'],24:['Addiction','Invention','Silence'],
  25:['Constriction','Acceptance','Universal Love'],26:['Pride','Artfulness','Invisibility'],
  27:['Selfishness','Altruism','Selflessness'],28:['Purposelessness','Totality','Immortality'],
  29:['Half-Heartedness','Commitment','Devotion'],30:['Desire','Lightness','Rapture'],
  31:['Arrogance','Leadership','Humility'],32:['Failure','Preservation','Veneration'],
  33:['Forgetting','Mindfulness','Revelation'],34:['Force','Strength','Majesty'],
  35:['Hunger','Adventure','Boundlessness'],36:['Turbulence','Humanity','Compassion'],
  37:['Weakness','Equality','Tenderness'],38:['Struggle','Perseverance','Honour'],
  39:['Provocation','Dynamism','Liberation'],40:['Exhaustion','Resolve','Divine Will'],
  41:['Fantasy','Anticipation','Emanation'],42:['Expectation','Detachment','Celebration'],
  43:['Deafness','Insight','Epiphany'],44:['Interference','Teamwork','Synarchy'],
  45:['Dominance','Synergy','Communion'],46:['Seriousness','Delight','Ecstasy'],
  47:['Oppression','Transmutation','Transfiguration'],48:['Inadequacy','Resourcefulness','Wisdom'],
  49:['Reaction','Revolution','Rebirth'],50:['Corruption','Equilibrium','Harmony'],
  51:['Agitation','Initiative','Awakening'],52:['Stress','Restraint','Stillness'],
  53:['Immaturity','Expansion','Superabundance'],54:['Greed','Aspiration','Ascension'],
  55:['Victimisation','Freedom','Freedom'],56:['Distraction','Enrichment','Intoxication'],
  57:['Unease','Intuition','Clarity'],58:['Dissatisfaction','Vitality','Bliss'],
  59:['Dishonesty','Intimacy','Transparency'],60:['Limitation','Realism','Justice'],
  61:['Psychosis','Inspiration','Sanctity'],62:['Intellect','Precision','Impeccability'],
  63:['Doubt','Inquiry','Truth'],64:['Confusion','Imagination','Illumination']};

export interface GateLine { gate: number; line: number; center: string; name: string; }
export function gateLine(lon: number): GateLine {
  const l = (((lon - GATE_START) % 360) + 360) % 360;
  const idx = Math.floor(l / GATE_W);
  const gate = GATE_SEQ[idx];
  const line = Math.floor((l - idx * GATE_W) / LINE_W) + 1;
  return { gate, line, center: GATE_TO_CENTER[gate], name: GATE_NAMES[gate] };
}

/* ---------- Numerology ---------- */
export function digitSum(n: number): number {
  return String(Math.abs(Math.trunc(n))).split('').reduce((a, c) => a + +c, 0);
}
export function reduceNum(n: number, keepMasters = true): number {
  const masters = keepMasters === false ? [] : [11, 22, 33];
  while (n > 9 && !masters.includes(n)) n = digitSum(n);
  return n;
}
export function lifePath(y: number, m: number, d: number): number {
  return reduceNum(digitSum(y) + digitSum(m) + digitSum(d));
}
export function personalYear(_y: number, m: number, d: number, calYear: number): number {
  return reduceNum(m + d + digitSum(calYear), false);
}
export function personalMonth(py: number, calMonth: number): number {
  return reduceNum(py + calMonth, false);
}
export function personalDay(pm: number, calDay: number): number {
  return reduceNum(pm + calDay, false);
}

/* ---------- Destiny Matrix (22 arcana) ---------- */
export const ARCANA: Record<number, string> = {1:'The Magician',2:'The High Priestess',3:'The Empress',4:'The Emperor',
  5:'The Hierophant',6:'The Lovers',7:'The Chariot',8:'Justice',9:'The Hermit',
  10:'Wheel of Fortune',11:'Strength',12:'The Hanged Man',13:'Transformation',14:'Temperance',
  15:'The Devil',16:'The Tower',17:'The Star',18:'The Moon',19:'The Sun',20:'Judgement',
  21:'The World',22:'The Fool'};
/* Reduce to 1-22: only values > 22 are reduced, by digit sum (22 itself is kept). */
export function red22(n: number): number {
  while (n > 22) n = digitSum(n);
  return n;
}
export interface DestinyMatrixResult { A: number; B: number; C: number; D: number; E: number; names: Record<string, string>; }
export function destinyMatrix(y: number, m: number, d: number): DestinyMatrixResult {
  const A = red22(d), B = red22(m), C = red22(digitSum(y));
  const D = red22(A + B + C), E = red22(A + B + C + D);
  return { A, B, C, D, E,
    names: { A: ARCANA[A], B: ARCANA[B], C: ARCANA[C], D: ARCANA[D], E: ARCANA[E] } };
}
export function destinyPersonalYear(_y: number, m: number, d: number, calYear: number): { value: number; name: string } {
  const v = red22(red22(d) + red22(m) + red22(digitSum(calYear)));
  return { value: v, name: ARCANA[v] };
}
