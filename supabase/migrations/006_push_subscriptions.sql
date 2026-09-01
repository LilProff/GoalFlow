-- 006_push_subscriptions.sql
-- Web Push subscriptions (VAPID). One browser/device registration per row;
-- a user can have several (phone + desktop). endpoint is unique per
-- subscription — re-subscribing the same device replaces its row rather
-- than accumulating duplicates that would each receive the same push.

begin;

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.user_profiles(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone default now()
);

alter table public.push_subscriptions enable row level security;
create policy "Users can CRUD own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

commit;
