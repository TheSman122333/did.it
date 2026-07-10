-- Weekly bingo: one shared 5x5 card per week (Monday start), drawn from the
-- same active challenge pool as the daily draw. Marking squares is honor
-- system, no photo proof -- it's a side game, not the main streak.
create table public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  created_at timestamptz not null default now()
);

alter table public.bingo_cards enable row level security;

create policy "bingo_cards are readable by any authenticated user"
  on public.bingo_cards for select
  to authenticated
  using (true);

-- Same lazy-create model as daily_challenges: whoever loads the page first
-- creates the week's card under their own session, so a real insert policy
-- is required. unique(week_start_date) caps it at one card per week.
create policy "any authenticated user can create this week's card"
  on public.bingo_cards for insert
  to authenticated
  with check (week_start_date <= current_date);

create table public.bingo_card_challenges (
  bingo_card_id uuid not null references public.bingo_cards (id) on delete cascade,
  position int not null check (position >= 0 and position < 25),
  challenge_id uuid not null references public.challenges (id),
  primary key (bingo_card_id, position)
);

alter table public.bingo_card_challenges enable row level security;

create policy "bingo_card_challenges are readable by any authenticated user"
  on public.bingo_card_challenges for select
  to authenticated
  using (true);

create policy "any authenticated user can fill a card's squares"
  on public.bingo_card_challenges for insert
  to authenticated
  with check (true);

-- Marked squares stored as a comma-separated position list; completed_at is
-- set exactly once on the first bingo (row/column/diagonal), so re-toggling
-- squares afterwards can never double-count a win.
create table public.user_bingo_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bingo_card_id uuid not null references public.bingo_cards (id) on delete cascade,
  marked_positions text not null default '',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, bingo_card_id)
);

alter table public.user_bingo_progress enable row level security;

create policy "users can read their own bingo progress"
  on public.user_bingo_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can insert their own bingo progress"
  on public.user_bingo_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can update their own bingo progress"
  on public.user_bingo_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.profiles add column bingo_cards_completed int not null default 0;

-- A 5x5 card needs 25 distinct prompts and the original seed only had 10.
-- These are deliberately short so they fit in a bingo square. They join the
-- shared pool, so the daily draw gets more variety out of this too.
insert into public.challenges (prompt)
select prompt from (values
  ('High five a stranger'),
  ('Hold the door for 5 people'),
  ('Learn a stranger''s name'),
  ('Pick up 10 pieces of litter'),
  ('Call a relative you miss'),
  ('Leave a kind note for someone'),
  ('Tell a joke to a stranger'),
  ('Ask a worker how their day is'),
  ('Give up your seat for someone'),
  ('Recommend a song to a stranger'),
  ('Ask for a book recommendation'),
  ('Compliment someone''s shoes'),
  ('Wave at a bus driver'),
  ('Say good morning to 10 people'),
  ('Ask for a local food spot tip'),
  ('Draw something, gift it'),
  ('Text an old friend you miss'),
  ('Help someone carry something'),
  ('Learn one word in a new language'),
  ('Let someone go ahead of you'),
  ('Offer to take a group''s photo'),
  ('Thank a worker by name'),
  ('Chat with someone older than you'),
  ('Share a snack with someone'),
  ('Ask someone their favorite movie')
) as seed(prompt)
where not exists (
  select 1 from public.challenges c where c.prompt = seed.prompt
);
