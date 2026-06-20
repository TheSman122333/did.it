-- One shared challenge per calendar date, replacing the old per-user
-- daily_quests table. `reveal_at` supports a future randomized "moment".
create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id),
  date date not null unique,
  reveal_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.daily_challenges enable row level security;

create policy "daily_challenges are readable by any authenticated user"
  on public.daily_challenges for select
  to authenticated
  using (true);

-- The Next.js server actions run under the requesting user's own session
-- (anon key + cookies, no service role), so lazy "create today's row if
-- missing" needs a real insert policy, not just server-side trust. The
-- unique(date) constraint caps abuse to one row per day regardless of who
-- creates it; the challenge_id still has to point at a real challenges row.
create policy "any authenticated user can create today's challenge"
  on public.daily_challenges for insert
  to authenticated
  with check (date <= current_date);
