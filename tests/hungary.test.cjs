const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const rows = require('./fixtures/hungary.cjs');
const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];

test('Hungary on a phone: a Soviet T-54 grants no Hungarian tiers; inspect, claim and research I–X in order', async t => {
  const owned=['MS1','T54']; let xp=414000;
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'T54',XP:xp,garageSlots:12}});
  await click('Дерево развития');await click('ВЕНГРИЯ');
  assert.deepEqual(await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId)), rows.map(r=>r[0]));
  assert.ok(await page.locator('#route-filter').isHidden());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  const prior=await saved();await click('Характеристики: T-54A');assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте 44M Tas');
  assert.deepEqual(await saved(),prior);assert.equal(await page.locator('#dispatch-name').innerText(),'Т-54');
  for(const [i,[id,name,hp,dmg,mag,reload,pen,hull,turret,speed]] of rows.entries()){
    await click('Исследовать: '+name);owned.push(id);xp-=costs[i];const s=await saved();
    assert.deepEqual([s.owned,s.XP,s.selected,s.curNat],[owned,xp,id,'hungary']);
    assert.deepEqual(await page.locator('#tree-stats dd').allTextContents(),[hp+' HP',mag===1?String(dmg):'80 (4 × 20)',(reload/1000).toLocaleString('ru-RU')+' с',pen+' мм',`${hull} / ${turret} мм`,speed+' км/ч',...(id==='TAS'?['±10° от корпуса']:[])]);
  }
  await page.reload();const s=await saved();assert.deepEqual([s.owned,s.selected,s.XP,s.curNat],[owned,'T55AM1',0,'hungary']);
  assert.equal(await page.locator('#bay-name').innerText(),'T-55AM');assert.match(await page.locator('#bay-meta').innerText(),/Венгрия/);
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption({label:'Венгрия'});
  assert.deepEqual(await page.locator('#enemy-select option').evaluateAll(os=>os.map(o=>o.value)),rows.map(r=>r[0]));
});

test('all ten Hungarian exports deploy offline: sheet damage, four distinct Toldi rounds and a casemate without phantom armour', async t => {
  const {page,click}=await openGame(t,{webgl:true,seed:{owned:rows.map(r=>r[0]),selected:'TOLDI1'}});
  await page.context().setOffline(true);
  for(const [i,j] of [[1,2],[3,0],[6,5],[7,4],[9,8]]){
    const [id,name,,dmg,mag,reload]=rows[i], [enemy,,hp]=rows[j];
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().sourceTriangles),rows[i].at(-1));
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('hungary');await page.locator('#enemy-select').selectOption(enemy);
    await click('НАЧАТЬ');
    const result=await page.evaluate(async mag=>{
      if(!await selectControl('mobile'))throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop();const g=GameState,p=g.player,e=g.units[1],clock=BattleClock.now,start=BattleClock.now();let elapsed=0;
      try {
        BattleClock.now=()=>start+elapsed;
        const mounts=g.units.map(u=>[u.id,['hull','turret','gun'].reduce((sum,k)=>sum+u.modelAsset[k].attributes.position.count/3,0)]);
        if(p.id==='TAS'){
          const box=p.modelAsset.turret.boundingBox;p.setLook(1,0);p.slewSight(Math.PI,1);
          if(Math.abs(wrapAngle(p.tAngle-p.angle)-Math.PI/18)>1e-6 || !box.isEmpty() || localBox(box,1,0,0,0,1,1,1,500)!==Infinity)throw Error('Tas mount or empty armour volume');
        }
        p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);BattleView.syncCamera();BattleView.aim();BattleView.draw();
        if(p.sightHit().hit!==e)throw Error('Unaligned model: '+p.id);
        const shots=[];for(let n=0;n<mag;n++){
          firePlayer();firePlayer();shots.push([g.bullets.length,g.bullets[0]?.dmg,p.curMag,p.isReloading,Math.round(p.nextShot-BattleClock.now())]);
          for(let k=0;k<50 && g.bullets.length;k++)updateBullets();elapsed+=p.shotDelay;
        }
        return {mounts,shots,hp:e.hp,dealt:g.battleDmg};
      }finally{BattleClock.now=clock;backToGarage();}
    },mag);
    assert.deepEqual(result,{mounts:[[id,rows[i].at(-1)],[enemy,rows[j].at(-1)]],shots:Array.from({length:mag},(_,n)=>[1,dmg,mag-1-n,n===mag-1,n===mag-1?reload:500]),hp:hp-dmg*mag,dealt:dmg*mag});
  }
});
