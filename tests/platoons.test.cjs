const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {database,bridge}=require('./fixtures/referral-db.cjs'),{openGame}=require('./winter-harness.cjs');
const lobby='city_tanks_platoon_v1',channel='city_tanks_platoon_channel_v1';

test('registered seats only: private membership, leases, readiness barrier, sender-isolated streams, shared result and expiry',async t=>{
  const {rpc,identity,rows,as}=await database(t,{platoons:true});
  const [a,b,c,d,anon]=await Promise.all(['lead','wing','legacy@example.org','outside','anonymous'].map(name=>identity(name.includes('@')?name:name+'@players.citytanks.invalid')));
  await rows('update auth.users set is_anonymous=true where id=$1',[anon]);
  const leases=new Map([a,b,c,d,anon].map(id=>[id,randomUUID()])), call=(uid,op,args={})=>rpc(uid,lobby,[op,leases.get(uid),args]);
  await assert.rejects(rpc(null,lobby,['create',randomUUID(),{tank:'MS1',map:'field'}]));
  await assert.rejects(call(anon,'create',{tank:'MS1',map:'field'}));
  assert.equal((await call(a,'create',{tank:'MS1',map:'not-a-sector'})).error,'invalid');
  for (const map of ['burgstadt','cape','sawmill','airfield']) {
    assert.equal((await call(a,'create',{tank:'MS1',map})).map,map);
    assert.deepEqual(await call(a,'leave'),{left:true});
  }
  const r=await call(a,'create',{tank:'MS1',map:'field',nick:'not trusted'}); assert.equal(r.me,0);assert.match(r.code,/^[0-9A-F]{8}$/);assert.equal(r.members[0].nick,'lead');
  const join={code:r.code,tank:'MS1'}, topic=i=>`ct-platoon-v1:${r.id}:${i}`;
  await assert.rejects(call(anon,'join',join));await assert.rejects(rpc(null,lobby,['join',randomUUID(),join]));
  await assert.rejects(as(b,'select * from city_tanks_private.platoons'));await assert.rejects(rpc(null,channel,[topic(0),false]));
  assert.equal((await call(d,'join',{...join,tank:'IS7'})).error,'tank');assert.equal((await call(d,'poll')).error,'missing');
  assert.equal((await rpc(a,lobby,['poll',randomUUID(),{}])).error,'occupied'); assert.equal((await call(a,'start')).error,'not_ready');
  assert.equal((await call(b,'join',join)).me,1);assert.equal((await call(c,'join',join)).me,2);assert.equal((await call(d,'join',join)).error,'full');
  assert.match((await call(a,'poll')).members[2].nick,/^Танкист-[a-f0-9]{6}$/);
  assert.deepEqual(await call(b,'leave'),{left:true}); assert.equal((await call(a,'poll')).members.length,2);
  await assert.rejects(rpc(null,'city_tanks_platoon_frame_v1',[leases.get(c),{n:1}]));
  assert.equal((await call(c,'start')).error,'state');await call(c,'ready',{ready:true});assert.equal((await call(a,'start')).phase,'loading');
  assert.equal((await call(d,'join',join)).error,'missing');assert.equal(await rpc(d,channel,[topic(0),false]),false);
  assert.equal(await rpc(c,channel,[topic(0),true]),false);assert.equal(await rpc(c,channel,[topic(0),false]),true);assert.equal(await rpc(c,channel,[topic(2),true]),true);
  assert.equal(await rpc(a,channel,[topic(0),true]),true);assert.equal(await rpc(a,channel,[topic(2),false]),true);assert.equal(await rpc(a,channel,[topic(1),false]),false);
  assert.equal((await call(a,'loaded')).phase,'loading');assert.equal((await call(c,'loaded')).phase,'live');
  const frame=(who,packet,lease=leases.get(who))=>rpc(who,'city_tanks_platoon_frame_v1',[lease,packet]);
  assert.deepEqual(await frame(a,{n:1}),{closed:true},'mailbox is off by default');await call(c,'relay');
  assert.deepEqual(await frame(d,{n:1},leases.get(c)),{closed:true});assert.deepEqual(await frame(anon,{n:1},leases.get(c)),{closed:true});
  assert.deepEqual(await frame(c,{n:1,cmd:'legitimate'}),{frames:[]});assert.deepEqual(await frame(a,{n:1,world:'state'}),{frames:[[2,{n:1,cmd:'legitimate'}]]});
  assert.deepEqual(await frame(c,{n:2}),{frames:[[0,{n:1,world:'state'}]]});assert.deepEqual(await frame(c,{n:2,cmd:'x'.repeat(7000)}),{error:'invalid'});
  await assert.rejects(as(c,'select * from city_tanks_private.platoon_frames'));assert.deepEqual(await frame(c,{n:2},randomUUID()),{closed:true});
  const result={won:true,scores:[[31,1,500],[0,0,0],[10,0,0]]}; assert.equal((await call(c,'finish',{result})).error,'state');
  assert.equal((await call(a,'finish',{result:{...result,scores:[[0,-1,0]]}})).error,'invalid');assert.deepEqual((await call(a,'finish',{result})).result,result);
  await call(a,'leave');assert.deepEqual((await call(c,'poll')).result,result);assert.equal(await rpc(c,channel,[topic(2),true]),false);await call(c,'leave');
  const late=await call(a,'create',{tank:'MS1',map:'city'});await call(b,'join',{...join,code:late.code});await rows("update city_tanks_private.platoon_seats set seen=now()-interval '3 min' where uid=$1",[a]);
  assert.equal((await call(b,'poll')).error,'missing');assert.equal((await call(b,'create',{tank:'MS1',map:'port'})).me,0);
});

test('offline guest sees sign-in, cannot create/join or open a socket, and still launches solo training',async t=>{
  let sockets=0;const {page,click}=await openGame(t,{webgl:true,socketSetup:p=>p.routeWebSocket('**/*',s=>{sockets++;s.close();})});
  await click('Взводы');assert.match(await page.locator('#platoon-guest').innerText(),/только зарегистрированным/);
  assert.ok(await page.locator('#platoon-setup').isHidden());assert.ok(await page.locator('#platoon-join').isHidden());assert.equal(await page.evaluate(()=>Accounts.platoonConnection()),null);
  await click('Войти в аккаунт');assert.ok(await page.locator('#account-modal').isVisible());await page.locator('#account-back').click();
  assert.equal(await page.evaluate(async()=>{if(!await launchBattle(1))return false;stopBattleLoop();const ok=GameState.training&&!GameState.platoon&&document.querySelector('#combat-callsign').hidden;backToGarage();return ok;}),true); assert.equal(sockets,0);
});

for (const fallback of [false,true]) test('two registered browsers share a sortie via '+(fallback?'authenticated HTTP fallback':'private Broadcast')+': drive, fire, human plates, hits, surviving wingman, shared result',async t=>{
  const {route,pg,identityFor}=await bridge(t,{platoons:true}),relay=require('./fixtures/platoon-relay.cjs')(pg,identityFor);
  const opts={route,enterGuest:false,webgl:true,socketSetup:relay.attach}; const [{page:a},{page:b}]=await Promise.all([openGame(t,opts),openGame(t,fallback?{...opts,socketSetup:p=>p.routeWebSocket('**/*',ws=>ws.close({code:4001,reason:'fixture relay offline'}))}:opts)]);
  await Promise.all([a,b].map(p=>p.setViewportSize({width:680,height:464})));
  const register=async(p,name)=>{ await p.locator('#entry-register').click(); await p.locator('#profile-handle').fill(name);
    await p.locator('#profile-pass').fill('local fixture password');await p.locator('#account-submit').click();await p.waitForFunction(()=>Accounts.active && !Accounts.switching);};
  await Promise.all([register(a,'commander'),register(b,'friend_2')]);
  // Compatible IV/V or V/V human seats. T67 is still the invited player's rental.
  const commandTank=fallback?'KV1':'NAT100';
  await a.evaluate(id=>{GameState.owned.push(id);GameState.selected=id;renderCarousel();saveProgress();},commandTank);
  const sector=fallback?'field':'burgstadt';
  await a.locator('#map-select').selectOption(sector);
  // Preexisting garage with a fitted rental; check that only a real launch uses it.
  await b.evaluate(()=>{GameState.owned.push('T67');GameState.selected='T67';GameState.rentalBattles.T67=2; GameState.modules.T67=['spall'];saveProgress();renderCarousel();});
  // Both receive the same server result, but their trees and local crate rolls are independent.
  const balances=await Promise.all([a,b].map((p,i)=>p.evaluate(i=>{
    GameState.tree2026.bauble=1; // Both own a ball, only the wingman hangs his.
    if(i) TreeEvent.setSlot(GameState,3,'bauble');
    const drop=nationalVictoryBox;nationalVictoryBox=(g,won)=>drop(g,won,()=>.19999);
    const settle=TreeEvent.settle;TreeEvent.settle=(g,base)=>settle(g,base,()=>.25);saveProgress();
    return [GameState.XP,GameState.GOLD];
  },i)));
  await a.locator('#platoon-open').click();await a.locator('#platoon-create').click(); await a.locator('#platoon-code').waitFor();
  assert.ok(await a.locator('#platoon-deploy').isDisabled());
  if (!fallback) {
    await b.getByRole('button',{name:'Выбрать для боя: МС-1',exact:true}).click();
    await b.locator('#platoon-open').click();await b.locator('#platoon-key').fill(await a.locator('#platoon-code').inputValue());await b.locator('#platoon-join button').click();
    await b.waitForFunction(()=>document.querySelector('#platoon-status').textContent.includes('Разница больше одного уровня'));
    assert.ok(await b.locator('#platoon-deploy').isDisabled());await b.locator('#platoon-back').click();
    await a.waitForFunction(()=>document.querySelectorAll('#platoon-members li').length===1);
    await b.getByRole('button',{name:'Выбрать для боя: T67',exact:true}).click();
  }
  await b.locator('#platoon-open').click();await b.locator('#platoon-key').fill(await a.locator('#platoon-code').inputValue());await b.locator('#platoon-join button').click();await b.locator('#platoon-deploy').waitFor();
  assert.equal(await b.evaluate(()=>GameState.rentalBattles.T67),2);await a.locator('#platoon-device').selectOption('mobile');await b.locator('#platoon-device').selectOption('mobile');
  await b.locator('#platoon-deploy').click();await a.waitForFunction(()=>!document.querySelector('#platoon-deploy').disabled);assert.match(await a.locator('#platoon-members').innerText(),/friend_2/);
  // build() still draws the real WebGL world on both devices. Avoid saturating a
  // shared software GPU with two renderers while measuring input/network behaviour.
  await Promise.all([a,b].map(p=>p.evaluate(()=>{const draw=BattleView.draw;let last=0;BattleView.draw=()=>{const now=performance.now();if(now-last>2000){last=now;draw();}};})));
  await a.locator('#platoon-deploy').click();
  const active=p=>p.waitForFunction(()=>GameState.gameActive && GameState.platoon?.live);
  try {await Promise.all([active(a),active(b)]);}catch(e){throw Error(e.message+' '+JSON.stringify(await Promise.all([a,b].map(p=>p.locator('#battle-notice-text,#platoon-status').allTextContents()))));}
  await b.waitForFunction(()=>GameState.platoon.lastWorld>=0);
  assert.equal(await b.evaluate(()=>!!GameState.platoon.http),fallback);
  const manifest=p=>p.evaluate(()=>({ids:GameState.units.map(u=>u.id),drivers:GameState.units.filter(u=>u.callsign).map(u=>[u.driverSeat,u.callsign,!!u.bot]),
    weather:WeatherEngine.currentWeather,sector:GameState.arena.id,bots:GameState.units.filter(u=>u.bot).length}));
  const m=await manifest(a);assert.ok(await b.evaluate(()=>GameState.units.every(u=>GameState.units.filter(h=>h.callsign).every(h=>Math.abs(DB[u.id].tier-DB[h.id].tier)<=1))));assert.deepEqual(await manifest(b),m);assert.equal(m.ids.length,14);assert.equal(m.sector,sector);assert.equal(m.bots,12);assert.deepEqual(m.drivers,[[0,'commander',false],[1,'friend_2',false]]);
  assert.deepEqual(await a.evaluate(()=>[GameState.player.id,BattleView.stats().nameplates,document.querySelector('#combat-callsign').textContent]),[commandTank,['friend_2'],'commander']);
  assert.deepEqual(await b.evaluate(()=>[GameState.player.id,GameState.player.maxHp,GameState.rentalBattles.T67,BattleView.stats().nameplates,document.querySelector('#combat-callsign').textContent]),['T67',475,1,['commander'],'friend_2']);
  // Hide the host's local input menu over the running world; the ally still drives.
  await a.evaluate(()=>BattleInput.pause());assert.match(await a.locator('#input-title').innerText(),/бой взвода продолжается/);
  const pos=await a.evaluate(()=>GameState.units.map(u=>[u.x,u.y]));
  // Withhold the authoritative reply after a fresh sample. The actual vehicle
  // used by the wingman's renderer must start moving without another host frame.
  await b.evaluate(()=>new Promise(resolve=>{
    const net=GameState.platoon,receive=net.receiveWorld.bind(net); let armed=false,hold=true,queued;
    net.receiveWorld=w=>{
      if (!armed) {
        const old=net.lastWorld; receive(w); if (net.lastWorld===old) return;
        armed=true; const p=GameState.player; window.driveProbe={world:net.lastWorld,x:p.x,y:p.y,hp:p.hp}; resolve();
      } else if (hold) queued=w;
      else setTimeout(()=>{ if (!net.closed) receive(w); },[45,185,65,115][w.n%4]);
    };
    window.releaseWorld=()=>{ hold=false; if (queued) receive(queued); };
  }));
  await b.keyboard.down('KeyW');await b.keyboard.down('KeyD');
  await b.waitForFunction(()=>{
    const p=GameState.player,q=window.driveProbe;
    return GameState.platoon.lastWorld===q.world && Math.hypot(p.x-q.x,p.y-q.y)>.03 && p.hp===q.hp;
  },null,{timeout:3000});
  await b.evaluate(()=>window.releaseWorld());
  const moved=points=>Math.hypot(GameState.units[1].x-points[1][0],GameState.units[1].y-points[1][1])>3;
  try { await a.waitForFunction(moved,pos,{timeout:12000});await b.waitForFunction(moved,pos,{timeout:12000}); }
  catch(e) {
    const state=await Promise.all([a,b].map(p=>p.evaluate(()=>({active:GameState.gameActive, input:BattleInput.state,
      cmd:GameState.platoon?.inputs.get(1), world:GameState.platoon?.lastWorld, position:GameState.units[1] && [GameState.units[1].x,GameState.units[1].y]}))));
    throw Error('Drive intent did not move both views: '+JSON.stringify({state,from:pos[1],counts:[...relay.counts],errors:relay.errors}));
  }
  const turned=before=>Math.abs(wrapAngle(GameState.units[1].angle-before))>.12;
  const before=await b.evaluate(()=>GameState.player.angle);
  await Promise.all([a.waitForFunction(turned,before),b.waitForFunction(turned,before)]);
  await b.keyboard.up('KeyW');await b.keyboard.up('KeyD');
  assert.ok(await a.evaluate(p=>GameState.units.some((u,i)=>u.bot && Math.hypot(u.x-p[i][0],u.y-p[i][1])>1),pos));
  // Real fire edge from the remote player's touch button goes through host Tank.fire().
  await b.locator('#fire-btn').click();
  await a.waitForFunction(()=>GameState.units[1].shotsFired>=1);await b.waitForFunction(()=>GameState.player.shotsFired>=1);
  // Only the surviving wingman can finish. Set up a stationary last target in the
  // practice lane, then use a real remote trigger and host-side shell hit, not a strike.
  await a.evaluate(()=>{
    BotAI.step=()=>{};const g=GameState,p=g.units[1],enemy=g.units.at(-1);
    for(const u of g.units.filter(u=>u.team==='enemy' && u!==enemy)) {u.dead=true;u.hp=0;} enemy.dead=false;enemy.hp=90;
    g.player.hp=0;finishUnit(g.player,null);p.hp=p.maxHp-100;g.bullets.length=0;
  });
  await b.waitForFunction(()=>GameState.units[0].dead && GameState.player.hp===GameState.player.maxHp-100);
  await b.evaluate(()=>useCons(1));await a.waitForFunction(()=>GameState.units[1].hp>GameState.units[1].maxHp-100);await b.waitForFunction(()=>GameState.consumables[1]);
  assert.ok(await a.evaluate(()=>GameState.gameActive&&!GameState.consumables[1] && GameState.player.dead));
  const legacyEdge=await b.evaluate(()=>{
    GameState.holdTurret=true;const net=GameState.platoon;
    if(net.action('strike',[0,0])!==false)throw Error('Auxiliary strike enabled on peer');
    // Send one old-version input through the real sequencer; do not invent an ack on the host.
    if(!net.sendInput('strike',[0,0]))throw Error('Missing peer input');return net.sequence;
  });
  await a.waitForFunction(n=>{const c=GameState.platoon.inputs.get(1);return c?.n>=n && c.hold && !GameState.units[1].isReloading;},legacyEdge);
  const targetTier=await a.evaluate(()=>{
    const g=GameState,p=g.units[1],enemy=g.units.at(-1),net=g.platoon;
    if(p.nextStrike || net.snapshot().strikes.length)throw Error('Disabled auxiliary strike accepted');
    for(const [u,x] of [[p,-120],[enemy,120]]) {
      Object.assign(u,{x,y:0,angle:0,tAngle:0,lookYaw:0,driveSpeed:0,yawRate:0,vx:0,vy:0,swayPitch:0,swayRoll:0,pitchVel:0,rollVel:0});TrackDrive.place(u);
    }
    enemy.spotted=enemy.visible=true;p.lookAtPoint(enemy.x,enemy.y,enemy.aimHeight);p.slewSight(Math.PI,Math.PI);
    if(p.sightHit().hit!==enemy)throw Error('Objective outside the firing lane');
    return enemy.tier;
  });
  await b.locator('#fire-btn').click();
  const finished=p=>p.waitForFunction(()=>!GameState.gameActive && document.querySelector('#result-screen').classList.contains('show'));
  try { await Promise.all([finished(a),finished(b)]); }
  catch(e) {
    const state=await Promise.all([a,b].map(page=>page.evaluate(()=>{
      const g=GameState,p=g.units[1],enemy=g.units.at(-1),cmd=g.platoon?.inputs.get(1);
      return {shots:p?.shotsFired,hp:enemy?.hp,scores:g.platoon?.scores,active:g.gameActive,hold:g.holdTurret,
        source:p && [p.x,p.y,p.tAngle,p.aimPitch],target:enemy && [enemy.id,enemy.x,enemy.y],cmd};
    })));throw Error('Final remote shot did not settle: '+JSON.stringify(state),{cause:e});
  }
  for(const p of [a,b])assert.equal(await p.locator('#result-title').innerText(),'ПОБЕДА!');
  assert.equal(await a.evaluate(()=>GameState.battleKills),0);assert.equal(await b.evaluate(()=>GameState.battleKills),1);assert.ok(await b.evaluate(()=>GameState.battleDmg>=90));
  assert.equal(await b.evaluate(()=>GameState.totalBattles),1);assert.equal(await a.evaluate(()=>GameState.totalBattles),1);
  const income=await Promise.all([a,b].map((p,i)=>p.evaluate(([xp,gold])=>[GameState.XP-xp, GameState.GOLD-gold, GameState.inventory.ornament||0],balances[i])));
  assert.deepEqual(await Promise.all([a,b].map(p=>p.evaluate(()=>Object.entries(GameState.inventory).filter(([id])=>id.startsWith('national-'))))),[[[fallback?'national-ussr':'national-france',1]],[['national-usa',1]]]);
  assert.deepEqual(income,[[300,50,0],[880+550*targetTier,55,1]]);
  if (!fallback) assert.ok(relay.counts.get('drive')>2 && relay.counts.get('world')>2);
  assert.deepEqual(relay.errors,[]);
  await Promise.all([a,b].map(p=>p.locator('#result-screen button').click()));
  assert.deepEqual(await b.evaluate(()=>[GameState.platoon,GameState.player,GameState.rentalBattles.T67]),[null,null,1]);
  if (fallback) {
    // Another sortie, then a device vanishes WITHOUT delivering leave. Test the
    // heartbeat deadline, not merely the return button. No duplicate rewards or bots taking its name.
    await a.locator('#platoon-open').click();await a.locator('#platoon-create').click();await a.locator('#platoon-code').waitFor();
    await b.locator('#platoon-open').click();await b.locator('#platoon-key').fill(await a.locator('#platoon-code').inputValue());await b.locator('#platoon-join button').click();
    await b.locator('#platoon-deploy').click();await a.waitForFunction(()=>!document.querySelector('#platoon-deploy').disabled);await a.locator('#platoon-deploy').click();
    await Promise.all([active(a),active(b)]);await a.waitForFunction(()=>GameState.platoon.inputs.has(1));
    await b.route('**/rest/v1/rpc/city_tanks_platoon*',r=>r.abort());await b.close();
    // Fast-forward only the last-received timestamp, not the fixed-step game or SQL clock.
    await a.evaluate(()=>GameState.platoon.seen.set(1,performance.now()-25000));
    await a.waitForFunction(()=>!GameState.gameActive && !document.querySelector('#battle-notice').hidden);
    assert.match(await a.locator('#battle-notice-text').innerText(),/связь|покинул/);assert.equal(await a.evaluate(()=>GameState.totalBattles),1);
    assert.ok(await a.locator('#result-screen').isHidden());await a.locator('#battle-notice button').click();
    await a.locator('#platoon-open').click();await a.locator('#platoon-create').click();await a.locator('#platoon-code').waitFor();await a.locator('#platoon-back').click();
  }
});
