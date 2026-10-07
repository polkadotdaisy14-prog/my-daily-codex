/* Ascendant / MC / DSC / IC from UT + observer location.
 * NEW math (not part of the validated Schlyter port) — validated against
 * Autumn's Swiss-Ephemeris-verified angles:
 *   2000-10-19 07:24 UT, Columbus OH (39.9612°N, 82.9988°W):
 *   MC = 58.328° (verified 58.317°), ASC = 152.990° (verified 152.983°).
 * Formulas:
 *   GMST (Meeus, degrees) from days since J2000.0; RAMC = GMST + lonEast.
 *   MC  = atan2(sin RAMC, cos RAMC · cos ε)
 *   ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε))
 *   DSC = ASC + 180°, IC = MC + 180°.
 */
import { dayNumber, rev } from './ephemeris';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Days since J2000.0 (2000-01-01 12:00 UT). */
export function daysSinceJ2000(y: number, m: number, d: number, utHours: number): number {
  return dayNumber(y, m, d, utHours) - 1.5;
}

/** Greenwich Mean Sidereal Time, degrees. */
export function gmstDeg(dJ2000: number): number {
  const T = dJ2000 / 36525;
  return rev(280.46061837 + 360.98564736629 * dJ2000 + 0.000387933 * T * T - (T * T * T) / 38710000);
}

/** Local sidereal time (RAMC), degrees. lonEast: degrees, east positive. */
export function ramcDeg(dJ2000: number, lonEast: number): number {
  return rev(gmstDeg(dJ2000) + lonEast);
}

/** Mean obliquity of the ecliptic, degrees. */
export function obliquityDeg(dJ2000: number): number {
  const T = dJ2000 / 36525;
  return 23.4392911 - 0.0130042 * T - 0.00000164 * T * T + 0.000000504 * T * T * T;
}

export interface Angles { asc: number; mc: number; dsc: number; ic: number; }

/**
 * Compute the four angles. `utHours` = UT time of birth as decimal hours.
 * `lat`/`lonEast` in decimal degrees (east positive; Columbus OH = -82.9988).
 */
export function computeAngles(y: number, m: number, d: number, utHours: number, lat: number, lonEast: number): Angles {
  const dj = daysSinceJ2000(y, m, d, utHours);
  const ramc = ramcDeg(dj, lonEast) * D2R;
  const eps = obliquityDeg(dj) * D2R;
  const mc = rev(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D);
  const asc = rev(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) * R2D);
  return { asc: rev(asc), mc, dsc: rev(asc + 180), ic: rev(mc + 180) };
}
