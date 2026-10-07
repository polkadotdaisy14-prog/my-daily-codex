create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','paid')),
  birth_date date, birth_time text, birth_time_unknown boolean not null default false,
  full_name text, birth_place_label text, birth_lat double precision,
  birth_lon double precision, birth_tz text, natal_snapshot jsonb,
  onboarding_complete boolean not null default false, push_subscription jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create table if not exists pattern_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  log_date date not null, observation_prompt text, what_occurred text,
  competing_explanation text, personal_meaning text,
  assessment text check (assessment in ('manifested','illuminated','generative','not_relevant','contradicted','unclear','did_not_resonate')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);
alter table pattern_logs enable row level security;
drop policy if exists "own logs" on pattern_logs;
create policy "own logs" on pattern_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_logs_updated on pattern_logs;
create trigger trg_logs_updated before update on pattern_logs for each row execute function public.set_updated_at();
