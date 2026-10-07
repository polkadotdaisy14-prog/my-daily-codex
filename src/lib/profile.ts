/* Profile persistence: Supabase `profiles` row when configured, otherwise
 * localStorage (local beta mode). The BirthInput is the single source of
 * truth — charts are recomputed from it at runtime, never cached.
 */
import type { BirthInput } from './engine/types';
import { getSupabase, isConfigured } from './supabase';

export type Tier = 'free' | 'paid';

export interface Profile {
  tier: Tier;
  birthInput: BirthInput | null;
  onboardingComplete: boolean;
}

const LS_KEY = 'codex:profile:v1';

const DEFAULT_PROFILE: Profile = { tier: 'free', birthInput: null, onboardingComplete: false };

function fromLocalStorage(): Profile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* ignore corrupt storage */
  }
  return { ...DEFAULT_PROFILE };
}

export async function loadProfile(userId: string | null): Promise<Profile> {
  if (!isConfigured() || !userId) return fromLocalStorage();
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return { ...DEFAULT_PROFILE };
  const birthInput: BirthInput | null = data.birth_date
    ? {
        date: data.birth_date as string,
        time: (data.birth_time_unknown as boolean) ? null : ((data.birth_time as string | null) ?? null),
        timeUnknown: Boolean(data.birth_time_unknown),
        tz: (data.birth_tz as string | null) ?? 'UTC',
        lat: Number(data.birth_lat ?? 0),
        lon: Number(data.birth_lon ?? 0),
        placeLabel: (data.birth_place_label as string | null) ?? '',
        fullName: (data.full_name as string | null) ?? undefined,
      }
    : null;
  return {
    tier: data.tier === 'paid' ? 'paid' : 'free',
    birthInput,
    onboardingComplete: Boolean(data.onboarding_complete),
  };
}

export async function saveProfile(userId: string | null, profile: Profile): Promise<void> {
  if (!isConfigured() || !userId) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(profile));
    } catch {
      /* storage full / unavailable */
    }
    return;
  }
  const b = profile.birthInput;
  const sb = getSupabase();
  const { error } = await sb.from('profiles').upsert(
    {
      id: userId,
      tier: profile.tier,
      birth_date: b?.date ?? null,
      birth_time: b && !b.timeUnknown ? b.time : null,
      birth_time_unknown: b?.timeUnknown ?? false,
      full_name: b?.fullName?.trim() ? b.fullName : null,
      birth_place_label: b?.placeLabel ?? null,
      birth_lat: b?.lat ?? null,
      birth_lon: b?.lon ?? null,
      birth_tz: b?.tz ?? null,
      onboarding_complete: profile.onboardingComplete,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`Could not save profile: ${error.message}`);
}
