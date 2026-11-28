const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {openGame} = require('./winter-harness.cjs');
const routes = require('./fixtures/artillery-23.cjs'), all = routes.flatMap(r=>r.rows);
const root = process.env.CITY_TANKS_INDEX ? path.dirname(process.env.CITY_TANKS_INDEX) : path.join(__dirname,'..');
const prices = [0,150,350,1500,4000,8000,25000,60000,120000,195000];

test('23 supplied meshes: original axles on both sides, hidden static drums, intact belts and clearance between staggered wheels',()=>{
  const ctx = vm.createContext({});
  for (const f of ['catalog','running-gear']) vm.runInContext(fs.readFileSync(path.join(root,'models',f+'.js'),'utf8'),ctx);
  const {DB,WHEEL_FITS,BRANCHES} = vm.runInContext('({DB,WHEEL_FITS,BRANCHES})',ctx);
  const line = end=>BRANCHES.ussr.routes.find(r=>r.at(-1).id===end);
  assert.equal(new Set(all.map(r=>r[0])).size,23); assert.equal(line('OBJ261')[0],DB.MS1);
  for(let i=0;i<5;i++) assert.equal(line('OBJ261')[i],line('OBJ261V4')[i]);
  for (const [id,,,,,,,,,triangles,num] of all) {
    const spec = DB[id], text=fs.readFileSync(path.join(root,'models',spec.file),'utf8');
    const d=JSON.parse(text.slice('BattleModels.receive('.length,-3)), [fit,mask]=WHEEL_FITS[id];
    assert.deepEqual([d.id,d.triangles,d.color,fit.length],[id,triangles,spec.nat==='ussr'?'#66734f':'#707070',num]);
    assert.match(d.source,/soviet-german-artillery-23\.zip.*Lesta Games/);
    const wheel=d.meshes.findIndex(m=>m[0]==='wheels'), body=d.meshes.findIndex(m=>m[0]==='body');
    assert.equal(mask[wheel],true); assert.deepEqual(Object.keys(mask).sort(),[String(body),String(wheel)].sort());
    assert.ok(mask[body].length && mask[body]!==true);
    // Each axis marker in this export is a 32-face cylinder. Recover its Y/Z centre
    // independently of the Python fitter; a correct count alone could hide a shifted row.
    const v=Buffer.from(d.meshes[wheel][1],'base64'),ix=Buffer.from(d.meshes[wheel][2],'base64');
    assert.equal(ix.length,num*32*6);
    const used=new Set();
    for(let i=0;i<ix.length;i+=32*6){
      const corners=Array.from({length:96},(_,j)=>ix.readUInt16LE(i+2*j)*6);
      const [x,y,z]=[0,2,4].map(k=>{const vs=corners.map(i=>v.readInt16LE(i+k));return (Math.min(...vs)+Math.max(...vs))/2;});
      const j=fit.findIndex(([X,Y,Z])=>Math.sign(x)===Math.sign(X) && Math.abs(y-Y)<=1 && Math.abs(z-Z)<=1);
      assert.ok(j>=0 && !used.has(j),id+' distinct original axle');used.add(j);
    }
    for(const side of [-1,1]) {
      const rows=Array.from(fit).filter(r=>Math.sign(r[0])===side).sort((a,b)=>Math.abs(a[0])-Math.abs(b[0]));
      assert.equal(rows.length,num/2);
      for(const [i,[x,y,z,r,w]] of rows.entries()) for(const [X,Y,Z,R,W] of rows.slice(i+1)) {
        if(Math.hypot(Y-y,Z-z)<r+R) assert.ok(Math.abs(X)-W/2>Math.abs(x)+.704*w,id+' intersecting axle planes');
      }
    }
  }
});

test('mobile research follows the three sheets, charges each shared node once and keeps legacy Grille 15 separate',async t=>{
  // GRILLE in an old save is NOT the new tier V. Keep its equipment when both are owned.
  let xp=routes.reduce((s,r)=>s+prices.slice(10-r.rows.length).reduce((a,b)=>a+b,0),0);
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned:['MS1','LTR','GRILLE'],selected:'GRILLE',
    modules:{GRILLE:['optics']},garageSlots:26,XP:xp}});
  const owned=['MS1','LTR','GRILLE15'];assert.deepEqual((await saved()).owned,owned);
  await click('Дерево развития');const picker=page.getByLabel('Показать ветку');
  for(const {nation,root,rows} of routes){
    await click(nation==='ussr'?'СССР':'ГЕРМАНИЯ');await picker.selectOption(rows.at(-1)[0]);
    const prefix=10-rows.length;
    const ids=await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId));
    assert.equal(ids.length,10);assert.equal(ids[prefix-1],root);assert.deepEqual(ids.slice(prefix),rows.map(r=>r[0]));
    if(prefix===5) assert.deepEqual(ids.slice(0,5),['MS1','SU18','SU26','SU5','SU122A']);
    await click('Характеристики: '+rows.at(-1)[1]);assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте '+rows.at(-2)[1]);
    for(const [i,[id,name,hp,dmg,sec,pen,hull,turret,speed]] of rows.entries()){
      await click('Исследовать: '+name);owned.push(id);xp-=prices[prefix+i];
      assert.deepEqual(await page.locator('#tree-stats dd').allTextContents(),[`${hp} HP`,String(dmg),sec.toLocaleString('ru-RU')+' с',
        `${pen} мм`,`${hull} / ${turret??'—'} мм`,`${speed} км/ч`,'Арт-прицел · вид сверху','±10° от корпуса']);
      const s=await saved();assert.deepEqual([s.selected,s.XP,s.owned],[id,xp,owned]);
    }
  }
  await page.reload();const s=await saved();assert.deepEqual([s.owned,s.selected,s.XP,s.modules],[owned,'GWE100',0,{GRILLE15:['optics']}]);
  assert.deepEqual(s.rentalBattles,{});
});

test('all 23 actual depot and battle models: signed wheel motion, playable overhead sight and the single round from each sheet',async t=>{
  const ids=all.map(r=>r[0]);const {page,click}=await openGame(t,{webgl:true,seed:{owned:ids,selected:ids[0]}});
  await page.context().setOffline(true);
  await page.evaluate(()=>{
    const follow=RoadWheels.prototype.follow;window.testRigs=new WeakMap();
    RoadWheels.prototype.follow=function(u,distant){testRigs.set(u,this);return follow.call(this,u,distant);};
  });
  for(const [id,name,hp,damage,sec,pen,hull,turret,speed,tris,num] of all){
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    assert.equal(await page.evaluate(()=>DepotView.stats().sourceTriangles),tris);
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('ussr');await page.locator('#enemy-select').selectOption('SU18');
    const got=await page.evaluate(async()=>{
      if(!await launchBattle(1))throw Error(document.getElementById('battle-notice-text').textContent);
      stopBattleLoop();BattleClock.pause();const p=GameState.player,a=p.modelAsset,rig=testRigs.get(p),matrix=new THREE.Matrix4();
      const angles=()=>a.axles.map((_,i)=>{rig.mesh.getMatrixAt(i,matrix);return Math.atan2(matrix.elements[6],matrix.elements[5]);});
      const drive=m=>{p.x+=m*p.modelScale*Math.cos(p.angle);p.y+=m*p.modelScale*Math.sin(p.angle);BattleView.draw();};
      try{
        const start=angles();drive(.1);const ahead=angles();drive(-.1);const back=angles();p.angle+=.04;BattleView.draw();const turn=angles();
        const rolled=a.axles.every(([x,,,r],i)=>Math.abs(wrapAngle(ahead[i]-start[i])-.1/r)<1e-5 &&
          Math.abs(wrapAngle(back[i]-ahead[i])+.1/r)<1e-5 && Math.abs(wrapAngle(turn[i]-back[i])-.04*x/r)<1e-5);
        BattleView.toggleScope();const sight=BattleView.artillery;
        sight.moveTo(p.x+180*Math.cos(p.angle),p.y+180*Math.sin(p.angle));p.setLook(p.angle,ArtillerySight.raisedPitch);p.slewSight(Math.PI,Math.PI);
        const now=BattleClock.now();const fired=p.fire(0,sight),b=GameState.bullets[0];const mode=BattleView.stats().mode;
        BattleView.toggleScope();const early=p.fire(0);
        return {stats:[p.hp,p.dmg,p.reloadTime,p.pen,p.armor,p.turretArmor,Math.round(p.baseSpeed*60*3.6/BATTLE_UNITS_PER_METRE)],
          wheels:[rig.mesh.isInstancedMesh,rig.mesh.geometry===a.wheel,rig.mesh.count,rolled],
          shot:[mode,fired,!!b?.arc,b?.dmg,b?.pen,early,p.nextShot-now,CombatMechanics.artilleryStrikes.length]};
      }finally{backToGarage();}
    });
    assert.deepEqual(got,{stats:[hp,damage,sec*1000,pen,hull,turret,speed],wheels:[true,true,num,true],
      shot:['artillery',true,true,damage,pen,false,sec*1000,0]},id);
  }
});
