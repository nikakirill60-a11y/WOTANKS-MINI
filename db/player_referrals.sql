-- Requires winter_player_saves.sql and player_signup_limits.sql. Tokens are public invitations,
-- not session credentials. Neither the link owner nor the two choices come from the recipient.
create table city_tanks_private.referral_links (
  code uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payout text not null check (payout in ('gold','xp')),
  gift text not null check (gift in ('resources','tanks')),
  unique(owner_id,payout,gift)
);
create table city_tanks_private.referral_entries (
  newcomer uuid primary key references auth.users(id) on delete cascade,
  link uuid not null references city_tanks_private.referral_links(code) on delete cascade,
  paid boolean not null default false
);
alter table city_tanks_private.referral_links enable row level security;
alter table city_tanks_private.referral_entries enable row level security;
create index referral_entries_link_idx on city_tanks_private.referral_entries(link,paid);
revoke all on city_tanks_private.referral_links, city_tanks_private.referral_entries from public, anon, authenticated;

create function public.city_tanks_invite_v1(payout text, gift text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result uuid;
begin
  if not exists (select 1 from auth.users u where u.id=uid and not u.is_anonymous and u.deleted_at is null) then
    raise exception 'account required' using errcode='42501';
  end if;
  insert into city_tanks_private.referral_links(owner_id,payout,gift) values (uid,$1,$2)
    on conflict on constraint referral_links_owner_id_payout_gift_key do nothing;
  select l.code into strict result from city_tanks_private.referral_links l where l.owner_id=uid and l.payout=$1 and l.gift=$2;
  return result;
end; $$;
revoke all on function public.city_tanks_invite_v1(text,text) from public, anon, authenticated;
grant execute on function public.city_tanks_invite_v1(text,text) to authenticated;

-- One opaque code can be previewed before login; no account identifiers or directory of links.
create function public.city_tanks_invite_preview_v1(code uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('gift',(select l.gift from city_tanks_private.referral_links l where l.code=$1));
$$;
revoke all on function public.city_tanks_invite_preview_v1(uuid) from public;
grant execute on function public.city_tanks_invite_preview_v1(uuid) to anon, authenticated, service_role;

-- The registration endpoint alone supplies app_metadata (never user_metadata). Enrollment,
-- first-save gift and the inviter's receipt commit or roll back with creation of the identity.
create function city_tanks_private.enroll_referral() returns trigger
language plpgsql security definer set search_path = '' as $$
declare offer city_tanks_private.referral_links; starter jsonb; invitation text;
begin
  -- GoTrue writes admin app_metadata AFTER INSERT, in the same transaction. Read the final row.
  select u.raw_app_meta_data->>'city_tanks_invite' into invitation from auth.users u where u.id=new.id;
  if invitation is null then return null; end if;
  select * into strict offer from city_tanks_private.referral_links where code=invitation::uuid;
  if new.is_anonymous or new.email is null or new.email !~ '^[a-z0-9_]{3,24}@players\.citytanks\.invalid$' or offer.owner_id=new.id then
    raise exception 'invalid referral registration';
  end if;
  -- Other fields use the ordinary starter defaults on load. 1500 XP = 500 starting XP + 1000 gift XP.
  starter := case offer.gift when 'resources' then '{"XP":1500,"GOLD":250}'::jsonb
    else '{"owned":["MS1","PZ-II-J","T67"],"selected":"MS1","rentalBattles":{"T67":5}}'::jsonb end;
  insert into public.city_tanks_saves_v1(player_id,revision,progress) values(new.id,1,starter);
  insert into city_tanks_private.referral_entries(newcomer,link) values(new.id,offer.code);
  return new;
end; $$;
revoke all on function city_tanks_private.enroll_referral() from public, anon, authenticated;
create constraint trigger city_tanks_enroll_referral after insert on auth.users deferrable initially deferred for each row
  when (new.email like '%@players.citytanks.invalid') execute function city_tanks_private.enroll_referral();

-- Settle ONLY the caller's receipts, locking the same save as the ordinary CAS writer. A live
-- client supplies its revision; login may pass NULL before reading the server snapshot.
create function public.city_tanks_referral_collect_v1(expected_revision integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); rev integer; n bigint; g bigint := 0; x bigint := 0;
begin
  if uid is null then raise exception 'account required' using errcode='42501'; end if;
  select s.revision into rev from public.city_tanks_saves_v1 s where s.player_id=uid for update;
  select count(*) into n from city_tanks_private.referral_entries e join city_tanks_private.referral_links l on l.code=e.link where l.owner_id=uid;
  if expected_revision is not null and expected_revision <> coalesce(rev,0) then return jsonb_build_object('stale',true); end if;
  if rev is not null then
    with claims as (
      update city_tanks_private.referral_entries e set paid=true from city_tanks_private.referral_links l
        where e.link=l.code and l.owner_id=uid and not e.paid returning l.payout
    ) select 25 * count(*) filter (where payout='gold'), 250 * count(*) filter (where payout='xp') into g,x from claims;
    if g+x>0 then
      update public.city_tanks_saves_v1 s set progress=s.progress || jsonb_build_object(
        'GOLD',coalesce((s.progress->>'GOLD')::numeric,0)+g,'XP',coalesce((s.progress->>'XP')::numeric,500)+x), revision=s.revision+1
        where s.player_id=uid returning s.revision into rev;
    end if;
  end if;
  return jsonb_build_object('invited',n,'gold',g,'xp',x,'revision',coalesce(rev,0));
end; $$;
revoke all on function public.city_tanks_referral_collect_v1(integer) from public, anon, authenticated;
grant execute on function public.city_tanks_referral_collect_v1(integer) to authenticated;
