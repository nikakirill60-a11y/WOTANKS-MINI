const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
// Unit-test the deployable edge source with its exact platform boundaries, without service credentials.
function edge({slot=true,gift='resources'}={}) {
  let handler;const requests=[];
  vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/city-tanks-register/index.ts'),'utf8')),{
    Deno:{serve:f=>{handler=f;},env:{get:n=>n==='SUPABASE_URL'?'https://mock.invalid':'local-test-only'}},
    TextEncoder,TextDecoder,Response,crypto:webcrypto,fetch:async(url,init)=>{
      const path=new URL(url).pathname,body=JSON.parse(init.body);requests.push({path,body});
      if (path.endsWith('/city_tanks_invite_preview_v1')) return Response.json({gift});
      return path.includes('/rpc/')?Response.json(slot):Response.json({id:'fixture'}, {status:201});
    }
  });
  return {requests,post:input=>handler(new Request('https://mock.invalid/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}))};
}
test('game registration only creates a handle in the reserved namespace; no mailbox, credentials, or admin response is exposed',async()=>{
  const {requests,post}=edge();const password='local fixture password';
  assert.equal((await post({handle:'real@example.com',password})).status,400);assert.equal(requests.length,0);
  const r=await post({handle:'snow_driver',password});assert.deepEqual(await r.json(),{result:'created'});
  assert.equal(requests[0].path,'/rest/v1/rpc/city_tanks_signup_slot_v1');assert.match(requests[0].body.client_bucket,/^[a-f0-9]{64}$/);
  assert.deepEqual(requests[1],{path:'/auth/v1/admin/users',body:{email:'snow_driver@players.citytanks.invalid',password,email_confirm:true}});
});
test('signup limit or invalid input stops before creating an Auth identity',async()=>{
  const {requests,post}=edge({slot:false});assert.equal((await post({handle:'x',password:'tiny'})).status,400);
  assert.equal((await post({handle:'ok_name',password:'fixture password'})).status,429);assert.equal(requests.length,1);
});

test('only a validated invitation code is forwarded in trusted app metadata; neither player ID nor reward is accepted',async()=>{
  const invite=require('node:crypto').randomUUID(), input={handle:'new_player',password:'fixture password',invite,
    gift:'tanks',payout:'xp',amount:9000,app_metadata:{role:'admin'},owner_id:'not-an-id'};
  const a=edge();assert.equal((await a.post({...input,invite:'broken'})).status,422);assert.equal(a.requests.length,0);
  const b=edge({gift:null});assert.equal((await b.post(input)).status,422);assert.equal(b.requests.length,2);
  const limited=edge({slot:false});assert.equal((await limited.post(input)).status,429);assert.equal(limited.requests.length,1);
  const r=await a.post(input);assert.deepEqual(await r.json(),{result:'referred'});assert.deepEqual(a.requests[1].body,{code:invite});
  assert.deepEqual(a.requests[2].body,{email:'new_player@players.citytanks.invalid',password:input.password,email_confirm:true,app_metadata:{city_tanks_invite:invite}});
});
