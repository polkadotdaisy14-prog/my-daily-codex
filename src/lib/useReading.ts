import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { loadProfile, type Profile } from '../lib/profile';
import { computeAllCharts } from '../lib/engine/charts';
import { buildDailyReading, todayYMD, type DailyReading } from '../lib/reading/pipeline';
import type { AllCharts } from '../lib/engine/types';

export interface ReadingState {
  loading: boolean;
  profile: Profile | null;
  all: AllCharts | null;
  reading: DailyReading | null;
  date: string;
  error: string | null;
}

/** Loads the profile, recomputes all charts from the saved birth input, and
 * builds today's reading. Charts are never cached — always recomputed. */
export function useReading(): ReadingState {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [charts, setCharts] = useState<{ all: AllCharts; reading: DailyReading } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = useMemo(() => todayYMD(), []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    loadProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your profile.');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!profile?.birthInput) {
      setCharts(null);
      return;
    }
    let cancelled = false;
    // compute off the render path (chart math + exact-date scans are heavy)
    const t = window.setTimeout(() => {
      try {
        const all = computeAllCharts(profile.birthInput!, date);
        const reading = buildDailyReading(all, profile.birthInput!, date);
        if (!cancelled) setCharts({ all, reading });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not build your reading.');
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [profile, date]);

  return {
    loading: authLoading || (user != null && profile === null) || (profile?.birthInput != null && charts === null && error === null),
    profile,
    all: charts?.all ?? null,
    reading: charts?.reading ?? null,
    date,
    error,
  };
}
