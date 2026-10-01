create table if not exists public.ai_match_recaps (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  data_hash text not null check (length(data_hash) = 64),
  summary text,
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),
  generation_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_match_recaps_ready_payload_check
    check (status <> 'ready' or summary is not null),
  constraint ai_match_recaps_cache_key_unique
    unique (event_id, data_hash)
);

alter table public.ai_match_recaps enable row level security;

-- Public event inputs are shared; only the authenticated server function accesses this cache.
revoke all on table public.ai_match_recaps from public, anon, authenticated;
grant select, insert, update on table public.ai_match_recaps to service_role;
