-- Keep RLS enabled; table privileges and row policies are both required.
alter table public.favorite_matches enable row level security;

-- Do not expose this user-specific table to anonymous or PUBLIC roles.
revoke all on table public.favorite_matches from public, anon;

grant select, insert, update, delete
  on table public.favorite_matches
  to authenticated;

drop policy if exists "Users can update their own favorite matches" on public.favorite_matches;
create policy "Users can update their own favorite matches"
  on public.favorite_matches for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
