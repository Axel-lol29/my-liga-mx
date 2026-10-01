create table if not exists public.ai_match_previews (
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
  constraint ai_match_previews_ready_payload_check
    check (status <> 'ready' or summary is not null),
  constraint ai_match_previews_cache_key_unique
    unique (event_id, data_hash)
);

alter table public.ai_match_previews enable row level security;

-- Match previews contain shared public match data; cache access is server-only.
revoke all on table public.ai_match_previews from public, anon, authenticated;
grant select, insert, update on table public.ai_match_previews to service_role;
