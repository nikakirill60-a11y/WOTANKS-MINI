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
    if(u.pathname==='/rest/v1/rpc/city_tanks_referral_collect_v1')return json(200,{invited:0,gold:0,xp:0,revision:rows.get(uid)?.revision||0});
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
  const register=button==='Создать аккаунт';
  if((await p.locator('#account-form').getAttribute('data-mode')==='register')!==register)await p.locator('#account-switch').click();
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

test('ARTA receipt, vehicle and remaining sorties sync to the signed-in profile; a guest has a separate four-battle claim',async t=>{
  const api=service(),uid=randomUUID(),password='test promo pass'; api.time='2026-11-22T10:00:00Z';
  api.users.set('promo_pilot@players.citytanks.invalid',{id:uid,email:'promo_pilot@players.citytanks.invalid',password});
  const {page,click,saved}=await openGame(t,{route:api.route,webgl:true}); const guest=await saved();
  const redeem=async()=>{await click('Код');await page.getByLabel('Промокод',{exact:true}).fill('arta');await click('АКТИВИРОВАТЬ');};
  await form(page,'promo_pilot',password,'Войти'); await active(page); await click('В ангар'); await redeem(); await synced(page);
  const claim=api.rows.get(uid).progress;assert.deepEqual([claim.owned,claim.usedPromos,claim.rentalBattles],[['MS1','GPZ'],['ARTA'],{GPZ:4}]);
  await click('ЗАКРЫТЬ');await click('Выбрать для боя: G.Pz. Mk. VI (e)');
  assert.equal(await page.evaluate(async()=>{if(!await startTraining())return false;backToGarage();return true;}),true);
  await synced(page);const cloud=api.rows.get(uid).progress;assert.deepEqual(cloud.rentalBattles,{GPZ:3});assert.deepEqual(await saved(),guest);
  await page.reload(); await active(page);assert.equal(await page.locator('.rental-tag').innerText(),'Аренда: 3 боя');
  await redeem(); assert.match(await page.locator('#promo-result').innerText(),/Уже использован/);
  await click('ЗАКРЫТЬ'); await logout(page); assert.deepEqual(await saved(),guest); await click('В ангар');
  await redeem(); const local=await saved(); assert.deepEqual(local.owned,['MS1','GPZ']);assert.deepEqual(local.usedPromos,['ARTA']);assert.deepEqual(local.rentalBattles,{GPZ:4});
  assert.deepEqual(api.rows.get(uid).progress,cloud); assert.deepEqual(api.forbidden,[]);
});

test('a last-vehicle gold sale syncs the empty fleet and its balance, never pays or empties the guest',async t=>{
  const api=service(),uid=randomUUID(),email='trade_pilot@players.citytanks.invalid';api.time='2026-11-22T10:00:00Z';api.users.set(email,{id:uid,email,password:'trade testing'});
  api.rows.set(uid,{revision:3,progress:{owned:['T62A'],selected:'T62A',SILVER:7000,GOLD:80,garageSlots:12}});
  const {page,click,saved}=await openGame(t,{route:api.route,seed:{GOLD:22}});const guest=await saved();await form(page,'trade_pilot','trade testing','Войти');await active(page);await click('В ангар');
  await click('Продать: Т-62А');await click('Подтвердить продажу');await synced(page);const row=api.rows.get(uid).progress;
  assert.deepEqual([row.owned,row.selected,row.GOLD,row.SILVER,row.garageSlots],[[],null,1080,7000,12]);assert.deepEqual(await saved(),guest);
  await page.reload();await active(page);assert.equal(await page.locator('#fleet-count').innerText(),'0 / 12');await logout(page);assert.deepEqual(await saved(),guest);assert.equal(await page.locator('#dispatch-name').innerText(),'МС-1');
});

test('entry menu: guest below both online actions, cancellable forms, no request/save/Advent reward until guest enters',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,enterGuest:false,date:'2026-12-05T12:00:00Z'});
  const entry=page.locator('#entry-screen'),dialog=page.locator('#account-modal');
  assert.deepEqual(await entry.getByRole('button').allTextContents().then(a=>a.map(v=>v.replace('→','').trim())),['ВХОД','РЕГИСТРАЦИЯ','ГОСТЬ']);
  const pos=await entry.locator('button').evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight]));
  assert.ok(pos[2][0]>=Math.max(pos[0][0]+pos[0][1],pos[1][0]+pos[1][1]));
  assert.ok(await page.locator('#ui').isHidden());assert.equal(await saved(),null);assert.equal(await page.locator('#depot-canvas').count(),0);
  await click('ВХОД');assert.equal(await dialog.getByRole('heading').innerText(),'Вход в аккаунт');assert.equal(await page.locator('#profile-pass').getAttribute('autocomplete'),'current-password');
  await page.keyboard.press('Escape');assert.ok(await dialog.isHidden());assert.ok(await entry.isVisible());
  await click('РЕГИСТРАЦИЯ');assert.equal(await dialog.getByRole('heading').innerText(),'Регистрация');assert.equal(await page.locator('#profile-pass').getAttribute('autocomplete'),'new-password');
  await page.getByLabel('Позывной игрока').fill('bad name');await page.getByLabel('Пароль',{exact:true}).fill('example guest password');await page.locator('#profile-pass').press('Enter');
  assert.match(await page.locator('#account-message').innerText(),/3–24/);await click('Назад');assert.equal(await saved(),null);
  // Model a newer local save written while the player was still at the checkpoint.
  await page.evaluate(()=>localStorage.setItem('ct_progress_v1',JSON.stringify({GOLD:13,owned:['T55A'],selected:'T55A'})));
  await click('ГОСТЬ');assert.ok(await entry.isHidden());assert.equal((await saved()).GOLD,63);assert.deepEqual((await saved()).owned,['T55A']);assert.deepEqual((await saved()).advent2026.dates,['2026-12-05']);
  const once=await saved();await page.reload();assert.deepEqual(await saved(),once);assert.ok(await page.locator('#ui').isVisible());
  assert.ok(await page.evaluate(()=>Object.keys(sessionStorage).every(k=>!k.startsWith('ct_auth')&&!k.startsWith('ct_account'))));
  const next=await page.context().newPage();await next.goto(page.url());assert.ok(await next.getByRole('button',{name:'ГОСТЬ',exact:true}).isVisible());await next.close();
});

test('register and sign in directly from the checkpoint using Enter; failed sign-in/restore leaves the dormant guest untouched',async t=>{
  const api=service(),dormant={owned:['T55A'],selected:'T55A',GOLD:101,XP:310};
  const {page,click,saved}=await openGame(t,{mobile:true,enterGuest:false,route:api.route,seed:dormant,date:'2026-12-08T12:00:00Z'});
  const post=async (p,pass)=>{await p.getByLabel('Позывной игрока').fill('checkpoint');await p.getByLabel('Пароль',{exact:true}).fill(pass);await p.locator('#profile-pass').press('Enter');};
  await click('РЕГИСТРАЦИЯ');await post(page,'test passphrase');await active(page);await synced(page);
  assert.ok(await page.locator('#account-modal').isHidden());assert.ok(await page.locator('#entry-screen').isHidden());assert.deepEqual(await saved(),dormant);
  const uid=api.users.get('checkpoint@players.citytanks.invalid').id;assert.deepEqual(api.rows.get(uid).progress.owned,['MS1']);assert.equal(api.users.size,1);
  await page.reload();await active(page);assert.ok(await page.locator('#ui').isVisible());assert.deepEqual(await saved(),dormant);
  // No active auth on this new tab. The user's local guest is shared, NOT the account session.
  const other=await page.context().newPage();await other.route(/^https?:/,api.route);await other.goto(page.url());await other.getByRole('button',{name:'ВХОД',exact:true}).click();
  await post(other,'incorrect phrase');await other.waitForFunction(()=>!Accounts.switching);assert.match(await other.locator('#account-message').innerText(),/Проверьте позывной/);assert.deepEqual(await saved(),dormant);
  await post(other,'test passphrase');await active(other);assert.ok(await other.locator('#account-modal').isHidden());assert.equal(api.users.size,1);await other.close();
  api.failRead=true;await page.reload();await page.waitForFunction(()=>!Accounts.switching && document.getElementById('entry-status').textContent.includes('Не удалось'));
  assert.deepEqual(await saved(),dormant);assert.ok(await page.locator('#ui').isHidden());await click('ГОСТЬ');assert.equal(await page.locator('#bay-name').innerText(),'T-55A');
  assert.deepEqual((await saved()).owned,['T55A']);assert.equal(api.rows.get(uid).progress.GOLD,50);assert.deepEqual(api.forbidden,[]);
});

test('blocking both storage areas does not block offline guest entry',async t=>{
  const {page,click}=await openGame(t,{enterGuest:false});
  await page.addInitScript(()=>{for(const k of ['sessionStorage','localStorage'])Object.defineProperty(window,k,{get(){throw new DOMException('Blocked','SecurityError');}});});
  await page.reload();await click('ГОСТЬ');assert.equal(await page.locator('#dispatch-name').innerText(),'МС-1');assert.match(await page.locator('#save-status').innerText(),/без сохранения/);
});

test('15_zar credits both resources once per profile, including after a reload', async t => {
  const api = service(); api.time = '2026-11-22T10:00:00Z';
  const {page,click,saved} = await openGame(t,{mobile:true,route:api.route,seed:{GOLD:17,XP:93}});
  const input = page.getByLabel('Промокод',{exact:true}), result = page.locator('#promo-result');
  const enter = async code => { await input.fill(code); await input.press('Enter'); return result.innerText(); };
  const receipt = p => ({...p, GOLD:p.GOLD+500, XP:p.XP+2500, usedPromos:[...p.usedPromos,'15_ZAR']});
  const local = await saved(); await click('Код');
  assert.match(await enter('15zar'),/Неверный код/); assert.deepEqual(await saved(), local);
  assert.match(await enter('15_zar'),/500G 2500XP/); assert.deepEqual(await saved(), receipt(local));
  await page.reload(); await click('Код'); assert.match(await enter('15_ZAR'),/Уже использован/);
  assert.deepEqual(await saved(), receipt(local)); await click('ЗАКРЫТЬ');
  await form(page,'reward_pilot','promo fixture phrase','Создать аккаунт'); await active(page); await synced(page);
  const uid = api.users.get('reward_pilot@players.citytanks.invalid').id, before = api.rows.get(uid).progress;
  await click('В ангар'); await click('Код'); assert.match(await enter(' 15_zAr '),/500G 2500XP/); await synced(page);
  assert.deepEqual(api.rows.get(uid).progress, receipt(before));
  await page.reload(); await active(page); await click('Код'); assert.match(await enter('15_zar'),/Уже использован/);
  assert.deepEqual(api.rows.get(uid).progress, receipt(before)); assert.deepEqual(await saved(), receipt(local));
});

test('the earned case and its decorations sync to their owner, not the guest; partial saves start with a bare tree',async t=>{
  const api=service();api.time='2026-11-22T14:00:00Z';
  const uid=randomUUID(),email='treekeeper@players.citytanks.invalid',pass='fixture tree pass';
  api.users.set(email,{id:uid,email,password:pass});api.rows.set(uid,{revision:1,progress:{GOLD:17}});
  const {page,click,saved}=await openGame(t,{route:api.route,seed:{tree2026:{gingerbread:3},treeSlots2026:[null,'gingerbread',null,null],inventory:{ornament:2}}});
  const guest=await saved();await form(page,'treekeeper',pass,'Войти');await active(page);await click('В ангар');await click('Ёлка');
  assert.equal(await page.locator('#tree-total').innerText(),'Занято: 0 / 4');assert.ok(await page.locator('#tree-unpack').isDisabled());await click('В ангар');
  await page.evaluate(()=>{TreeEvent.settle(GameState,{silver:0,xp:0,gold:0},()=>.01);saveProgress();});await synced(page);
  assert.deepEqual(api.rows.get(uid).progress.inventory,{ornament:1});await page.reload();await active(page);await click('Ёлка');
  await page.locator('#tree-unpack').evaluate(b=>{const rand=Math.random;try{Math.random=()=>.995;b.click();}finally{Math.random=rand;}});
  await synced(page);const cloud=api.rows.get(uid).progress;
  assert.deepEqual(cloud.tree2026,{gingerbread:0,deer:0,fir:0,bauble:1});assert.deepEqual(cloud.inventory,{});assert.equal(cloud.GOLD,17);
  assert.deepEqual(cloud.treeSlots2026,[null,null,null,null]);await click('ЗАБРАТЬ');
  assert.equal(await page.locator('#tree-chance').innerText(),'20%');await page.getByLabel('Слот 4',{exact:true}).selectOption('bauble');await synced(page);
  assert.deepEqual(api.rows.get(uid).progress.treeSlots2026,[null,null,null,'bauble']);
  await page.reload();await active(page);await click('Ёлка');assert.equal(await page.getByLabel('Слот 4',{exact:true}).inputValue(),'bauble');assert.equal(await page.locator('#tree-chance').innerText(),'30%');await click('В ангар');
  const inventory=page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/});
  await inventory.click();assert.deepEqual(await page.locator('#inventory-toys h4').allInnerTexts(),['Шар × 1']);await click('В ангар');
  await logout(page);await page.locator('#account-back').click();await click('Ёлка');assert.equal(await page.locator('#tree-stock').innerText(),'2');
  assert.equal(await page.getByLabel('Слот 2',{exact:true}).inputValue(),'gingerbread');assert.equal(await page.getByLabel('Слот 4',{exact:true}).inputValue(),'');
  assert.equal(await page.locator('#tree-chance').innerText(),'20%');await click('В ангар');await inventory.click();
  assert.deepEqual(await page.locator('#inventory-toys h4').allInnerTexts(),['Пряник × 3']);assert.deepEqual(await saved(),guest);assert.deepEqual(api.forbidden,[]);
});
