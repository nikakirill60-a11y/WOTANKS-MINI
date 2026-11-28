const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {database,bridge}=require('./fixtures/referral-db.cjs'),{openGame}=require('./winter-harness.cjs');
const invite='city_tanks_invite_v1',preview='city_tanks_invite_preview_v1',collect='city_tanks_referral_collect_v1';

test('private enrollment at registration only; immutable choices, atomic starter gift and revision-checked one-time payout',async t=>{
  const {rows,identity,as,rpc}=await database(t),a=await identity('owner@players.citytanks.invalid'),other=await identity('other@players.citytanks.invalid');
  const link=await rpc(a,invite,['gold','resources']),alt=await rpc(a,invite,['xp','tanks']);
  assert.equal(await rpc(a,invite,['gold','resources']),link);assert.notEqual(link,alt);
  assert.notEqual(await rpc(other,invite,['gold','resources']),link);assert.deepEqual(await rpc(null,preview,[link]),{gift:'resources'});
  assert.deepEqual(await rpc(null,preview,[randomUUID()]),{gift:null});
  await assert.rejects(rpc(a,invite,['huge','resources']));await assert.rejects(rpc(a,invite,['xp','both']));
  await assert.rejects(rpc(null,invite,['xp','tanks']));await assert.rejects(rpc(null,collect,[null]));
  await assert.rejects(as(a,'select * from city_tanks_private.referral_links'));await assert.rejects(as(other,'update city_tanks_private.referral_entries set paid=false'));
  const start={GOLD:32,XP:600,selected:'IS7',owned:['IS7'],rentalBattles:{GPZ:2}};
  await as(a,'insert into public.city_tanks_saves_v1 values($1,7,$2)',[a,JSON.stringify(start)]);
  await assert.rejects(identity('broken@players.citytanks.invalid',randomUUID()));assert.equal((await rows("select count(*)::int as n from auth.users where email='broken@players.citytanks.invalid'"))[0].n,0);
  const recruit=await identity('first@players.citytanks.invalid',link),tanker=await identity('second@players.citytanks.invalid',alt);
  await identity('third@players.citytanks.invalid',link);await assert.rejects(identity('first@players.citytanks.invalid',alt));
  const save=async id=>(await as(id,'select revision,progress from public.city_tanks_saves_v1 where player_id=$1',[id]))[0];
  assert.deepEqual((await save(recruit)).progress,{GOLD:250,XP:1500});assert.deepEqual((await save(tanker)).progress,{owned:['MS1','PZ-II-J','T67'],selected:'MS1',rentalBattles:{T67:5}});
  await rows('update auth.users set raw_user_meta_data=$1, raw_app_meta_data=$1 where id=$2',[JSON.stringify({city_tanks_invite:link}),other]);
  assert.equal(await save(other),undefined,'sign-in/metadata changes to existing identities do not enroll anyone');
  assert.deepEqual(await rpc(a,collect,[6]),{stale:true});assert.deepEqual(await save(a),{revision:7,progress:start});
  assert.deepEqual(await rpc(a,collect,[7]),{revision:8,invited:3,gold:50,xp:250});assert.deepEqual(await rpc(a,collect,[8]),{revision:8,invited:3,gold:0,xp:0});
  assert.deepEqual(await save(a),{revision:8,progress:{...start,GOLD:82,XP:850}});assert.equal((await rpc(other,collect,[null])).invited,0);
  assert.deepEqual(await as(other,'select * from public.city_tanks_saves_v1 where player_id=$1',[a]),[]);
});

test('two independent browsers: creator selects both gifts, newcomer only registers; replay, lost replies and guest isolation',async t=>{
  const {route,state}=await bridge(t),a=await openGame(t,{route,mobile:true}),b=await openGame(t,{route,enterGuest:false});
  const p=a.page,q=b.page,base=q.url(),guest=await a.saved();
  const login=async(page,name)=>{await page.locator('#profile-handle').fill(name);await page.locator('#profile-pass').fill('fixture passphrase');await page.locator('#account-submit').click();};
  const active=page=>page.waitForFunction(()=>Accounts.active && !Accounts.switching);
  await a.click('Профиль игрока');await p.locator('#account-switch').click();await login(p,'captain');await active(p);
  await p.locator('#referral-desk summary').click();
  const create=async(payout,gift)=>{
    await p.locator(`input[name=invite-payout][value=${payout}]`).check();await p.locator(`input[name=invite-gift][value=${gift}]`).check();
    await a.click('Создать ссылку');await p.waitForFunction(()=>!Accounts.switching&&!document.querySelector('#invite-share').hidden);
    return new URL(await p.locator('#invite-url').inputValue());
  };
  const fleet=await create('xp','tanks');await a.click('Скопировать');assert.match(await p.locator('#invite-status').innerText(),/скопирована|выделена/);
  await p.locator('input[name=invite-gift][value=resources]').check();assert.ok(await p.locator('#invite-share').isHidden());
  const cash=await create('gold','resources');assert.notEqual(fleet.href,cash.href);assert.equal(cash.origin,'https://wotanks-mini.vercel.app');assert.deepEqual([...cash.searchParams.keys()],['ref']);
  // Load the same packed game with the public URL's query; unrelated query overrides are ignored.
  await q.goto(base+fleet.search+'&gift=resources&payout=gold');await q.waitForFunction(()=>document.querySelector('#invite-offer').textContent.includes('T67'));
  assert.equal(await q.locator('#account-form input[type=radio]').count(),0);assert.ok(await q.locator('#cloud-profile').isHidden());assert.ok(await q.locator('#invite-input').isHidden());
  await login(q,'wingman');await active(q);assert.match(await q.locator('#referral-notice').innerText(),/Pz\.Kpfw\. II Ausf\. J навсегда \+ T67 на 5 боёв/);
  const stats=()=>q.evaluate(()=>[GameState.GOLD,GameState.XP,GameState.owned,GameState.rentalBattles]);
  assert.deepEqual(await stats(),[0,500,['MS1','PZ-II-J','T67'],{T67:5}]);await q.reload();await active(q);assert.deepEqual(await stats(),[0,500,['MS1','PZ-II-J','T67'],{T67:5}]);
  const check=async()=>{await a.click('Проверить награды');await p.waitForFunction(()=>!Accounts.switching);};
  state.dropCollect=true;await check();assert.match(await p.locator('#invite-status').innerText(),/Не удалось/);await check();
  assert.deepEqual(await p.evaluate(()=>[GameState.XP,GameState.GOLD]),[750,0]);assert.match(await p.locator('#invite-count').innerText(),/: 1$/);
  // Existing accounts, even on another valid link, get neither a gift nor a second bounty.
  await q.goto(base+cash.search);await active(q);assert.match(await q.locator('#referral-notice').innerText(),/только для нового аккаунта/);
  assert.deepEqual(await stats(),[0,500,['MS1','PZ-II-J','T67'],{T67:5}]);
  await b.click('Профиль игрока');await b.click('Выйти в гостевой ангар');await q.waitForFunction(()=>!Accounts.switching&&!Accounts.active);
  await q.locator('#account-switch').click();await q.locator('#invite-manual summary').click();await q.locator('#invite-input').fill(cash.href);await b.click('Проверить ссылку');
  await q.waitForFunction(()=>document.querySelector('#invite-offer').textContent.includes('250 золота + 1000 опыта'));await login(q,'cadet');await active(q);
  assert.deepEqual(await stats(),[250,1500,['MS1'],{}]);await p.reload();await active(p);assert.deepEqual(await p.evaluate(()=>[GameState.XP,GameState.GOLD]),[750,25]);
  await a.click('Профиль игрока');await p.locator('#referral-desk summary').click();await check();assert.match(await p.locator('#invite-count').innerText(),/: 2$/);
  assert.deepEqual(await a.saved(),guest);
});

test('invalid invitation never silently creates an unrewarded account; guest entry is still available offline',async t=>{
  const calls=[];const {page,click,saved}=await openGame(t,{enterGuest:false,route:r=>{calls.push(r.request().url());return r.abort();}});
  await page.goto(page.url()+'?ref=broken');assert.equal(await page.locator('#account-form').getAttribute('data-mode'),'register');
  await page.locator('#profile-handle').fill('new_cadet');await page.locator('#profile-pass').fill('fixture password');
  await page.locator('#account-submit').click();await page.waitForFunction(()=>!Accounts.switching);
  assert.match(await page.locator('#account-message').innerText(),/Приглашение недействительно/);assert.deepEqual(calls,[]);assert.equal(await saved(),null);
  await click('Продолжить без приглашения');assert.ok(await page.locator('#invite-offer').isHidden());await click('Назад');await click('ГОСТЬ');
  assert.deepEqual((await saved()).owned,['MS1']);assert.deepEqual(calls,[]);
});

test('officer reserve: exact 2% pool, permanent conversion of a rental without cloning a berth, full manifests and bulk FIFO',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{owned:['MS1','PZ-II-J','T67'],selected:'T67',rentalBattles:{T67:3},modules:{T67:['optics']},inventory:{premium:2}}});
  await click('Контейнеры');const card=page.locator('.c-card').filter({hasText:'Офицерский резерв'});await card.locator('summary').click();
  assert.match(await card.innerText(),/2% на танк/);assert.match(await card.innerText(),/Pz\.Kpfw\. II Ausf\. J · навсегда/);assert.match(await card.innerText(),/T67 · навсегда/);
  await click('Инвентарь');await page.getByRole('button',{name:'ОТКРЫТЬ ВСЕ'}).evaluate(b=>{const orig=Math.random,seq=[.019999,0,.1,0,0,.09999];Math.random=()=>seq.length?seq.shift():orig();try{b.click();}finally{Math.random=orig;}});
  const won=await saved();assert.deepEqual(won.owned,['MS1','PZ-II-J','T67']);assert.deepEqual(won.inventory,{});assert.deepEqual(won.rentalBattles,{});assert.deepEqual(won.modules.T67,['optics']);assert.equal(won.garageSlots,11);assert.equal(won.SILVER,20000);
  await page.reload();assert.deepEqual(await saved(),won);const hist=await page.evaluate(()=>{
    function totals(owned){const h={};for(let i=0;i<3000;i++){
      Object.assign(GameState,{owned:['MS1',...owned],pendingVehicles:[],garageSlots:10,rentalBattles:{}});
      const rolls=[(i+.5)/3000,(i%2+.5)/2,.1];const r=openContainerDirect('premium',()=>rolls.shift()),key=r.id||r.type;h[key]=(h[key]||0)+1;
    }return h;}
    const h=totals([]),one=totals(['T67']),full=totals(['PZ-II-J','T67']);
    Object.assign(GameState,{owned:Object.values(DB).filter(t=>!t.source).slice(0,10).map(t=>t.id),garageSlots:10,pendingVehicles:['BT42']});
    for(const seq of [[0,0,.1],[0,0,.099999]])openContainerDirect('premium',()=>seq.shift());
    return [h,one,full,GameState.pendingVehicles,GameState.owned.at(-1),CONTAINERS.collection.vehicles];
  });assert.deepEqual(hist,[{'PZ-II-J':30,T67:30,silver:1764,xp:735,gold:441},{'PZ-II-J':60,silver:1764,xp:735,gold:441},{silver:1800,xp:750,gold:450},['PZ-II-J','T67'],'BT42',['M4A3E2','T71DA','JPANTHERII','T62A','TL7']]);
});

test('the two supplied models deploy offline; only five actual T67 sorties consume its loan, not a cancelled launch or a target',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{owned:['MS1','PZ-II-J','T67'],selected:'PZ-II-J',rentalBattles:{T67:5}}});
  await page.waitForFunction(()=>DepotView.stats()?.id==='PZ-II-J');await click('ТРЕНИРОВКА');
  await page.locator('#train-nat-select').selectOption('usa');await page.locator('#enemy-select').selectOption('T67');
  const sortie=()=>page.evaluate(async()=>{if(!await launchBattle(1))throw Error(document.querySelector('#battle-notice-text').textContent);stopBattleLoop();
    const units=GameState.units.map(u=>[u.id,u.maxHp,u.dmg,u.reloadTime,!!u.modelAsset]);backToGarage();return units;});
  assert.deepEqual(await sortie(),[['PZ-II-J',290,15,4200,true],['T67',440,115,2800,true]]);assert.equal((await saved()).rentalBattles.T67,5);
  await click('Выбрать для боя: T67');assert.equal(await page.locator('[aria-label="Продать: T67"]').count(),0);
  assert.equal(await page.evaluate(async()=>{const p=launchBattle(1);backToGarage();return await p;}),false);assert.equal((await saved()).rentalBattles.T67,5);
  for(let n=4;n>=0;n--){assert.equal((await sortie())[0][0],'T67');assert.equal((await saved()).rentalBattles.T67,n||undefined);if(n===3){await page.reload();await page.locator('.tank-slot.selected').waitFor();}}
  await page.reload();await page.locator('.tank-slot.selected').waitFor();assert.deepEqual((await saved()).owned,['MS1','PZ-II-J']);assert.deepEqual((await saved()).rentalBattles,{});
});
