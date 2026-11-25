const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const index = pathToFileURL(process.env.CITY_TANKS_INDEX || path.resolve(__dirname, '../index.html')).href;
const saveKey = 'ct_progress_v1';
const sovietIds = ['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','IS7'];

const germanIds = ['LTR','PZII','PZIC','LUCHS','LEOPARD','VK2801','SPIC','HWK12','RU251','RHMPZW'];

const is4Ids = ['T150','KV3','KV4','STI','IS4'];
const mediumIds = ['BT2','BT7','A20','T34','T3485','T43','T44','T54','OBJ140'];
const scoutIds = ['T50','MT25','LTG','LTTB','T54L','T100LT'];
const panzerIds = ['PZ35T','PZ38T','PZIVD','PZIVH'];
const mausIds = ['VK3001P','TIGERP','VK10001P','MAUSCHEN','MAUS'];
const e100Ids = ['VK3601H','TIGERI','TIGERII','E75','E100'];
const tdIds = ['PZJAG1','MARDER2','MARDER38','PZSFL4C','NASHORN','STEMIL','RHMBWT','WTPZ4','WTE100'];
const usIds = ['T1C','T2MEDIUM','M2MEDIUM','M3LEE','M4SHERMAN','M4A3E8','T20','PERSHING','M46PATTON','M48PATTON'];

const obj430Ids = ['OBJ430','OBJ430U'];
const k91Ids = ['A43','A44','OBJ416','OBJ430II','K91'];
const e50Ids = ['VK3002M','PANTHER','PANTHERII','E50','E50M'];
const jagdIds = ['HETZER','STUG3G','JGPZIV','JAGDP','FERDINAND','JAGDTIGER','JGPZE100'];
const batch5 = require('./fixtures/batch5.cjs');
const additions = nation => batch5.filter(route=>route.nation===nation).flatMap(route=>route.rows.map(row=>row[0]));
const sovger = require('./fixtures/soviet-german.cjs');
const newIds = end => sovger.find(path=>path.end===end).rows.map(row=>row[0]);
const usTreeIds = usIds.concat(additions('usa'));
const sovietTreeIds = sovietIds.concat(newIds('OBJ-277'),newIds('OBJ-705A'),newIds('ST-II'),is4Ids,newIds('TET-100'),
  mediumIds,obj430Ids,k91Ids,scoutIds,additions('ussr'),newIds('OBJ-2684'),newIds('OBJ-263-X'));
const germanTreeIds = germanIds.concat(tdIds,'GRILLE15',jagdIds,panzerIds,mausIds,newIds('PZKPFW-VII'),
  newIds('VK-7201-K'),e50Ids,newIds('LEOPARD-1'),e100Ids,newIds('KPZ-67'));

const retiredFields = ['vaults','rankedRating','worldBossHp','claimedMail','clans','clanId','clanTag','quest23',
  'collectionBonusesClaimed','battlePass','camos','equippedCamo','crew','blueprints','newsLastSeenId','achievements','dailyQuests'];
const checkClean = data => { for (const key of retiredFields) assert.ok(!(key in data),key); };
const meshCounts = {'PZ-II-J':4155,T67:4437,
  ...Object.fromEntries(require('./fixtures/france.cjs').unique.map(row=>[row[0],row.at(-1)])),
  GPZ:2823,...Object.fromEntries(sovger.flatMap(p=>p.rows.map(row=>[row[0],row.at(-1)]))),
  ...Object.fromEntries(require('./fixtures/japan.cjs').unique.map(row=>[row[0],row.at(-1)])),
  ...Object.fromEntries(require('./fixtures/hungary.cjs').map(row=>[row[0],row.at(-1)])),
  ...Object.fromEntries(batch5.flatMap(route=>route.rows.map(row=>[row[0],row.at(-1)]))),BT42:13432,IS6:3389,JPANTHERII:2781,LOWE:2890,M4A3E2:2540,STA2:4833,STRVS1:3531,T62A:3572,T34HEAVY:3846,T71DA:2862,TL7:4707,TL7OLEN:5175,MS1:2722,T26:2520,T46:2049,T28_USSR:2483,KV1:3139,KV1S:3166,IS:3032,IS3:3156,OBJ257:4099,IS7:2677,
  A43:4665,A44:5232,OBJ416:6798,OBJ430II:6909,K91:7883,OBJ430:7137,OBJ430U:5790,
  VK3002M:5762,PANTHER:5830,PANTHERII:4691,E50:4989,E50M:4825,GRILLE15:7315,
  HETZER:5233,STUG3G:4502,JGPZIV:3638,JAGDP:5681,FERDINAND:4022,JAGDTIGER:5341,JGPZE100:5780,
  PZ35T:2486,PZ38T:2637,PZIVD:3160,PZIVH:3263,VK3001P:2890,TIGERP:3161,VK10001P:2723,MAUSCHEN:3174,MAUS:2760,
  VK3601H:2659,TIGERI:2972,TIGERII:3394,E75:2944,E100:2986,T50:4700,MT25:2313,LTG:3221,LTTB:3339,T54L:2919,T100LT:3398,
  T150:2514,KV3:2866,KV4:3259,STI:3226,IS4:3284,
  LTR:2253,PZII:2742,PZIC:3451,LUCHS:2466,LEOPARD:2729,VK2801:2120,SPIC:2747,HWK12:2985,RU251:3114,RHMPZW:3422,
  T1C:2015,T2MEDIUM:2391,M2MEDIUM:2737,M3LEE:2400,M4SHERMAN:2514,M4A3E8:2326,T20:2465,PERSHING:3443,M46PATTON:3188,M48PATTON:3360,
  BT2:1788,BT7:2424,A20:1840,T34:2238,T3485:2245,T43:2180,T44:3034,T54:2807,OBJ140:3097,
  PZJAG1:2321,MARDER2:2796,MARDER38:5661,PZSFL4C:2583,NASHORN:3206,STEMIL:3140,RHMBWT:2926,WTPZ4:2968,WTE100:3226,
  STRVFM21:4252,STRVM38:3520,STRVM40L:3946,LAGO:2144,STRVM42:2545,STRV74:3016,LEO:2637,EMIL1:2699,EMIL2:2999,KRANVAGN:2933,
  PVLVV42:4205,IKV72:4415,SAV43:3884,IKV103:4146,IKV65:3943,IKV90:3828,UDES03:4497,STRV1030:3262,STRV103B:4561};

// Use the actual double-click launch path: no test server, CDN, or database.
async function offlineGame(t, { seed, denyStorage, webgl = false, mobile = false } = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: webgl ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-webgl']
  });
  const errors = [], network = [], dialogs = [];
  t.after(async () => {
    await browser.close();
    assert.deepEqual(errors, [], 'uncaught errors or broken local assets');
    assert.deepEqual(network, [], 'the game must not even attempt a network request');
  });
  const page = await browser.newPage({ viewport: mobile ? {width:390,height:780} : webgl ? {width:850,height:570} : {width:1440,height:900}, hasTouch: mobile, offline: true, reducedMotion: 'reduce' });
  page.setDefaultTimeout(webgl ? 22000 : 6000);
  page.on('console', msg => { if (/Shader Error|GL_INVALID_OPERATION/.test(msg.text())) errors.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', req => {
    const why = req.failure()?.errorText;
    // Suspending the owned stand can cancel a pending local mesh script.
    if (why === 'net::ERR_ABORTED' && req.resourceType()==='script' && /\/models\/[^/]+\.mesh\.js$/.test(req.url())) return;
    // Switching dossiers can also cancel the previous poster. The asset test decodes EVERY poster.
    if (why === 'net::ERR_ABORTED' && req.resourceType() === 'image' && /\/models\/[^/]+\.webp$/.test(req.url())) return;
    if (req.url().startsWith('file:')) errors.push(`Could not load ${req.url()}: ${why}`);
  });
  await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await page.routeWebSocket('**/*', socket => { network.push(socket.url()); socket.close(); });
  page.on('dialog', dialog => { dialogs.push(dialog.message()); return dialog.dismiss(); });
  // Pre-season baseline is independent of the date the regression suite is run.
  await page.addInitScript(() => { const real = Date.now, offset = Date.parse('2026-11-22T13:00:00Z')-real(); Date.now = () => real()+offset; });
  if (seed) await page.addInitScript(entries => {
    if (window !== window.top || sessionStorage.fixtureLoaded) return;
    for (const [key, raw] of Object.entries(entries)) localStorage.setItem(key, raw);
    sessionStorage.fixtureLoaded = '1';
  }, seed);
  if (denyStorage) await page.addInitScript(() => {
    if (window !== window.top) return;
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await page.goto(index, {timeout: webgl ? 90000 : 15000});
  assert.deepEqual(dialogs, [], 'no native blocking prompt on entry');
  await page.getByRole('button',{name:'ГОСТЬ',exact:true}).click();
  assert.ok(await page.locator('#ui').isVisible());
  await page.locator('.tank-slot.selected').waitFor();
  await page.waitForFunction(()=>DepotView.stats() || !document.getElementById('bay-poster').hidden);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  return { page, click, dialogs };
}

const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);

test('fresh garage, local rewards, selected tank and settings survive an immediate reload', async t => {
  const { page, click } = await offlineGame(t);
  assert.equal(await page.locator('#login-screen, input[type=password]:visible, #tab-market, #tab-referral, #chat-panel, #leaderboard-modal').count(), 0);
  assert.equal(await page.locator('#tank-carousel .tank-slot').count(), 1);
  assert.equal(await page.locator('#xp-val').textContent(), '500');
  await click('ОБМЕН');
  assert.equal(await page.locator('#xp-val').textContent(), '400');
  assert.equal(await page.locator('#gold-val').textContent(), '10');

  await click('Контейнеры');
  for (const tab of await page.locator('.modal-tab').all()) {
    await tab.click();
    assert.equal(await page.locator('#container-modal .tab-content:visible').count(), 1);
  }
  assert.deepEqual(await page.locator('#container-modal .tab-content').evaluateAll(els=>els.map(e=>e.id)),['tab-shop','tab-inventory']);
  assert.deepEqual(await page.locator('.top-btns button').allInnerTexts(),['Гость','Адвент','Премиум-магазин','Код','Контейнеры','Инвентарь','Модули','Прокачка','Обучение']);
  assert.equal(await page.locator('#battlepass-track,#features-modals-root,#quest-widget,#sixth-sense-lamp').count(),0);
  await click('В ангар');
  await click('Адвент');
  assert.equal(await page.locator('#calendar-days .future').count(),31);
  assert.equal(await page.locator('#advent-count').innerText(),'0 / 31');
  await click('В ангар');
  await click('Дерево развития');
  assert.deepEqual(await page.locator('.n-btn').allInnerTexts(),['СССР','ГЕРМАНИЯ','США','ШВЕЦИЯ','ВЕНГРИЯ','ЯПОНИЯ','ФРАНЦИЯ']);
  await click('Выбрать для боя: МС-1');
  await page.locator('button[onclick="showSettings()"]').click();
  await page.locator('#volume-slider').press('Home');await page.locator('#look-sensitivity').press('End');
  await page.locator('#settings-modal input[type=checkbox]').uncheck();
  await page.locator('#settings-modal select').selectOption('en');
  await page.reload(); // Do not wait for the autosave interval.
  assert.ok(await page.locator('#ui').isVisible());
  assert.equal(await page.locator('.tank-slot.selected .slot-name').innerText(), 'МС-1');
  assert.equal(await page.locator('.n-btn.active-n').innerText(), 'СССР');
  assert.equal(await page.locator('#gold-val').innerText(), '10');
  assert.equal(await page.locator('#charges-val').innerText(), '0');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.locator('button[onclick="showSettings()"]').click();
  assert.equal(await page.locator('#volume-slider').inputValue(), '0');assert.equal(await page.locator('#look-sensitivity').inputValue(),'2.5');
  assert.equal(await page.locator('#settings-modal input[type=checkbox]').isChecked(), false);
  await page.locator('button[onclick="hideSettings()"]').click();
  await click('Адвент');
  assert.equal(await page.locator('#calendar-days .received').count(),0);
  checkClean(await saved(page));
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [saveKey]);
});

test('one legacy local profile: keep earned progress, exclude credentials and retired services', async t => {
  const oldUsers = JSON.stringify({ Former: { pass: 'obsolete-test-marker', data: {
    XP: 0, GOLD: 2500, SILVER: 0, owned: ['T26', 'PZ2','T1CUNN','STRV21','ST1','KV2','T2LT','OB140','RHMB','WT_E220','T34_USA','T54O','T54L','PZ4D','VK36H','TIGER1','TIGER2','VK30P','VK100','MAUSCH','OB84','PZ5G','VK45A'], modules:{T1CUNN:['optics'],RHMB:['turbo'],ST1:['optics'],T54O:['rammer']}, upgrades:{T1CUNN:{engine:1},TIGER1:{gun:2}}, selected: 'PZ2', charges: 4, referralCode: 'old-code'
  } } });
  const { page } = await offlineGame(t, { seed: {
    ct_users: oldUsers, ct_mailbox: JSON.stringify([{ id: 'mail_event', claimed: true }]),
    ct_world_boss: JSON.stringify({ currentHp: 123456 })
  } });
  const data = await saved(page);
  assert.equal(data.XP, 0);
  assert.equal(data.SILVER, 0);
  assert.equal(data.charges, 4);
  assert.equal(data.selected, 'PZII');assert.equal(data.curNat,'germany');
  assert.deepEqual(data.owned, ['T26','PZII','T1C','STRVFM21','STI','OBJ140','RHMBWT','T34HEAVY','T54L','PZIVD','VK3601H','TIGERI','TIGERII','VK3001P','VK10001P','MAUSCHEN','VK-4502-A']); // no grants for similarly named tanks or a retired event boss
  assert.deepEqual(data.modules,{T1C:['optics'],RHMBWT:['turbo'],STI:['optics'],T54L:['rammer']});assert.deepEqual(data.upgrades,{T1C:{engine:1},TIGERI:{gun:2}});
  checkClean(data);assert.equal(data.GOLD,2500);
  assert.doesNotMatch(JSON.stringify(data), /obsolete-test-marker|Former|old-code|mail_event/);
  assert.equal(await page.evaluate(() => localStorage.getItem('ct_users')), oldUsers);
});

test('multiple legacy accounts stay untouched; no account is silently selected', async t => {
  const oldUsers = JSON.stringify({ A: { data: { GOLD: 8000 } }, B: { data: { GOLD: 9000 } } });
  const { page } = await offlineGame(t, { seed: { ct_users: oldUsers } });
  assert.equal((await saved(page)).GOLD, 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('ct_users')), oldUsers);
});

test('an unreadable save is not overwritten', async t => {
  const { page, click } = await offlineGame(t, { seed: { [saveKey]: '{broken' } });
  assert.ok(await page.locator('#save-status.warning').isVisible());
  await click('ОБМЕН');
  await page.reload();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), '{broken');
});

test('the new MS-1 and both heavy tanks occupy the winter depot; camera, rapid switching and cleanup work', async t => {
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','IS','IS3'],selected:'MS1'})}});
  for(const [id,name] of [['MS1','МС-1'],['IS','ИС'],['IS3','ИС-3']]){
    await click('Выбрать для боя: '+name);
    await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    const info = await page.evaluate(()=>DepotView.stats());
    assert.equal(info.triangles,meshCounts[id]);assert.equal(info.room,'Северное депо · Полярная ночь');assert.ok(info.calls>5);
    assert.equal(await page.locator('#bay-open,#tree-inspect,#bay-picker').count(),0);
    await click('Сбоку');assert.notDeepEqual(await page.evaluate(()=>DepotView.stats().camera),info.camera);
    assert.equal(await page.locator('#bay-angles [data-view=side]').getAttribute('aria-pressed'),'true');
  }
  // An outdated asynchronous export must never replace the most recently requested vehicle.
  await page.evaluate(()=>{for(const name of ['ИС','МС-1','ИС-3'])document.querySelector(`[aria-label="Выбрать для боя: ${name}"]`).click();});
  await page.waitForFunction(()=>DepotView.stats()?.id==='IS3' && document.getElementById('bay-loading').hidden);
  assert.equal(await page.locator('#depot-canvas').count(),1);assert.equal(await page.locator('#dispatch-name').innerText(),'ИС-3');
  await click('Дерево развития');assert.equal(await page.locator('#depot-canvas, iframe').count(),0);
  assert.equal(await page.evaluate(()=>DepotView.stats()),null);
  assert.equal(await page.locator('a[href*="-game.html"]').count(),0);
  assert.equal(await page.evaluate(()=>typeof GarageViewer.inspect),'undefined');
});

test('winter yard: real meshes share the vehicle camera, with touch-orbit parallax, 3D snowfall and teardown', async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,mobile:true});
  // Observe an actual renderer frame, not strings reported by DepotView or a screenshot of a poster.
  await page.evaluate(()=>{
    const prev=THREE.Scene.prototype.onAfterRender;
    THREE.Scene.prototype.onAfterRender=function(r,scene,camera){
      prev.apply(this,arguments);
      if(!scene.getObjectByName('festive-spruce'))return;
      THREE.Scene.prototype.onAfterRender=prev;
      const landmarks=['festive-spruce','snowman','open-yard-doors'],seen=new Set();
      const snow=scene.getObjectByName('falling-snow'), sky=scene.getObjectByName('polar-sky');
      const probe=window.bayProbe={frames:0,disposed:false,read(){
        return landmarks.map(name=>{
          const prop=scene.getObjectByName(name),bounds=new THREE.Box3().setFromObject(prop),centre=bounds.getCenter(new THREE.Vector3());
          return {world:centre.toArray(),uv:centre.project(camera).toArray(),size:bounds.getSize(new THREE.Vector3()).toArray(),rendered:seen.has(name)};
        });
      },time:()=>snow.material.uniforms.uTime.value,
      hasWeather:snow.isInstancedMesh && snow.count>1 && snow.material.uniforms.uTime===sky.material.uniforms.uTime,
      sameScene:!!scene.getObjectByName(DB[GameState.selected].n),opaque:!!scene.background?.isColor && !sky.material.transparent};
      for(const name of landmarks)scene.getObjectByName(name).traverse(n=>{if(n.isMesh)n.onAfterRender=()=>seen.add(name);});
      scene.onBeforeRender=()=>seen.clear(); scene.onAfterRender=()=>probe.frames++;
      snow.addEventListener('dispose',()=>{probe.disposed=true;});
      DepotView.view('iso');
    };
    DepotView.view('iso');
  });
  await page.waitForFunction(()=>window.bayProbe?.frames>0);
  const read=()=>page.evaluate(()=>bayProbe.read()),before=await read();
  assert.deepEqual(await page.evaluate(()=>[bayProbe.sameScene,bayProbe.hasWeather,bayProbe.opaque]),[true,true,true]);
  assert.equal(await page.locator('#bay-viewport').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  assert.equal(await page.locator('.winter-snow').count(),0);
  for(const prop of before) {
    assert.ok(prop.rendered && prop.size.every(x=>x>.15),'3D landmark actually drew in the first view');
    assert.ok(Math.abs(prop.uv[0])<1 && Math.abs(prop.uv[1])<1,'landmark is in frame on a phone');
  }
  const touch=await page.context().newCDPSession(page),send=(type,points)=>touch.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const rect=await page.locator('#depot-canvas').boundingBox(),p={id:1,x:rect.x+rect.width*.48,y:rect.y+rect.height*.58};
  const frames=await page.evaluate(()=>bayProbe.frames);
  await send('touchStart',[p]);await send('touchMove',[{...p,x:p.x+24}]);await send('touchEnd',[]);
  await page.waitForFunction(n=>bayProbe.frames>n,frames);
  const after=await read(),delta=after.map((prop,i)=>prop.uv[0]-before[i].uv[0]);
  for(let i=0;i<before.length;i++){
    assert.deepEqual(after[i].world,before[i].world,'objects do not follow the camera');
    assert.ok(Math.abs(delta[i])>.02,'perspective changes for every landmark');
  }
  assert.ok(Math.max(...delta)-Math.min(...delta)>.04,'objects at different depths do not slide like a background');
  assert.equal(await page.evaluate(()=>bayProbe.time()),0,'reduced motion keeps scenery but does not advance the snow');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>bayProbe.time()>.02);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  const frozen=await page.evaluate(()=>bayProbe.time());await page.waitForTimeout(220);
  assert.equal(await page.evaluate(()=>bayProbe.time()),frozen);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(n=>bayProbe.time()>n,frozen);
  await click('Дерево развития');assert.equal(await page.locator('#depot-canvas').count(),0);
  assert.ok(await page.evaluate(()=>bayProbe.disposed && !DepotView.stats()));
  await click('Мой танк');await page.waitForFunction(()=>DepotView.stats()?.id==='MS1');
  await page.locator('#depot-canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('#bay-poster').waitFor();assert.match(await page.locator('#bay-poster span').innerText(),/потерян контекст WebGL/);
  assert.equal(await page.locator('#depot-canvas').count(),0);assert.equal(await page.evaluate(()=>DepotView.stats()),null);
});

async function ready(page,acquire=true) {
  await page.waitForFunction(()=>GameState.gameActive && BattleView.stats()?.triangles>0,null,{timeout:45000});
  if(acquire && await page.evaluate(()=>BattleInput.state==='waiting')) {
    await page.locator('#resume-input').click();await page.waitForFunction(()=>BattleInput.running);
  }
}
const chooseControls = (page, type) => page.locator(`.control-option[onclick="selectControl('${type}')"]`).click();

test('migration keeps earned late tiers, supplies, modules, settings and currency; retired bonuses are gone', async t => {
  const {page,click}=await offlineGame(t,{seed:{[saveKey]: JSON.stringify({
    ...Object.fromEntries(retiredFields.map(k=>[k,{legacy:true}])),
    owned:['PZ2','T26','WT_E220','T26','OBJ257','IS7'], selected:'IS7', curNat:'germany', rentalTanks:{WT_E220:3},
    modules:{T26:['optics'],PZ2:['rammer'],WT_E220:['turbo']}, upgrades:{PZ2:{gun:2},T26:{gun:1},WT_E220:{gun:2}},
    GOLD:187, XP:6412, SILVER:0, totalBattles:45, inventory:{waffentrager:2,flamebox:1,premium:4},
    settings:{showTracks:false},loginCalendar:{claimedDays:[7]},boosterStock:{xp:2}
  })}});
  const old=await saved(page);
  assert.deepEqual(old.owned,['PZII','T26','OBJ257','IS7']);assert.equal(old.selected,'IS7');assert.equal(old.curNat,'germany','remember the browsed nation without changing the equipped tank');
  assert.equal(old.GOLD,187);assert.equal(old.XP,6412);assert.equal(old.SILVER,0);assert.equal(old.totalBattles,45);
  assert.equal(old.settings.showTracks,false);assert.equal(old.boosterStock.xp,2);assert.deepEqual(old.loginCalendar.claimedDays,[7]);
  assert.deepEqual(old.modules,{T26:['optics'],PZII:['rammer']});assert.deepEqual(old.upgrades,{T26:{gun:1},PZII:{gun:2}});
  checkClean(old);assert.ok(!('rentalTanks' in old));assert.deepEqual(old.inventory,{supply:2,premium:5});
  assert.equal(await page.locator('#bay-name').innerText(),'ИС-7');
  await click('Дерево развития');assert.equal(await page.locator('.n-btn.active-n').innerText(),'ГЕРМАНИЯ');
  await click('СССР');assert.equal(await page.locator('#nodes .node.owned').count(),3);
  await click('Выбрать: Объект 257');assert.equal(await page.locator('#dispatch-name').innerText(),'Объект 257');
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(opts=>opts.map(o=>o.value)),sovietTreeIds.concat(['T62A','IS6']));
  const rewards=await page.evaluate(()=>{
    for(const id of ['basic','supply','premium'])openContainerDirect(id);
    for(const code of ['BETA_TEST','WT220','START2025']){document.getElementById('promo-input').value=code;activatePromo();}
    saveProgress();
    return [typeof FeaturesHub,typeof EconomyEngine,typeof BattlePassSystem,typeof getCrewPerkValue,
      typeof claimQuestReward,typeof getDiscountedXPCost,typeof refreshDailyQuests,typeof addBlueprintFragment];
  });
  assert.deepEqual(rewards,Array(8).fill('undefined'));
  const after=await saved(page);assert.deepEqual(after.owned,old.owned);checkClean(after);assert.ok(!after.usedPromos.includes('WT220'));
  await page.reload();assert.equal((await saved(page)).selected,'OBJ257');
});

test('no WebGL: the garage poster works and a sortie never silently becomes 2D or grants rewards', async t=>{
  const {page,click}=await offlineGame(t);
  assert.match(await page.locator('#bay-poster span').innerText(),/WebGL 2/);
  assert.ok(await page.locator('#bay-poster img').evaluate(i=>i.complete && i.naturalWidth>0));
  const before=await saved(page);
  for(const mode of ['В БОЙ 15×15','Обучение']) {
    await click(mode);if(mode!=='Обучение')await chooseControls(page,'pc');
    await page.getByRole('heading',{name:'3D-бой недоступен'}).waitFor();
    assert.match(await page.locator('#battle-notice-text').innerText(),/WebGL 2/);
    assert.equal(await page.evaluate(()=>GameState.gameActive),false);
    assert.equal(await page.locator('#tutorial-overlay').isVisible(),false);
    await click('Вернуться в ангар');
  }
  assert.deepEqual(await saved(page),before);
});

// Headless Chromium may recenter a native locked pointer after a CDP absolute
// mouse move. Feed measured relative motion through the same DOM mouse handler.
// Capture, buttons, wheel, keys and all touch contacts use native browser input.
const sessions=new WeakMap();
async function lockedButton(page,down,button='left') {
  if(!sessions.has(page))sessions.set(page,await page.context().newCDPSession(page));
  // CDP deals in absolute coordinates. Its locked virtual device rests at (0,0);
  // sending the pre-capture screen coordinates would ALSO synthesize a large warp.
  return sessions.get(page).send('Input.dispatchMouseEvent',{type:down?'mousePressed':'mouseReleased',x:0,y:0,button,buttons:down?(button==='right'?2:1):0,clickCount:1});
}
async function moveLook(page, dx, dy) {
  await page.evaluate(([dx,dy])=>{
    const canvas=document.querySelector('#game');
    for(const [x,y] of [[0,0],[dx,dy]]) canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:x,movementY:y}));
    return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  },[dx,dy]);
}
async function centerPractice(page, touch=null) {
  // Aim as a player would: observe the rendered direction and close the angular
  // error, without writing any game or camera angles. Orbit parallax converges.
  for(let i=0;i<9;i++){
    const [dx,dy]=await page.evaluate(isTouch=>{
      const s=BattleView.stats(),[cx,ch,cy]=s.camera,t=GameState.units[1];
      const x=t.x-cx,y=t.y-cy, fov=s.fov*Math.PI/180;
      const rate=.0022*GameState.settings.lookSensitivity*(isTouch?1.4:1)/(s.mode==='sniper'?s.zoom*1.4:1);
      return [Math.round(wrapAngle(Math.atan2(y,x)-s.yaw)/rate),Math.round((Math.atan2(ch-t.aimHeight,Math.hypot(x,y))+Math.atan(.12*Math.tan(fov/2))-s.pitch)/rate)];
    },!!touch);
    if(Math.abs(dx)+Math.abs(dy)<=1)break;
    if(touch){
      const start={id:1,x:260,y:320};await touch('touchStart',[start]);
      await touch('touchMove',[{...start,x:start.x+Math.max(-94,Math.min(94,dx)),y:start.y+Math.max(-110,Math.min(110,dy))}]);await touch('touchEnd',[]);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    }else await moveLook(page,dx,dy);
  }
  await page.waitForFunction(()=>GameState.aim.hit===GameState.units[1] && GameState.player.sightHit().hit===GameState.units[1]);
}
async function fixedSight(page){
  assert.ok(await page.evaluate(()=>{
    const a=GameState.aim,q=BattleView.screenPoint(a.x,a.y,a.h),r=document.querySelector('#game').getBoundingClientRect(),b=document.querySelector('#battle-reticle').getBoundingClientRect();
    return Math.hypot(q.x-.5,q.y-.44)<.001 && Math.abs((b.x+b.width/2-r.left)/r.width-.5)<.002 && Math.abs((b.y+b.height/2-r.top)/r.height-.44)<.002;
  }),'camera ray and crosshair stay at 50%, 44%');
}

test('reference PC controls: relative orbit, independent hull, held turret, optics, pause and real training victory',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true});
  await click('ТРЕНИРОВКА');await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page,false);
  assert.equal(await page.evaluate(()=>BattleInput.state),'waiting');await page.mouse.click(2,2);await page.waitForFunction(()=>BattleInput.state==='locked');
  const scene=await page.evaluate(()=>BattleView.stats());
  assert.equal(scene.webgl,'WebGL2RenderingContext');assert.equal(scene.projection,'PerspectiveCamera');assert.equal(scene.units,2);assert.ok(scene.triangles>1000);
  assert.equal(await page.locator('iframe').count(),0,'one renderer, no running hangar/mesh frames');
  assert.deepEqual(await page.evaluate(()=>[BattleInput.state,document.pointerLockElement?.id,GameState.player.lastShot]),['locked','game',0]);
  assert.ok(Math.abs(scene.yaw)<.005 && Math.abs(scene.pitch-.22)<.005,'capturing does not jerk the sight');
  assert.deepEqual(await page.evaluate(()=>{
    const g=GameState,p=g.player,w=g.walls[0], sweep=(x,z,h,range)=>traceBattleRay(x,z,h,1,0,0,range,p).hit;
    return [sweep(p.x,p.y,8,500)===g.units[1],sweep(p.x,p.y,50,500)===null,sweep(w.x-30,w.y+w.h/2,w.baseHeight+8,200)===w,sweep(w.x-30,w.y+w.h/2,w.baseHeight+w.height+10,200)===null];
  }),[true,true,true,true]);
  // Initial software-GL shader uploads can stall the first few frames for seconds.
  // With capped catch-up and the new run-up curve, allow real time for the same drive distance.
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>GameState.player.x>-140,null,{timeout:60000});await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');await page.waitForFunction(()=>!GameState.player.isMoving);await page.keyboard.up('Space');
  await moveLook(page,100,-20);await fixedSight(page);
  const orbit=await page.evaluate(()=>BattleView.stats());assert.ok(Math.abs(orbit.yaw-.22)<.005 && orbit.pitch<scene.pitch);assert.notDeepEqual(orbit.camera,scene.camera);
  await lockedButton(page,true,'right');const held=await page.evaluate(()=>({mount:wrapAngle(GameState.player.tAngle-GameState.player.angle),yaw:BattleView.stats().yaw,holding:GameState.holdTurret}));
  await moveLook(page,-155,33);await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>GameState.player.angle>.21);await page.keyboard.up('ArrowRight');
  await page.waitForFunction(()=>GameState.player.yawRate===0);const turned=await page.evaluate(()=>({mount:wrapAngle(GameState.player.tAngle-GameState.player.angle),yaw:BattleView.stats().yaw,holding:GameState.holdTurret}));
  assert.ok(turned.holding && held.holding && Math.abs(turned.mount-held.mount)<1e-7 && Math.abs(turned.yaw-held.yaw+155*.0022)<.005,'RMB during hull turn: '+JSON.stringify({held,turned}));
  await lockedButton(page,false,'right');await page.waitForFunction(()=>Math.abs(wrapAngle(GameState.player.tAngle-GameState.player.lookYaw))<.02);
  await page.mouse.wheel(0,-120);await page.waitForFunction(()=>BattleView.stats().distance<12);
  assert.ok(await page.evaluate(()=>{
    const g=GameState,p=g.player,[x,,y]=BattleView.stats().camera;g.walls.push({solid:true,x:(x+p.x)/2-2,y:(y+p.y)/2-2,w:4,h:4,height:130});
    try{BattleView.syncCamera();const [qx,,qy]=BattleView.stats().camera;return Math.hypot(qx-p.x,qy-p.y)<.6*Math.hypot(x-p.x,y-p.y);}finally{g.walls.pop();}
  }),'obstacle-safe boom');
  await page.keyboard.press('Shift');await page.waitForFunction(()=>BattleView.stats().fov===22);await page.mouse.wheel(0,-100);await page.waitForFunction(()=>BattleView.stats().fov===11);
  await page.mouse.wheel(0,-100);await page.waitForFunction(()=>BattleView.stats().fov===5.5);await fixedSight(page);
  await page.keyboard.press('Shift');await page.waitForFunction(()=>BattleView.stats().fov===62);
  await page.keyboard.down('Tab');assert.ok(await page.locator('#battle-roster').isVisible());assert.equal(await page.locator('#battle-roster img').count(),2);await page.keyboard.up('Tab');assert.ok(await page.locator('#battle-roster').isHidden());
  await page.keyboard.down('ArrowLeft');await lockedButton(page,true,'right');await page.evaluate(()=>document.exitPointerLock());await page.getByRole('heading',{name:'Бой на паузе'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>[BattleInput.state,GameState.holdTurret,Object.keys(GameState.keys)]),['paused',false,[]]);await lockedButton(page,false,'right');await page.keyboard.up('ArrowLeft');const frozen=await page.evaluate(()=>[ticks,BattleClock.now()]);
  await page.keyboard.down('w');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.keyboard.up('w');
  assert.deepEqual(await page.evaluate(()=>[ticks,BattleClock.now()]),frozen);await page.locator('#resume-input').click();await page.waitForFunction(()=>BattleInput.running);
  await centerPractice(page);await page.keyboard.press('e');await page.waitForFunction(()=>!!BattleView.stats().autoTarget);
  const straight=await page.evaluate(()=>{GameState.units[1].vy=.95;return GameState.player.lookYaw;});
  await page.waitForFunction(old=>wrapAngle(GameState.player.lookYaw-old)>.045,straight);
  await page.evaluate(()=>{GameState.units[1].vy=0;});await page.waitForFunction(()=>GameState.player.sightHit().hit===GameState.units[1]);
  await moveLook(page,180,0);assert.ok(await page.evaluate(()=>GameState.aim.hit!==GameState.units[1] && GameState.player.sightHit().hit===GameState.units[1]));
  await page.keyboard.press('7');await page.waitForFunction(()=>CombatMechanics.smokeClouds.length>0 && !BattleView.stats().autoTarget);
  await centerPractice(page);await page.keyboard.press('2');assert.equal(await page.evaluate(()=>GameState.curShell),1);
  const hp=await page.evaluate(()=>{const p=GameState.player;p.hp=p.maxHp/2;return p.maxHp;});await page.keyboard.press('4');assert.equal(await page.evaluate(()=>GameState.player.hp),hp*.65);
  await lockedButton(page,true);await page.waitForFunction(()=>GameState.battleDmg>0,null,{timeout:30000});
  await page.locator('#result-screen.show').waitFor({timeout:30000});await lockedButton(page,false);assert.equal(await page.evaluate(()=>document.pointerLockElement),null);
  assert.equal(await page.locator('#result-title').innerText(),'ПОБЕДА!');assert.match(await page.locator('#result-stats').innerText(),/Фрагов: 1/);await click('В АНГАР');
  const progress=await saved(page);assert.equal(progress.totalBattles,1);assert.equal(progress.GOLD,50);assert.equal(progress.lifetimeWins,1);assert.equal(progress.lifetimeKills,1);assert.ok(progress.XP>500);checkClean(progress);
  assert.ok(!('units' in progress||'player' in progress));assert.equal(await page.evaluate(()=>BattleView.stats()),null);await page.reload();assert.equal((await saved(page)).GOLD,progress.GOLD);
});

test('offline team modes use the shared 3D asset; touch driving/firing, replay and tutorial work even with blocked storage',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,mobile:true,denyStorage:true});
  assert.ok(await page.locator('#save-status.warning').isVisible());
  const touch=await page.context().newCDPSession(page);
  for(const [name,type,count,map] of [['7×7','pc',14,'city'],['В БОЙ 15×15','mobile',30,'desert']]){
    await page.locator('#map-select').selectOption(map);await click(name);await chooseControls(page,type);await ready(page);
    const units=await page.evaluate(()=>{
      const pool=Object.values(DB).filter(t=>Math.abs(t.tier-GameState.player.tier)<=1).map(t=>t.id);
      const mover=GameState.units.findIndex(u=>u.bot && !u.isSPG);
      return {n:BattleView.stats().units,poolSize:pool.length,
        shared:GameState.units.every(u=>pool.includes(u.id)&&u.modelAsset===GameState.units.find(t=>t.id===u.id).modelAsset),
        types:new Set(GameState.units.map(u=>u.id)).size,
        allFinite:GameState.units.every(u=>Number.isFinite(u.angle)&&Number.isFinite(u.y)),start:[mover,GameState.units[mover].x,GameState.units[mover].y]};
    });
    assert.equal(units.n,count);assert.ok(units.types>count/2 && units.types<=Math.min(units.poolSize,count));assert.ok(units.shared&&units.allFinite);
    await page.waitForFunction(([i,x,y])=>Math.hypot(GameState.units[i].x-x,GameState.units[i].y-y)>4,units.start);
    if(type==='pc'){
      // Real RAF motion was checked above. On the full-size map walk the remaining
      // fixed steps to first contact without tying the result to software GPU speed.
      assert.ok(await page.evaluate(()=>{
        const real=Date.now,now=performance.now(),date=real();let time=0;
        try{performance.now=()=>now+time;Date.now=()=>date+time;
          for(let i=0;i<7200 && GameState.gameActive;i++){
            time+=TICK;update();
            if(GameState.units.some(u=>u.team==='enemy' && u.lastShot) && GameState.units.some(u=>u.hp<u.maxHp))return true;
          }return false;
        }finally{delete performance.now;Date.now=real;}
      }),'opposing bot actually fires and a vehicle loses HP');
    }
    if(type==='mobile'){
      const start=await page.evaluate(()=>[GameState.player.x,GameState.player.y]);
      assert.ok(await page.locator('#mobile-controls').isVisible());
      assert.equal(await page.locator('#allies-list').textContent(),'15');
      assert.equal(await page.locator('#enemies-list').textContent(),'15');
      assert.ok(await page.locator('#recon-status').isVisible());
      const boxes=await Promise.all(['.combat-location','.combat-score','#battle-exit','#recon-status'].map(s=>page.locator(s).boundingBox()));
      assert.ok(boxes.every(b=>b.x>=0 && b.x+b.width<=390 && b.y>=0));
      assert.ok(boxes[0].x+boxes[0].width<=boxes[1].x && boxes[1].x+boxes[1].width<=boxes[2].x,'score fits between location and exit');
      assert.ok(await page.locator('#battle-reticle').isVisible(),'touch still has its on-screen gun sight');
      const f=await page.locator('#fire-btn').boundingBox();
      // Start well away from the decorative corner stick: this is a floating base.
      const origin={id:1,x:125,y:440},move={...origin,y:origin.y-55};
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
      assert.equal(await page.evaluate(()=>GameState.joystickData.mag),0,'floating origin has no throttle on tap');
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move]});
      await page.waitForFunction(([x,y])=>Math.hypot(GameState.player.x-x,GameState.player.y-y)>5,start);
      const aim={id:2,x:205,y:355}, turned={...aim,x:278,y:350}, trigger={id:3,x:f.x+f.width/2,y:f.y+f.height/2};
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,aim]});
      const yaw=await page.evaluate(()=>BattleView.stats().yaw);await fixedSight(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move,turned]});
      await page.waitForFunction(y=>Math.abs(BattleView.stats().yaw-y)>.19,yaw);await fixedSight(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,turned,trigger]});
      await page.waitForFunction(()=>GameState.player.lastShot>0 && GameState.joystickData.active && GameState.mobileFireActive);
      await fixedSight(page);
      const eye=await page.evaluate(()=>{const p=GameState.player,d=BattleView.stats().direction;
        return [wrapAngle(p.angle-Math.atan2(d[2],d[0])),p.speedKmh,GameState.mouseDown];});
      assert.ok(Math.abs(eye[0])>.19 && eye[1]>0 && !eye[2],'three fingers: drive, relative look and independent fire');
      const prev=await page.evaluate(()=>BattleView.stats().yaw);
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move,turned,{...trigger,x:trigger.x-32}]});
      await page.waitForFunction(y=>BattleView.stats().yaw<y-.07,prev);
      const scope=await page.locator('#scope-btn').boundingBox();
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,turned,{...trigger,x:trigger.x-32},{id:4,x:scope.x+scope.width/2,y:scope.y+scope.height/2}]});
      await page.waitForFunction(()=>BattleView.stats().zoom===2 && GameState.joystickData.active && GameState.mobileFireActive);
      await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      await page.waitForFunction(()=>!GameState.joystickData.mag&&!GameState.mobileFireActive);
    }
    if(type==='pc') {
      await page.evaluate(()=>{GameState.player.dead=true;});await page.getByText('ПОРАЖЕНИЕ',{exact:true}).waitFor();
      await click('В АНГАР');
    } else {
      const battles=await page.evaluate(()=>GameState.totalBattles);
      await page.evaluate(()=>document.getElementById('game').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
      await page.getByRole('heading',{name:'3D-бой недоступен'}).waitFor();await click('Вернуться в ангар');
      assert.equal(await page.evaluate(()=>GameState.totalBattles),battles);
    }
    assert.equal(await page.evaluate(()=>BattleView.stats()),null);
  }
  await click('Обучение');await ready(page);await page.locator('#tutorial-overlay').waitFor();
  await click('Пропустить');assert.equal(await page.evaluate(()=>GameState.gameActive),false);assert.ok(await page.locator('#ui').isVisible());
});

test('research, icons and offline mesh loading: the complete line is visible; only real vehicles can be unlocked',async t=>{
  const {page,click}=await offlineGame(t);
  await click('Дерево развития');
  assert.equal(await page.locator('#nodes .node').count(),sovietTreeIds.length);assert.equal(await page.locator('#bay-research table').count(),0);
  const edges=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('#nodes .node')], c=document.getElementById('tree-canvas'), ctx=c.getContext('2d'), dpr=c.width/c.offsetWidth;
    return nodes.slice(1).map(n=>{
      const p=nodes.find(b=>b.dataset.tankId===researchParent(n.dataset.tankId)), x=(p.offsetLeft+p.offsetWidth+n.offsetLeft)/2, y=(p.offsetTop+n.offsetTop+n.offsetHeight)/2;
      return ctx.getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data[3]>0;
    });
  });assert.deepEqual(edges,Array(sovietTreeIds.length-1).fill(true),'each prerequisite has a visible connector');
  await click('Характеристики: Т-46');assert.deepEqual((await saved(page)).owned,['MS1']);
  assert.equal(await page.locator('#tree-inspect,#depot-canvas,#bay-picker,#bay-open').count(),0);
  assert.equal(await page.locator('#tree-name').innerText(),'Т-46');
  assert.equal(await page.locator('#dispatch-name').innerText(),'МС-1','inspection never grants or selects a tank');
  assert.deepEqual((await saved(page)).owned,['MS1']);
  await click('Дерево развития');await click('Исследовать: Т-26');await click('Исследовать: Т-46');
  assert.equal(await page.locator('#dispatch-dmg-label').innerText(),'Урон барабана');
  assert.equal(await page.locator('#dispatch-dmg').innerText(),'60 (6 × 10)');
  const s=await saved(page);assert.deepEqual(s.owned,['MS1','T26','T46']);assert.equal(s.XP,0);assert.equal(s.selected,'T46');
  await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'Т-46');
  const parts=await page.evaluate(async()=>{
    GarageViewer.suspend();const signal=new AbortController().signal, result={};
    for(const id of Object.keys(DB)) {
      const poster=new Image();poster.src='models/'+DB[id].thumbnail;await poster.decode();
      if(poster.naturalWidth!==640 || poster.naturalHeight<100)throw Error(id+' icon');
      const a=await BattleModels.load(id,signal);
      if(a!==await BattleModels.load(id,signal)||a.muzzle[2]<=0||!Number.isFinite(a.height))throw new Error(id);
      const unit=new Tank(id,0,0,'enemy');unit.modelAsset=a;const f=TrackContact.shape(unit);
      if(f.reach+Math.hypot(f.along,f.left)>BOT_CLEARANCE)throw Error(id+' too large for bot paths');
      result[id]=(a.hull.attributes.position.count+a.turret.attributes.position.count+a.gun.attributes.position.count)/3;
    }
    return result;
  });
  assert.deepEqual(parts,meshCounts);
  assert.ok(await page.evaluate(async()=>{
    const signal=new AbortController().signal,a=await BattleModels.load('TL7',signal),b=await BattleModels.load('TL7OLEN',signal);
    return a.height===b.height && a.aimHeight===b.aimHeight && a.hull.boundingBox.equals(b.hitHull) && a.turret.boundingBox.equals(b.hitTurret) && a.muzzle.every((v,i)=>v===b.muzzle[i]);
  }),'holiday decorations are not extra armour, flotation, or a different muzzle');
  assert.equal(await page.locator('iframe').count(),0,'no WebGL renderer is required to load the original meshes');
});

test('T-46 holds fire in a real 3D training battle: one complete drum removes 60 HP, not 360',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','T46'],selected:'T46'})}});
  await click('ТРЕНИРОВКА');await page.locator('#enemy-select').selectOption('T28_USSR');
  await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);
  assert.equal(await page.locator('#combat-tank').innerText(),'Т-46');
  await page.keyboard.press('2');assert.equal(await page.evaluate(()=>GameState.curShell),0);
  assert.match(await page.locator('#ammo-val').innerText(),/БАРАБАН 6\/6/);
  await centerPractice(page);
  await lockedButton(page,true);await page.waitForFunction(()=>GameState.player.isReloading);await lockedButton(page,false);
  await page.waitForFunction(()=>GameState.bullets.length===0&&!GameState.player.isReloading);
  assert.deepEqual(await page.evaluate(()=>[GameState.battleDmg,GameState.units[1].maxHp-GameState.units[1].hp,GameState.player.curMag,GameState.mouseDown]),[60,60,6,false]);
});

test('mobile graph: no VI → IX shortcut or blueprint discount; new tiers research in order and persist',async t=>{
  const {page,click} = await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','KV1S'],selected:'KV1S',XP:400000,blueprints:{IS:99,IS3:99}})}});
  await click('Дерево развития');
  const area = page.locator('#tree-container');
  assert.ok(await area.evaluate(el=>el.scrollWidth>el.clientWidth && el.scrollLeft>0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await click('Предыдущие уровни');await click('Следующие уровни');
  await click('Характеристики: Объект 257');assert.equal((await saved(page)).XP,400000);assert.equal((await saved(page)).selected,'KV1S');
  let xp=400000;
  for(const [id,name,cost] of [['IS','ИС',25000],['IS3','ИС-3',60000],['OBJ257','Объект 257',120000],['IS7','ИС-7',195000]]) {
    await click('Исследовать: '+name);xp-=cost;
    assert.equal((await saved(page)).XP,xp);assert.equal((await saved(page)).selected,id);
    await click('Выбрать: '+name);assert.equal((await saved(page)).XP,xp,'no double charge');
  }
  await page.reload();const s=await saved(page);assert.equal(s.XP,0);assert.equal(s.selected,'IS7');
  assert.deepEqual(s.owned,['MS1','KV1S','IS','IS3','OBJ257','IS7']);checkClean(s);
});

test('the new VII and VIII use their own meshes as player and opponent in a 3D battle',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','IS'],selected:'IS'})}});
  await click('ТРЕНИРОВКА');await page.locator('#enemy-select').selectOption('IS3');await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);
  assert.deepEqual(await page.evaluate(()=>GameState.units.map(u=>[u.id,u.hp,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)])),
    [['IS',1300,3032],['IS3',1600,3156]]);
  assert.equal(await page.locator('#depot-canvas').count(),0);
  await page.evaluate(()=>backToGarage());await page.waitForFunction(()=>DepotView.stats()?.id==='IS');
  assert.equal((await saved(page)).totalBattles,0,'leaving a training session does not claim an end-of-battle reward');
});

test('all six selected plans become playable WebGL arenas with exploration, contact and damage in 7×7, 10×10 and 15×15',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','LTR','IS3','RHMPZW','T1C','M3LEE','M48PATTON','OBJ140','WTE100','E100','MAUS','T100LT','MT25','E75','TIGERII'],selected:'MS1'})}});
  const ids=await page.locator('#map-select option').evaluateAll(options=>options.map(o=>o.value));
  assert.deepEqual(ids,['city','field','desert','port','quarry','frost']);
  const plans=new Set();
  for(const size of [7,10,15]) {
    for(const [i,id] of ids.entries()) {
      const playerName=size===7?['T1 Cunningham','Leichttraktor','МС-1'][i%3]:
        size===10?['ИС-3','Объект 140','Rhm. Panzerwagen','M3 Lee','Waffenträger auf E 100','M48 Patton'][i]:
        ['E 100','Т-100 ЛТ','Maus','E 75','МТ-25','Tiger II'][i];
      await click('Выбрать для боя: '+playerName);
      await page.locator('#map-select').selectOption(id);
      await click(size===15?'В БОЙ 15×15':size+'×'+size);
      const info=await page.evaluate(async ({id,size})=>{
        const spec=BattleMaps.specs[id],plan=document.querySelector('#map-plan').toDataURL();
        const random=Math.random;let spawnSeed=731*size+Number(spec.sector);
        try {Math.random=()=>(spawnSeed=(Math.imul(spawnSeed,1664525)+1013904223)>>>0)/4294967296;
          if(!await selectControl('mobile'))throw new Error(document.querySelector('#battle-notice-text').textContent);
        } finally {Math.random=random;}
        // Run the ordinary fixed ticks, but don't wait wall-clock minutes or need a fast GPU
        // to exercise eighteen different sorties. Nothing sets aim, vision, damage or team orders.
        stopBattleLoop();const g=GameState,a=g.arena,nav=g.navigation,r=nav.recon;
        const initialCounts=r.teams.map(t=>t.count), initialScore=['allies-list','enemies-list'].map(id=>Number(document.getElementById(id).textContent));
        const orders=new Set(g.units.filter(u=>u.bot).map(u=>u.bot.order)).size;
        const mobileBots=g.units.filter(u=>u.bot && !u.isSPG).length;
        const starts=g.units.map(u=>[u.x,u.y]);let moved=0,invalid=false,spotted=false,damage=0,both=false;
        const clock=Date.now,start=performance.now(),date=clock();let time=0;
        const rng=Math.random;let state=650+size;
        try {
          performance.now=()=>start+time;Date.now=()=>date+time;
          Math.random=()=>(state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
          for(let i=0;i<7200 && g.gameActive;i++){
            time+=TICK; update();
            if(ticks%12===0){
              moved=Math.max(moved,g.units.filter((u,k)=>u.bot && !u.isSPG && Math.hypot(u.x-starts[k][0],u.y-starts[k][1])>110).length);
              invalid ||= g.units.some(u=> !Number.isFinite(u.x+u.y+u.angle+u.tAngle+u.rideHeight+u.groundPitch+u.groundRoll) || u.drownTimer!=null || !nav.clear(u.x,u.y,u.x,u.y));
              spotted ||= g.units.some(u=>u.team==='enemy' && u.visible);
              damage=g.units.reduce((s,u)=>s+u.maxHp-u.hp,0);
              both=g.units.some(u=>u.team==='ally' && u.lastShot>0) && g.units.some(u=>u.team==='enemy' && u.lastShot>0);
              if(both && damage>0 && moved===mobileBots && r.teams.every((t,i)=>t.count>=initialCounts[i]+2))break;
            }
          }
          BattleView.syncCamera();BattleView.aim();BattleView.draw();updateHUD();
        } finally {delete performance.now;Date.now=clock;Math.random=rng;}
        const allies=g.units.filter(u=>u.team!=='enemy'),enemies=g.units.filter(u=>u.team==='enemy');
        const different=enemies.some(e=>!allies.some(u=>u.id===e.id));
        const inBand=g.units.every(u=>Math.abs(u.tier-g.player.tier)<=1);
        const onBase=g.units.filter(u=>u.bot && u.isSPG).every(u=>!u.bot.scout && u.bot.sector<0 && Math.hypot(u.x-u.bot.post.x,u.y-u.bot.post.y)<65);
        const info={player:g.player.name,nations:[...new Set(allies.map(u=>DB[u.id].nat))],different,inBand,onBase,mobileBots,id:a.id,sizeOK:document.querySelector('#map-size').textContent===spec.size.join(' × ')+' м',
          hudOK:document.querySelector('#combat-map').textContent===spec.name && document.querySelector('#combat-sector').textContent.endsWith(size+' × '+size),
          surveyLabel:document.querySelector('#recon-status').textContent, expectedLabel:`Разведано: ${r.teams[0].count}/${r.total}`,
          growth:r.teams.map((t,i)=>t.count-initialCounts[i]), initialScore, orders,plan,mesh:BattleView.stats(),moved,spotted,damage,both,invalid};
        backToGarage();info.reset=!g.units.length && !g.arena && !g.navigation && !WeatherEngine.waterBodies.length;
        return info;
      },{id,size});
      const label=id+' '+size+'×'+size;
      assert.equal(info.player,playerName);assert.deepEqual(info.nations.sort(),['france','germany','hungary','japan','sweden','usa','ussr']);assert.ok(info.different && info.inBand && info.onBase,label+' different rosters, matched range and SPG base duty');
      assert.equal(info.id,id);assert.ok(info.sizeOK && info.hudOK,label);plans.add(info.plan);
      assert.ok(info.mesh.triangles>1000 && info.mesh.units===size*2,label+' scene');
      assert.deepEqual(info.initialScore,[size,size],label+' initial HUD counts the actual line-ups');
      assert.equal(info.orders,size*2-1);assert.ok(info.growth.every(g=>g>=2),label+' both teams enter new sectors');
      assert.equal(info.surveyLabel,info.expectedLabel);
      assert.equal(info.moved,info.mobileBots,label+' non-artillery bots leave their starts');
      assert.ok(!info.invalid && info.spotted && info.both && info.damage>0 && info.reset,label+' fight');
    }
  }
  assert.equal(plans.size,6,'each plan depicts different ground');
});

test('Germany is a separate connected mobile tree: stats before unlocking, free starter, no cross-nation shortcuts',async t=>{
  const prior=['MS1','T26','IS3'];let xp=500000;
  const {page,click}=await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned:prior,selected:'IS3',XP:xp,garageSlots:prior.length+10})}});
  await click('Дерево развития');await click('ГЕРМАНИЯ');
  assert.equal(await page.locator('#branch-number').textContent(),'02');assert.match(await page.locator('#branch-title').innerText(),/Rhm\. Panzerwagen/);
  assert.deepEqual(await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId)),germanTreeIds);
  assert.equal(await page.locator('#tree-name').innerText(),'Leichttraktor');assert.equal(await page.locator('#dispatch-name').innerText(),'ИС-3');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await click('Характеристики: Spähpanzer Ru 251');assert.match(await page.locator('#tree-status').textContent(),/HWK 12/);
  assert.equal(await page.locator('#tree-inspect,#bay-picker').count(),0);
  assert.ok(await page.locator('#tree-photo').evaluate(async i=>{await i.decode();return i.naturalWidth>0 && i.src.endsWith('/ru-251.webp');}));
  assert.equal((await saved(page)).selected,'IS3');assert.deepEqual((await saved(page)).owned,prior);
  await click('Дерево развития');await click('Характеристики: VK 16.02 Leopard');
  assert.match(await page.locator('#tree-stats').innerText(),/240 \(8 × 30\)/);
  const nodes=['Leichttraktor','Pz.Kpfw. II','Pz.Kpfw. I Ausf. C','Pz. II «Luchs»','VK 16.02 Leopard','VK 28.01','Spähpanzer SP I.C.','HWK 12','Spähpanzer Ru 251','Rhm. Panzerwagen'];
  const costs=[0,150,350,1500,4000,8000,25000,60000,120000,195000];
  for(const [i,name] of nodes.entries()){
    await click('Исследовать: '+name);xp-=costs[i];const s=await saved(page);assert.equal(s.XP,xp);assert.equal(s.selected,germanIds[i]);
    assert.deepEqual(s.owned,prior.concat(germanIds.slice(0,i+1)));
    if(i===0){await click('Выбрать: Leichttraktor');assert.equal(await page.getByRole('button',{name:'Продать: Leichttraktor'}).count(),1);}
  }
  await click('СССР');assert.equal(await page.locator('#nodes .node.owned').count(),3);assert.equal((await saved(page)).selected,'RHMPZW');
  await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'Rhm. Panzerwagen');await click('Дерево развития');
  assert.equal(await page.locator('#branch-number').innerText(),'01');await click('ГЕРМАНИЯ');
  assert.equal(await page.locator('#nodes .node.owned').count(),10);assert.equal(await page.locator('#tree-name').innerText(),'Rhm. Panzerwagen');
  assert.equal((await saved(page)).XP,xp);
});

test('Leopard player and VK 28.01 practice opponent: the supplied models fight with the selected primary loadouts',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','LEOPARD'],selected:'LEOPARD'})}});
  assert.equal(await page.locator('#dispatch-dmg-label').innerText(),'Урон кассеты');assert.equal(await page.locator('#dispatch-dmg').innerText(),'240 (8 × 30)');
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('germany');
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(opts=>opts.map(o=>o.value)),germanTreeIds.concat(['GPZ','JPANTHERII','LOWE']));
  await page.locator('#enemy-select').selectOption('VK2801');await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);
  const units=await page.evaluate(()=>GameState.units.map(u=>[u.id,u.dmg,u.magSize,u.reloadTime,u.pen,
    ['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]));
  assert.deepEqual(units,[['LEOPARD',30,8,9000,105,meshCounts.LEOPARD],['VK2801',115,1,3600,135,meshCounts.VK2801]]);
  await page.keyboard.press('3');assert.equal(await page.evaluate(()=>GameState.curShell),0);
  assert.equal(await page.locator('#shell-ui').isVisible(),false);assert.match(await page.locator('#ammo-val').innerText(),/КАССЕТА 8\/8/);
  await centerPractice(page);
  await lockedButton(page,true);await page.waitForFunction(()=>GameState.player.isReloading);await lockedButton(page,false);
  await page.waitForFunction(()=>!GameState.bullets.length);assert.deepEqual(await page.evaluate(()=>[GameState.battleDmg,GameState.units[1].hp]),[240,440]);
});

test('US research from a free T1 Cunningham to M48 Patton, locked stats and local progress',async t=>{
  const prior=['MS1','IS3','LTR'],names=['T1 Cunningham','T2 Medium Tank','M2 Medium Tank','M3 Lee','M4 Sherman',
    'M4A3E8 Sherman','T20','M26 Pershing','M46 Patton','M48 Patton'];
  let xp=414000;const {page,click}=await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned:prior,selected:'IS3',XP:xp,garageSlots:prior.length+10})}});
  await click('Дерево развития');await click('США');
  assert.equal(await page.locator('#branch-number').innerText(),'03');assert.match(await page.locator('#branch-title').innerText(),/M48 Patton/);
  assert.deepEqual(await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId)),usTreeIds);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await click('Характеристики: M48 Patton');assert.match(await page.locator('#tree-status').innerText(),/M46 Patton/);
  assert.equal(await page.locator('#tree-inspect,#bay-picker').count(),0);
  assert.ok(await page.locator('#tree-photo').evaluate(async i=>{await i.decode();return i.naturalWidth>0 && i.src.endsWith('/m48-patton.webp');}));
  assert.equal((await saved(page)).selected,'IS3');assert.deepEqual((await saved(page)).owned,prior);
  await click('Дерево развития');
  for (const [i,cost] of [0,150,350,1500,4000,8000,25000,60000,120000,195000].entries()) {
    await click('Исследовать: '+names[i]);xp-=cost;const s=await saved(page);
    assert.equal(s.XP,xp);assert.equal(s.selected,usIds[i]);assert.deepEqual(s.owned,prior.concat(usIds.slice(0,i+1)));
    if(!i){await click('Выбрать: T1 Cunningham');assert.equal(await page.getByRole('button',{name:'Продать: T1 Cunningham'}).count(),1);}
  }
  await page.reload();const s=await saved(page);assert.equal(s.selected,'M48PATTON');assert.equal(s.curNat,'usa');assert.equal(s.XP,0);
  assert.equal(await page.locator('#dispatch-name').innerText(),'M48 Patton');await click('Дерево развития');
  assert.equal(await page.locator('#nodes .node.owned').count(),10);await click('ГЕРМАНИЯ');assert.equal(await page.locator('#nodes .node.owned').count(),1);
});

test('US M3 Lee: real depot and mobile sortie, limited traverse, swipe to aim, touch optics and an actual shot',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,mobile:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','M3LEE'],selected:'M3LEE'})}});
  assert.equal(await page.evaluate(()=>DepotView.stats().triangles),meshCounts.M3LEE);
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('usa');
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(opts=>opts.map(o=>o.value)),usTreeIds.concat(['M4A3E2','T71DA','TL7','T34HEAVY','TL7OLEN']));
  await page.locator('#enemy-select').selectOption('M4SHERMAN');await click('НАЧАТЬ');await chooseControls(page,'mobile');await ready(page);
  const models=await page.evaluate(()=>GameState.units.map(u=>[u.id,u.hp,u.dmg,u.magSize,u.reloadTime,u.pen,
    ['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]));
  assert.deepEqual(models,[['M3LEE',400,110,1,3800,92,2400],['M4SHERMAN',600,115,1,3500,122,2514]]);
  const c=await page.context().newCDPSession(page), sw=(type,touchPoints)=>c.send('Input.dispatchTouchEvent',{type,touchPoints});
  const camera=await page.evaluate(()=>BattleView.stats().direction);
  await sw('touchStart',[{id:1,x:175,y:340}]);await sw('touchMove',[{id:1,x:358,y:340}]);await sw('touchEnd',[]);
  await page.waitForFunction(()=>Math.abs(GameState.player.tAngle-Math.PI/12)<1e-6);await fixedSight(page);
  assert.notDeepEqual(await page.evaluate(()=>BattleView.stats().direction),camera,'a swipe rotates the view past the traverse stop');
  assert.equal(await page.evaluate(()=>GameState.player.lastShot),0,'aim finger alone never fires');
  await page.locator('#scope-btn').tap();await page.waitForFunction(()=>BattleView.stats().fov===22);
  for(const z of [4,8,2]){await page.locator('#zoom-btn').tap();await page.waitForFunction(n=>BattleView.stats().zoom===n,z);}
  await page.locator('#scope-btn').tap();await centerPractice(page,sw);
  await page.locator('#autoaim-btn').tap();await page.waitForFunction(()=>BattleView.stats().autoTarget==='M4SHERMAN');
  await page.locator('#fire-btn').tap();await page.waitForFunction(()=>GameState.battleDmg===110);
  assert.deepEqual(await page.evaluate(()=>[GameState.units[1].hp,GameState.player.curMag,GameState.player.isReloading]),[490,0,true]);
  await page.evaluate(()=>backToGarage());assert.equal((await saved(page)).selected,'M3LEE');assert.equal((await saved(page)).totalBattles,0);
});


test('capture-denied preview: relative mouse, actual barrel on quick click, mount stops, cover and cleanup',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['M3LEE'],selected:'M3LEE'})}});
  await page.evaluate(()=>{document.querySelector('#game').requestPointerLock=()=>Promise.reject(new DOMException('Embedding policy','NotAllowedError'));});
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('usa');await page.locator('#enemy-select').selectOption('M4SHERMAN');await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);
  assert.equal(await page.evaluate(()=>BattleInput.state),'relative');assert.ok(await page.locator('#relative-hint').isVisible());
  await page.keyboard.down('Alt');await page.mouse.move(385,245);await page.keyboard.up('Alt');
  const before=await page.evaluate(()=>{stopBattleLoop();return {angle:GameState.player.tAngle,yaw:BattleView.stats().yaw};});
  await page.mouse.move(600,245);await page.mouse.down();await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>GameState.bullets.map(b=>b.a)),[before.angle],'fast shot uses the barrel, not a pending camera delta');
  await page.evaluate(()=>{update();BattleView.syncCamera();BattleView.aim();});
  const first=await page.evaluate(()=>[GameState.player.tAngle,BattleView.stats().yaw]);
  assert.ok(Math.abs(first[1]-before.yaw-215*.0022)<.01 && Math.abs(first[0]-before.angle)<.02);
  await page.evaluate(()=>startBattleLoop());await page.waitForFunction(()=>Math.abs(GameState.player.tAngle-Math.PI/12)<1e-7);await fixedSight(page);
  assert.ok(await page.evaluate(()=>{const r=document.querySelector('#battle-reticle').getBoundingClientRect(),m=document.querySelector('#gun-marker').getBoundingClientRect();return Math.abs(m.x-r.x)>20;}));
  await page.waitForFunction(()=>!GameState.player.isReloading && !GameState.bullets.length);await centerPractice(page);
  const hp=await page.evaluate(()=>GameState.units[1].hp);
  assert.ok(await page.evaluate(()=>{
    const g=GameState,hit=g.aim,m=g.player.muzzle(),[cx,ch]=BattleView.stats().camera;
    const x=(hit.x+m.x)/2,y=(hit.y+m.y)/2,gunH=(m.h+hit.h)/2,eyeH=ch+(hit.h-ch)*(x-cx)/(hit.x-cx);
    if(eyeH<gunH+2)return false;
    g.walls.push({type:'test-cover',solid:true,x:x-1,y:y-14,w:2,h:28,height:(eyeH+gunH)/2});return true;
  }));await page.waitForFunction(()=>GameState.aim.hit===GameState.units[1] && GameState.player.sightHit().hit?.type==='test-cover');
  const last=await page.evaluate(()=>GameState.player.lastShot);await page.mouse.down();await page.mouse.up();
  await page.waitForFunction(t=>GameState.player.lastShot>t && !GameState.bullets.length,last);assert.equal(await page.evaluate(()=>GameState.units[1].hp),hp,'elevated crosshair cannot shoot through cover');
  await page.keyboard.press('q');await page.keyboard.press('f');
  assert.ok(await page.evaluate(()=>GameState.consumables[0] && GameState.consumables[3]));
  await page.keyboard.press('x');assert.match(await page.locator('#combat-message').innerText(),/Нужна помощь/);
  await page.keyboard.press('8');await page.waitForFunction(()=>!!CombatMechanics.artilleryStrikes.length);
  await page.keyboard.press('Escape');assert.ok(await page.locator('#input-menu').isVisible());await page.locator('#input-menu .battle-cancel').first().click();
  assert.equal(await page.evaluate(()=>BattleInput.state),'paused','declining the leave confirmation keeps the match paused');await page.evaluate(()=>backToGarage());
  assert.ok(await page.locator('#game').isHidden());assert.ok(await page.locator('#input-menu').isHidden());assert.equal(await page.evaluate(()=>BattleInput.state),'off');
});

test('shared-root research on a phone: both added routes unlock in order, including the Borsig, and persist with old vehicles', async t=>{
  const owned=['MS1','T26','KV1S','IS7','LTR','PZII','RHMPZW','T1C'];let xp=828000;
  const {page,click}=await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned,selected:'IS7',XP:xp,garageSlots:owned.length+mediumIds.length+tdIds.length})}});
  assert.equal(await page.locator('#bay-picker,#tree-inspect,#bay-open').count(),0);
  await click('Дерево развития');
  for(const [nation,root,ids,names,blocked,parent] of [
    ['СССР','MS1',mediumIds,['БТ-2','БТ-7','А-20','Т-34','Т-34-85','Т-43','Т-44','Т-54','Объект 140'],'БТ-7','БТ-2'],
    ['ГЕРМАНИЯ','LTR',tdIds,['Panzerjäger I','Marder II','Marder 38T','Pz.Sfl. IVc','Nashorn','Sturer Emil','Rhm.-Borsig Waffenträger','Waffenträger auf Pz. IV','Waffenträger auf E 100'],'Marder II','Panzerjäger I']
  ]){
    await click(nation);assert.equal(await page.locator(`#nodes [data-tank-id="${root}"]`).count(),1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    await click('Характеристики: '+blocked);assert.match(await page.locator('#tree-status').innerText(),new RegExp(parent));
    if(root==='LTR'){
      const before=await saved(page);await click('Характеристики: Waffenträger auf Pz. IV');assert.match(await page.locator('#tree-status').innerText(),/Rhm.-Borsig/);
      await click('Характеристики: Rhm.-Borsig Waffenträger');assert.equal(await page.locator('#tree-inspect').count(),0);
      assert.ok(await page.locator('#tree-photo').evaluate(async i=>{await i.decode();return i.src.endsWith('/rhm-borsig-waffentrager.webp') && i.naturalWidth>0}));
      assert.deepEqual(await saved(page),before);await click('Дерево развития');
    }
    for(const [i,cost] of [150,350,1500,4000,8000,25000,60000,120000,195000].entries()){
      await click('Исследовать: '+names[i]);owned.push(ids[i]);xp-=cost;
      const s=await saved(page);assert.deepEqual(s.owned,owned);assert.equal(s.XP,xp);assert.equal(s.selected,ids[i]);
    }
    await click('Выбрать: '+names.at(-1));assert.equal((await saved(page)).XP,xp);
  }
  await page.reload();const s=await saved(page);assert.equal(s.XP,0);assert.equal(s.selected,'WTE100');assert.deepEqual(s.owned,owned);
  assert.equal(await page.locator('#dispatch-dmg').innerText(),'2080 (4 × 520)');assert.equal(await page.locator('#dispatch-reload').innerText(),'40 с');
});

test('added vehicles in a real 3D sortie: Object 140 hits Borsig, casemate stops hold, and WT fires four 520-point rounds',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','OBJ140','PZSFL4C','WTE100'],selected:'OBJ140'})}});
  assert.equal(await page.evaluate(()=>DepotView.stats().triangles),meshCounts.OBJ140);
  assert.equal(await page.locator('#dispatch-name').innerText(),'Объект 140');
  for(const [name,id,nation,opponent,rounds,alpha,left,reload] of [
    ['Объект 140','OBJ140','germany','RHMBWT',1,320,830,5800],
    ['Pz.Sfl. IVc','PZSFL4C','ussr','T34',1,220,360,6200],
    ['Waffenträger auf E 100','WTE100','ussr','IS7',4,520,320,40000]
  ]){
    await click('Выбрать для боя: '+name);if(id==='PZSFL4C')assert.equal(await page.locator('#dispatch-armor').innerText(),'20 / — мм');
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption(nation);await page.locator('#enemy-select').selectOption(opponent);
    await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);
    const units=await page.evaluate(()=>GameState.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]));
    assert.deepEqual(units,[[id,meshCounts[id]],[opponent,meshCounts[opponent]]]);
    if(id==='PZSFL4C'){
      await moveLook(page,185,0);await page.waitForFunction(()=>Math.abs(GameState.player.tAngle-Math.PI/36)<1e-8);
      assert.ok(await page.evaluate(()=>Math.abs(GameState.player.tAngle-Math.PI/36)<1e-8 && GameState.player.angle===0));
    }else if(id==='WTE100'){
      assert.equal(await page.locator('#shell-ui').isVisible(),false);assert.match(await page.locator('#ammo-val').innerText(),/БАРАБАН 4\/4/);
    }
    await centerPractice(page);
    await lockedButton(page,true);await page.waitForFunction(()=>GameState.player.isReloading);await lockedButton(page,false);
    await page.waitForFunction(()=>!GameState.bullets.length);
    assert.deepEqual(await page.evaluate(()=>[GameState.battleDmg,GameState.units[1].hp,GameState.player.dmg,GameState.player.curMag,GameState.player.reloadTime]),[rounds*alpha,left,alpha,0,reload]);
    await page.evaluate(()=>backToGarage());assert.equal((await saved(page)).selected,id);
  }
});

test('on a real slope the rendered track bed, offset gun, sight ray and live hit use the same pose',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','M3LEE'],selected:'M3LEE'})}});
  await page.locator('#map-select').selectOption('field');await click('ТРЕНИРОВКА');await click('НАЧАТЬ');await chooseControls(page,'mobile');await ready(page);
  const result=await page.evaluate(()=>{
    stopBattleLoop();const g=GameState,p=g.player,target=g.units[1],a=g.arena,f=a.ground,nav=g.navigation;
    // Place the fixture on a slope of the shipped map, not an artificial renderer-only tilt.
    let found=false;
    search:for(let y=-3000;y<3000;y+=25)for(let x=-2600;x<2600;x+=24){
      if(f.at(x,y)<24 || (f.at(x+15,y)-f.at(x-15,y))/30<.085 || !nav.clear(x,y,x+260,y+25))continue;
      p.x=x;p.y=y;target.x=x+260;target.y=y+25;target.angle=0;
      TrackDrive.place(p);TrackDrive.place(target);p.lookAtPoint(target.x,target.y,target.aimHeight);p.slewSight(Math.PI,Math.PI);
      if(Math.abs(p.groundRoll)>.02 && clearBattleSight(p,target) && p.sightHit().hit===target){found=true;break search;}
    }
    if(!found)throw Error('no clear slope fixture');
    BattleView.syncCamera();BattleView.aim();const ray=p.barrelRay();let muzzleError=null,angularError=null,terrainError=null;
    const proto=THREE.Mesh.prototype,original=proto.onBeforeRender;
    try{
      proto.onBeforeRender=function(...args){
        if(this.geometry===p.modelAsset.gun){
          const tip=new THREE.Vector3(...p.modelAsset.muzzle).applyMatrix4(this.matrixWorld);
          muzzleError=tip.distanceTo(new THREE.Vector3(ray.x,ray.h,ray.y));
          const bore=new THREE.Vector3(0,0,1).transformDirection(this.matrixWorld);
          angularError=bore.distanceTo(new THREE.Vector3(ray.dx,ray.dh,ray.dy));
        }
        if(this.geometry.parameters?.width===2*a.bounds.x && this.geometry.parameters.heightSegments===f.rows){
          const pick=new THREE.Raycaster(new THREE.Vector3(p.x,500,p.y),new THREE.Vector3(0,-1,0));
          const hit=pick.intersectObject(this,false)[0];if(hit)terrainError=Math.abs(hit.point.y-f.at(p.x,p.y));
        }
        original.apply(this,args);
      };
      BattleView.draw();
    }finally{proto.onBeforeRender=original;}
    const [cx,ch,cy]=BattleView.stats().camera,old=target.hp;
    if(!p.fire(0))throw Error('expected a live round');for(let i=0;i<60 && g.bullets.length;i++)updateBullets();
    return {pitch:p.groundPitch,roll:p.groundRoll,muzzleError,angularError,terrainError,clearance:ch-f.at(cx,cy),loss:old-target.hp};
  });
  assert.ok(result.pitch>.06 && Math.abs(result.roll)>.02 && result.clearance>0);
  for(const e of ['muzzleError','angularError','terrainError'])assert.ok(result[e]!==null && result[e]<1e-4,JSON.stringify(result));
  assert.ok(result.loss>0,'a round from the rendered gun reaches the higher target');
});


test('Sweden on mobile: locked nodes load only icons and stats; both research paths persist with one starter',async t=>{
  const prior=['MS1','IS3','T1C'];let xp=828000;
  const {page,click}=await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned:prior,curNat:'european',selected:'IS3',XP:xp,garageSlots:prior.length+19})}});
  assert.equal((await saved(page)).curNat,'ussr');const requests=[];page.on('request',r=>{if(r.url().endsWith('.mesh.js'))requests.push(r.url());});
  await click('Дерево развития');await click('ШВЕЦИЯ');const before=await saved(page);
  assert.equal(await page.locator('#nodes .node').count(),19);assert.equal(await page.locator('#nodes .node img').count(),19);
  const labels=await page.evaluate(()=>{const ctx=document.querySelector('#tree-canvas').getContext('2d'),texts=[],original=ctx.fillText;
    ctx.fillText=function(t,...p){texts.push(t);return original.call(this,t,...p);};try{renderTree();}finally{delete ctx.fillText;}
    return texts;});assert.deepEqual(labels,['I','II','III','IV','V','VI','VII','VIII','IX','X']);
  for(const [name,parent] of [['Strv 103B','Strv 103-0'],['Kranvagn','Emil II']]){
    await click('Характеристики: '+name);assert.match(await page.locator('#tree-status').innerText(),new RegExp(parent));
    assert.equal(await page.locator('#bay-open,#bay-picker,#tree-inspect,#depot-canvas').count(),0);assert.deepEqual(await saved(page),before);
  }
  await click('Мой танк');assert.equal(await page.locator('#bay-name').innerText(),'ИС-3');assert.deepEqual(requests,[]);
  await click('Дерево развития');await click('Исследовать: Strv fm/21');
  const ids=['STRVFM21'];for(const route of [
    [['Strv m/38','STRVM38'],['Strv m/40L','STRVM40L'],['Lago','LAGO'],['Strv m/42','STRVM42'],['Strv 74','STRV74'],['Leo','LEO'],['Emil I','EMIL1'],['Emil II','EMIL2'],['Kranvagn','KRANVAGN']],
    [['Pvlvv fm/42','PVLVV42'],['Ikv 72','IKV72'],['Sav m/43','SAV43'],['Ikv 103','IKV103'],['Ikv 65 Alt II','IKV65'],['Ikv 90 Typ B','IKV90'],['UDES 03','UDES03'],['Strv 103-0','STRV1030'],['Strv 103B','STRV103B']]
  ]){
    for(const [i,[name,id]] of route.entries()){
      await click('Исследовать: '+name);xp-=[150,350,1500,4000,8000,25000,60000,120000,195000][i];ids.push(id);
      const save=await saved(page);assert.deepEqual(save.owned,prior.concat(ids));assert.equal(save.selected,id);assert.equal(save.XP,xp);
    }
  }
  assert.equal(await page.getByRole('button',{name:'Продать: Strv fm/21'}).count(),1);await page.reload();
  assert.equal(await page.locator('#bay-name').innerText(),'Strv 103B');assert.equal((await saved(page)).XP,0);
  await click('Дерево развития');assert.equal(await page.locator('#nodes .node.owned').count(),19);
});

test('supplied Swedish rigs in combat: Kranvagn fires 3 × 400; hydraulic mounts tilt the body, not the tracks',async t=>{
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1','KRANVAGN','STRV103B','UDES03'],selected:'KRANVAGN'})}});
  assert.equal(await page.evaluate(()=>DepotView.stats().triangles),meshCounts.KRANVAGN);
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('sweden');
  assert.equal(await page.locator('#enemy-select option').count(),20);await page.locator('#enemy-select').selectOption('STRV103B');
  await click('НАЧАТЬ');await chooseControls(page,'pc');await ready(page);await centerPractice(page);
  await lockedButton(page,true);await page.waitForFunction(()=>GameState.player.isReloading);await lockedButton(page,false);await page.waitForFunction(()=>!GameState.bullets.length);
  assert.deepEqual(await page.evaluate(()=>[GameState.player.reloadTime,GameState.player.curMag,GameState.battleDmg,GameState.units[1].hp]),[22000,0,1200,600]);
  await page.evaluate(()=>backToGarage());
  for(const [id,name] of [['STRV103B','Strv 103B'],['UDES03','UDES 03']]){
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('germany');await page.locator('#enemy-select').selectOption('WTE100');
    await click('НАЧАТЬ');await chooseControls(page,'mobile');await ready(page);
    const result=await page.evaluate(()=>{stopBattleLoop();const u=GameState.player,t=GameState.units[1],a=u.modelAsset,measures=[];
      for(const pitch of [-.13,.14]){u.setLook(1.5,pitch);u.slewSight(3,1);const ray=u.barrelRay(),p=THREE.Mesh.prototype,original=p.onBeforeRender,parts={};
        try{p.onBeforeRender=function(...args){if([a.body,a.treads,a.gun].includes(this.geometry)){
          const dir=new THREE.Vector3(0,0,1).transformDirection(this.matrixWorld);if(this.geometry===a.gun){const tip=new THREE.Vector3(...a.muzzle).applyMatrix4(this.matrixWorld);
            parts.tip=tip.distanceTo(new THREE.Vector3(ray.x,ray.h,ray.y));parts.bore=dir.distanceTo(new THREE.Vector3(ray.dx,ray.dh,ray.dy));}
          else parts[this.geometry===a.body?'body':'tracks']=Math.asin(dir.y);
        }original.apply(this,args);};BattleView.draw();}finally{p.onBeforeRender=original;}
        measures.push({...parts,yaw:u.tAngle,tilt:u.suspensionPitch,pitch});}
      u.lookAtPoint(t.x,t.y,t.aimHeight);u.slewSight(3,1);const old=t.hp;if(u.sightHit().hit!==t||!u.fire())throw Error('fixed mount missed practice target');for(let i=0;i<60 && GameState.bullets.length;i++)updateBullets();
      return {measures,damage:old-t.hp};});
    for(const v of result.measures){assert.equal(v.yaw,0);assert.ok(v.tip<.0001 && v.bore<.0001 && Math.abs(v.tracks)<.0001,JSON.stringify(v));
      assert.ok(Math.abs(v.body-v.tilt)<.0001);assert.equal(v.tilt,id==='STRV103B'?v.pitch:Math.min(0,v.pitch));}
    assert.equal(result.damage,390);await page.evaluate(()=>backToGarage());
  }
});


test('IS-4 research on a phone: one KV-1 feeds both heavy routes without cross-unlocks or duplicate charges',async t=>{
  const prior=sovietIds.slice(0,5).concat('IS7','OBJ140','KRANVAGN');let xp=408000;
  // Reserve one more berth: the last assertion isolates the XP gate on the other branch.
  const {page,click}=await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned:prior,selected:'KV1',XP:xp,garageSlots:prior.length+is4Ids.length+1})}});
  await click('Дерево развития');assert.match(await page.locator('#branch-title').innerText(),/ИС-4/);
  const layout=await page.evaluate(()=>{
    const c=document.getElementById('tree-container'),ns=[...document.querySelectorAll('#nodes .node')];
    const y=id=>ns.find(n=>n.dataset.tankId===id).offsetTop;
    return {ids:ns.map(n=>n.dataset.tankId),width:document.documentElement.scrollWidth===innerWidth,
      bottomFits:ns.every(n=>n.offsetTop+n.offsetHeight<=c.clientHeight),scrolls:c.scrollWidth>c.clientWidth,
      forks:y('KV1S')<y('KV1')&&y('KV1')<y('T150')&&y('T150')<y('T3485')};
  });assert.deepEqual(layout.ids,sovietTreeIds);assert.ok(layout.width && layout.bottomFits && layout.scrolls && layout.forks);
  await click('Характеристики: КВ-3');assert.match(await page.locator('#tree-status').innerText(),/Т-150/);
  await click('Характеристики: ИС-4');assert.match(await page.locator('#tree-status').innerText(),/СТ-I/);
  assert.deepEqual((await saved(page)).owned,prior);assert.equal((await saved(page)).selected,'KV1');
  assert.equal(await page.getByRole('button',{name:'Исследовать: КВ-1С',exact:true}).count(),1);
  for(const [i,[name,cost]] of [['Т-150',8000],['КВ-3',25000],['КВ-4',60000],['СТ-I',120000],['ИС-4',195000]].entries()){
    await click('Исследовать: '+name);xp-=cost;const s=await saved(page);
    assert.equal(s.selected,is4Ids[i]);assert.equal(s.XP,xp);assert.deepEqual(s.owned,prior.concat(is4Ids.slice(0,i+1)));
    await click('Выбрать: '+name);assert.equal((await saved(page)).XP,xp);
  }
  await page.reload();assert.equal((await saved(page)).selected,'IS4');assert.equal(await page.locator('#bay-name').innerText(),'ИС-4');
  assert.equal(await page.locator('#dispatch-hp').innerText(),'2600');assert.equal(await page.locator('#dispatch-armor').innerText(),'160 / 250 мм');
  await click('Дерево развития');await click('Характеристики: КВ-1С');assert.match(await page.locator('#tree-status').innerText(),/Не хватает/);
  assert.equal((await saved(page)).XP,0);assert.equal((await saved(page)).selected,'IS4');
});

async function checkSingleShotSorties(t, cases) {
  const owned = ['MS1', ...cases.map(row => row[0])];
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned,selected:cases[0][0]})}});
  for(const [id,name,enemy,dmg,remaining] of cases){
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().triangles),meshCounts[id]);
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption(await page.evaluate(id=>DB[id].nat,enemy));await page.locator('#enemy-select').selectOption(enemy);
    await click('НАЧАТЬ');const result=await page.evaluate(async()=>{
      if(!await selectControl('mobile'))throw Error(document.getElementById('battle-notice-text').textContent);
      stopBattleLoop();const g=GameState,p=g.player,t=g.units[1];
      p.lookAtPoint(t.x,t.y,t.aimHeight);p.slewSight(Math.PI,Math.PI);BattleView.syncCamera();BattleView.aim();BattleView.draw();
      const models=g.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]);
      if(p.sightHit().hit!==t)throw Error('No line from the model muzzle to '+t.name);
      setShell(0);firePlayer();firePlayer();const rounds=g.bullets.length;for(let i=0;i<50 && g.bullets.length;i++)updateBullets();
      const state={models,units:BattleView.stats().units,rounds,reloading:p.isReloading,dealt:g.battleDmg,hp:t.hp};backToGarage();return state;
    });assert.deepEqual(result,{models:[[id,meshCounts[id]],[enemy,meshCounts[enemy]]],units:2,rounds:1,reloading:true,dealt:dmg,hp:remaining});
  }
}

test('all five IS-4 route models mount in the owned depot, deploy as player and opponent, and fire live single rounds', t =>
  checkSingleShotSorties(t, [
    ['T150','Т-150','KV3',300,1120], ['KV3','КВ-3','T150',390,660], ['KV4','КВ-4','KV4',320,1430],
    ['STI','СТ-I','IS4',440,2160], ['IS4','ИС-4','STI',440,1610]
  ]));

test('the 20 supplied Maus, E 100 and scout models deploy in ten offline 3D practice matches', t =>
  checkSingleShotSorties(t, [
    ['PZ35T','Pz.Kpfw. 35 (t)','PZ38T',45,220], ['PZIVD','Pz.Kpfw. IV Ausf. D','PZIVH',110,490],
    ['VK3001P','VK 30.01 (P)','VK3601H',220,780], ['TIGERP','Tiger (P)','TIGERI',240,1260],
    ['MAUS','Maus','VK10001P',490,1360], ['E100','E 100','MAUSCHEN',680,1620], ['E75','E 75','TIGERII',490,1160],
    ['T100LT','Т-100 ЛТ','T54L',300,1120], ['LTG','ЛТГ','T50',180,340], ['LTTB','ЛТТБ','MT25',190,480]
  ]));

test('multi-lane research on a phone: Maus, E 100 and T-100 LT charge each distinct node once, then persist', async t => {
  const owned = ['MS1','BT2','BT7','A20','T34','LTR','IS4','WTE100'];
  let xp = 1234000;
  const {page,click} = await offlineGame(t, {mobile:true,seed:{[saveKey]:JSON.stringify({owned,selected:'A20',XP:xp,garageSlots:owned.length+panzerIds.length+mausIds.length+e100Ids.length+scoutIds.length})}});
  await click('Дерево развития');
  await click('ГЕРМАНИЯ');
  const graph = await page.evaluate(() => {
    const c = document.getElementById('tree-container'), cv = document.getElementById('tree-canvas');
    const dpr = cv.width / cv.offsetWidth, ctx = cv.getContext('2d');
    const nodes = [...document.querySelectorAll('#nodes .node')];
    const node = id => nodes.find(n => n.dataset.tankId === id), y = id => node(id).offsetTop;
    const links = nodes.slice(1).map(n => {
      const p = node(researchParent(n.dataset.tankId));
      const x = (p.offsetLeft + p.offsetWidth + n.offsetLeft) / 2, y = (p.offsetTop + n.offsetTop + n.offsetHeight) / 2;
      return ctx.getImageData(Math.round(x*dpr), Math.round(y*dpr), 1, 1).data[3];
    });
    return {count:nodes.length, edges:links.filter(a => a > 0).length,
      fits:nodes.every(n => n.offsetTop >= 0 && n.offsetTop + n.offsetHeight <= c.clientHeight) &&
        document.documentElement.scrollWidth === innerWidth && c.scrollWidth > c.clientWidth,
      split:y('VK3001P') < y('PZIVH') && y('PZIVH') < y('VK3601H')};
  });
  assert.deepEqual(graph,{count:germanTreeIds.length,edges:germanTreeIds.length-1,fits:true,split:true});
  await click('Характеристики: E 100');
  assert.match(await page.locator('#tree-status').innerText(),/E 75/);
  assert.match(await page.locator('#tree-stats').innerText(),/680/);
  assert.deepEqual((await saved(page)).owned,owned);
  const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];
  async function buy(ids, names, firstTier) {
    for(const [i,id] of ids.entries()) {
      await click('Исследовать: '+names[i]); owned.push(id); xp -= costs[firstTier+i-1];
      const s = await saved(page); assert.deepEqual(s.owned,owned); assert.equal(s.selected,id); assert.equal(s.XP,xp);
    }
  }
  await buy(panzerIds,['Pz.Kpfw. 35 (t)','Pz.Kpfw. 38 (t)','Pz.Kpfw. IV Ausf. D','Pz.Kpfw. IV Ausf. H'],2);
  for (const name of ['VK 30.01 (P)','VK 36.01 (H)']) assert.equal(await page.getByRole('button',{name:'Исследовать: '+name,exact:true}).count(),1);
  await buy(mausIds,['VK 30.01 (P)','Tiger (P)','VK 100.01 (P)','Mäuschen','Maus'],6);
  await click('Характеристики: Tiger I'); assert.match(await page.locator('#tree-status').innerText(),/VK 36\.01 \(H\)/);
  await click('Выбрать: Pz.Kpfw. IV Ausf. H'); assert.equal((await saved(page)).XP,xp);
  await buy(e100Ids,['VK 36.01 (H)','Tiger I','Tiger II','E 75','E 100'],6);
  await click('СССР'); await click('Характеристики: МТ-25'); assert.match(await page.locator('#tree-status').innerText(),/Т-50/);
  await buy(scoutIds,['Т-50','МТ-25','ЛТГ','ЛТТБ','Т-54 обл.','Т-100 ЛТ'],5);
  await page.reload(); const s=await saved(page);
  assert.deepEqual(s.owned,owned); assert.equal(s.XP,0); assert.equal(s.selected,'T100LT');
  assert.equal(await page.locator('#dispatch-speed').innerText(),'72 км/ч');
});

test('winter lineup: all 12 new 3D vehicles enter offline practice; Finnish and Japanese specials remain playable without research',async t=>{
  const pairs=[['BT42','M4A3E2'],['STA2','LOWE'],['JPANTHERII','T62A'],['T71DA','IS6'],['TL7','T34HEAVY'],['TL7OLEN','STRVS1']];
  const {page,click}=await offlineGame(t,{webgl:true,seed:{[saveKey]:JSON.stringify({owned:['MS1',...pairs.flat()],selected:'BT42'})}});
  for (const [id,enemy] of pairs) {
    await page.locator(`.tank-slot[data-tank-id="${id}"] .slot-select`).click();await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption(await page.evaluate(id=>DB[id].nat,enemy));await page.locator('#enemy-select').selectOption(enemy);
    await click('НАЧАТЬ');const result=await page.evaluate(async()=>{
      if (!await selectControl('mobile')) throw Error(document.getElementById('battle-notice-text').textContent);
      stopBattleLoop();const p=GameState.player,e=GameState.units[1];p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
      BattleView.syncCamera();BattleView.draw();firePlayer();const shot=GameState.bullets[0];
      const result={models:GameState.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]),
        rounds:p.curMag,damage:shot.dmg,reload:p.reloadTime,visible:BattleView.stats().units};backToGarage();return result;
    });assert.deepEqual(result.models,[[id,meshCounts[id]],[enemy,meshCounts[enemy]]]);assert.equal(result.visible,2);
    const ttx=await page.evaluate(id=>[shotDamage(DB[id]),(DB[id].mag||1)-1,DB[id].reload],id);
    assert.deepEqual([result.damage,result.rounds,result.reload],ttx);
  }
});

test('route picker on a phone: browse the five supplied paths, buy only the twenty new nodes, keep sibling unlocks and XP separate', async t => {
  // Existing fork vehicles are already in this garage; no artificial tier skips or re-purchases.
  const owned = ['MS1','T34','T44','PZIVH','MARDER2','WTPZ4','JPANTHERII'];
  const paths = [
    ['СССР','Т-44',obj430Ids,['Объект 430','Объект 430У'],9],
    ['СССР','Т-34',k91Ids,['А-43','А-44','Объект 416','Объект 430 II','К-91'],6],
    ['ГЕРМАНИЯ','Pz.Kpfw. IV Ausf. H',e50Ids,['VK 30.02 (M)','Panther','Panther II','E 50','E 50 Ausf. M'],6],
    ['ГЕРМАНИЯ','Waffenträger auf Pz. IV',['GRILLE15'],['Grille 15'],10],
    ['ГЕРМАНИЯ','Marder II',jagdIds,['Hetzer','StuG III Ausf. G','Jagdpanzer IV','Jagdpanther','Ferdinand','Jagdtiger','Jagdpanzer E 100'],4]
  ];
  const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];
  let xp = paths.reduce((sum,[,,,,tier])=>sum+costs.slice(tier-1).reduce((a,b)=>a+b),0);
  const {page,click} = await offlineGame(t,{mobile:true,seed:{[saveKey]:JSON.stringify({owned,selected:'T44',XP:xp,garageSlots:owned.length+20})}});
  const meshes = []; page.on('request',r=>{if (r.url().endsWith('.mesh.js')) meshes.push(r.url());});
  await click('Дерево развития');
  const picker = page.getByLabel('Показать ветку');
  for (const [nation, fork, ids, names, tier] of paths) {
    await click(nation);
    const before = await saved(page), end = ids.at(-1);
    await picker.selectOption(end);
    assert.equal(await page.locator('#tree-name').innerText(), names.at(-1));
    const nodes = await page.locator('#nodes .node').evaluateAll(list => list.map(n => [n.dataset.tankId,n.querySelector('b').textContent]));
    assert.equal(nodes.length,10); assert.equal(nodes[tier-2][1],fork); assert.deepEqual(nodes.slice(tier-1).map(n=>n[0]),ids);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth === innerWidth));
    assert.deepEqual(await saved(page),before,'choosing a path previews, never buys or equips');
    if (ids.length > 1) {
      await click('Характеристики: '+names[1]); assert.ok((await page.locator('#tree-status').innerText()).includes(names[0]));
      assert.deepEqual(await saved(page),before);
    }
    for (const [i,id] of ids.entries()) {
      await click('Исследовать: '+names[i]); owned.push(id); xp -= costs[tier+i-1];
      const s=await saved(page); assert.deepEqual([s.owned,s.selected,s.XP],[owned,id,xp]);
      await click('Выбрать: '+names[i]); assert.equal((await saved(page)).XP,xp);
    }
  }
  assert.deepEqual(meshes,[],'tree rows use their own icons, not twenty 3D viewers');
  await picker.selectOption(''); assert.equal(await page.locator('#nodes .node').count(),germanTreeIds.length);
  await click('США'); assert.ok(await picker.isVisible()); assert.equal(await picker.inputValue(),'');
  await click('ГЕРМАНИЯ'); assert.equal(await picker.inputValue(),'');
  await page.reload(); const s=await saved(page); assert.deepEqual([s.owned,s.selected,s.XP],[owned,'JGPZE100',0]);
  assert.equal(await page.locator('#dispatch-dmg').innerText(),'1050'); assert.equal(await page.locator('#dispatch-armor').innerText(),'250 / — мм');
});

test('twenty supplied meshes for the five new routes deploy offline in ten 3D training pairs', t =>
  checkSingleShotSorties(t, [
    ['HETZER','Hetzer','STUG3G',110,380], ['A43','А-43','JGPZIV',115,585],
    ['A44','А-44','PANTHER',300,900], ['OBJ416','Объект 416','JAGDP',320,660],
    ['PANTHERII','Panther II','VK3002M',240,600], ['K91','К-91','OBJ430II',320,1280],
    ['OBJ430U','Объект 430У','OBJ430',440,1310], ['E50M','E 50 Ausf. M','E50',390,1360],
    ['GRILLE15','Grille 15','FERDINAND',750,650], ['JGPZE100','Jagdpanzer E 100','JAGDTIGER',1050,800]
  ]));

test('renamed legacy vehicles migrate by identity without confusing the 430s, Panthers or E 100s',async t=>{
  const legacy=['OB430II','OB430U','PANTHER2','GRILLE','STUG3','JGPZ4','JPANTHER','JPANTHER2','JAGTIGER','JGE100','VK30D2'];
  const {page}=await offlineGame(t,{seed:{[saveKey]:JSON.stringify({owned:legacy,selected:'OB430II',XP:150,modules:{JPANTHER:['optics'],JPANTHER2:['turbo']}})}});
  const s=await saved(page);assert.deepEqual(s.owned,['OBJ430II','OBJ430U','PANTHERII','GRILLE15','STUG3G','JGPZIV','JAGDP','JPANTHERII','JAGDTIGER','JGPZE100','VK-3002-D']);
  assert.equal(s.selected,'OBJ430II');assert.equal(s.XP,150);assert.deepEqual(s.modules,{JAGDP:['optics'],JPANTHERII:['turbo']});
  await page.reload();assert.deepEqual(await saved(page),s);
});
