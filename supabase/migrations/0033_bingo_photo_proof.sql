-- Bingo squares now require photo proof, same as the daily challenge.
-- One row per claimed square, replacing the honor-system CSV column on
-- user_bingo_progress. Photos live in the existing private completions
-- bucket under {user_id}/bingo-{card_id}-{position}.jpg, so the current
-- storage policies (insert/read own folder, friends can read) already
-- cover them with no changes.
create table public.bingo_square_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bingo_card_id uuid not null references public.bingo_cards (id) on delete cascade,
  position int not null check (position >= 0 and position < 25),
  photo_path text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bingo_card_id, position)
);

alter table public.bingo_square_completions enable row level security;

create policy "users can read their own bingo squares"
  on public.bingo_square_completions for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can claim their own bingo squares"
  on public.bingo_square_completions for insert
  to authenticated
  with check (user_id = auth.uid());

alter table public.user_bingo_progress drop column marked_positions;

-- Squares marked under the old tap-to-claim rules have no photos behind
-- them, so wipe the test data and start counting under the real rules.
delete from public.user_bingo_progress;
update public.profiles set bingo_cards_completed = 0 where bingo_cards_completed > 0;
