-- Catches the one extra test account created by the storage cleanup
-- script in this same session. Safe to run even if there's nothing left.
delete from auth.users;
