-- Upgrade after player_platoons.sql. Replace only the map check, leaving existing
-- matches, function ownership/ACLs, authorization and messaging policies untouched.
do $migration$
declare
  ddl text := pg_get_functiondef('public.city_tanks_platoon_v1(text,uuid,jsonb)'::regprocedure);
  before_check text := $q$args->>'map' in ('city','port','field','desert','quarry','frost')$q$;
  after_check text := $q$args->>'map' in ('city','port','field','desert','quarry','frost','burgstadt','cape','sawmill','airfield')$q$;
begin
  if strpos(ddl, after_check) > 0 then return; end if;
  if strpos(ddl, before_check) = 0 then raise exception 'Unexpected platoon sector check'; end if;
  execute replace(ddl, before_check, after_check);
end;
$migration$;
