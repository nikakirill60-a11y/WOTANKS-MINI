const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{openGame}=require('./winter-harness.cjs');

// Real bundled AuthClient + browser forms; simulate only the remote API. No emails,
// accounts, tokens or player data from the real Supabase project are used by CI.
function service() {
  const users=new Map(), sessions=new Map(), rows=new Map(), forbidden=[];
  const api={users,rows,forbidden,writes:0,time:'2026-12-01T12:00:00Z',offline:false,failRead:false};
  api.route=async route=>{
    const q=route.request(),u=new URL(q.url()),m=q.method(),body=q.postDataJSON()||{};
    const json=(status,data)=>route.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':'*','x-supabase-api-version':'2024-01-01'},body:JSON.stringify(data)});
    if(api.offline)return route.abort('internetdisconnected');
    if(u.origin!=='https://tkkpdtfhcwwondonfjsi.supabase.co'){forbidden.push(u.origin);return route.abort();}
    if(m==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'*'}});
    if(u.pathname==='/functions/v1/city-tanks-register'){
      const {handle,password}=body,email=handle+'@players.citytanks.invalid';if(users.has(email))return json(409,{result:'taken'});
      users.set(email,{id:randomUUID(),email,password});return json(201,{result:'created'});
    }
    if(u.pathname==='/auth/v1/token') {
      const user=users.get(body.email);if(!user||body.password!==user.password)return json(400,{code:'invalid_credentials',msg:'Invalid login credentials'});
      const access=randomUUID();sessions.set(access,user.id);return json(200,{access_token:access,refresh_token:randomUUID(),token_type:'bearer',expires_in:3600,user:{id:user.id,email:user.email}});
    }
    const access=q.headers().authorization?.replace('Bearer ',''),uid=sessions.get(access);
    if(!uid){forbidden.push(u.pathname);return json(401,{});}
    if(u.pathname==='/auth/v1/logout'){sessions.delete(access);return json(200,{});}
    if(u.pathname==='/rest/v1/rpc/city_tanks_clock_v1')return json(200,api.time);
    if(u.pathname!=='/rest/v1/city_tanks_saves_v1'){forbidden.push(u.pathname);return json(404,{});}
    const owner=m==='POST'?body.player_id:u.searchParams.get('player_id')?.slice(3);
    if(uid!==owner){forbidden.push('wrong owner');return json(403,{});}
    const old=rows.get(uid);
    if(m==='GET')return api.failRead?json(503,{}):json(200,old?[old]:[]);
    if(m==='POST'&&old)return json(409,{});
    if(m==='PATCH'&&(!old||u.searchParams.get('revision')!=='eq.'+old.revision))return json(200,[]);
    api.writes++;rows.set(uid,{revision:body.revision,progress:body.progress});return json(200,[{revision:body.revision}]);
  };
  return api;
}
async function form(p,handle,password,button) {
  if(!await p.locator('#account-modal').isVisible())await p.getByRole('button',{name:'Профиль игрока'}).click();
  await p.getByLabel('Позывной игрока').fill(handle);await p.getByLabel('Пароль',{exact:true}).fill(password);
  await p.getByRole('button',{name:button,exact:true}).click();
}
const active=p=>p.waitForFunction(()=>Accounts.active && !Accounts.switching);
const synced=p=>p.waitForFunction(()=>document.getElementById('save-status').textContent==='Прогресс сохранён в облаке');
async function logout(p) {
  if(!await p.locator('#account-modal').isVisible())await p.getByRole('button',{name:'Профиль игрока'}).click();
  await p.getByRole('button',{name:'Выйти в гостевой ангар'}).click();await p.waitForFunction(()=>!Accounts.active && !Accounts.switching);
}

test('nickname signup, real SDK sign-in, server date, session reload and two isolated cloud players vs an existing guest',async t=>{
  const api=service(),{page,click,saved}=await openGame(t,{route:api.route,seed:{owned:['MS1','IS4'],selected:'IS4',GOLD:19000,XP:1700}});
  const guest=await saved();assert.equal(api.writes,0);await form(page,'polar_one','example pass A','Создать аккаунт');await active(page);await synced(page);
  const alice=api.users.get('polar_one@players.citytanks.invalid').id;
  assert.deepEqual(api.rows.get(alice).progress.owned,['MS1']);assert.equal(api.rows.get(alice).progress.GOLD,50);
  assert.deepEqual(api.rows.get(alice).progress.advent2026.dates,['2026-12-01']);assert.deepEqual(await saved(),guest);
  await click('В ангар');await click('ОБМЕН');await synced(page);assert.equal(api.rows.get(alice).progress.GOLD,60);
  const before=api.writes;await page.reload();await active(page);await synced(page);assert.equal(api.writes,before,'reload must not create a new revision or a second reward');
  assert.equal(await page.locator('#gold-val').innerText(),'60');await logout(page);assert.deepEqual(await saved(),guest);assert.equal(await page.locator('#dispatch-name').innerText(),'ИС-4');
  await form(page,'polar_two','example pass B','Создать аккаунт');await active(page);await synced(page);
  assert.equal(await page.locator('#gold-val').innerText(),'50');await logout(page);
  await form(page,'polar_one','wrong password','Войти');await page.waitForFunction(()=>!Accounts.switching);assert.equal(await page.evaluate(()=>Accounts.active),false);assert.equal(api.rows.get(alice).progress.GOLD,60);
  await form(page,'polar_one','example pass A','Войти');await active(page);assert.equal(await page.locator('#gold-val').innerText(),'60');
  assert.deepEqual(await saved(),guest);assert.deepEqual(api.forbidden,[]);
  const storage=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));assert.doesNotMatch(storage,/example pass|wrong password/);
});

test('failed initial cloud read never initializes a fresh save; offline outbox survives logout, and revision conflicts preserve both versions',async t=>{
  const api=service(),who=randomUUID(),email='returning@players.citytanks.invalid'; api.users.set(email,{id:who,email,password:'test phrase'});
  api.rows.set(who,{revision:7,progress:{owned:['MS1','TL7'],selected:'TL7',GOLD:710,XP:600}});api.time='2026-11-22T10:00:00Z';api.failRead=true;
  const {page,saved}=await openGame(t,{route:api.route,seed:{GOLD:13}});const guest=await saved();
  await form(page,'returning','test phrase','Войти');await page.waitForFunction(()=>!Accounts.switching);assert.equal(api.writes,0);assert.deepEqual(await saved(),guest);
  api.failRead=false;await form(page,'returning','test phrase','Войти');await active(page);assert.equal(await page.locator('#dispatch-name').innerText(),'TL-7');
  api.offline=true;await page.evaluate(()=>exchangeXP());await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('Нет связи'));
  await logout(page);assert.deepEqual(await saved(),guest);assert.equal(api.rows.get(who).progress.GOLD,710);
  api.offline=false;await form(page,'returning','test phrase','Войти');await active(page);await synced(page);assert.equal(api.rows.get(who).revision,8);assert.equal(api.rows.get(who).progress.GOLD,720);
  // A second device has advanced the same row since sign-in. PATCH of the old revision affects zero rows.
  const updated={...api.rows.get(who).progress,GOLD:3200};api.rows.set(who,{revision:9,progress:updated});await page.evaluate(()=>exchangeXP());
  await page.locator('#cloud-recover').waitFor();assert.equal(api.rows.get(who).progress.GOLD,3200);assert.equal(await page.locator('#gold-val').innerText(),'730');
  page.once('dialog',d=>d.accept());const download=page.waitForEvent('download');await page.locator('#cloud-recover').click();assert.equal((await download).suggestedFilename(),'city-tanks-progress.json');
  await synced(page);assert.equal(await page.locator('#gold-val').innerText(),'3200');assert.equal(api.rows.get(who).revision,9);
  await logout(page);assert.deepEqual(await saved(),guest);assert.deepEqual(api.forbidden,[]);
});

test('berths, pending Advent tank and box receipt belong only to the signed-in profile',async t=>{
  const api=service(),uid=randomUUID(),email='supply_pilot@players.citytanks.invalid';api.time='2026-11-22T10:00:00Z';api.users.set(email,{id:uid,email,password:'test crate pass'});
  const fleet=['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','IS7'];
  api.rows.set(uid,{revision:2,progress:{owned:fleet,pendingVehicles:['BT42'],garageSlots:10,inventory:{collection:1}}});
  const {page,click,saved}=await openGame(t,{route:api.route,seed:{GOLD:110,inventory:{collection:3},garageSlots:12}});const guest=await saved();
  await form(page,'supply_pilot','test crate pass','Войти');await active(page);await click('В ангар');await click('Ожидают слота: 1');
  await page.getByRole('button',{name:'ОТКРЫТЬ 1',exact:true}).evaluate(b=>{const normal=Math.random,rolls=[0,.999999,0];Math.random=()=>rolls.length?rolls.shift():normal();try{b.click();}finally{Math.random=normal;}});
  await synced(page);const row=api.rows.get(uid);assert.equal(row.progress.garageSlots,11);assert.deepEqual(row.progress.pendingVehicles,['TL7']);
  assert.deepEqual(row.progress.owned,fleet.concat('BT42'));assert.deepEqual(row.progress.inventory,{});assert.deepEqual(await saved(),guest);
  await page.reload();await active(page);assert.equal(await page.locator('#fleet-count').innerText(),'11 / 11');await logout(page);
  assert.deepEqual(await saved(),guest);assert.equal(await page.locator('#fleet-count').innerText(),'1 / 12');assert.deepEqual(api.forbidden,[]);
});
