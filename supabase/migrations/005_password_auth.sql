-- 005_password_auth.sql
-- Moving off Clerk to self-issued JWT auth (bcrypt password hashes, signed
-- with JWT_SECRET). user_profiles.id already went from `auth.users`-linked
-- uuid to a free-standing `text` id in migration 004, so this table needs
-- nothing structural beyond somewhere to put the hash.

begin;

alter table public.user_profiles add column if not exists password_hash text;

commit;
