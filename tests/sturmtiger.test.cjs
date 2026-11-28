const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const rows = require('./fixtures/sturmtiger.cjs');
const prefix = ['LTR','PZJAG1','MARDER2'];
const prices = [1500,4000,8000,25000,60000,120000,195000];

test('phone: a third Marder II fork; old StuG G keeps its slot and equipment, and all seven IV–X rows match the sheet', async t => {
  let xp = prices.reduce((a,b)=>a+b);
  const {page,click,saved} = await openGame(t,{mobile:true,seed:{owned:[...prefix,'STUG3'],selected:'STUG3',
    XP:xp,garageSlots:11,modules:{STUG3:['optics']}}});
  const owned=[...prefix,'STUG3G'];
  assert.deepEqual((await saved()).owned,owned); assert.equal((await saved()).selected,'STUG3G');
  await click('Дерево развития'); await click('ГЕРМАНИЯ');
  const nodes=page.locator('#nodes .node'), picker=page.getByLabel('Показать ветку');
  assert.equal(await nodes.count(),74);assert.equal(await picker.locator('option').count(),14);
  assert.deepEqual(await page.evaluate(()=>BRANCHES.germany.tanks.filter(t=>t.parent==='MARDER2').map(t=>t.id)),['MARDER38','HETZER','STUG3B']);
  const before=await saved(); await picker.selectOption('STURMTIGER');
  assert.deepEqual(await nodes.evaluateAll(ns=>ns.map(n=>n.dataset.tankId)),prefix.concat(rows.map(r=>r[0])));
  await click('Характеристики: Sturmtiger');assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте Bär');
  assert.deepEqual(await saved(),before);
  for(const [i,[id,name,slug,hp,dmg,ms,pen,armor,speed]] of rows.entries()){
    await click('Исследовать: '+name);xp-=prices[i];owned.push(id);
    assert.deepEqual(await page.locator('#tree-stats dd').allInnerTexts(),[
      hp+' HP',String(dmg),(ms/1000).toLocaleString('ru-RU')+' с',pen+' мм',armor+' / — мм',speed+' км/ч','Вместе с корпусом'
    ]);
    assert.ok(await page.locator('#tree-photo').evaluate(async (img,slug)=>{await img.decode();return img.naturalWidth===640 && img.src.endsWith('/'+slug+'.webp')},slug));
    await click('Выбрать: '+name);const s=await saved();assert.deepEqual([s.owned,s.selected,s.XP],[owned,id,xp]);
  }
  await page.reload();const s=await saved();assert.deepEqual([s.selected,s.modules,s.owned,s.XP],['STURMTIGER',{STUG3G:['optics']},owned,0]);
});

test('all seven fitted meshes deploy and fire offline: fixed casemate, visible muzzle through pitch limits, exact single-shot reload', async t => {
  const {page,click} = await openGame(t,{webgl:true,seed:{owned:rows.map(r=>r[0]),selected:'STUG3B'}});
  await page.context().setOffline(true);
  for(const [id,name,,hp,dmg,ms,pen,armor,speed,,tris] of rows){
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().sourceTriangles),tris);
    if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('germany');
    await page.locator('#enemy-select').selectOption(id==='BAER'?'STURMTIGER':'BAER');await click('НАЧАТЬ');
    const got=await page.evaluate(async()=>{
      if(!await selectControl('mobile'))throw Error(document.getElementById('battle-notice-text').textContent);
      stopBattleLoop();const g=GameState,p=g.player,e=g.units[1],a=p.modelAsset,old=BattleClock.now,random=Math.random;
      try {
        let now=BattleClock.now();BattleClock.now=()=>now;Math.random=()=>.99;
        const errors=[];const origAngle=p.angle;p.angle+=.35;p.groundPitch=.04;p.groundRoll=-.06;
        for(const pitch of [-1,1]){
          p.setLook(p.angle+.9,pitch);p.slewSight(Math.PI,Math.PI);
          if(Math.abs(wrapAngle(p.tAngle-p.angle))>1e-8 || Math.abs(p.aimPitch-(pitch<0?-5:8)*Math.PI/180)>1e-8 || a.turret.attributes.position.count)
            throw Error('Casemate turns independently or pitches past its stops: '+p.id);
          BattleView.syncCamera();const proto=THREE.Mesh.prototype,draw=proto.onBeforeRender;let pos;
          try { proto.onBeforeRender=function(...args){if(this.geometry===a.gun)pos=new THREE.Vector3(...a.muzzle).applyMatrix4(this.matrixWorld);draw.apply(this,args);};BattleView.draw(); }
          finally {proto.onBeforeRender=draw;}
          const tip=p.muzzle();errors.push(Math.hypot(pos.x-tip.x,pos.y-tip.h,pos.z-tip.y));
        }
        p.angle=origAngle;p.groundPitch=p.groundRoll=0;
        p.angle=p.lookAtPoint(e.x,e.y,e.aimHeight);p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
        e.angle=e.tAngle=e.lookYaw=p.angle; // rear of the stationary target: no random bounce or edited armour
        BattleView.syncCamera();BattleView.aim();BattleView.draw();
        setShell(0);const ray=p.sightHit(),tip=p.muzzle();firePlayer();firePlayer();
        const b=g.bullets[0], round=[g.bullets.length,b.dmg,b.pen,p.curMag,p.nextShot-now];
        errors.push(Math.hypot(b.x-tip.x,b.h-tip.h,b.y-tip.y));
        for(let step=0;step<80 && g.bullets.length;step++)updateBullets();
        const hit=[ray.hit===e,ray.part,e.maxHp-e.hp,g.battleDmg];
        now=p.nextShot-1;firePlayer();const early=g.bullets.length;now++;firePlayer();
        return {stats:[p.hp,p.dmg,p.reloadTime,p.pen,p.armor,p.turretArmor,Math.round(p.baseSpeed*60*3.6/BATTLE_UNITS_PER_METRE),p.magSize,p.isSPG],
          tips:errors.every(n=>n<1e-4),hit,round,cycle:[early,g.bullets.length],tris:['hull','turret','gun'].reduce((n,k)=>n+a[k].attributes.position.count/3,0)};
      } finally {BattleClock.now=old;Math.random=random;backToGarage();}
    });
    assert.deepEqual(got,{stats:[hp,dmg,ms,pen,armor,null,speed,1,false],tips:true,hit:[true,'hull',dmg,dmg],round:[1,dmg,pen,0,ms],cycle:[0,1],tris},id);
  }
});
