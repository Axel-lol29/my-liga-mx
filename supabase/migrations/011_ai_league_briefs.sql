create table if not exists public.ai_league_briefs (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  season text not null,
  data_hash text not null check (length(data_hash) = 64),
  summary text,
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array'),
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  generation_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_league_briefs_ready_payload_check check (status <> 'ready' or summary is not null),
  constraint ai_league_briefs_cache_key_unique unique (league_id, season, data_hash)
);

alter table public.ai_league_briefs enable row level security;
revoke all on table public.ai_league_briefs from public, anon, authenticated;
grant select, insert, update on table public.ai_league_briefs to service_role;
