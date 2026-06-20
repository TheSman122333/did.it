-- Users who signed up before the on_auth_user_created trigger existed
-- (0001_profiles.sql) have no profiles row. completions.user_id references
-- profiles, so without this backfill their first photo submission would
-- fail on a foreign key violation. Reuses the same handle-generation logic
-- as public.handle_new_user().
do $$
declare
  u record;
  base_handle text;
  candidate text;
  suffix int;
begin
  for u in
    select au.id, au.email
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    base_handle := lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g'));
    if length(base_handle) < 3 then
      base_handle := base_handle || substr(replace(u.id::text, '-', ''), 1, 6);
    end if;
    base_handle := substr(base_handle, 1, 20);
    candidate := base_handle;
    suffix := 0;

    while exists (select 1 from public.profiles where handle = candidate) loop
      suffix := suffix + 1;
      candidate := substr(base_handle, 1, 20 - length(suffix::text) - 1) || '_' || suffix;
    end loop;

    insert into public.profiles (id, handle) values (u.id, candidate);
  end loop;
end;
$$;
