const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const {routes,unique} = require('./fixtures/france.cjs');
const ids = rows => rows.map(row => row[0]);
const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];

test('France on a phone: buy all 31 vehicles through four routes, never repay the FT or the shared heavy line', async t => {
  const owned = ['MS1'];
  let xp = unique.reduce((sum,row) => sum + costs[routes.find(r => r.includes(row)).indexOf(row)],0);
  const {page,click,saved} = await openGame(t,{mobile:true,seed:{owned,selected:'MS1',XP:xp,garageSlots:32}});
  await click('Дерево развития'); await click('ФРАНЦИЯ');
  const picker = page.getByLabel('Показать ветку'), nodes = page.locator('#nodes .node');
  const visibleIds = () => nodes.evaluateAll(ns => ns.map(n => n.dataset.tankId));
  assert.equal(await page.locator('#branch-number').innerText(),'07');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  assert.deepEqual(await visibleIds(),ids(unique));
  assert.deepEqual(await picker.locator('option').allTextContents(),['Все ветки',...routes.map(r => r.at(-1)[1])]);
  const before = await saved(); await click('Характеристики: AMX M4 mle. 54');
  assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте AMX M4 mle. 51');
  assert.deepEqual(await saved(),before); assert.equal(before.selected,'MS1');
  for (const rows of routes) {
    const end = rows.at(-1)[0]; await picker.selectOption(end); assert.deepEqual(await visibleIds(),ids(rows));
    for (const [i,[id,name,,hp,dmg,mag,sec,pen,hull,turret,kmh]] of rows.entries()) {
      if (owned.includes(id)) { await click('Выбрать: '+name); }
      else { await click('Исследовать: '+name); owned.push(id); xp -= costs[i]; }
      const s = await saved(); assert.deepEqual([s.owned,s.selected,s.XP,s.curNat],[owned,id,xp,'france']);
      const damage = mag === 1 ? String(dmg) : `${dmg*mag} (${mag} × ${dmg})`;
      assert.deepEqual((await page.locator('#tree-stats dd').allTextContents()).slice(0,6),
        [hp+' HP',damage,sec.toLocaleString('ru-RU')+' с',pen+' мм',`${hull} / ${turret ?? '—'} мм`,kmh+' км/ч']);
      // Before buying either alternative, check the two real forks in the unfiltered graph.
      if ((id==='FT' && owned.length===2) || (id==='AMX-M4-45' && !owned.includes('AMX-50-100'))) {
        await picker.selectOption('');
        const available = await page.locator('#nodes .available').evaluateAll(ns => ns.map(n => n.dataset.tankId));
        assert.deepEqual(available,id==='FT'?['FT-AC','D1','H35']:['AMX-50-100','AMX-65-T','H35']);
        await picker.selectOption(end);
      }
    }
  }
  await page.reload(); const s = await saved();
  assert.deepEqual([s.owned,s.XP,s.selected,s.curNat],[owned,0,'B-C-25-T','france']);
  assert.equal(await page.locator('#bay-name').innerText(),'Bat.-Châtillon 25 t');
  await click('ТРЕНИРОВКА'); await page.locator('#train-nat-select').selectOption({label:'Франция'});
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(ns => ns.map(n=>n.value)),ids(unique));
});

test('old French save keys restore their own vehicles and equipment, not the old R35 or AMX 13 90 as substitutes', async t => {
  const aliases = 'D2 B1 AMX38 SAU40 S35CA ARLV39 AC46 AC48 FOCH FOCH155 BDRG1B ARL44 AMXM445 AMX50100 AMX50120 AMX50B AMX65T AMXM451 AMXM454 AMXELC AMX12T AMX1375 BC25TAP BC25T'.split(' ');
  const canonical = 'D2 B1 AMX-38 SAU-40 S35-CA ARL-V39 AMX-AC-46 AMX-AC-48 FOCH FOCH-155 BDR-G1-B ARL-44 AMX-M4-45 AMX-50-100 AMX-50-120 AMX-50-B AMX-65-T AMX-M4-51 AMX-M4-54 AMX-ELC-BIS AMX-12-T AMX-13-75 B-C-25-T-AP B-C-25-T'.split(' ');
  const {page,saved} = await openGame(t,{seed:{XP:317,owned:[...aliases,'FOCH-155','R35','AMX1390'],selected:'BC25T',
    modules:{BC25T:['optics'],FOCH155:['rammer'],'FOCH-155':['turbo'],AMX1390:['camo']},upgrades:{AMX50B:{engine:1}}}});
  const s = await saved(); assert.deepEqual([s.owned,s.selected,s.curNat,s.XP],[canonical,'B-C-25-T','france',317]);
  assert.deepEqual(s.modules,{'B-C-25-T':['optics'],'FOCH-155':['turbo']}); assert.deepEqual(s.upgrades,{'AMX-50-B':{engine:1}});
  await page.reload(); assert.deepEqual(await saved(),s);
});

test('offline French sorties: 3D models, Foch and Bat.-Châtillon clip hits, full reloads and seven-nation matchmaking', async t => {
  const {page,click} = await openGame(t,{webgl:true,seed:{owned:['FT','FOCH-155','B-C-25-T','AMX-50-B'],selected:'FT'}});
  await page.context().setOffline(true);
  const byId = new Map(unique.map(row => [row[0],row]));
  for (const [id,other] of [['FOCH-155','AMX-M4-54'],['B-C-25-T','AMX-50-B']]) {
    const [,name,,,dmg,mag,sec] = byId.get(id), target = byId.get(other);
    await click('Выбрать для боя: '+name); await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().triangles),byId.get(id).at(-1));
    if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('france'); await page.locator('#enemy-select').selectOption(other); await click('НАЧАТЬ');
    const result = await page.evaluate(async () => {
      if (!await selectControl('mobile')) throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop(); const g=GameState, p=g.player, e=g.units[1], clock=BattleClock.now, random=Math.random;
      try {
        let ms=BattleClock.now(); BattleClock.now=()=>ms; Math.random=()=>.99; // no random criticals
        const geometry = g.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]);
        p.lookAtPoint(e.x,e.y,e.aimHeight); p.slewSight(Math.PI,Math.PI); BattleView.syncCamera(); BattleView.aim(); BattleView.draw();
        if (p.sightHit().hit!==e) throw Error('Practice target out of sight: '+p.id);
        const hits=[]; let reload;
        for (let i=0;i<p.magSize;i++) {
          firePlayer(); firePlayer();
          if (g.bullets.length!==1) throw Error('Expected one projectile: '+p.id);
          const shell=g.bullets[0]; for(let step=0;step<60 && g.bullets.length;step++) updateBullets();
          hits.push([shell.dmg,p.curMag,p.isReloading,e.hp,g.battleDmg]); reload=Math.round(p.nextShot-ms); ms=p.nextShot;
        }
        ms--; firePlayer(); const blocked = !g.bullets.length; ms++; firePlayer();
        return {geometry,hits,reload,blocked,refilled:g.bullets.length===1 && p.curMag===p.magSize-1,
          upper:!!p.modelAsset.upperBox && !p.modelAsset.upperBox.isEmpty()};
      } finally { BattleClock.now=clock; Math.random=random; backToGarage(); }
    });
    assert.deepEqual(result,{geometry:[[id,byId.get(id).at(-1)],[other,target.at(-1)]],
      hits:Array.from({length:mag},(_,i)=>[dmg,mag-i-1,i===mag-1,target[3]-(i+1)*dmg,(i+1)*dmg]),
      reload:Math.round(sec*1000),blocked:true,refilled:true,upper:id==='B-C-25-T'},id);
  }
  await click('Выбрать для боя: AMX 50 B'); await click('7×7');
  const match = await page.evaluate(async () => {
    if (!await selectControl('mobile')) throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop(); try {
      const units=GameState.units;
      return [GameState.player.id,BattleView.stats().units,units.filter(u=>u.bot).length,
        ...[units.slice(0,7),units.slice(7)].map(side=>new Set(side.map(u=>DB[u.id].nat)).size),
        units.slice(7).some(u=>DB[u.id].nat==='france' && u.modelAsset && u.tier>=9)];
    } finally { backToGarage(); }
  });
  assert.deepEqual(match,['AMX-50-B',14,13,7,7,true]);
});
