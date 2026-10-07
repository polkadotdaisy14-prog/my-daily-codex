/* Synthetic birth profiles: crash-free onboarding across hemispheres,
 * timezones, and the unknown-birth-time path. No reference chart needed —
 * these assert structural sanity + explicit missing-data states.
 */
import { describe, expect, it } from 'vitest';
import { computeAllCharts } from './charts';
import { offsetMinutesAt } from './geo';
import { rev } from './ephemeris';
import type { BirthInput } from './types';

const PROFILES: { label: string; input: BirthInput }[] = [
  {
    label: 'Sydney (southern hemisphere, AEDT)',
    input: { date: '2021-03-10', time: '09:15', timeUnknown: false, tz: 'Australia/Sydney', lat: -33.8688, lon: 151.2093, placeLabel: 'Sydney, Australia' },
  },
  {
    label: 'Tokyo (late night)',
    input: { date: '1995-12-01', time: '23:45', timeUnknown: false, tz: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503, placeLabel: 'Tokyo, Japan' },
  },
  {
    label: 'Nairobi, unknown birth time',
    input: { date: '1988-07-04', time: null, timeUnknown: true, tz: 'Africa/Nairobi', lat: -1.2921, lon: 36.8219, placeLabel: 'Nairobi, Kenya' },
  },
  {
    label: 'Reykjavik (high latitude)',
    input: { date: '2005-06-21', time: '00:05', timeUnknown: false, tz: 'Atlantic/Reykjavik', lat: 64.1466, lon: -21.9426, placeLabel: 'Reykjavik, Iceland' },
  },
];

describe('synthetic profiles', () => {
  for (const { label, input } of PROFILES) {
    it(`${label}: computes without crashing`, () => {
      const all = computeAllCharts(input, '2026-10-06');
      // every body has a valid longitude + gate
      for (const [name, b] of Object.entries(all.natal.bodies)) {
        expect(b.lon, `${label}/${name} lon`).toBeGreaterThanOrEqual(0);
        expect(b.lon, `${label}/${name} lon`).toBeLessThan(360);
        expect(b.gate, `${label}/${name} gate`).toBeGreaterThanOrEqual(1);
        expect(b.gate, `${label}/${name} gate`).toBeLessThanOrEqual(64);
      }
      // HD always computable (no birth time needed)
      expect(['Generator', 'Manifesting Generator', 'Projector', 'Manifestor', 'Reflector']).toContain(all.hd.type);
      expect(all.geneKeys.activation).toHaveLength(4);
      expect(all.numerology.dateDerived.lifePath).toBeGreaterThanOrEqual(1);
      expect(all.destinyMatrix.E).toBeGreaterThanOrEqual(1);
      if (input.timeUnknown) {
        expect(all.natal.angles).toBeNull();
        expect(all.natal.ascLon).toBeNull();
        expect(all.natal.missing).toContain('birth_time');
        for (const b of Object.values(all.natal.bodies)) expect(b.house).toBeNull();
      } else {
        expect(all.natal.angles).not.toBeNull();
        expect(all.natal.ascLon).not.toBeNull();
        expect(all.natal.missing).not.toContain('birth_time');
        const houses = new Set(Object.values(all.natal.bodies).map((b) => b.house));
        expect(houses.size).toBeGreaterThan(1);
      }
    });
  }

  it('unknown-time chart still yields gates for every body', () => {
    const all = computeAllCharts(PROFILES[2].input, '2026-10-06');
    for (const b of Object.values(all.natal.bodies)) {
      expect(b.gate).toBeGreaterThanOrEqual(1);
      expect(b.center).toBeTruthy();
    }
  });
});

describe('historical UTC offsets (DST-aware)', () => {
  it('New York Oct 2000 (EDT) = −240', () => {
    expect(offsetMinutesAt('America/New_York', 2000, 10, 19, 3, 24)).toBe(-240);
  });
  it('New York Jan 2000 (EST) = −300', () => {
    expect(offsetMinutesAt('America/New_York', 2000, 1, 15, 12, 0)).toBe(-300);
  });
  it('Sydney Mar 2021 (AEDT) = +660', () => {
    expect(offsetMinutesAt('Australia/Sydney', 2021, 3, 10, 9, 15)).toBe(660);
  });
  it('Tokyo (no DST) = +540', () => {
    expect(offsetMinutesAt('Asia/Tokyo', 1995, 12, 1, 23, 45)).toBe(540);
  });
  it('rev() sanity', () => {
    expect(rev(720)).toBe(0);
    expect(rev(-30)).toBe(330);
  });
});
