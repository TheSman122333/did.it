-- Pool of real-world dare prompts that daily_challenges draws from.
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

create policy "challenges are readable by any authenticated user"
  on public.challenges for select
  to authenticated
  using (true);

-- Carry over any prompts from the old per-user quest pool, if present.
-- Uses dynamic SQL since `quests` may not exist in fresh environments and a
-- direct reference would fail at parse time regardless of a runtime guard.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'quests'
  ) then
    execute 'insert into public.challenges (prompt) select title from public.quests';
  end if;
end;
$$;

insert into public.challenges (prompt)
select prompt from (values
  ('Fist bump 15 strangers'),
  ('Compliment a stranger'),
  ('Ask someone for directions, even if you don''t need them'),
  ('Strike up a conversation with someone in line'),
  ('Introduce yourself to someone new'),
  ('Ask a stranger to take your photo'),
  ('Tell a stranger you like something about their outfit'),
  ('Ask someone what their favorite book is'),
  ('Give a genuine compliment to a coworker or classmate'),
  ('Wave and say hello to 5 strangers')
) as seed(prompt)
where not exists (select 1 from public.challenges);
