// One authoritative browser (the commander), one private, write-isolated topic per seat.
// Peers send driving/aim intent only. No peer simulates bots, reports hits or sets HP.
class PlatoonMatch {
  static interval = 120;
  static pose = ['x','y','rideHeight','angle','tAngle','aimPitch','groundPitch','groundRoll','swayPitch','swayRoll'];
  static signals = {KeyZ:'Атакую!', KeyX:'Нужна помощь!', KeyC:'Защищаем базу!', KeyV:'Так точно', KeyB:'Никак нет'};
  constructor(room, service) {
    this.room = room; this.me = room.me; this.host = room.me === 0;
    this.drivers = new Map(room.members.map(m => [m.seat,m]));
    // The immutable room ID picks ONE deal and weather, independent of page RNG.
    let seed = parseInt(room.id.slice(0,8),16);
    this.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
    const top = room.members.reduce((a,b) => DB[a.tank].tier >= DB[b.tank].tier ? a : b);
    this.teams = makeRosters(top.tank,7,this.random);
    for (const m of room.members) this.teams[0][m.seat] = m.tank;
    this.channels = new Map(); this.inputs = new Map(); this.seen = new Map(); this.sequence = 0; this.lastWorld = -1;
    this.scores = Array.from({length:3},()=>[0,0,0]); this.service = service; this.edges=[]; this.pendingKits=new Set(); this.radioLog=[]; this.lastRadio=0;
  }
  async connect(conn) {
    const socket = await conn.socket();
    if (this.closed || this.http) { socket.disconnect(); throw Error('closed'); }
    this.socket = socket;
    await Promise.all([...this.drivers.keys()].filter(i=>this.host || i===0 || i===this.me).map(i=>new Promise((resolve,reject)=>{
      const ch = socket.channel(`ct-platoon-v1:${this.room.id}:${i}`, {config:{private:true,broadcast:{self:false,ack:false}}});
      this.channels.set(i,ch);
      ch.on('broadcast',{event:'drive'},({payload})=>{ if (this.host && i!==0) this.receiveInput(i,payload); });
      ch.on('broadcast',{event:'world'},({payload})=>{ if (!this.host && i===0) this.receiveWorld(payload); });
      ch.on('broadcast',{event:'radio'},({payload})=>{ if (!this.host && i===0 && this.live) this.radio(payload); });
      ch.subscribe(status=>{ if (status==='SUBSCRIBED') resolve(); else reject(Error('channel')); },6000);
    })));
  }
  send(event,payload) {
    if (this.http && !this.closed) {
      if (event==='drive') {
        const {action,value,...cmd}=payload; this.pending=cmd;
        // Retain edges across coalesced/lost HTTP replies. Monotonic input sequence
        // makes each tap/kit/radio execute at most once on the authority.
        if (action) { this.edges.push({n:cmd.n,action,value}); this.edges=this.edges.slice(-12); }
      } else if (event==='radio') { this.radioLog.push({...payload,id:++this.lastRadio}); this.radioLog=this.radioLog.slice(-4); }
      return true;
    }
    const ch = this.channels.get(this.me);
    if (!this.closed && this.socket?.isConnected() && ch?.state==='joined') {
      ch.send({type:'broadcast',event,payload}).catch(()=>{}); return true;
    }
    return false; // do not fall back to a stream of REST requests on a broken socket
  }
  start() {
    if (this.closed || this.live) return;
    this.live = true; const now = performance.now();
    for (const i of this.drivers.keys()) if (i!==this.me) this.seen.set(i,now);
    this.walls = [...GameState.walls]; this.lastStep = now; this.carry = 0;
    beginSortie();
    if (this.host) this.clock = setInterval(()=>{
      const n = performance.now(); this.carry += Math.min(150,n-this.lastStep); this.lastStep = n;
      while (this.carry >= TICK && this.live && !this.result) { this.carry -= TICK; update(); }
    },1000/30);
    this.pulse = setInterval(()=>{
      const n = performance.now();
      const gap = Math.max(0,...[...this.seen].filter(([i])=>this.host || i===0).map(([,t])=>n-t));
      if (gap>20000) { this.service.lost(); return; }
      if (this.http) { if (!this.exchanging && n>=(this.nextExchange||0)) this.exchange(); }
      else {
        if (gap>4500 && n>(this.retryRelay||0)) { this.retryRelay=n+10000; this.service.fallback(); }
        if (this.host) this.send('world',this.snapshot()); else this.sendInput();
      }
    },PlatoonMatch.interval);
    if (!this.host) this.sendInput();
  }
  useHttp() {
    if (this.http || this.closed) return;
    this.http=true; this.closeSocket();
    for (const i of this.seen.keys()) this.seen.set(i,performance.now());
  }
  closeSocket() {
    const socket=this.socket; this.socket=null; this.channels.clear();
    socket?.removeAllChannels().catch(()=>socket.disconnect());
  }
  async exchange() {
    // At most one in-flight exchange and four small writes/s per driver, only if
    // Broadcast failed. Never queue frames; the next packet is a full current state.
    this.exchanging=true; this.nextExchange=performance.now()+250;
    try {
      if (!this.host) this.sendInput();
      const world=this.host && this.snapshot();
      const packet=this.host ? {n:world.n,world,radio:this.radioLog} : {n:this.pending.n,cmd:this.pending,edges:this.edges};
      const r=await this.service.frame(packet);
      if (!this.live || this.closed || !Array.isArray(r.frames)) return;
      for (const [seat,p] of r.frames) {
        if (this.host && seat!==0 && this.drivers.has(seat) && p?.cmd) {
          const last=this.inputs.get(seat)?.n ?? -1;
          if (p.n<=last) continue;
          for (const e of (Array.isArray(p.edges)?p.edges:[]).slice(-12)) if (e && e.n>last && e.n<=p.n)
            this.receiveInput(seat,{...p.cmd,n:e.n,action:e.action,value:e.value});
          this.receiveInput(seat,{...p.cmd,n:p.n});
        } else if (!this.host && seat===0 && p?.world) {
          this.receiveWorld(p.world);
          for (const msg of p.radio || []) if (msg.id>this.lastRadio) { this.lastRadio=msg.id; this.radio(msg); }
        }
      }
    } catch { /* retry only the latest packet; the regular heartbeat bounds outages */ }
    finally { this.exchanging=false; }
  }
  stop() {
    this.closed = true; this.live = false; clearInterval(this.clock); clearInterval(this.pulse);
    this.closeSocket();
  }
  sendInput(action, value) {
    const g = GameState, p = g.player;
    if (!this.live || !p || this.host) return false;
    const on = BattleInput.running && !p.dead && !document.hidden;
    const {forward,turn,brake} = on ? driveIntent() : {forward:0,turn:0,brake:true};
    const board = on && BattleView.artillery;
    return this.send('drive',{n:++this.sequence,forward,turn,brake,hold:!on||g.holdTurret, yaw:p.lookYaw,pitch:p.lookPitch,
      shell:g.curShell,trigger:on && (g.mouseDown || g.mobileFireActive), board:board ? [board.x,board.y] : null,
      ...(action && on && {action,value})});
  }
  action(type,value) {
    return this.sendInput(type,value);
  }
  receiveInput(seat,cmd) {
    if (!this.live || this.result || !cmd || !Number.isSafeInteger(cmd.n) ||
        ![cmd.forward,cmd.turn,cmd.yaw,cmd.pitch].every(Number.isFinite)) return;
    const p = GameState.units[seat], prev = this.inputs.get(seat);
    if (!p || p.driverSeat!==seat || cmd.n <= (prev?.n ?? -1)) return;
    const now = performance.now(); this.seen.set(seat,now);
    const point = pair => Array.isArray(pair) && pair.length===2 && pair.every(Number.isFinite)
      ? [bounded(pair[0],-GameState.arena.bounds.x,GameState.arena.bounds.x),bounded(pair[1],-GameState.arena.bounds.y,GameState.arena.bounds.y)] : null;
    const c = {n:cmd.n,at:now,forward:bounded(cmd.forward,-1,1),turn:bounded(cmd.turn,-1,1),brake:cmd.brake===true,
      hold:cmd.hold===true, yaw:bounded(cmd.yaw,-Math.PI,Math.PI),pitch:bounded(cmd.pitch,-1,1),
      shell:[0,1,2].includes(cmd.shell)?cmd.shell:0, trigger:cmd.trigger===true,tap:prev?.tap || cmd.action==='fire'};
    const bp = p.isSPG && point(cmd.board);
    if (bp) { c.board = prev?.board || new ArtillerySight(GameState.arena.bounds,{x:bp[0],y:bp[1]}); c.board.moveTo(...bp); }
    this.inputs.set(seat,c);
    if (p.dead) return;
    if (cmd.action==='kit') this.applyKit(p,cmd.value);
    if (cmd.action==='calibrate') p.toggleCalibration();
    if (cmd.action==='smoke' && (p.nextSmoke ?? 0)<=now) { p.nextSmoke = now+500; CombatMechanics.deploySmokeScreen(p); }
    if (cmd.action==='strike' && (p.nextStrike ?? 0)<=now) { const q = point(cmd.value); if (q) { p.nextStrike=now+500; CombatMechanics.callArtilleryStrike(...q,p); } }
    if (cmd.action==='signal' && (p.nextRadio ?? 0)<=now) { p.nextRadio=now+1800; this.relay(seat,cmd.value); }
  }
  stepDriver(p) {
    const c = this.inputs.get(p.driverSeat);
    if (!c || performance.now()-c.at>(this.http?1250:600)) { TrackDrive.step(p,0,0,true); if (c) c.tap=false; return; }
    const rel = wrapAngle(p.tAngle - p.angle);
    const assist = c.board && !c.hold && !c.forward && !c.turn && !p.isMoving ? c.board.steer(p) : 0;
    TrackDrive.step(p,c.forward,c.turn || assist,c.brake);
    p.tAngle=wrapAngle(p.angle+rel); p.constrainTraverse();
    if (c.board) c.board.step(p,1/60,c.hold);
    else if (!c.hold) { p.setLook(c.yaw,c.pitch); p.slewDriver(1/60); }
    if ((c.tap || c.trigger) && !(c.board && c.hold)) p.fire(c.shell,c.board);
    c.tap=false;
  }
  kit(i) {
    if (!this.live || this.result) return;
    if (this.host) { this.applyKit(GameState.player,i); return; }
    let reserved=0;
    for (const j of this.pendingKits) if (j!==i) reserved+=CONFIG.CONSUMABLES[j].cost;
    if (GameState.SILVER-reserved<CONFIG.CONSUMABLES[i].cost) { combatMessage('Нет свободного серебра!','#f28b68'); return; }
    if (this.action('kit',i)) this.pendingKits.add(i);
  }
  applyKit(p,i) {
    if (!Number.isInteger(i) || i<0 || i>5 || p.dead || (p.kitMask & (1<<i))) return;
    p.kitMask = (p.kitMask || 0) | (1<<i); applyConsumable(p,p.fieldKit,i);
    if (p===GameState.player) payConsumable(i);
  }
  signal(code) { if (this.host) this.relay(this.me,code); else this.action('signal',code); }
  relay(seat,code) { if (Object.hasOwn(PlatoonMatch.signals,code)) { this.send('radio',{seat,code}); this.radio({seat,code}); } }
  radio(msg) {
    if (msg && Object.hasOwn(PlatoonMatch.signals,msg.code) && this.drivers.has(msg.seat))
      combatMessage(this.drivers.get(msg.seat).nick+' · '+PlatoonMatch.signals[msg.code],'#bce4d3');
  }
  credit(source,damage,kills,xp) {
    const score = this.scores[source?.driverSeat]; if (!score) return;
    score[0]+=damage; score[1]+=kills; score[2]+=xp;
    if (source===GameState.player) { GameState.battleDmg=score[0]; GameState.battleKills=score[1]; }
  }
  finish(won) {
    if (!this.host || this.result) return;
    this.result={won, scores:this.scores.map(s=>s.map(Math.floor))};
    this.send('world',this.snapshot()); this.service.finish(this.result);
  }
  // Relative reload/calibration deadlines: devices need not agree on wall-clock time.
  // Poses are compact tuples in stable formation order, never serialized Tank objects.
  snapshot() {
    const g=GameState, now=BattleClock.now(), q=(x,d=100)=>Math.round(x*d)/d;
    return {n:++this.sequence, tick:ticks, units:g.units.map(u=>[
      ...PlatoonMatch.pose.map((k,i)=>q(u[k],i<3?100:10000)), q(u.hp),
      +u.dead | (+u.visible<<1) | (+!!u.spotted<<2) | (+u.airborne<<3) | (+u.trackBroken<<4) | (+u.isMoving<<5),
      q(u.speedKmh), u.currentTerrain, u.shotsFired||0, q(u.vx), q(u.vy)]),
      guns:[...this.drivers.keys()].map(i=>{const p=g.units[i],c=p.calibration;return [i,p.curMag,+p.isReloading,
        Math.max(0,Math.round(p.nextShot-now)),!!c?.active,c?.until!=null ? Math.max(0,Math.round(c.until-now)) : null,
        p.drownTimer??null,p.kitMask||0,this.inputs.get(i)?.board?.focus||0];}),
      shells:g.bullets.slice(-100).map(b=>[q(b.x),q(b.y),q(b.h),q(b.a,1000),q(b.dh,1000),b.color]),
      walls:this.walls.flatMap((w,i)=>w.destroyed?[i]:[]), trees:g.arena.trees.flatMap((t,i)=>t.fallen?[[i,q(t.angle,1000)]]:[]),
      visited:Array.from(g.navigation.recon.teams[0].visited,n=>n>=0?1:0),
      smoke:CombatMechanics.smokeClouds.slice(-32).map(s=>[q(s.x),q(s.y),q(s.duration)]),
      strikes:CombatMechanics.artilleryStrikes.slice(-32).map(a=>[q(a.x),q(a.y),q(a.timer),+a.exploded]),
      scores:this.scores.map(s=>s.map(Math.floor))};
  }
  receiveWorld(w) {
    const g=GameState;
    if (!this.live || !w || !Number.isSafeInteger(w.n) || w.n<=this.lastWorld || w.units?.length!==g.units.length ||
        !w.units.every(r=>Array.isArray(r) && r.length===17 && r.slice(0,13).every(Number.isFinite) && Object.hasOwn(CONFIG.TERRAIN,r[13]))) return;
    const now = performance.now(), gunTime = BattleClock.now(); this.seen.set(0,now);
    const first = this.lastWorld<0; this.lastWorld=w.n; ticks=w.tick;
    for (const [i,r] of w.units.entries()) {
      const p=g.units[i], hp=r[10], flags=r[11];
      if (first) PlatoonMatch.pose.forEach((k,j)=>p[k]=r[j]);
      p.fromPose=PlatoonMatch.pose.map(k=>p[k]); p.toPose=r;
      if (!p.dead && (flags&1)) boom(p.x,p.y);
      else if (hp<p.hp) { sparks(p.x,p.y,p.aimHeight); if (p===g.player) dmgLog('−'+Math.ceil(p.hp-hp),'#ffa78b'); }
      if (r[14]>(p.shotsFired||0)) { const tip=p.muzzle(); p.lastShot=BattleClock.date(); spawnParticles(tip.x,tip.y,'#ffb24c',5,1.2,8,tip.h); if (p===g.player) snd('shot'); }
      p.hp=hp; p.dead=!!(flags&1); p.visible=!!(flags&2); p.spotted=!!(flags&4); p.airborne=!!(flags&8);
      p.trackBroken=!!(flags&16); p.isMoving=!!(flags&32); p.speedKmh=r[12]; p.currentTerrain=r[13]; p.shotsFired=r[14]; p.vx=r[15]; p.vy=r[16];
    }
    this.poseDuration=bounded(now-(this.poseAt??now),65,this.http?450:200); this.poseAt=now;
    for (const [i,mag,loading,until,cal,switchIn,water,mask,focus] of w.guns) {
      const p=g.units[i]; p.curMag=mag; p.isReloading=!!loading; p.nextShot=gunTime+until; p.drownTimer=water; p.kitMask=mask;
      if (p.calibration) { p.calibration.active=cal; p.calibration.until=switchIn===null?null:gunTime+switchIn; }
      if (p===g.player) {
        for (let j=0;j<6;j++) if (mask & (1<<j)) { this.pendingKits.delete(j); payConsumable(j); }
        if (BattleView.artillery) BattleView.artillery.focus=focus;
      }
    }
    for (const i of w.walls) { const wall=this.walls[i]; if (wall && !wall.destroyed) {
      wall.destroyed=true; const at=g.walls.indexOf(wall); if (at>=0) g.walls.splice(at,1); g.arena.revision++;
    } }
    for (const [i,a] of w.trees) { const t=g.arena.trees[i]; if (t && !t.fallen) { t.fallen=true; t.angle=a; g.arena.treeRevision++; } }
    const team=g.navigation.recon.teams[0]; team.count=0; w.visited.forEach((v,i)=>{team.visited[i]=v?1:-1; if(v) team.count++;});
    g.bullets=w.shells.map(([x,y,h,a,dh,color])=>({x,y,h,a,dh,color}));
    CombatMechanics.smokeClouds=w.smoke.map(([x,y,duration])=>({x,y,duration,radius:38,maxDuration:12}));
    CombatMechanics.artilleryStrikes=w.strikes.map(([x,y,timer,exploded])=>({x,y,timer,exploded,radius:140}));
    [g.battleDmg,g.battleKills]=w.scores[this.me]; updateScoreboard();
  }
  stepView(dt) {
    const g=GameState, f=bounded((performance.now()-this.poseAt)/this.poseDuration,0,1);
    for (const p of g.units) if (p.toPose) PlatoonMatch.pose.forEach((k,j)=>{
      const a=p.fromPose[j], b=p.toPose[j]; p[k]=a+(j===3||j===4?wrapAngle(b-a):b-a)*f;
    });
    if (BattleInput.running) {
      BattleInput.consumeLook();
      if (!g.player.dead) BattleView.stepPlayer(dt/1000,0,true);
    }
    updateVisualEffects(); // visual particles only; never run AI, collisions, damage or endBattle here
  }
}
