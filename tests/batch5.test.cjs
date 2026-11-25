const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const paths = require('./fixtures/batch5.cjs');
const byId = new Map(paths.flatMap(path => path.rows.map(row => [row[0], row])));

test('five new paths on a phone: the same T1 Heavy opens both VI nodes; each of the 32 purchases charges XP once', async t => {
  const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];
  const owned = ['MS1','T1C','M3LEE','T20','T71DA','IS7'];
  let xp = paths.reduce((sum, {shared}) => sum + costs.slice(shared).reduce((a,b) => a+b, 0), 0);
  const {page, click, saved} = await openGame(t, {mobile:true, seed:{owned, selected:'T20', XP:xp, garageSlots:owned.length+32}});
  await click('Дерево развития');
  const picker = page.getByLabel('Показать ветку');
  const fork = {T57HEAVY:'T20', T110E5:'M3LEE', MVY:'T1HEAVY', SHERIDAN:'T1C', OBJ268:'MS1'};
  for (const {nation,end,shared,rows} of paths) {
    await click(nation==='usa' ? 'США' : 'СССР');
    const before = await saved();
    await picker.selectOption(end);
    const ids = await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId));
    assert.equal(ids.length,10); assert.equal(ids[shared-1],fork[end]); assert.deepEqual(ids.slice(shared),rows.map(r=>r[0]));
    assert.equal(await page.locator('#tree-name').innerText(),rows.at(-1)[1]);
    await click('Характеристики: '+rows[1][1]);
    assert.ok((await page.locator('#tree-status').innerText()).includes(rows[0][1]));
    assert.deepEqual(await saved(),before,'neither inspecting a successor nor switching paths buys anything');
    if (end==='MVY') {
      await click('Выбрать: T1 Heavy'); assert.equal((await saved()).XP,xp);
      assert.equal(await page.locator('#nodes .node[data-tank-id="PAWLACK"].available').count(),1);
    }
    for (const [j,[id,name,hp,damage,clip,reload,pen,hull,turret,speed]] of rows.entries()) {
      await click('Исследовать: '+name); owned.push(id); xp-=costs[shared+j];
      const s = await saved(); assert.deepEqual([s.owned,s.selected,s.XP],[owned,id,xp]);
      const values = await page.locator('#tree-stats dd').allTextContents();
      assert.deepEqual(values.slice(0,6), [hp+' HP',clip===1?String(damage):`${clip*damage} (${clip} × ${damage})`,
        reload.toLocaleString('ru-RU')+' с', pen+' мм', `${hull} / ${turret??'—'} мм`,speed+' км/ч']);
    }
    if (end==='T57HEAVY') {
      await picker.selectOption('M48PATTON');
      assert.equal(await page.getByRole('button',{name:'Исследовать: M26 Pershing',exact:true}).count(),1);
    }
  }
  await page.reload(); const s=await saved(); assert.deepEqual([s.owned,s.selected,s.XP],[owned,'OBJ268',0]);
  assert.equal(await page.locator('#dispatch-armor').innerText(),'187 / — мм');
});

test('batch5 legacy keys migrate ownership and equipment by identity, not by tier or by a similar name', async t => {
  const prev = ['T1HVY','T57HVY','M3YOH','M5YOH','M6YOH','M3STUART','M5STUART','CHAFFEE','XM551',
    'S85B','S85','S100','S152','OB704','OB268','T49','T71DA','T1HEAVY','M7YOH','T71','T2LT','S100M1'];
  const {page, saved} = await openGame(t, {seed:{owned:prev,selected:'M6YOH',XP:4321,
    modules:{M5YOH:['optics'],T71:['optics'],OB268:['rammer']}, upgrades:{T57HVY:{gun:1}}}});
  const s=await saved(); assert.deepEqual(s.owned,['T1HEAVY','T57HEAVY','MIIIY','MVY','MVIY','M3ST','M5ST','M24','SHERIDAN',
    'SU85B','SU85','SU100','SU152','OBJ704','OBJ268','T49','T71DA','SU-100M1']);
  assert.equal(s.selected,'MVIY'); assert.equal(s.XP,4321);
  assert.deepEqual(s.modules,{MVY:['optics'],OBJ268:['rammer']}); assert.deepEqual(s.upgrades,{T57HEAVY:{gun:1}});
  await page.reload(); assert.deepEqual(await saved(),s);
});

test('all 32 batch5 exports deploy in offline WebGL: actual model geometry, separate rounds and a mixed team sortie', async t => {
  // Each model plays on one side of a real practice sortie. No target needs a modified HP/armour value.
  const pairs = [['T69','M41'],['T54E1','SHERIDAN'],['T57HEAVY','OBJ268'],['M2LT','AT1'],['M3ST','SU76M'],
    ['M5ST','SU85B'],['M24','SU85'],['T37','SU100'],['T71CMCD','SU152'],['ISU152','T49'],['OBJ704','M6'],
    ['T1HEAVY','PAWLACK'],['MIIY','T29'],['T32','MIIIY'],['MVIY','M103'],['MVY','T110E5']];
  assert.deepEqual(new Set(pairs.flat()),new Set(byId.keys()));
  const {page,click} = await openGame(t,{webgl:true,seed:{owned:pairs.flat(),selected:'T69'}});
  await page.context().setOffline(true);
  for (const [id,other] of pairs) {
    const [,name,,damage,clip,seconds] = byId.get(id), enemy=byId.get(other);
    await click('Выбрать для боя: '+name); await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().triangles),byId.get(id).at(-1));
    if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption(paths.find(p=>p.rows.includes(enemy)).nation);
    await page.locator('#enemy-select').selectOption(other); await click('НАЧАТЬ');
    const battle=await page.evaluate(async clip=>{
      if (!await selectControl('mobile')) throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop(); const g=GameState,p=g.player,e=g.units[1];
      const mounts=g.units.map(u=>[u.id,['hull','turret','gun'].reduce((n,k)=>n+u.modelAsset[k].attributes.position.count/3,0)]);
      // Drive the simulation clock, not the browser/UI clock. The controls and collision code still run normally.
      const shots=[],now=BattleClock.now,start=BattleClock.now(); let elapsed=0;
      try {
        BattleClock.now=()=>start+elapsed;
        p.lookAtPoint(e.x,e.y,e.aimHeight); p.slewSight(Math.PI,Math.PI);
        BattleView.syncCamera(); BattleView.aim(); BattleView.draw();
        if (p.sightHit().hit!==e) throw Error('Model muzzle misses '+e.name);
        setShell(0);
        for (let i=0;i<clip;i++) {
          firePlayer(); firePlayer(); // second click cannot bypass shot spacing / reload
          shots.push([g.bullets.length,g.bullets[0]?.dmg,p.curMag,p.isReloading,Math.round(p.nextShot-BattleClock.now())]);
          for (let step=0;step<50 && g.bullets.length;step++) updateBullets();
          elapsed+=120;
        }
        return {mounts,shots,units:BattleView.stats().units,hp:e.hp,dealt:g.battleDmg};
      } finally {BattleClock.now=now; backToGarage();}
    },clip);
    assert.deepEqual(battle,{mounts:[[id,byId.get(id).at(-1)],[other,enemy.at(-1)]],units:2,
      shots:Array.from({length:clip},(_,i)=>[1,damage,clip-i-1,i===clip-1,i===clip-1?Math.round(seconds*1000):120]),
      hp:enemy[2]-clip*damage,dealt:clip*damage},id+' vs '+other);
  }
  await click('Выбрать для боя: Объект 268'); await click('7×7');
  const team=await page.evaluate(async()=>{
    if (!await selectControl('mobile')) throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop(); const allies=GameState.units.slice(0,7), enemies=GameState.units.slice(7);
    const info=[BattleView.stats().units,GameState.player.id,enemies.some(e=>!allies.some(a=>a.id===e.id)),
      enemies.every(e=>e.team==='enemy' && e.bot && e.modelAsset)];backToGarage();return info;
  });
  assert.deepEqual(team,[14,'OBJ268',true,true]);
});
