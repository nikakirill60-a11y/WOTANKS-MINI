// In-memory PostgreSQL runs the shipped schema, grants, trigger and RPCs. Only the HTTP
// transport and Auth identity service are simulated: CI never creates a real player.
const {PGlite}=require('@electric-sql/pglite'), {randomUUID,webcrypto}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const source=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
async function database(t,{platoons=false}={}) {
  const db=await PGlite.create(); t.after(()=>db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,email text unique,is_anonymous boolean default false,deleted_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;`);
  for(const file of ['winter_player_saves','player_signup_limits','player_referrals'])await db.exec(source(`db/${file}.sql`));
  if(platoons) {
    await db.exec(`create schema realtime; create table realtime.messages(extension text); alter table realtime.messages enable row level security;
      create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
      grant usage on schema realtime to authenticated; grant select,insert on realtime.messages to authenticated;`);
    await db.exec(source('db/player_platoons.sql'));
  }
  const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
  // GoTrue admin creation: INSERT, then update trusted metadata in the same transaction.
  async function identity(email,code) {
    const id=randomUUID(); await db.transaction(async tx=>{
      await tx.query('insert into auth.users(id,email) values ($1,$2)',[id,email]);
      if(code)await tx.query('update auth.users set raw_app_meta_data=$2 where id=$1',[id,JSON.stringify({city_tanks_invite:code})]);
    });return id;
  }
  const as=(uid,sql,args=[],service=false)=>db.transaction(async tx=>{
    await tx.exec('set local role '+(service?'service_role':uid?'authenticated':'anon'));
    if(uid)await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);
    return (await tx.query(sql,args)).rows;
  });
  const rpc=async(uid,name,args=[],service=false)=>(await as(uid,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args,service))[0].result;
  return {rows,identity,as,rpc};
}
async function bridge(t,options) {
  const pg=await database(t,options), passwords=new Map(),sessions=new Map(),errors=[];
  let handler;const origin='https://tkkpdtfhcwwondonfjsi.supabase.co';
  vm.runInNewContext(stripTypeScriptTypes(source('supabase/functions/city-tanks-register/index.ts')),{
    Deno:{serve:f=>handler=f,env:{get:k=>k==='SUPABASE_URL'?origin:'fixture-not-a-key'}},TextEncoder,TextDecoder,Response,crypto:webcrypto,
    fetch:async(url,init)=>{const body=JSON.parse(init.body),route=new URL(url).pathname;
      if(route.endsWith('signup_slot_v1'))return Response.json(await pg.rpc(null,'city_tanks_signup_slot_v1',[body.client_bucket],true));
      if(route.endsWith('invite_preview_v1'))return Response.json(await pg.rpc(null,'city_tanks_invite_preview_v1',[body.code],true));
      if(route!=='/auth/v1/admin/users')throw Error(route);
      if(passwords.has(body.email))return Response.json({code:'email_exists'},{status:422});
      const id=await pg.identity(body.email,body.app_metadata?.city_tanks_invite);passwords.set(body.email,{id,password:body.password});return Response.json({id},{status:201});}
  });
  const state={dropCollect:false};
  const route=async r=>{
    const q=r.request(),u=new URL(q.url()),method=q.method(),headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'*','x-supabase-api-version':'2024-01-01'};
    const reply=(status,data)=>r.fulfill({status,headers,body:status===204?'':JSON.stringify(data)});
    try {
      if(u.origin!==origin)throw Error('unexpected origin');if(method==='OPTIONS')return reply(204);
      const body=q.postDataJSON()||{},uid=sessions.get(q.headers().authorization?.replace('Bearer ',''));
      if(u.pathname.endsWith('/functions/v1/city-tanks-register')){
        const result=await handler(new Request(u.href,{method,headers:q.headers(),body:JSON.stringify(body)}));return reply(result.status,await result.json());
      }
      if(u.pathname==='/auth/v1/token'){
        const user=passwords.get(body.email);if(!user||user.password!==body.password)return reply(400,{code:'invalid_credentials',msg:'Invalid login credentials'});
        const token=randomUUID();sessions.set(token,user.id);return reply(200,{access_token:token,refresh_token:randomUUID(),token_type:'bearer',expires_in:3600,user:{id:user.id,email:body.email}});
      }
      if(u.pathname==='/rest/v1/rpc/city_tanks_invite_preview_v1')return reply(200,await pg.rpc(null,'city_tanks_invite_preview_v1',[body.code]));
      if(!uid)return reply(401,{});
      if(u.pathname==='/auth/v1/logout')return reply(200,{});
      if(options?.platoons && u.pathname.endsWith('/rpc/city_tanks_platoon_frame_v1'))return reply(200,await pg.rpc(uid,'city_tanks_platoon_frame_v1',[body.ticket,body.packet]));
      if(options?.platoons && u.pathname.endsWith('/rpc/city_tanks_platoon_v1'))return reply(200,await pg.rpc(uid,'city_tanks_platoon_v1',[body.op,body.ticket,body.args]));
      if(u.pathname.endsWith('/rpc/city_tanks_clock_v1'))return reply(200,'2026-11-22T12:00:00Z');
      if(u.pathname.endsWith('/rpc/city_tanks_invite_v1'))return reply(200,await pg.rpc(uid,'city_tanks_invite_v1',[body.payout,body.gift]));
      if(u.pathname.endsWith('/rpc/city_tanks_referral_collect_v1')){
        const result=await pg.rpc(uid,'city_tanks_referral_collect_v1',[body.expected_revision]);
        if(state.dropCollect){state.dropCollect=false;return r.abort();}return reply(200,result);
      }
      if(u.pathname!=='/rest/v1/city_tanks_saves_v1')throw Error('unexpected route: '+u.pathname);
      const owner=method==='POST'?body.player_id:u.searchParams.get('player_id')?.slice(3);
      if(method==='GET')return reply(200,await pg.as(uid,'select revision,progress from public.city_tanks_saves_v1 where player_id=$1',[owner]));
      if(method==='POST')return reply(201,await pg.as(uid,'insert into public.city_tanks_saves_v1 values($1,$2,$3) returning revision',[owner,body.revision,JSON.stringify(body.progress)]));
      if(method==='PATCH')return reply(200,await pg.as(uid,'update public.city_tanks_saves_v1 set revision=$2,progress=$3 where player_id=$1 and revision=$4 returning revision',[owner,body.revision,JSON.stringify(body.progress),u.searchParams.get('revision').slice(3)]));
      throw Error(method);
    } catch(e){errors.push(e.message);return reply(500,{});}
  };
  t.after(()=>require('node:assert/strict').deepEqual(errors,[]));return {pg,route,state,identityFor:token=>sessions.get(token)};
}
module.exports={database,bridge};
