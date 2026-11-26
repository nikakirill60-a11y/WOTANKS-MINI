-- One read-only snapshot of the three leaderboards. Keep the save table private.
create or replace function public.city_tanks_standings_v1()
returns table (category text, place bigint, callsign text, score bigint, entry_no bigint, is_self boolean)
language sql stable security definer set search_path = '' rows 33 as $$
  with players as (
    select u.id, case when u.email ~ '^[a-z0-9_]{3,24}@players[.]citytanks[.]invalid$'
      then split_part(u.email, '@', 1) else 'Танкист-' || left(u.id::text, 6) end as nick,
      -- A missing fleet (new account/resource-only referral) starts with MS1;
      -- an explicit [] after a sale stays empty. Queued awards and slots aren't tanks.
      (select to_jsonb(count(distinct f.tank)) from jsonb_array_elements(
        case when jsonb_typeof(s.progress->'owned') = 'array' then s.progress->'owned'
             else '["MS1"]'::jsonb end) as f(tank)
       where jsonb_typeof(f.tank) = 'string' and (f.tank #>> '{}') ~ '^[A-Z0-9_-]{1,28}$'
         and not coalesce((s.progress->'rentalBattles') ? (f.tank #>> '{}'), false)
         -- Older ARTA saves used the receipt alone to identify a loaned GPZ.
         and not (f.tank = '"GPZ"'::jsonb and coalesce((s.progress->'usedPromos') ? 'ARTA', false))
      ) as tanks, s.progress->'lifetimeWins' as wins, s.progress->'GOLD' as gold
    from auth.users u left join public.city_tanks_saves_v1 s on s.player_id = u.id
    where u.deleted_at is null and u.is_anonymous is false
  ), scores as (
    select p.id, p.nick, v.board,
      case when jsonb_typeof(v.val) = 'number' and v.val between '0'::jsonb and '9007199254740991'::jsonb
           then trunc(v.val::numeric)::bigint else 0::bigint end as points
    from players p cross join lateral (values ('tanks', p.tanks), ('wins', p.wins), ('gold', p.gold)) v(board, val)
  ), ranked as (
    select s.*, rank() over (partition by s.board order by s.points desc) as standing,
      row_number() over (partition by s.board order by s.points desc, s.nick collate "C", s.id) as line,
      (s.id = (select auth.uid())) is true as mine
    from scores s
  )
  select r.board, r.standing, r.nick, r.points, r.line, r.mine from ranked r
  where r.line <= 10 or r.mine order by r.board, r.line;
$$;
revoke all on function public.city_tanks_standings_v1() from public, anon, authenticated;
grant execute on function public.city_tanks_standings_v1() to anon, authenticated;
