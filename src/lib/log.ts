/* Pattern Log persistence: Supabase `pattern_logs` when configured, otherwise
 * localStorage (local beta mode). One entry per (user, date).
 */
import { getSupabase, isConfigured } from './supabase';

export type Assessment =
  | 'manifested'
  | 'illuminated'
  | 'generative'
  | 'not_relevant'
  | 'contradicted'
  | 'unclear'
  | 'did_not_resonate';

export const ASSESSMENT_OPTIONS: { value: Assessment; label: string }[] = [
  { value: 'manifested', label: 'Manifested' },
  { value: 'illuminated', label: 'Illuminated' },
  { value: 'generative', label: 'Generative' },
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'contradicted', label: 'Contradicted' },
  { value: 'unclear', label: 'Unclear' },
  { value: 'did_not_resonate', label: 'Did not resonate' },
];

export interface LogEntry {
  id: string;
  log_date: string; // 'YYYY-MM-DD'
  observation_prompt: string;
  what_occurred: string;
  competing_explanation: string;
  personal_meaning: string;
  assessment: Assessment | '';
}

const LS_KEY = 'codex:logs:v1';

function localList(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function localSave(list: LogEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listEntries(userId: string | null): Promise<LogEntry[]> {
  if (!isConfigured() || !userId) {
    return localList().sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('pattern_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });
  if (error) throw new Error(`Could not load log entries: ${error.message}`);
  return (data ?? []) as LogEntry[];
}

export async function getEntry(userId: string | null, id: string): Promise<LogEntry | null> {
  const list = await listEntries(userId);
  return list.find((e) => e.id === id) ?? null;
}

export async function getEntryForDate(userId: string | null, date: string): Promise<LogEntry | null> {
  const list = await listEntries(userId);
  return list.find((e) => e.log_date === date) ?? null;
}

/** Insert or replace the entry for its log_date (one entry per day). */
export async function saveEntry(
  userId: string | null,
  entry: Omit<LogEntry, 'id'> & { id?: string },
): Promise<LogEntry> {
  const full: LogEntry = { ...entry, id: entry.id ?? newId() };
  if (!isConfigured() || !userId) {
    const list = localList().filter((e) => e.log_date !== full.log_date && e.id !== full.id);
    list.push(full);
    localSave(list);
    return full;
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('pattern_logs')
    .upsert(
      {
        id: full.id.startsWith('local-') ? undefined : full.id,
        user_id: userId,
        log_date: full.log_date,
        observation_prompt: full.observation_prompt || null,
        what_occurred: full.what_occurred || null,
        competing_explanation: full.competing_explanation || null,
        personal_meaning: full.personal_meaning || null,
        assessment: full.assessment || null,
      },
      { onConflict: 'user_id,log_date' },
    )
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Could not save log entry: ${error.message}`);
  return (data as LogEntry) ?? full;
}

export async function deleteEntry(userId: string | null, id: string): Promise<void> {
  if (!isConfigured() || !userId) {
    localSave(localList().filter((e) => e.id !== id));
    return;
  }
  const sb = getSupabase();
  const { error } = await sb.from('pattern_logs').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Could not delete log entry: ${error.message}`);
}
