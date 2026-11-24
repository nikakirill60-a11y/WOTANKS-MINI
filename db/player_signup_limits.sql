-- Private, short-lived counters for the nickname-registration endpoint. No raw IPs or credentials.
create schema if not exists city_tanks_private;
revoke all on schema city_tanks_private from public, anon, authenticated;
create table city_tanks_private.signup_windows (
  period bigint not null, bucket text not null, attempts integer not null, primary key(period,bucket)
);
revoke all on city_tanks_private.signup_windows from public, anon, authenticated;
create function public.city_tanks_signup_slot_v1(client_bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare win bigint := floor(extract(epoch from now())/3600); n integer;
begin
  if client_bucket is null or client_bucket !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from city_tanks_private.signup_windows where period < win-1;
  insert into city_tanks_private.signup_windows values (win,client_bucket,1)
    on conflict(period,bucket) do update set attempts=signup_windows.attempts+1 where signup_windows.attempts<5 returning attempts into n;
  if n is null then return false; end if;
  insert into city_tanks_private.signup_windows values (win,'global',1)
    on conflict(period,bucket) do update set attempts=signup_windows.attempts+1 where signup_windows.attempts<120 returning attempts into n;
  return n is not null;
end; $$;
revoke all on function public.city_tanks_signup_slot_v1(text) from public, anon, authenticated;
grant execute on function public.city_tanks_signup_slot_v1(text) to service_role;
