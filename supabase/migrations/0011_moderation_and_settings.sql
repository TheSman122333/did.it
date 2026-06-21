alter table public.profiles
  add column banned boolean not null default false,
  add column allow_claps boolean not null default true,
  add column allow_comments boolean not null default true;

-- A reported completion gets hidden (photo no longer served) instead of
-- hard-deleted, so the record/report history survives.
alter table public.completions
  add column removed boolean not null default false;

-- Banned users keep their rows (for the report/moderation history) but
-- lose every write capability. Simplest enforcement point: every existing
-- write policy already checks `= auth.uid()`, so layer a "not banned"
-- check into one shared helper instead of editing every policy by hand.
create or replace function public.is_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select banned from public.profiles where id = uid), false);
$$;
