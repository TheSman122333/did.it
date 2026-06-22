-- Storage rows can't be deleted with plain SQL (Supabase blocks it so the
-- underlying file in the bucket doesn't end up orphaned) -- that part has
-- to go through the Storage API instead, done separately. This just
-- catches the one extra test account created while verifying 0019.
delete from auth.users;
