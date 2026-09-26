create table if not exists public.favorite_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (length(trim(event_id)) > 0),
  home_team_name text not null,
  away_team_name text not null,
  home_team_badge text,
  away_team_badge text,
  event_date date,
  event_time time,
  status text not null,
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now(),
  constraint favorite_matches_user_event_unique unique (user_id, event_id)
);

create index if not exists favorite_matches_user_created_at_idx
  on public.favorite_matches (user_id, created_at desc);

alter table public.favorite_matches enable row level security;

drop policy if exists "Users can read their own favorite matches" on public.favorite_matches;
create policy "Users can read their own favorite matches"
  on public.favorite_matches for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own favorite matches" on public.favorite_matches;
create policy "Users can add their own favorite matches"
  on public.favorite_matches for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own favorite matches" on public.favorite_matches;
create policy "Users can remove their own favorite matches"
  on public.favorite_matches for delete to authenticated
  using (auth.uid() = user_id);
