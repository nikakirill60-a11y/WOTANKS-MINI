const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const {medium,heavy,unique} = require('./fixtures/japan.cjs');
const ids = rows => rows.map(r=>r[0]);
const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];

test('Japan on a phone: research both routes once, keep the premium STA-2 separate, save both top tiers', async t => {
  const owned=['MS1','STA2'];let xp=2*costs.reduce((a,b)=>a+b,0);
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'STA2',XP:xp,garageSlots:owned.length+19}});
  await click('Дерево развития');await click('ЯПОНИЯ');
  const picker=page.getByLabel('Показать ветку'), nodes=page.locator('#nodes .node');
  const visibleIds=()=>nodes.evaluateAll(ns=>ns.map(n=>n.dataset.tankId));
  assert.equal(await page.locator('#branch-number').innerText(),'06');assert.deepEqual(await visibleIds(),ids(unique));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  assert.deepEqual(await picker.locator('option').allTextContents(),['Все ветки','STB-1','Type 5 Heavy']);
  const before=await saved();await click('Характеристики: Type 61');
  assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте STA-1');
  assert.deepEqual(await saved(),before);assert.equal(await page.locator('#dispatch-name').innerText(),'STA-2');
  for(const [lane,rows] of [medium,heavy].entries()){
    await picker.selectOption(rows.at(-1)[0]);assert.deepEqual(await visibleIds(),ids(rows));
    for(const [tier,[id,name,,hp,dmg,sec,pen,hull,turret,speed]] of rows.entries()){
      if(lane===1 && tier===0){
        await click('Выбрать: '+name);assert.deepEqual((await saved()).owned,owned);assert.equal((await saved()).XP,xp);continue;
      }
      await click('Исследовать: '+name);owned.push(id);xp-=costs[tier];
      const s=await saved();assert.deepEqual([s.owned,s.selected,s.XP,s.curNat],[owned,id,xp,'japan']);
      assert.deepEqual(await page.locator('#tree-stats dd').allTextContents(),[hp+' HP',String(dmg),sec.toLocaleString('ru-RU')+' с',pen+' мм',`${hull} / ${turret} мм`,speed+' км/ч']);
      if(!tier){
        await picker.selectOption('');assert.deepEqual(await page.locator('#nodes .available').evaluateAll(ns=>ns.map(n=>n.dataset.tankId)),['HA-GO','I-GOCHI-RO']);
        await picker.selectOption(rows.at(-1)[0]);
      }
    }
  }
  await page.reload();const s=await saved();assert.deepEqual([s.owned,s.XP,s.curNat,s.selected],[owned,0,'japan','TYPE-5-H']);
  assert.equal(await page.locator('#bay-name').innerText(),'Type 5 Heavy');
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption({label:'Япония'});
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(os=>os.map(o=>o.value)),[...ids(unique),'STA2']);
});

test('old Japanese save keys restore only the same machines, selection and equipment; no substitute Chi-Ni or premium unlock',async t=>{
  const old=['RENOTSU','CHIHA_JP','CHIHE','CHINU','CHITO','CHIRI','STA1','TYPE61','STB1','MITSU108','OI','ONI','OHO','TYPE4','TYPE5'];
  const wanted=['R-OTSU',...ids(medium).slice(2),...ids(heavy).slice(4)];
  const {page,saved}=await openGame(t,{seed:{owned:[...old,'STA-1','CHINI','CHITOSPG','TYPE71'],selected:'TYPE5',XP:567,
    modules:{TYPE5:['optics'],STA1:['rammer'],'STA-1':['turbo']},upgrades:{CHIRI:{gun:1}}}});
  const s=await saved();assert.deepEqual([s.owned,s.selected,s.curNat,s.XP],[wanted,'TYPE-5-H','japan',567]);
  assert.deepEqual(s.modules,{'TYPE-5-H':['optics'],'STA-1':['turbo']});assert.deepEqual(s.upgrades,{'CHI-RI':{gun:1}});
  await page.reload();assert.deepEqual(await saved(),s);
});

test('all nineteen Japanese meshes deploy offline: garage, actual practice hits and reload, mixed 15×15 with Type 5 Heavy',async t=>{
  // Hand-picked opponents can take one penetrating shot without changing HP, plates or facing.
  const pairs=[['R-OTSU','I-GOCHI-RO'],['TYPE-91','HA-GO'],['CHI-HA','TYPE-95'],['CHI-HE','CHI-NU'],['MITSU-108','CHI-TO'],
    ['CHI-RI','O-I'],['STA-1','O-NI'],['TYPE-61','O-HO'],['STB-1','TYPE-4-H'],['TYPE-5-H','STB-1']];
  const rows=new Map(unique.map(r=>[r[0],r]));assert.deepEqual(new Set(pairs.flat()),new Set(rows.keys()));
  const {page,click}=await openGame(t,{webgl:true,seed:{owned:ids(unique),selected:'R-OTSU'}});
  await page.context().setOffline(true);
  for(const [id,other] of pairs){
    const [,name,,,damage,sec]=rows.get(id),enemy=rows.get(other);
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().sourceTriangles),rows.get(id).at(-1));
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('japan');await page.locator('#enemy-select').selectOption(other);await click('НАЧАТЬ');
    const result=await page.evaluate(async()=>{
      if(!await selectControl('mobile'))throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop();const g=GameState,p=g.player,e=g.units[1],now=BattleClock.now,time=BattleClock.now();
      try {
        BattleClock.now=()=>time;
        const mounts=g.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]);
        p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);BattleView.syncCamera();BattleView.aim();BattleView.draw();
        if(p.sightHit().hit!==e)throw Error('Unaligned practice model: '+p.id+' / '+e.id);
        setShell(0);firePlayer();firePlayer();
        const shot=[g.bullets.length,g.bullets[0]?.dmg,p.curMag,p.isReloading,Math.round(p.nextShot-time)];
        for(let k=0;k<50 && g.bullets.length;k++)updateBullets();
        return {mounts,units:BattleView.stats().units,shot,hp:e.hp,dealt:g.battleDmg};
      } finally {BattleClock.now=now;backToGarage();}
    });
    assert.deepEqual(result,{mounts:[[id,rows.get(id).at(-1)],[other,enemy.at(-1)]],units:2,shot:[1,damage,0,true,Math.round(sec*1000)],hp:enemy[3]-damage,dealt:damage},id+' vs '+other);
  }
  await click('В БОЙ 15×15');
  const team=await page.evaluate(async()=>{
    if(!await selectControl('mobile'))throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop();try {
      const g=GameState,a=g.units.slice(0,15),b=g.units.slice(15);
      return [g.player.id,BattleView.stats().units,b.some(u=>u.bot && DB[u.id].nat==='japan'),b.some(e=>!a.some(u=>u.id===e.id)),
        g.units.every(u=>u.modelAsset && u.tier>=9 && g.navigation.clear(u.x,u.y,u.x,u.y))];
    } finally {backToGarage();}
  });
  assert.deepEqual(team,['TYPE-5-H',30,true,true,true]);
});
