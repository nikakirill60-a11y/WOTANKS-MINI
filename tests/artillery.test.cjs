const test = require('node:test'), assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const name = 'G.Pz. Mk. VI (e)', seed = {owned:['MS1','LTR','GPZ'], selected:'GPZ'};

async function redeem(page, code='ARTA', enter=false) {
  const input = page.getByLabel('Промокод',{exact:true});
  await input.fill(code);
  if (enter) await input.press('Enter');
  else await page.getByRole('button',{name:'АКТИВИРОВАТЬ',exact:true}).click();
  return page.locator('#promo-result').innerText();
}

test('ARTA grants four battles once, without research, payment or a new slot; the rental cannot be sold', async t => {
  const {page,click,saved} = await openGame(t,{mobile:true});
  await click('Дерево развития'); await click('ГЕРМАНИЯ');
  assert.equal(await page.locator('#tree-route option[value="GPZ"],#nodes [data-tank-id="GPZ"]').count(),0);
  const before = await saved(); await page.evaluate(()=>researchTank('GPZ')); assert.deepEqual(await saved(),before);
  await click('Код'); assert.match(await redeem(page,'AR TA'),/Неверный код/); assert.deepEqual(await saved(),before);
  const message = await redeem(page,'  aRtA  ',true);
  assert.ok(message.includes(name+' добавлена в ангар')); assert.match(message,/Аренда на 4 боя/);
  const claimed = {...before,owned:[...before.owned,'GPZ'],usedPromos:[...before.usedPromos,'ARTA'],rentalBattles:{GPZ:4}};
  assert.deepEqual(await saved(),claimed); assert.match(await redeem(page),/Уже использован/); assert.deepEqual(await saved(),claimed);
  await click('ЗАКРЫТЬ'); await click('Выбрать для боя: '+name); await page.reload();
  assert.equal((await saved()).selected,'GPZ'); assert.equal(await page.locator('#bay-kind').innerText(),'КОЛЛЕКЦИОННАЯ МАШИНА');
  assert.match(await page.locator('#dispatch-meta').innerText(),/Германия.*II.*САУ.*Аренда: 4 боя/);
  assert.equal(await page.locator('.tank-slot.selected [data-card-nation]').getAttribute('data-card-nation'),'germany');
  assert.equal(await page.locator('.tank-slot.selected .rental-tag').innerText(),'Аренда: 4 боя');
  const parked = await saved();
  assert.equal(await page.getByRole('button',{name:'Продать: '+name}).count(),0);
  assert.equal(await page.evaluate(()=>{sellTank('GPZ');document.getElementById('sale-confirm').click();return document.getElementById('sale-modal').open;}),false);
  await click('В БОЙ 15×15'); await click('Назад в ангар');
  assert.equal(await page.evaluate(()=>startTraining()),false,'no WebGL: a failed launch must be free');
  assert.deepEqual(await saved(),parked);
});

test('full garage: the promo saves one reservation, survives reload and delivers once when a berth opens',async t=>{
  const fleet=['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','IS7'];
  const {page,click,saved}=await openGame(t,{seed:{owned:fleet,selected:'IS7'}}); const before=await saved();
  await click('Код'); const message=await redeem(page);assert.ok(message.includes(name+' ожидает слота'));assert.match(message,/Аренда на 4 боя/);
  const waiting={...before,pendingVehicles:['GPZ'],usedPromos:['ARTA'],rentalBattles:{GPZ:4}}; assert.deepEqual(await saved(),waiting);
  await page.reload(); await click('Ожидают слота: 1');assert.ok((await page.locator('#vehicle-deliveries').innerText()).includes(name+' (аренда на 4 боя)'));
  await click('В ангар'); await click('Код');assert.match(await redeem(page,'arta',true),/Уже использован/);assert.deepEqual(await saved(),waiting);
  await click('ЗАКРЫТЬ'); await page.getByRole('button',{name:'Выбрать для боя: Т-26',exact:true}).focus();
  await click('Продать: Т-26');await click('Подтвердить продажу');await page.reload();
  const delivered=await saved();assert.deepEqual(delivered.owned,fleet.filter(id=>id!=='T26').concat('GPZ'));
  assert.equal(delivered.selected,'IS7');assert.deepEqual(delivered.pendingVehicles,[]);assert.deepEqual(delivered.usedPromos,['ARTA']);
  assert.deepEqual(delivered.rentalBattles,{GPZ:4}); assert.equal(await page.locator('[data-tank-id="GPZ"] .rental-tag').innerText(),'Аренда: 4 боя');
});

test('already researched GPZ retains selection and equipment; entering ARTA neither clones nor compensates it',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{...seed,XP:350,modules:{GPZ:['optics']},upgrades:{GPZ:{gun:1}}}});
  const old=await saved();assert.deepEqual([old.owned,old.selected,old.XP,old.modules.GPZ,old.upgrades.GPZ],[seed.owned,'GPZ',350,['optics'],{gun:1}]);
  await click('Код'); assert.ok((await redeem(page)).includes(name+' уже в ангаре. Код не потрачен.'));
  await page.reload();assert.deepEqual(await saved(),old);assert.deepEqual(old.rentalBattles,{});
  assert.equal(await page.locator('.rental-tag').count(),0);
  await click('Продать: '+name);assert.equal(await page.locator('#sale-price').innerText(),'200 G');await click('Отмена');
});

test('rental migration uses the ARTA receipt plus actual possession; sold, corrupt and expired grants never respawn',async t=>{
  const {page}=await openGame(t);
  const cases=await page.evaluate(()=>{
    const full=['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','IS7'];
    return [
      {owned:full,pendingVehicles:['BT42','GPZ']}, // queued by the previous promo build
      {owned:['MS1']},                           // sold before the update
      {owned:['MS1'],rentalBattles:{GPZ:4}},     // orphan counter is not a grant
      {owned:['GPZ'],rentalBattles:{GPZ:0}},     // last vehicle expired
      {owned:['GPZ'],rentalBattles:{GPZ:'2'}},   // non-integer must not make it permanent
      {owned:['GPZ'],rentalBattles:{GPZ:40,MS1:4}},
      {owned:['GPZ'],usedPromos:[],rentalBattles:{GPZ:3}} // researched copy, no receipt
    ].map(fields=>{
      const g=decodeProgress({selected:'GPZ',usedPromos:['ARTA'],...fields});
      return [g.rentalBattles,g.owned.includes('GPZ'),g.pendingVehicles,g.selected,g.usedPromos];
    });
  });
  assert.deepEqual(cases,[
    [{GPZ:4},false,['BT42','GPZ'],'MS1',['ARTA']], [{},false,[],'MS1',['ARTA']], [{},false,[],'MS1',['ARTA']],
    [{},false,[],null,['ARTA']], [{},false,[],null,['ARTA']], [{GPZ:4},true,[],'GPZ',['ARTA']], [{},true,[],'GPZ',[]]
  ]);
});

test('four playable sorties only: no charge for a target or cancelled load, no refund on reload/exit, final berth delivers FIFO',async t=>{
  const fleet=['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','GPZ'];
  // Parked ARTA grant from the previous release, with no counter yet.
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{owned:fleet,selected:'GPZ',usedPromos:['ARTA'],pendingVehicles:['BT42','T62A'],
    modules:{GPZ:['spall'],MS1:['optics']},upgrades:{GPZ:{gun:1}},upgradesBought:{GPZ:{gun:[true,true,false]}}}});
  const start=await saved();assert.deepEqual(start.rentalBattles,{GPZ:4});
  assert.equal(await page.evaluate(async()=>{const pending=startTraining();backToGarage();return await pending;}),false);
  assert.deepEqual(await saved(),start);

  const enter=size=>page.evaluate(async size=>{
    GameState.controlMode='mobile';const launch=launchBattle(size),duplicate=await launchBattle(size);
    if (!await launch) throw Error(document.getElementById('battle-notice-text').textContent);
    stopBattleLoop();return {player:GameState.player.id,hp:GameState.player.maxHp,enemy:GameState.units.find(u=>u.team==='enemy').id,duplicate};
  },size);
  await click('Выбрать для боя: МС-1');await click('ТРЕНИРОВКА');
  await page.locator('#train-nat-select').selectOption('germany');await page.locator('#enemy-select').selectOption('GPZ');
  const target=await enter(1);assert.deepEqual([target.player,target.enemy,target.duplicate],['MS1','GPZ',false]);
  await page.evaluate(()=>{endBattle(false);backToGarage();});assert.deepEqual((await saved()).rentalBattles,{GPZ:4});
  await click('Выбрать для боя: '+name);

  for (let remaining=3;remaining>=0;remaining--) {
    const match=await enter(remaining===3?7:1);assert.deepEqual([match.player,match.hp,match.duplicate],['GPZ',135,false]);
    assert.deepEqual((await saved()).rentalBattles,remaining?{GPZ:remaining}:{});
    if (remaining===2) { // close the live match, then restore the same rental, not a fresh one
      await page.reload();await page.locator('.tank-slot.selected').waitFor();
    } else if (remaining===1) {
      page.once('dialog',d=>d.accept());await page.evaluate(()=>leaveBattle());
    } else {
      await page.evaluate(win=>{endBattle(win);endBattle(win);},!!remaining);
      assert.match(await page.locator('#result-stats').innerText(),remaining?/Остаток аренды: 3 боя/:/Аренда G\.Pz\. Mk\. VI \(e\) завершена/);
      await click('В АНГАР');
    }
    if (remaining) {
      const tag='Аренда: '+remaining+(remaining===1?' бой':' боя');
      assert.equal(await page.locator('.tank-slot.selected .rental-tag').innerText(),tag);
      assert.ok((await page.locator('#dispatch-meta').innerText()).includes(tag));
    }
  }
  await page.reload();await page.locator('.tank-slot.selected').waitFor();
  const final=await saved();assert.deepEqual(final.owned,fleet.filter(id=>id!=='GPZ').concat('BT42'));
  assert.deepEqual([final.selected,final.pendingVehicles,final.garageSlots,final.usedPromos,final.rentalBattles],['MS1',['T62A'],10,['ARTA'],{}]);
  for(const k of ['modules','upgrades','upgradesBought'])assert.equal(final[k].GPZ,undefined);
  assert.deepEqual(final.modules.MS1,['optics']);assert.equal(final.totalBattles,3);assert.equal(final.GOLD,start.GOLD+70,'battle rewards only');
  assert.equal(await page.locator('.tank-slot[data-tank-id="GPZ"]').count(),0);assert.equal(await page.locator('#dispatch-name').innerText(),'МС-1');
  assert.equal(await page.evaluate(async()=>{const id=GameState.selected;try{GameState.selected='GPZ';return await startTraining();}finally{GameState.selected=id;}}),false);
  await click('Код');assert.match(await redeem(page),/Уже использован/);assert.deepEqual(await saved(),final);
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
  const {page,click} = await openGame(t,{webgl:true});
  await click('Код'); await redeem(page); await click('ЗАКРЫТЬ'); await click('Выбрать для боя: '+name);
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
