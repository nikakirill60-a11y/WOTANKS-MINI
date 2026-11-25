const test = require('node:test'), assert = require('node:assert/strict');
const {readFileSync} = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {openGame} = require('./winter-harness.cjs');
const root = process.env.CITY_TANKS_INDEX ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX)) : path.resolve(__dirname, '..');

function fixture() {
  let ms = 100;
  const ctx = vm.createContext({window:{addEventListener(){}},console:{log(){}}, performance:{now:()=>ms}, Date:{now:()=>ms},
    snd(){}, spawnParticles(){}, spawnShellCasing(){}});
  for (const file of ['models/catalog','js/config','js/battle-space','js/armor-system','js/tank'])
    vm.runInContext(readFileSync(path.join(root,file+'.js'),'utf8'),ctx,{filename:file});
  const api = vm.runInContext('Math.random=()=>.99; ({DB,Tank,GameState,BattleClock,resolveHit,traceBattleRay})',ctx);
  const tank = (id='KPZ-67',team='ally',bonuses) => {
    const u = new api.Tank(id,0,0,team,bonuses);
    u.modelAsset = {groundY:0,pivot:[0,1,0],gunPivot:[0,.2,.4],muzzle:[0,0,2]};
    return u;
  };
  return {...api, tank, advance:dt=>{ ms+=dt; }};
}

test('KPz: one battle second both ways; no repeated switch, free shot, reload reset or shared mode',()=>{
  const {tank,advance,BattleClock:clock,GameState:g} = fixture();
  const p=tank(), other=tank(), stock=tank('VPZ-57');
  assert.equal(stock.toggleCalibration(),false);
  assert.ok(p.fire(0));const first=g.bullets[0], ready=p.nextShot;
  assert.equal(first.dmg,420);assert.equal(ready-clock.now(),9200);
  advance(8500);assert.ok(p.toggleCalibration());assert.equal(p.toggleCalibration(),false);
  advance(999);clock.pause();advance(12000);assert.equal(p.toggleCalibration(),false);assert.equal(p.fire(1),false);
  assert.equal(p.isReloading,false,'reload finished before switching did');assert.equal(g.bullets.length,1);
  clock.resume();advance(1);assert.ok(p.fire(1));assert.equal(g.bullets[1].dmg,380);
  assert.equal(p.calibration.active,true);assert.equal(other.calibration.active,false);
  assert.equal(first.dmg,420);assert.equal(first.round.ricochetDeg,70,'round already in flight');
  const next=p.nextShot;assert.ok(p.toggleCalibration());advance(999);p.updateCalibration(clock.now());
  assert.equal(p.calibration.active,true);advance(1);p.updateCalibration(clock.now());assert.equal(p.calibration.active,false);
  assert.equal(p.nextShot,next);advance(8199);assert.equal(p.fire(0),false);advance(1);assert.ok(p.fire(0));
  assert.equal(g.bullets.at(-1).dmg,420);p.dead=true;assert.equal(p.toggleCalibration(),false);
});

test('actual KPz rounds: exact BP ricochet edges, normalization, KS loss once, unaffected HE and ordinary tanks',()=>{
  const {tank,advance,GameState:g,resolveHit} = fixture(), target=tank('LTR','enemy');
  target.angle=target.tAngle=Math.PI;
  function shot(i,calibrated,bonuses) {
    const u=tank('KPZ-67','ally',bonuses);
    if (calibrated) {assert.ok(u.toggleCalibration());advance(1000);}
    assert.ok(u.fire(i));return g.bullets.pop();
  }
  const rad=d=>d*Math.PI/180;
  for (const [on,dmg,ric,norm,loss] of [[false,420,70,2,5],[true,380,75,7,2]]) {
    const bp=shot(0,on), ks=shot(1,on), he=shot(2,on);
    assert.deepEqual([bp.dmg,ks.dmg,he.dmg],[dmg,dmg,630]);
    target.armor=1;
    assert.equal(resolveHit(bp,target,'hull',Math.cos(rad(ric-.001))).dmg,dmg);
    assert.ok(resolveHit(bp,target,'hull',Math.cos(rad(ric))).ricochet);
    assert.equal(resolveHit(bp,target,'hull',Math.cos(rad(ric+.001))).dmg,0);
    const hit=()=>resolveHit(bp,target,'hull',Math.cos(rad(60))).dmg;
    target.armor=bp.pen*Math.cos(rad(60-norm))-.001;assert.equal(hit(),dmg);
    target.armor+=.002;assert.equal(hit(),0);
    target.armor=ks.pen*(1-loss/100);assert.equal(resolveHit(ks,target).dmg,dmg);
    assert.equal(resolveHit(ks,target).dmg,dmg,'must not compound a percentage on the projectile');
    target.armor+=.001;assert.equal(resolveHit(ks,target).dmg,0);
    target.armor=1;assert.equal(resolveHit(he,target,'hull',0).dmg,630);
    assert.equal(shot(0,on,{upg:{dmgMul:1.25}}).dmg,dmg*1.25);
  }
  const previous=tank('VPZ-57');assert.ok(previous.fire(2));const shell=g.bullets.pop();
  assert.equal(shell.round.name,'Подкал');assert.equal(resolveHit(shell,target,'hull',0).dmg,390*.75);
});

test('BP uses the face actually entered, not just the bearing: same heading can hit two different faces',()=>{
  const {traceBattleRay,resolveHit,GameState:g,tank} = fixture(), gun=tank(), t=tank('LTR','enemy');
  const box=(x,h,z)=>({boundingBox:{min:{x:-x,y:0,z:-z},max:{x,y:h,z}}});
  Object.assign(t.modelAsset,{hull:box(1,1,2),turret:box(.8,1,1)});t.modelScale=1;g.units=[t];
  t.angle=72*Math.PI/180;t.tAngle=71*Math.PI/180;
  assert.ok(gun.fire());const bullet=g.bullets.pop();
  for (const [part,angle,h,len] of [['hull',t.angle,.5,2],['turret',t.tAngle,1.5,1]]) {
    for (const rear of [true,false]) {
      const c=Math.cos(angle),s=Math.sin(angle),width=part==='hull'?1:.8;
      const x=rear?-len*c:-width*s,y=rear?-len*s:width*c;
      const hit=traceBattleRay(x-4,y,h,1,0,0,8,gun,false,false,false,true);
      assert.equal(hit.hit,t);assert.equal(hit.part,part);assert.ok(Math.abs(hit.incidenceCos-(rear?c:s))<1e-10);
      assert.equal(!!resolveHit(bullet,t,part,hit.incidenceCos).ricochet,rear);
    }
  }
});

for (const mobile of [true,false]) test(`offline KPz sortie (${mobile?'touch':'keyboard'}): loadout, input, hits, pause and cleanup`,async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,mobile,seed:{owned:['KPZ-67','VPZ-57'],selected:'KPZ-67'}});
  await page.context().setOffline(true);const initial=await saved();
  const guide=page.locator('#kpz-guide'), select=page.locator('#kpz-ammo'), btn=page.getByRole('button',{name:'Калибровка',exact:true});
  await guide.locator('summary').click();const cells=()=>guide.locator('tbody td').allTextContents();
  assert.deepEqual(await cells(),['Базовый урон','420','380','Угол рикошета','70°','75°','Нормализация','2°','7°']);
  await select.selectOption({index:1});assert.deepEqual(await cells(),['Базовый урон','420','380','Потеря пробития','5%','2%']);
  await select.selectOption({index:2});assert.ok(await guide.locator('table').isHidden());assert.match(await guide.innerText(),/На ОФ калибровка не влияет/);
  const slot=mobile?1:0;await select.selectOption({index:slot});await guide.locator('summary').click();
  async function launch(){
    if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('ussr');await page.locator('#enemy-select').selectOption('IS7');await click('НАЧАТЬ');
    await page.locator(`.control-option[onclick="selectControl('${mobile?'mobile':'pc'}')"]`).click();
    await page.waitForFunction(()=>GameState.gameActive || document.querySelector('#battle-notice-title').textContent==='3D-бой недоступен');
    assert.equal(await page.evaluate(()=>BattleView.stats()?.units),2,await page.locator('#battle-notice-text').textContent());
    if(!mobile){await page.keyboard.press('g');assert.ok(await page.evaluate(()=>GameState.player.calibration?.until==null));await page.locator('#resume-input').click();}
    await page.waitForFunction(()=>BattleInput.running);await page.evaluate(()=>stopBattleLoop());
  }
  await launch();const buttons=page.locator(mobile?'.m-shell':'.shell-opt');
  assert.deepEqual(await buttons.allTextContents(),mobile?['БП','КС','ОФ']:['1:БП','2:КС','3:ОФ']);
  assert.equal(await buttons.nth(slot).getAttribute('aria-pressed'),'true');assert.equal(await btn.getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{window.restoreGunClock=performance.now;window.gunTestTime=Math.ceil(performance.now());performance.now=()=>window.gunTestTime;});
  const tick=ms=>page.evaluate(n=>{window.gunTestTime+=n;update();updateHUD();},ms);
  const toggle=()=>mobile?btn.tap():page.keyboard.press('g');
  const fire=()=>mobile?page.locator('#fire-btn').tap():page.evaluate(()=>firePlayer());
  const count=()=>page.evaluate(()=>GameState.bullets.length);
  await toggle();assert.ok(await btn.isDisabled());assert.match(await btn.innerText(),/Вход.*1,0 с/);
  await tick(999);await fire();assert.equal(await count(),0);await tick(1);assert.equal(await btn.getAttribute('aria-pressed'),'true');
  async function aim(){await page.evaluate(()=>{const p=GameState.player,e=GameState.units[1];e.angle=e.tAngle=e.lookYaw=p.angle;
    p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);if(p.sightHit().hit!==e)throw Error('practice aim');});}
  await aim();await fire();assert.equal(await count(),1);
  const fired=await page.evaluate(()=>[GameState.bullets[0].round.name,GameState.bullets[0].dmg,GameState.player.nextShot]);
  assert.deepEqual(fired.slice(0,2),[mobile?'КС':'БП',380]);
  await toggle();assert.match(await btn.innerText(),/Выход/);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>BattleInput.state==='paused');
  const left=()=>page.evaluate(()=>GameState.player.calibration.until-BattleClock.now());
  const frozen=await left();await page.evaluate(()=>window.gunTestTime+=2500);assert.equal(await left(),frozen);
  await page.keyboard.press('g');assert.equal(await left(),frozen);await page.locator('#resume-input').click();await page.waitForFunction(()=>BattleInput.running);
  // Finish switching without advancing the in-flight shell; it must still deal the old mode's damage.
  await page.evaluate(()=>{window.gunTestTime+=1000;GameState.player.updateCalibration(BattleClock.now());updateHUD();});
  assert.equal(await btn.getAttribute('aria-pressed'),'false');
  const firstHit=await page.evaluate(()=>{const g=GameState,e=g.units[1],hp=e.hp;for(let i=0;i<100 && g.bullets.length;i++)updateBullets();return [hp-e.hp,g.player.nextShot];});
  assert.deepEqual(firstHit,[380,fired[2]]);await fire();assert.equal(await count(),0,'switching did not shorten reload');
  if(mobile){
    await buttons.nth(0).tap();assert.ok(await page.locator('#calibration-stats').isHidden());
    await page.locator('#calibration-info summary').tap();
  }else await page.keyboard.press('2');
  assert.ok(await page.locator('#calibration-stats').isVisible());
  assert.match(await page.locator('#calibration-stats').innerText(),mobile?/Нормализация:\s*2° → 7°/:/Потеря пробития:\s*5% → 2%/);
  await tick(8200);await aim();await fire();assert.equal(await page.evaluate(()=>GameState.bullets[0].dmg),420);
  await page.evaluate(()=>{performance.now=window.restoreGunClock;backToGarage();});assert.deepEqual(await saved(),initial);
  await click('Выбрать для боя: Versuchspanzer 57');assert.ok(await guide.isHidden());await launch();
  assert.ok(await page.locator('#calibration-controls').isHidden());assert.deepEqual(await buttons.allTextContents(),mobile?['ББ','ОФ','ПК']:['1:ББ','2:ОФ','3:Подкал']);
  await page.keyboard.press('g');assert.equal(await page.evaluate(()=>GameState.player.calibration),null);await page.evaluate(()=>backToGarage());
});
