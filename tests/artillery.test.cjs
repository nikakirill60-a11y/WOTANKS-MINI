const test = require('node:test'), assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const name = 'G.Pz. Mk. VI (e)', seed = {owned:['MS1','LTR','GPZ'], selected:'GPZ'};

test('the German artillery fork ends at II: inspect before purchase, one 150 XP node, supplied stats and a persistent flagged vehicle', async t => {
  const {page,click,saved} = await openGame(t,{mobile:true});
  await click('Дерево развития'); await click('ГЕРМАНИЯ');
  await page.getByLabel('Показать ветку').selectOption('GPZ');
  assert.deepEqual(await page.locator('#nodes .node').evaluateAll(ns=>ns.map(n=>n.dataset.tankId)),['LTR','GPZ']);
  await click('Характеристики: '+name);
  assert.equal(await page.locator('#tree-status').innerText(),'Сначала исследуйте Leichttraktor');
  assert.deepEqual(await page.locator('#tree-stats dd').allTextContents(),['125 HP','220','14,5 с','35 мм','22 / — мм','50 км/ч','Арт-прицел · вид сверху','±5° от корпуса']);
  await click('Исследовать: Leichttraktor'); await click('Исследовать: '+name); await click('Выбрать: '+name);
  const s = await saved(); assert.equal(s.XP,350); assert.deepEqual(s.owned,['MS1','LTR','GPZ']);
  await page.reload(); assert.equal((await saved()).selected,'GPZ');
  assert.match(await page.locator('#dispatch-meta').innerText(),/Германия.*II.*САУ/);
  assert.equal(await page.locator('.tank-slot.selected [data-card-nation]').getAttribute('data-card-nation'),'germany');
});

async function practice(page,click,type) {
  if (!await page.locator('#enemy-select').isVisible()) await click('ТРЕНИРОВКА');
  await page.locator('#train-nat-select').selectOption('ussr'); await page.locator('#enemy-select').selectOption('T28_USSR');
  await click('НАЧАТЬ');
  await page.evaluate(async type => {
    if (!await selectControl(type)) throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop(); // exercise fixed steps explicitly, independently of software renderer frame time
    if (type==='pc') document.querySelector('#game').requestPointerLock = undefined;
  },type);
  if (type==='pc') await click('Взять управление');
  await page.waitForFunction(()=>BattleInput.running);
}

test('PC artillery: Shift, relative cursor, real convergence, one arcing 220/35 shot and a shared 14.5s reload across views',async t=>{
  const {page,click} = await openGame(t,{webgl:true,seed});
  await practice(page,click,'pc'); await page.keyboard.press('Shift');
  const stops = await page.evaluate(()=>{
    const a=BattleView.artillery, p=GameState.player, start=[a.x,a.y], c=document.querySelector('#game');
    const zooms=[-1,-1,-1,1,1].map(deltaY=>{c.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY}));return a.zoom;});
    a.moveTo(p.x,p.y); BattleView.aim(); firePlayer();
    const close=[document.querySelector('#arty-state').textContent, GameState.bullets.length, p.isReloading];
    a.moveTo(...start); return {zooms,close};
  });
  assert.deepEqual(stops,{zooms:[2,4,4,2,1], close:['Слишком близко',0,false]});
  const aimed = await page.evaluate(()=>{
    const a=BattleView.artillery, g=GameState, p=g.player, e=g.units[1], c=document.querySelector('#game');
    // Move the mouse by the observed screen displacement; don't set a turret angle or target a unit by ID.
    const gain=a.span/c.clientHeight*g.settings.lookSensitivity;
    c.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:Math.round((e.x-a.x)/gain),movementY:Math.round((e.y-a.y)/gain)}));
    BattleInput.consumeLook(); const wide=a.radius;
    for(let i=0;i<245;i++)updatePlayer(); BattleView.aim(); BattleView.draw();
    const stats=BattleView.stats(), q=BattleView.screenPoint(a.x,a.y,a.h);
    return [stats.mode,stats.direction[1],q,wide,a.radius,a.focus,Math.hypot(a.x-e.x,a.y-e.y),p.minYaw,p.maxYaw];
  });
  assert.equal(aimed[0],'artillery'); assert.ok(aimed[1]<-.99999); assert.ok(Math.hypot(aimed[2].x-.5,aimed[2].y-.5)<1e-5);
  assert.ok(aimed[3]>aimed[4]); assert.equal(aimed[5],1); assert.ok(aimed[6]<2); assert.ok(aimed[7]<0 && aimed[8]>0);
  assert.equal(await page.locator('#arty-state').innerText(),'Сведено');
  const launch=await page.evaluate(()=>{
    const g=GameState,p=g.player,muzzle=p.muzzle(), now=BattleClock.now;
    const mouse=(type)=>document.querySelector('#game').dispatchEvent(new MouseEvent(type,{bubbles:true,button:0}));
    try {
      BattleClock.now=()=>2000; mouse('mousedown');mouse('mouseup');mouse('mousedown');mouse('mouseup');
      const b=g.bullets[0];return [g.bullets.length,b.dmg,b.pen,p.nextShot,b.arc.tick,b.arc.x0===muzzle.x && b.arc.h0===muzzle.h,
        BattleView.artillery.focus,g.units[1].hp,g.battleDmg,CombatMechanics.artilleryStrikes.length];
    } finally {BattleClock.now=now;}
  });
  assert.deepEqual(launch,[1,220,35,16500,0,true,0,420,0,0]);
  await page.keyboard.press('Shift');
  assert.equal(await page.evaluate(()=>BattleView.stats().mode),'arcade');
  const result=await page.evaluate(()=>{
    const g=GameState,p=g.player,b=g.bullets[0], now=BattleClock.now;
    let peak=b.h, ticks=0;
    while(g.bullets.length && ticks++<180){updateBullets();peak=Math.max(peak,b.h);}
    try {
      BattleClock.now=()=>16499;const tooSoon=p.fire();BattleClock.now=()=>16500;const normal=p.fire();
      return [peak>b.arc.h0+40,ticks>10,g.battleDmg,g.units[1].hp,tooSoon,normal,!!g.bullets[0].arc,g.bullets[0].dmg];
    } finally {BattleClock.now=now; backToGarage();}
  });
  assert.deepEqual(result,[true,true,220,200,false,true,false,220]);
  // Real exit + next sortie: a non-SPG still has the original sniper optics, not the board cursor.
  await click('Выбрать для боя: МС-1');await practice(page,click,'pc');await page.keyboard.press('Shift');
  const regular=await page.evaluate(()=>{BattleView.syncCamera();BattleView.aim();return [BattleView.stats().mode,BattleView.stats().fov,BattleView.artillery];});
  assert.deepEqual(regular,['sniper',22,null]);assert.ok(await page.locator('#arty-overlay').isHidden());
});

test('touch artillery: pan, minimap jump, zoom, hull assist, cover, hidden enemies and pause do not turn into free shots',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,mobile:true,seed});const original=await saved();
  await practice(page,click,'mobile'); const scope=page.getByRole('button',{name:'Арт-прицел',exact:true});await scope.tap();
  assert.equal(await scope.getAttribute('aria-pressed'),'true');assert.ok(await page.locator('#autoaim-btn').isHidden());
  const start=await page.evaluate(()=>BattleView.artillery.x);
  const cdp=await page.context().newCDPSession(page), touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  await touch('touchStart',[{id:1,x:255,y:325}]);await touch('touchMove',[{id:1,x:299,y:325}]);await touch('touchEnd',[]);
  assert.ok(await page.evaluate(start=>{BattleInput.consumeLook();return BattleView.artillery.x>start+10;},start));
  await page.locator('#zoom-btn').tap(); assert.equal(await page.evaluate(()=>BattleView.artillery.zoom),2);
  const map=page.locator('#minimap'),box=await map.boundingBox();
  await map.tap({position:{x:Math.floor(box.width*.78),y:Math.floor(box.height*.78)}});
  const sweep=await page.evaluate(()=>{
    const s=BattleView.artillery,g=GameState,p=g.player,xy=[p.x,p.y];firePlayer();const blocked=!g.bullets.length&&!p.isReloading;
    for(let i=0;i<290;i++)updatePlayer();
    return [s.x>500&&s.y>500,blocked,s.focus,p.angle>.5,Math.hypot(p.x-xy[0],p.y-xy[1])<1,s.aligned(p)];
  });assert.deepEqual(sweep,[true,true,1,true,true,true]);
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>{firePlayer();return [BattleInput.running,GameState.bullets.length,BattleView.artillery.focus];}),[false,0,1]);
  await click('Продолжить');
  const checked=await page.evaluate(()=>{
    const g=GameState,p=g.player,e=g.units[1],a=BattleView.artillery;
    a.moveTo(e.x,e.y);for(let i=0;i<300;i++)updatePlayer();
    const after=THREE.Scene.prototype.onAfterRender;let visible;
    try {
      e.visible=false;THREE.Scene.prototype.onAfterRender=function(r,scene){
        const root=scene.children.find(o=>o.isGroup && o.children.some(c=>c.geometry===e.modelAsset.hull || (e.modelAsset.far && c.geometry===e.modelAsset.far.hull)));
        visible=root.visible;
      };BattleView.aim();BattleView.draw();
    } finally {THREE.Scene.prototype.onAfterRender=after;e.visible=true;}
    g.walls.push({type:'test-cover',solid:true,x:-8,y:-45,w:18,h:90,height:900});
    return [visible,GameState.aim.hit,a.focus,p.isReloading];
  });assert.deepEqual(checked,[false,null,1,false]);
  await page.locator('#fire-btn').tap();
  const blocked=await page.evaluate(()=>{
    const g=GameState,b=g.bullets[0],a=BattleView.artillery; a.moveTo(-1e7,1e7);
    for(let i=0;i<180 && g.bullets.length;i++)updateBullets();
    return [a.x===-g.arena.bounds.x && a.y===g.arena.bounds.y,b.arc.tick<b.arc.frames,g.battleDmg,g.units[1].hp,g.player.isReloading,g.bullets.length];
  });assert.deepEqual(blocked,[true,true,0,420,true,0]);
  const splash=await page.evaluate(()=>{
    const g=GameState,p=g.player,e=g.units[1],a=BattleView.artillery,now=BattleClock.now,rng=Math.random;
    g.walls.pop(); a.moveTo(e.x,e.y+23); for(let i=0;i<240;i++)updatePlayer();
    const ally=new Tank(e.id,e.x,e.y+23,'ally'); ally.modelAsset=e.modelAsset; TrackDrive.place(ally);g.units.push(ally);
    try {
      const ready=p.nextShot;BattleClock.now=()=>ready; Math.random=()=>0; firePlayer();Math.random=rng;
      for(let i=0;i<180 && g.bullets.length;i++)updateBullets();
      for(let i=0;i<240;i++)updatePlayer(); const tight=a.radius;
      g.keys.KeyW=true;for(let i=0;i<35;i++)updatePlayer();g.keys.KeyW=false;
      return [g.battleDmg,e.hp,ally.hp,a.radius>tight,p.isMoving];
    } finally {Math.random=rng;BattleClock.now=now;g.units.pop();}
  });
  assert.ok(splash[0]>0 && splash[0]<110); assert.deepEqual(splash.slice(1),[420-splash[0],420,true,true]);
  await scope.tap();assert.equal(await scope.getAttribute('aria-pressed'),'false');assert.ok(await page.locator('#arty-overlay').isHidden());
  await page.evaluate(()=>backToGarage());assert.deepEqual(await saved(),original);
});
