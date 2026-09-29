create table if not exists public.ai_round_summaries (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  season text not null,
  round integer not null check (round between 1 and 20),
  data_hash text not null check (length(data_hash) = 64),
  summary text,
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  is_complete boolean not null default false,
  completed_matches integer not null check (completed_matches between 0 and 20),
  total_matches integer not null check (total_matches between 1 and 20),
  generation_status text not null default 'generating'
    check (generation_status in ('generating', 'ready', 'failed')),
  generation_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_round_summaries_match_counts_check
    check (completed_matches <= total_matches),
  constraint ai_round_summaries_ready_payload_check
    check (generation_status <> 'ready' or summary is not null),
  constraint ai_round_summaries_cache_key_unique
    unique (league_id, season, round, data_hash)
);

alter table public.ai_round_summaries enable row level security;

-- Cache access is server-only. The Edge Function authenticates the caller
-- before using its server-side service-role credential.
revoke all on table public.ai_round_summaries from public, anon, authenticated;
grant select, insert, update on table public.ai_round_summaries to service_role;
