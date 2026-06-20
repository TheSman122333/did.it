-- Anonymous users (auth.users.email is null) would otherwise generate a
-- null handle and violate the not-null constraint, since split_part(null,
-- ...) propagates null through the rest of the expression.
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
  base_handle := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), ''), '[^a-z0-9_]', '', 'g'));
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
