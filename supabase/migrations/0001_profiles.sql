-- Profiles: one row per auth.users, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint handle_format check (handle ~ '^[a-z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Generates a default unique handle from the user's email, falling back to
-- a random suffix on collision so signup never blocks on a taken handle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  candidate text;
  suffix int := 0;
begin
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := base_handle || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base_handle := substr(base_handle, 1, 20);
  candidate := base_handle;

  while exists (select 1 from public.profiles where handle = candidate) loop
    suffix := suffix + 1;
    candidate := substr(base_handle, 1, 20 - length(suffix::text) - 1) || '_' || suffix;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, candidate, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
