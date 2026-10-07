/* Geography helpers: place → coordinates (OpenStreetMap Nominatim),
 * coordinates → IANA timezone (offline tz-lookup DB), and the historical
 * UTC offset for an IANA zone on a given local date (via Intl, DST-aware).
 *
 * Nominatim usage policy: max 1 req/sec, cache results, identify the app.
 * Browsers cannot set a custom User-Agent header, so we rely on the page
 * Referer/Origin for identification and keep results in localStorage.
 * See README for the policy notes.
 */
import tzlookup from 'tz-lookup';

export interface GeoResult { label: string; lat: number; lon: number; }

const CACHE_PREFIX = 'codex:geo:';
let lastRequestAt = 0;

function cacheGet(key: string): GeoResult[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as GeoResult[]) : null;
  } catch { return null; }
}
function cacheSet(key: string, val: GeoResult[]): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(val)); } catch { /* ignore */ }
}

/** Throttled, cached Nominatim place search. Returns up to 5 candidates. */
export async function geocodePlace(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const cached = cacheGet(q.toLowerCase());
  if (cached) return cached;
  const wait = 1100 - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    format: 'jsonv2', q, limit: '5', addressdetails: '1',
    'accept-language': 'en',
  }).toString();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocode request failed (${res.status})`);
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  const out: GeoResult[] = data.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
  cacheSet(q.toLowerCase(), out);
  return out;
}

/** IANA timezone for coordinates (offline lookup). */
export function tzForLatLon(lat: number, lon: number): string {
  return tzlookup(lat, lon);
}

/**
 * UTC offset in minutes for an IANA zone at a given LOCAL date/time.
 * DST-aware via Intl. Returns O such that UT = local − O.
 * (e.g. New York on 2000-10-19 03:24 → −240, i.e. UT = 07:24.)
 */
export function offsetMinutesAt(tz: string, y: number, m: number, d: number, hh: number, mm: number): number {
  const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm); // wall time read as UTC
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const wallMsAt = (utcMs: number): number => {
    const o: Record<string, number> = {};
    for (const p of fmt.formatToParts(new Date(utcMs))) {
      if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
    }
    const h = o.hour === 24 ? 0 : o.hour;
    return Date.UTC(o.year, o.month - 1, o.day, h, o.minute, o.second);
  };
  let ut = guessUtcMs, offset = 0;
  for (let i = 0; i < 3; i++) {
    offset = Math.round((wallMsAt(ut) - ut) / 60000);
    ut = guessUtcMs - offset * 60000;
  }
  return offset;
}
