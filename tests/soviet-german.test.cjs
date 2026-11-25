const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const paths = require('./fixtures/soviet-german.cjs');
const rows = new Map(paths.flatMap(p => p.rows.map(r => [r[0], r])));
const costs = [0,150,350,1500,4000,8000,25000,60000,120000,195000];

test('New Year checkpoint: the local ST-II and Leopard 1 artwork, entry controls and caption fit without starting the garage', async t => {
  const {page,click,saved}=await openGame(t,{enterGuest:false});
  await page.context().setOffline(true);
  for (const [width,height] of [[320,568],[390,844],[768,1024],[568,320],[844,390],[1024,768],[1366,768]]) {
    await page.setViewportSize({width,height});
    const result=await page.evaluate(async()=>{
      const root=document.querySelector('#entry-screen'),url=new URL('assets/depot-entry.webp',location.href).href;
      const art=new Image();art.src=url;await art.decode();
      return [getComputedStyle(root,'::before').backgroundImage.includes(url),art.naturalWidth>=1280,
        root.scrollWidth===root.clientWidth,root.scrollHeight===root.clientHeight,
        [...root.querySelectorAll('button, footer strong')].every(n=>{const r=n.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight;}),
        document.querySelector('#ui').hidden,document.querySelector('#depot-canvas')===null];
    });
    assert.deepEqual(result,Array(7).fill(true),`${width}×${height}`);
  }
  assert.match(await page.locator('.entry-foot').innerText(),/СТ-II · Leopard 1/);
  assert.equal(await saved(),null);await click('ГОСТЬ');assert.ok(await page.locator('#ui').isVisible());
});

test('phone: research all thirty additions on ten routes; a shared fork is never charged twice', async t => {
  const owned=['MS1','IS','IS3','SU100','T150','PZIVH','TIGERP','TIGERI','LEOPARD'];
  let xp=paths.reduce((sum,{shared})=>sum+costs.slice(shared).reduce((a,b)=>a+b,0),0);
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'IS3',XP:xp,garageSlots:owned.length+30}});
  await click('Дерево развития');const picker=page.getByLabel('Показать ветку');
  const forks=['IS3','IS','IS','SU100','SU-101','T150','PZIVH','TIGERP','VK-4502-B','TIGERI'];
  const meshes=[];page.on('request',r=>{if(r.url().endsWith('.mesh.js'))meshes.push(r.url());});
  for(const [i,{nation,end,shared,rows:extra}] of paths.entries()){
    await click(nation==='ussr'?'СССР':'ГЕРМАНИЯ');const before=await saved();
    await picker.selectOption(end);
    const ids=await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId));
    assert.equal(ids.length,10);assert.equal(ids[shared-1],forks[i]);assert.deepEqual(ids.slice(shared),extra.map(r=>r[0]));
    if(extra.length>1){await click('Характеристики: '+extra[1][1]);assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте '+extra[0][1]);}
    assert.deepEqual(await saved(),before);
    for(const [j,[id,name,hp,dmg,mag,salvo,sec,pen,hull,turret,speed]] of extra.entries()){
      await click('Исследовать: '+name);owned.push(id);xp-=costs[shared+j];
      const s=await saved();assert.deepEqual([s.selected,s.XP,s.owned],[id,xp,owned]);
      const rounds=mag*salvo;
      assert.deepEqual((await page.locator('#tree-stats dd').allTextContents()).slice(0,6),[
        hp+' HP',rounds>1?`${dmg*rounds} (${rounds} × ${dmg})`:String(dmg),sec.toLocaleString('ru-RU')+' с',pen+' мм',`${hull} / ${turret??'—'} мм`,speed+' км/ч']);
      if(salvo===2){assert.equal(await page.locator('#dispatch-dmg-label').innerText(),'Урон залпа');assert.match(await page.locator('#dispatch-drum').innerText(),/одновременно/);}
    }
  }
  assert.deepEqual(meshes,[]);await page.reload();const s=await saved();assert.deepEqual([s.selected,s.XP,s.owned],['KPZ-67',0,owned]);
  await click('ТРЕНИРОВКА');for(const nat of ['ussr','germany']){
    await page.locator('#train-nat-select').selectOption(nat);
    const opts=await page.locator('#enemy-select option').evaluateAll(os=>os.map(o=>o.value));
    for(const p of paths.filter(p=>p.nation===nat))assert.ok(p.rows.every(r=>opts.includes(r[0])));
  }
});

test('historical tier-X OB263 and Leopard 1 saves keep the right tier, equipment and selection',async t=>{
  const {page,saved}=await openGame(t,{seed:{owned:['S100M1','S101','S12254','OB263','LEO1','LEOPARD','VK72'],selected:'OB263',XP:501,
    modules:{OB263:['optics'],LEO1:['turbo']},upgrades:{OB263:{gun:1}}}});
  const s=await saved();assert.deepEqual([s.owned,s.selected,s.XP],[['SU-100M1','SU-101','SU-122-54','OBJ-263-X','LEOPARD-1','LEOPARD','VK-7201-K'],'OBJ-263-X',501]);
  assert.deepEqual(s.modules,{'OBJ-263-X':['optics'],'LEOPARD-1':['turbo']});assert.deepEqual(s.upgrades,{'OBJ-263-X':{gun:1}});
  assert.equal(await page.locator('#dispatch-name').innerText(),'Объект 263 (10 ур.)');await page.reload();assert.deepEqual(await saved(),s);
});

async function practice(page,click,id,enemy){
  await click('Выбрать для боя: '+rows.get(id)[1]);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
  assert.equal(await page.evaluate(()=>DepotView.stats().triangles),rows.get(id).at(-1));
  if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
  await page.locator('#train-nat-select').selectOption(paths.find(p=>p.rows.includes(rows.get(enemy))).nation);
  await page.locator('#enemy-select').selectOption(enemy);await click('НАЧАТЬ');
  await page.evaluate(async()=>{if(!await selectControl('mobile'))throw Error(document.querySelector('#battle-notice-text').textContent);stopBattleLoop();});
}

test('all thirty records deploy offline: actual meshes, hits, separate 263 variants, exact volley/drum/single cooldowns',async t=>{
  const pairs=[['IS-2-II','IS-M'],['IS-3-II','OBJ-705A'],['ST-II','LEOPARD-1'],['TET-100','KPZ-67'],['KV-90','PZKPFW-VII'],
    ['KV-4M','VPZ-57'],['KV-4F','PZ-55'],['OBJ-263-X','OBJ-263'],['T-10','VK-4502-B'],['OBJ-277','VK-7201-K'],
    ['OBJ-705','VK-4502-A'],['SU-100M1','VK-3001-D'],['SU-101','VK-3002-D'],['SU-122-54','INDIEN-PZ'],['OBJ-2684','LEOPARD-PT-A']];
  assert.deepEqual(new Set(pairs.flat()),new Set(rows.keys()));
  const {page,click}=await openGame(t,{webgl:true,seed:{owned:pairs.flat(),selected:pairs[0][0]}});await page.context().setOffline(true);
  for(const [id,other] of pairs){
    const [,,,dmg,mag,salvo,seconds]=rows.get(id);await practice(page,click,id,other);
    const result=await page.evaluate(mag=>{
      const g=GameState,p=g.player,e=g.units[1],now=BattleClock.now, start=BattleClock.now();let time=start;
      try {
        BattleClock.now=()=>time;
        const models=g.units.map(u=>[u.id,['hull','turret','gun'].reduce((sum,k)=>sum+u.modelAsset[k].attributes.position.count/3,0)]);
        // A rear-facing stationary practice target avoids random nonpenetrations. No edited HP, plates or damage.
        e.angle=e.tAngle=e.lookYaw=p.angle;p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
        BattleView.syncCamera();BattleView.aim();BattleView.draw();if(p.sightHit().hit!==e)throw Error('Practice aim: '+p.id);
        setShell(0);const shots=[];for(let i=0;i<mag;i++){
          firePlayer();firePlayer();shots.push([g.bullets.map(b=>b.dmg),p.curMag,p.isReloading,Math.round(p.nextShot-time)]);
          for(let step=0;step<60 && g.bullets.length;step++)updateBullets();
          time=p.nextShot-1;if(p.fire(0))throw Error('Reload bypass: '+p.id);time++;
        }
        const cycle=p.fire(0)?g.bullets.length:0;
        return {models,shared:p.modelAsset===e.modelAsset,shots,cycle,loss:e.maxHp-e.hp,counted:g.battleDmg};
      } finally {BattleClock.now=now;backToGarage();}
    },mag);
    assert.deepEqual(result,{models:[[id,rows.get(id).at(-1)],[other,rows.get(other).at(-1)]],shared:id==='OBJ-263-X',
      shots:Array.from({length:mag},(_,i)=>[Array(salvo).fill(dmg),mag-i-1,i===mag-1,i===mag-1?Math.round(seconds*1000):120]),
      cycle:salvo,loss:dmg*mag*salvo,counted:dmg*mag*salvo},id+' vs '+other);
  }
});

test('double guns: one touch fires from both rendered tips; one shell can hit cover while the other hits a tank',async t=>{
  const tips={ // authored local gun-tip centres in millimetres, including the asymmetric ST-II rig
    'IS-2-II':[[-218.5,-1,4388],[218.5,-1,4388]],'IS-3-II':[[-220,-36,4969],[220,-32,4969]],'ST-II':[[-119,0,4880],[216.5,4,4880]]};
  const {page,click}=await openGame(t,{webgl:true,mobile:true,seed:{owned:Object.keys(tips),selected:'ST-II'}});await page.context().setOffline(true);
  for(const id of Object.keys(tips)){
    const other=id==='ST-II'?'IS-2-II':'ST-II',dmg=rows.get(id)[3]*.75;await practice(page,click,id,other);
    const pose=await page.evaluate(()=>{
      const g=GameState,p=g.player,e=g.units[1],a=p.modelAsset;
      p.angle=.42;p.groundPitch=.045;p.groundRoll=-.065;e.angle=e.tAngle=e.lookYaw=0;
      p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);setShell(2);BattleView.syncCamera();BattleView.aim();
      const proto=THREE.Mesh.prototype,render=proto.onBeforeRender;let world;
      try {proto.onBeforeRender=function(...args){if(this.geometry===a.gun)world=a.muzzles.map(tip=>new THREE.Vector3(...tip).applyMatrix4(this.matrixWorld).toArray());render.apply(this,args);};BattleView.draw();}
      finally {proto.onBeforeRender=render;}
      return {local:a.muzzles.map(t=>t.map(v=>Math.round(v*2000)/2)),world};
    });
    assert.deepEqual(pose.local,tips[id]);assert.equal(pose.world.length,2);
    await page.locator('#fire-btn').tap(); // no held frame, second input or setTimeout can create the other shell
    const hit=await page.evaluate(()=>{
      const g=GameState,p=g.player,e=g.units[1],shots=g.bullets.map(b=>[[b.x,b.h,b.y],b.dmg,b.st]);
      if(shots.length!==2 || !p.isReloading)throw Error('One touch must queue the entire volley');
      const wallAt=b=>({type:'building',solid:true,hp:2000,x:b.x+b.dx*10-.2,y:b.y+b.dy*10-.2,w:.4,h:.4,height:1000});
      if(!p.modelAsset.muzzles.every(tip=>p.sightHit(600,true,false,tip).hit===e))throw Error('Unobstructed aim');
      const w=wallAt(g.bullets[0]);g.walls.push(w);const hp=e.hp;
      for(let i=0;i<80 && g.bullets.length;i++)updateBullets();g.walls.splice(g.walls.indexOf(w),1);
      const damage=[2000-w.hp,hp-e.hp,g.battleDmg];updateHUD();const hud=document.querySelector('#ammo-val').textContent;
      // A real bot uses the same two tips: hold if either is covered, then fire a single volley when clear.
      e.practiceTarget=false;p.spotted=true;BotAI.attach(e,{lane:0,index:0,side:1},g.navigation);
      Object.assign(e.bot,{target:p,open:true,aimTicks:60,nextLook:Infinity,shell:0});e.lookAtPoint(p.x,p.y,p.aimHeight);e.slewSight(Math.PI,Math.PI);
      const cover=wallAt(e.barrelRay(e.modelAsset.muzzles[0]));g.walls.push(cover);BotAI.step(e,1);const blocked=g.bullets.length;
      g.walls.splice(g.walls.indexOf(cover),1);BotAI.step(e,2);
      const bot=[blocked,g.bullets.length,g.bullets.every(b=>b.shooter===e),e.isReloading];
      return {shots,damage,hud,bot};
    });
    for(const [i,[xyz,damage,shell]] of hit.shots.entries()){
      assert.ok(Math.hypot(...xyz.map((n,j)=>n-pose.world[i][j]))<1e-4,`${id} rendered tip ${i}`);
      assert.deepEqual([damage,shell],[dmg,2]);
    }
    assert.deepEqual(hit.damage,[dmg,dmg,dmg]);assert.match(hit.hud,/ЗАЛП ×2 · Подкал.*ПЕРЕЗАРЯДКА/);
    assert.deepEqual(hit.bot,[0,2,true,true]);await page.evaluate(()=>backToGarage());
  }
});
