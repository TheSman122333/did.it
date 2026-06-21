-- Tracks when each user last looked at the Social feed, so a completion
-- (or a new comment on one) can be flagged unread if it happened after
-- that. Null means "never viewed" -- everything is unread.
alter table public.profiles
  add column feed_last_seen_at timestamptz;
