alter table public.user_preferences
  add column if not exists match_reminder_minutes integer not null default 60;

alter table public.user_preferences
  drop constraint if exists user_preferences_match_reminder_minutes_check;

alter table public.user_preferences
  add constraint user_preferences_match_reminder_minutes_check
  check (match_reminder_minutes in (15, 30, 60));
