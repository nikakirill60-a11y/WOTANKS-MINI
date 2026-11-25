-- Applied to Wot-mini. No service-role key, password, or email belongs in a game save.
create table public.city_tanks_saves_v1 (
  player_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  progress jsonb not null check (jsonb_typeof(progress) = 'object' and octet_length(progress::text) <= 262144)
);
alter table public.city_tanks_saves_v1 enable row level security;
revoke all on table public.city_tanks_saves_v1 from public, anon, authenticated;
grant select, insert, update on table public.city_tanks_saves_v1 to authenticated;
create policy read_own_save on public.city_tanks_saves_v1 for select to authenticated
  using (player_id = (select auth.uid()));
create policy create_own_save on public.city_tanks_saves_v1 for insert to authenticated
  with check (player_id = (select auth.uid()));
create policy change_own_save on public.city_tanks_saves_v1 for update to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));
create function public.city_tanks_clock_v1() returns timestamptz language sql stable security invoker
  set search_path = '' as $$ select now() $$;
revoke all on function public.city_tanks_clock_v1() from public, anon;
grant execute on function public.city_tanks_clock_v1() to authenticated;
