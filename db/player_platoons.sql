-- Ephemeral registered-only platoons. Prefer private Realtime Broadcast; fall back
-- to a bounded, unlogged latest-frame mailbox if the WebSocket relay is unavailable.
create table city_tanks_private.platoons (
  id uuid primary key default gen_random_uuid(), code text unique not null default upper(left(gen_random_uuid()::text,8)),
  phase text not null default 'lobby' check (phase in ('lobby','loading','live','done')),
  sector text not null, http_relay boolean not null default false, expires timestamptz not null default now()+interval '2 minutes', result jsonb
);
create table city_tanks_private.platoon_seats (
  uid uuid primary key references auth.users(id) on delete cascade,
  room uuid not null references city_tanks_private.platoons(id) on delete cascade,
  seat integer not null check(seat between 0 and 2), lease uuid not null, nickname text not null,
  tank text not null, mods jsonb not null, upgrades jsonb not null,
  ready boolean not null default false, loaded boolean not null default false, seen timestamptz not null default now(), unique(room,seat)
);
-- Not a battle log: at most THREE replaceable frames per active fallback match.
create unlogged table city_tanks_private.platoon_frames (
  room uuid not null references city_tanks_private.platoons(id) on delete cascade,
  seat int not null check(seat between 0 and 2), seq bigint not null, frame jsonb not null,
  written timestamptz not null default now(), primary key(room,seat)
);
alter table city_tanks_private.platoon_frames enable row level security;
alter table city_tanks_private.platoons enable row level security;
alter table city_tanks_private.platoon_seats enable row level security;
revoke all on city_tanks_private.platoons, city_tanks_private.platoon_seats, city_tanks_private.platoon_frames from public, anon, authenticated;

create function public.city_tanks_platoon_v1(op text, ticket uuid, args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); m city_tanks_private.platoon_seats; r city_tanks_private.platoons;
  n int; nick text; vehicle text; g jsonb; modules jsonb; levels jsonb; report jsonb; k text;
begin
  if who is null or ticket is null or octet_length(args::text)>2048 then return '{"error":"invalid"}'; end if;
  if not exists(select 1 from auth.users u where u.id=who and u.is_anonymous is false and u.deleted_at is null) then raise exception 'account required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(who::text,31));
  if op in ('create','join') then delete from city_tanks_private.platoons where expires<now(); end if;
  select * into m from city_tanks_private.platoon_seats where uid=who;
  if m.room is not null then select * into r from city_tanks_private.platoons where id=m.room for update; end if;
  if r.id is not null and r.phase<>'done' then
    if r.expires<now() or not exists(select 1 from city_tanks_private.platoon_seats where room=r.id and seat=0 and seen>now()-interval '90 seconds')
      or (r.phase<>'lobby' and exists(select 1 from city_tanks_private.platoon_seats where room=r.id and seen<now()-interval '90 seconds')) then
      delete from city_tanks_private.platoons where id=r.id; r:=null; m:=null;
    elsif r.phase='lobby' then
      delete from city_tanks_private.platoon_seats where room=r.id and seat<>0 and seen<now()-interval '90 seconds';
      if m.seen<now()-interval '90 seconds' then m:=null; r:=null; end if;
    end if;
  end if;
  if r.phase='done' and op in ('create','join') and m.lease<>ticket then
    delete from city_tanks_private.platoon_seats where uid=who; r:=null; m:=null;
  end if;
  if r.id is not null and m.lease<>ticket then return '{"error":"occupied"}'; end if;
  if op in ('create','join') and r.id is null then
    select case when u.email ~ '^[a-z0-9_]{3,24}@players\.citytanks\.invalid$' then split_part(u.email,'@',1) else 'Танкист-'||left(who::text,6) end into nick
      from auth.users u where u.id=who and not u.is_anonymous and u.deleted_at is null;
    select progress into g from public.city_tanks_saves_v1 where player_id=who;
    vehicle:=args->>'tank';
    if nick is null or vehicle is null or vehicle !~ '^[A-Z0-9_-]{1,28}$' or not coalesce((coalesce(g->'owned','["MS1"]') ? vehicle),false) then return '{"error":"tank"}'; end if;
    if op='create' then
      if not coalesce(args->>'map' in ('city','port','field','desert','quarry','frost'),false) then return '{"error":"invalid"}'; end if;
      insert into city_tanks_private.platoons(sector) values(args->>'map') returning * into r; n:=0;
    else
      select * into r from city_tanks_private.platoons where code=upper(args->>'code') and phase='lobby' and expires>now() for update;
      if r.id is null then return '{"error":"missing"}'; end if;
      if not exists(select 1 from city_tanks_private.platoon_seats where room=r.id and seat=0 and seen>now()-interval '90 seconds') then return '{"error":"missing"}'; end if;
      delete from city_tanks_private.platoon_seats where room=r.id and seat<>0 and seen<now()-interval '90 seconds';
      select min(i) into n from generate_series(1,2) i where not exists(select 1 from city_tanks_private.platoon_seats s where s.room=r.id and s.seat=i);
      if n is null then return '{"error":"full"}'; end if;
    end if;
    -- Only the equipped vehicle's supported module IDs and three upgrade levels are shared.
    select coalesce(jsonb_agg(v order by i),'[]') into modules from (select i,g->'modules'->vehicle->>i as v from generate_series(0,2)i) slots
      where v in ('rammer','optics','vents','spall','camo_net','gun_lay','turbo','armor_plate');
    levels:='{}'; foreach k in array array['gun','engine','turret'] loop
      if g->'upgrades'->vehicle->>k in ('1','2') then levels:=levels||jsonb_build_object(k,(g->'upgrades'->vehicle->>k)::int); end if;
    end loop;
    insert into city_tanks_private.platoon_seats(uid,room,seat,lease,nickname,tank,mods,upgrades,ready)
      values(who,r.id,n,ticket,nick,vehicle,modules,levels,n=0) returning * into m;
  elsif r.id is null then return '{"error":"missing"}';
  elsif op='leave' then
    if r.phase in ('loading','live') or (r.phase='lobby' and m.seat=0) then delete from city_tanks_private.platoons where id=r.id;
    else delete from city_tanks_private.platoon_seats where uid=who; end if;
    if r.phase='done' and not exists(select 1 from city_tanks_private.platoon_seats where room=r.id) then delete from city_tanks_private.platoons where id=r.id; end if;
    return '{"left":true}';
  elsif op='ready' and r.phase='lobby' and m.seat<>0 then
    update city_tanks_private.platoon_seats set ready=(args->'ready'='true'::jsonb) is true where uid=who;
  elsif op='start' and r.phase='lobby' and m.seat=0 then
    if (select count(*)<2 or not bool_and(ready) from city_tanks_private.platoon_seats where room=r.id) then return '{"error":"not_ready"}'; end if;
    update city_tanks_private.platoons set phase='loading' where id=r.id returning * into r;
  elsif op='relay' and r.phase in ('loading','live') then
    update city_tanks_private.platoons set http_relay=true where id=r.id returning * into r;
  elsif op='loaded' and r.phase='loading' then
    update city_tanks_private.platoon_seats set loaded=true where uid=who;
    if not exists(select 1 from city_tanks_private.platoon_seats where room=r.id and not loaded) then
      update city_tanks_private.platoons set phase='live' where id=r.id returning * into r;
    end if;
  elsif op='finish' and m.seat=0 and r.phase='live' then
    report:=args->'result';
    if jsonb_typeof(report->'won') is distinct from 'boolean' or jsonb_typeof(report->'scores') is distinct from 'array' then return '{"error":"invalid"}'; end if;
    if jsonb_array_length(report->'scores')<>3 or exists(select 1 from jsonb_array_elements(report->'scores') v where v::text !~ '^\[[0-9]{1,6}, [0-7], [0-9]{1,5}\]$') then return '{"error":"invalid"}'; end if;
    update city_tanks_private.platoons set phase='done',result=jsonb_build_object('won',report->'won','scores',report->'scores') where id=r.id returning * into r;
  elsif op not in ('poll','create','join') and not(op='loaded' and r.phase='live') and not(op='finish' and m.seat=0 and r.phase='done') then return '{"error":"state"}';
  end if;
  update city_tanks_private.platoon_seats set seen=now() where uid=who;
  update city_tanks_private.platoons set expires=now()+interval '2 minutes' where id=r.id;
  return jsonb_build_object('id',r.id,'code',r.code,'phase',r.phase,'relay',r.http_relay,'map',r.sector,'me',m.seat,'result',r.result,'members',
    (select jsonb_agg(jsonb_build_object('seat',s.seat,'nick',s.nickname,'tank',s.tank,'mods',s.mods,'upgrades',s.upgrades,'ready',s.ready,'loaded',s.loaded) order by s.seat) from city_tanks_private.platoon_seats s where s.room=r.id));
end; $$;
revoke all on function public.city_tanks_platoon_v1(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.city_tanks_platoon_v1(text,uuid,jsonb) to authenticated;

-- One private topic per driver. Only seat 0 may publish the world; a wingman can send
-- commands only on their own topic. No broader change to other Realtime applications.
create function public.city_tanks_platoon_channel_v1(topic text, writing boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from city_tanks_private.platoon_seats me join city_tanks_private.platoons r on r.id=me.room
   join city_tanks_private.platoon_seats sender on sender.room=r.id join auth.users u on u.id=me.uid where me.uid=auth.uid() and u.is_anonymous is false and u.deleted_at is null and r.phase in ('loading','live') and r.expires>now()
   and $1='ct-platoon-v1:'||r.id::text||':'||sender.seat::text and (not $2 or sender.uid=me.uid));
$$;
revoke all on function public.city_tanks_platoon_channel_v1(text,boolean) from public,anon,authenticated;
grant execute on function public.city_tanks_platoon_channel_v1(text,boolean) to authenticated;
create policy ct_platoon_listen on realtime.messages for select to authenticated using(extension='broadcast' and (select public.city_tanks_platoon_channel_v1(realtime.topic(),false)));
create policy ct_platoon_transmit on realtime.messages for insert to authenticated with check(extension='broadcast' and (select public.city_tanks_platoon_channel_v1(realtime.topic(),true)));

-- Used only on explicit fallback. Authenticated identity + private tab lease select
-- the room and writer; a caller cannot supply a room ID, recipient or another seat.
create function public.city_tanks_platoon_frame_v1(ticket uuid, packet jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m city_tanks_private.platoon_seats; n bigint;
begin
  select s.* into m from city_tanks_private.platoon_seats s join auth.users u on u.id=s.uid
    join city_tanks_private.platoons r on r.id=s.room where s.uid=auth.uid() and s.lease=ticket
    and u.is_anonymous is false and u.deleted_at is null and r.http_relay and r.phase='live' and r.expires>now();
  if m.uid is null then return '{"closed":true}'; end if;
  if jsonb_typeof(packet) is distinct from 'object' or not coalesce(packet->>'n' ~ '^[0-9]{1,12}$',false)
    or octet_length(packet::text)>(case when m.seat=0 then 49152 else 6144 end) then return '{"error":"invalid"}'; end if;
  n:=(packet->>'n')::bigint;
  insert into city_tanks_private.platoon_frames as f(room,seat,seq,frame) values(m.room,m.seat,n,packet)
    on conflict(room,seat) do update set seq=excluded.seq,frame=excluded.frame,written=excluded.written
    where f.seq<excluded.seq and f.written<now()-interval '180 milliseconds';
  return jsonb_build_object('frames',(select coalesce(jsonb_agg(jsonb_build_array(f.seat,f.frame)),'[]')
    from city_tanks_private.platoon_frames f where f.room=m.room and f.seat<>m.seat and (m.seat=0 or f.seat=0)));
end; $$;
revoke all on function public.city_tanks_platoon_frame_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.city_tanks_platoon_frame_v1(uuid,jsonb) to authenticated;
