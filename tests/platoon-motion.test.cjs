const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=process.env.CITY_TANKS_INDEX ? path.dirname(process.env.CITY_TANKS_INDEX) : path.join(__dirname,'..');
const step=1000/60;

// Two independent clocks, tanks and game states; use the shipped packet encoder,
// decoder, drive physics and draw path. Only transport and the renderer are stubs.
function machine(seat) {
  const env={window:{addEventListener(){}},document:{hidden:false},console:{log(){}},ms:seat?4000:0,
    setInterval:()=>1,clearInterval(){},beginSortie(){},makeRosters:()=>[[],[]],boom(){},updateScoreboard(){},updateVisualEffects(){},
    BattleInput:{running:true,consumeLook(){}},BattleView:{stepPlayer(){},artillery:null},CombatMechanics:{smokeClouds:[],artilleryStrikes:[]},
    cmd:{forward:0,turn:0,brake:false},out:[]};
  env.performance={now:()=>env.ms}; env.driveIntent=()=>env.cmd;
  const ctx=vm.createContext(env);
  for (const f of ['models/catalog','js/tree-event','js/config','js/battle-space','js/armor-system','js/tank','js/terrain','js/track-contact','js/track-drive','js/platoon-motion','js/platoon-match'])
    vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),ctx,{filename:f});
  const {g,Tank,Match,Playback,bodyTick}=vm.runInContext('const TICK=1000/60; let ticks=0; ({g:GameState,Tank,Match:PlatoonMatch,Playback:PlatoonPlayback,bodyTick:()=>++ticks})',ctx);
  const members=[{seat:0,tank:'KV1'},{seat:1,tank:'T67'}];
  g.units=members.map(({seat,tank})=>Object.assign(new Tank(tank,0,0,'player'),{driverSeat:seat,fieldKit:{}}));
  g.player=g.units[seat];g.arena={bounds:{x:5000,y:5000},trees:[]};g.walls=[];
  g.navigation={recon:{teams:[{visited:[-1]}]}};g.gameActive=true;
  const n=new Match({id:'ca111cab',me:seat,members},{});
  n.send=(event,payload)=>{env.out.push(payload);return true;}; n.start();
  return {g,n,env,bodyTick,Playback};
}

test('wingman responds before a round trip; replay converges on the commander through jitter, loss, reordered packets and a stop',()=>{
  const h=machine(0),w=machine(1),remote=h.g.units[1],local=w.g.player,queue=[];
  let firstHost=0,firstLocal=0,oldWorld=-1,peakError=0,worldCount=0;
  for(let i=1;i<=400;i++) {
    // Clocks deliberately have different origins. Steps and command IDs, not times, are echoed.
    h.env.ms=i*step; w.env.ms=4000+i*step;
    w.env.cmd={forward:i<=145?1:0,turn:i>45&&i<=73?.6:0,brake:i>145};
    for(const e of queue.filter(v=>v.at===i)) {
      if(e.cmd)h.n.receiveInput(1,e.cmd);else w.n.receiveWorld(e.world);
    }
    h.bodyTick();h.n.stepDriver(remote);
    if(!firstHost && remote.x>.001)firstHost=i;
    if(i%6===0 && i%30!==0) {
      const world=h.n.snapshot(); worldCount++;
      // Some old packets arrive AFTER a newer one; never rewind HP/poses or acks.
      queue.push({at:i+[4,13,6,10][worldCount%4],world});
      if(i%24===0)queue.push({at:i+17,world});
    }
    w.n.stepView(step);
    for(const cmd of w.env.out.splice(0))queue.push({at:i+5+(cmd.n%3),cmd});
    if(!firstLocal && local.x>.001)firstLocal=i;
    assert.ok(w.n.lastWorld>=oldWorld);oldWorld=w.n.lastWorld;
    peakError=Math.max(peakError,Math.hypot(remote.x-local.x,remote.y-local.y));
  }
  assert.equal(firstLocal,1);assert.ok(firstHost>=6,firstHost);
  assert.ok(peakError<2*9,`peak simultaneous position error: ${peakError/9} m`);
  assert.ok(Math.hypot(remote.x-local.x,remote.y-local.y)<.06,'both come to rest at the host position');
  assert.ok(Math.abs(remote.angle-local.angle)<.001);assert.equal(local.shotsFired,0);
  assert.equal(w.g.bullets.length,0);assert.equal(local.hp,remote.maxHp);
  assert.ok(w.n.prediction.history.length<=90 && w.n.prediction.sent.size<=96);
  h.n.stop();w.n.stop();assert.equal(w.n.prediction,null);assert.equal(w.n.playback,null);
});

test('prediction cannot fell cover, fire, or award points; an outage bounds drift, authoritative death snaps and ends prediction',()=>{
  const w=machine(1),h=machine(0),p=w.g.player,t={x:23,y:0,r:1,fallen:false};
  w.g.arena.trees=[t];w.g.arena.treeRevision=0;w.env.cmd.forward=1;w.g.mobileFireActive=true;
  w.n.prediction.body.driveSpeed=9;
  for(let i=0;i<120;i++){w.env.ms+=step;w.n.stepView(step);}
  assert.equal(w.g.arena.treeRevision,0);assert.equal(t.fallen,false);assert.equal(w.g.bullets.length,0);assert.equal(p.hp,p.maxHp);
  const stopped=p.x; w.n.stepView(step);assert.equal(p.x,stopped);
  const host=h.g.units[1];host.dead=true;host.hp=0;host.x=1000;host.y=-200;
  h.bodyTick();w.n.receiveWorld(h.n.snapshot());
  for(let i=0;i<15;i++){w.env.ms+=step;w.n.stepView(step);}
  assert.deepEqual([p.dead,p.hp,p.x,p.y],[true,0,1000,-200]);assert.equal(w.g.battleKills,0);
});

test('remote movement uses host ticks across the angle seam; late packets cannot extrapolate forever or rewind the buffer',()=>{
  const {Playback}=machine(1),v=new Playback(),u={};
  const frame=(tick,x,yaw)=>({tick,units:[[x,0,0,yaw,yaw,0,0,0,0,0,100,32,12,'normal',0,.6,0]]});
  const a=frame(10,0,3.11),b=frame(16,3.6,-3.11);v.push(a,0,false);v.push(b,100,false);
  assert.equal(v.push(a,110,false),false);v.cursor=13;v.draw([u],null,150,0,false);
  assert.ok(Math.abs(u.x-1.8)<.0001);assert.ok(Math.abs(Math.abs(u.angle)-Math.PI)<.0001);
  v.draw([u],null,1000,100,false);const x=u.x;
  v.draw([u],null,3000,100,false);assert.equal(u.x,x);assert.ok(x<=3.6+5*.6+.001);
  v.push(frame(280,50,0),5000,false);v.draw([u],null,5000,step,false);assert.equal(u.x,50);
});

for (const http of [false,true]) for (const hz of [60,120])
  test(`sustained throttle + steering at ${hz} Hz (${http?'HTTP':'Broadcast'} jitter) never freezes the wingman's heading or reverses forward travel`,()=>{
    const h=machine(0),w=machine(1),queue=[],p=w.g.player;
    h.n.http=w.n.http=http;
    let seed=7,nextHttp=0,lastTick=0,checked=0;
    const random=()=>((seed=Math.imul(48271,seed)>>>0)%1000)/1000;
    for (let frame=1;frame<=hz*20;frame++) {
      const t=frame/hz,tick=Math.floor(t*60+1e-6),old={x:p.x,y:p.y,a:p.angle};
      h.env.ms=t*1000;w.env.ms=4000+t*1000;
      for (let i=0;i<queue.length;) {
        const item=queue[i]; if (item.at>t) {i++;continue;}
        queue.splice(i,1);if(item.world)w.n.receiveWorld(item.world);else h.n.receiveInput(1,item.cmd);
      }
      if(tick>lastTick) {
        lastTick=tick;h.bodyTick();h.n.stepDriver(h.g.units[1]);
        if(tick%(http?18:6)===0)queue.push({at:t+.04+random()*(http?.28:.16),world:h.n.snapshot()});
      }
      w.env.cmd={forward:t<17?1:0,turn:t>1 && t<17?.9:0,brake:t>=17};
      if(http && t>=nextHttp){nextHttp=t+.30;w.n.sendInput();}
      w.n.stepView(1000/hz);
      for (const cmd of w.env.out.splice(0))queue.push({at:t+.05+random()*(http?.28:.16),cmd});
      if(t>5 && t<16) {
        const yaw=Math.atan2(Math.sin(p.angle-old.a),Math.cos(p.angle-old.a))*hz;
        const forward=((p.x-old.x)*Math.cos(p.angle)+(p.y-old.y)*Math.sin(p.angle))*hz/9;
        assert.ok(yaw>.12 && yaw<.9 && forward>2 && forward<12,`frame ${frame}: ${yaw} rad/s, ${forward} m/s`);checked++;
      }
    }
    assert.equal(checked,hz*11-1);assert.ok(Math.hypot(p.x-h.g.units[1].x,p.y-h.g.units[1].y)<.1);
    h.n.stop();w.n.stop();
  });

test('peers reject mismatched terrain revisions before consuming poses or applying an input',()=>{
  const h=machine(0),w=machine(1);h.g.arena.spec={seed:100};w.g.arena.spec={seed:101};
  let rejected=0;h.n.service.wrongAtlas=w.n.service.wrongAtlas=()=>rejected++;
  const world=h.n.snapshot();w.n.receiveWorld(world);assert.equal(w.n.lastWorld,-1);assert.equal(rejected,1);
  w.n.lastSent=null;w.n.sendInput();h.n.receiveInput(1,w.env.out.at(-1));assert.equal(h.n.inputs.size,0);assert.equal(rejected,2);
  delete world.atlas;w.n.receiveWorld(world);assert.equal(rejected,3);h.n.stop();w.n.stop();
});

test('a wingman hears current visible reports, fallen timber and demolished cover once, not a replay or a hidden enemy',()=>{
  const h=machine(0),w=machine(1),notes=[];
  for(const m of [h,w]){
    const u=m.g.units[0];u.team='enemy';u.visible=true;u.muzzle=()=>({x:0,y:0,h:0});
    m.g.arena.trees=[{x:25,y:8}];m.g.arena.treeRevision=0;m.g.arena.revision=0;
    const wall={x:50,y:20,w:20,h:20};m.g.walls.push(wall);m.n.walls=[wall];
  }
  Object.assign(w.env,{snd:(key,gain,source)=>notes.push([key,source]),spawnParticles(){}});
  const u=h.g.units[0],send=()=>{h.bodyTick();w.n.receiveWorld(h.n.snapshot());};
  u.shotsFired=1;send();assert.equal(notes.length,0); // no history on connection
  u.shotsFired++;u.visible=false;send();assert.equal(notes.length,0);
  u.shotsFired++;u.visible=true;h.g.arena.trees[0].fallen=true;h.g.arena.trees[0].angle=.5;h.n.walls[0].destroyed=true;
  send();assert.deepEqual(notes.map(n=>n[0]),[u.reportSound,'collapse','timber']);assert.equal(notes[0][1],w.g.units[0]);
  send();assert.equal(notes.length,3);h.n.stop();w.n.stop();
});
