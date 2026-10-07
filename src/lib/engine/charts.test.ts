/* Verification test: Autumn's Swiss-Ephemeris-verified natal chart.
 * Reference: ~/workspace/codex/research/natal.json (do NOT edit; read-only).
 *
 * GATE: if any assertion fails, the engine math is wrong — STOP, do not
 * ship. Report the exact discrepancies.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { rev } from './ephemeris';
import { computeAllCharts, designMomentD } from './charts';
import { dayNumber } from './ephemeris';
import type { BirthInput } from './types';

const ref = JSON.parse(
  readFileSync(new URL('../../../../codex/research/natal.json', import.meta.url), 'utf8')
);

const AUTUMN: BirthInput = {
  date: '2000-10-19',
  time: '03:24',
  timeUnknown: false,
  tz: 'America/New_York',
  lat: 39.9612,
  lon: -82.9988, // east-positive
  placeLabel: 'Columbus, Ohio, USA',
};

const DEG_TOL = 0.0417; // ±2.5′ — validated engine tolerance
const ANGLE_TOL = 0.1; // ±6′ — ASC/MC math is new (not part of the validated port)

function lonErr(a: number, b: number): number {
  const d = Math.abs(rev(a) - rev(b)) % 360;
  return Math.min(d, 360 - d);
}

describe("Autumn's verified natal chart", () => {
  const all = computeAllCharts(AUTUMN, '2026-09-30');
  const { natal, hd, geneKeys, numerology, destinyMatrix } = all;

  it('reproduces planetary longitudes within ±2.5′', () => {
    const failures: string[] = [];
    for (const [name, p] of Object.entries(ref.points as Record<string, { lon: number }>)) {
      if (name === 'TrueNode' || name === 'Chiron' || name === 'MeanLilith') continue; // not computable
      if (['ASC', 'MC', 'DSC', 'IC'].includes(name)) continue; // angles checked separately
      const key = name === 'TrueNode' ? 'MeanNode' : name;
      const got = natal.bodies[key];
      if (!got) { failures.push(`${name}: missing from computed chart`); continue; }
      const err = lonErr(got.lon, p.lon);
      if (err > DEG_TOL) failures.push(`${name}: got ${got.lon.toFixed(4)}°, ref ${p.lon}°, err ${(err * 60).toFixed(2)}′`);
    }
    // MeanNode vs TrueNode reference: allow wider tolerance (mean vs true node)
    const mnErr = lonErr(natal.bodies.MeanNode.lon, ref.points.TrueNode.lon);
    if (mnErr > 2) failures.push(`MeanNode vs TrueNode ref: err ${mnErr.toFixed(3)}° (mean≠true expected, but >2° is suspicious)`);
    if (failures.length) throw new Error('LONGITUDE MISMATCH — do not ship:\n' + failures.join('\n'));
  });

  it('reproduces gates, lines, and Whole Sign houses', () => {
    const failures: string[] = [];
    for (const [name, p] of Object.entries(ref.points as Record<string, { gate: number; line: number; wholeSignHouse?: number }>)) {
      if (name === 'TrueNode' || name === 'Chiron' || name === 'MeanLilith') continue;
      const key = ['ASC', 'MC', 'DSC', 'IC'].includes(name) ? name : name;
      const got = ['ASC', 'MC', 'DSC', 'IC'].includes(name)
        ? natal.angles![name as 'ASC']
        : natal.bodies[key];
      if (!got) { failures.push(`${name}: missing`); continue; }
      if (got.gate !== p.gate || got.line !== p.line)
        failures.push(`${name}: got gate ${got.gate}.${got.line}, ref ${p.gate}.${p.line}`);
      if (p.wholeSignHouse != null && got.house !== p.wholeSignHouse)
        failures.push(`${name}: got house ${got.house}, ref ${p.wholeSignHouse}`);
    }
    if (failures.length) throw new Error('GATE/LINE/HOUSE MISMATCH — do not ship:\n' + failures.join('\n'));
  });

  it('reproduces ASC/MC within ±6′', () => {
    const ascErr = lonErr(natal.ascLon!, ref.points.ASC.lon);
    const mcErr = lonErr(natal.mcLon!, ref.points.MC.lon);
    const failures: string[] = [];
    if (ascErr > ANGLE_TOL) failures.push(`ASC: got ${natal.ascLon!.toFixed(4)}°, ref ${ref.points.ASC.lon}°, err ${(ascErr * 60).toFixed(2)}′`);
    if (mcErr > ANGLE_TOL) failures.push(`MC: got ${natal.mcLon!.toFixed(4)}°, ref ${ref.points.MC.lon}°, err ${(mcErr * 60).toFixed(2)}′`);
    if (failures.length) throw new Error('ANGLE MISMATCH — do not ship:\n' + failures.join('\n'));
  });

  it('reproduces numerology + destiny matrix', () => {
    expect(numerology.dateDerived.lifePath).toBe(4);
    expect(ref.numerology.lifePath).toBe(4);
    expect(destinyMatrix.A).toBe(19);
    expect(destinyMatrix.B).toBe(10);
    expect(destinyMatrix.C).toBe(2);
    expect(destinyMatrix.D).toBe(4);
    expect(destinyMatrix.E).toBe(8);
    expect(destinyMatrix.personalYear.value).toBe(12); // 2026 Hanged Man (asOf 2026-09-30)
    expect(numerology.dateDerived.personalYear).toBe(3); // 2026
  });

  it('computes the HD chart: Generator, Sacral, 6/2, Split', () => {
    expect(hd.type).toBe('Generator');
    expect(hd.authority).toBe('Sacral');
    expect(hd.profile).toBe('6/2');
    expect(hd.definition).toBe('Split');
    expect([...hd.definedCenters].sort()).toEqual(['G', 'Root', 'Sacral', 'Spleen', 'Throat']);
    const channelSet = new Set(hd.channels.map(([a, b]) => [a, b].sort((x, y) => x - y).join('-')));
    for (const ch of [[8, 1], [33, 13], [32, 54], [42, 53]]) {
      const key = [...ch].sort((x, y) => x - y).join('-');
      expect(channelSet.has(key), `missing channel ${ch}`).toBe(true);
    }
    // Design moment ≈ July 20, 2000 11:50:13 AM EDT = 15:50:13 UTC
    const refMs = Date.UTC(2000, 6, 20, 15, 50, 13);
    const gotMs = new Date(hd.designMomentISO).getTime();
    expect(Math.abs(gotMs - refMs)).toBeLessThan(15 * 60 * 1000);
  });

  it('maps Gene Keys sequences to the right gates', () => {
    const act = Object.fromEntries(geneKeys.activation.map((s) => [s.sphere, s]));
    expect([act["Life's Work"].key, act["Life's Work"].line]).toEqual([32, 6]);
    expect([act.Evolution.key, act.Evolution.line]).toEqual([42, 6]);
    expect([act.Radiance.key, act.Radiance.line]).toEqual([56, 2]);
    expect([act.Purpose.key, act.Purpose.line]).toEqual([60, 2]);
    const ven = Object.fromEntries(geneKeys.venus.map((s) => [s.sphere, s]));
    expect([ven.Attraction.key, ven.Attraction.line]).toEqual([63, 2]);
    expect([ven.IQ.key, ven.IQ.line]).toEqual([14, 6]);
    expect([ven.Core.key]).toEqual([62]);
    const pearl = Object.fromEntries(geneKeys.pearl.map((s) => [s.sphere, s]));
    expect([pearl.Vocation.key, pearl.Vocation.line]).toEqual([62, 2]);
    expect([pearl.Brand.key, pearl.Brand.line]).toEqual([32, 6]);
    const sp = Object.fromEntries(geneKeys.starPearl.map((s) => [s.sphere, s]));
    expect([sp.Creativity.key, sp.Creativity.line]).toEqual([49, 1]);
    expect([sp.Relating.key, sp.Relating.line]).toEqual([1, 3]);
    expect([sp.Stability.key, sp.Stability.line]).toEqual([8, 5]);
  });

  it('designMomentD is consistent with computeAllCharts', () => {
    const birthD = dayNumber(2000, 10, 19, 12);
    const d2 = designMomentD(birthD, natal.bodies.Sun.lon);
    const refMs = Date.UTC(2000, 6, 20, 15, 50, 13);
    const gotMs = new Date(new Date(Date.UTC(1999, 11, 31) + d2 * 86400000).toISOString()).getTime();
    expect(Math.abs(gotMs - refMs)).toBeLessThan(15 * 60 * 1000);
  });
});
