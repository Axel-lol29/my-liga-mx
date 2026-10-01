create table if not exists public.ai_team_briefs (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  team_name text not null,
  data_hash text not null check (length(data_hash) = 64),
  summary text,
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),
  generation_token uuid,
  constraint ai_team_briefs_ready_payload_check
    check (status <> 'ready' or summary is not null),
  constraint ai_team_briefs_cache_key_unique
    unique (team_id, data_hash)
);

alter table public.ai_team_briefs enable row level security;

-- Briefs contain shared public football data. Only the Edge Function's
-- server-side service-role credential can access this cache.
revoke all on table public.ai_team_briefs from public, anon, authenticated;
grant select, insert, update on table public.ai_team_briefs to service_role;
