const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
// Unit-test the deployable edge source with its exact platform boundaries, without service credentials.
function edge({slot=true}={}) {
  let handler;const requests=[];
  vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/city-tanks-register/index.ts'),'utf8')),{
    Deno:{serve:f=>{handler=f;},env:{get:n=>n==='SUPABASE_URL'?'https://mock.invalid':'local-test-only'}},
    TextEncoder,TextDecoder,Response,crypto:webcrypto,fetch:async(url,init)=>{
      const path=new URL(url).pathname,body=JSON.parse(init.body);requests.push({path,body});
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
