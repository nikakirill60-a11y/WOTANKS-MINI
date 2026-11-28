// Presentation for a non-commanding driver. Nothing here fires, deals damage,
// spends a kit, steps another vehicle's physics or writes a result.
const PlatoonMotion = {
  pose: ['x','y','rideHeight','angle','tAngle','aimPitch','groundPitch','groundRoll','swayPitch','swayRoll'],
  angle: i => i === 3 || i === 4,
  // Identical 60 Hz drive/mount integration on the commander and on the local
  // prediction body. On the peer the sight and suspension are private copies.
  drive(p, c, preview = false) {
    const assist = c.board && !c.hold && !c.forward && !c.turn && !p.isMoving ? c.board.steer(p) : 0;
    TrackDrive.step(p,c.forward,c.turn || assist,c.brake,null,preview);
    if (c.board) c.board.step(p,1/60,c.hold);
    else if (!c.hold) { p.setLook(c.yaw,c.pitch); p.slewDriver(1/60); }
  }
};

class PlatoonPrediction {
  constructor(player) {
    // Do not feed the smoothing offset back into collisions or input replay.
    this.body=Object.assign(Object.create(Object.getPrototypeOf(player)),player,{
      _basis:null, fieldKit:{}, critTimers:{...player.critTimers}
    });
    this.player=player; this.tick=0; this.carry=0; this.history=[];
    this.sent=new Map([[0,0]]); this.offset=PlatoonMotion.pose.map(()=>0); this.turnStep=0; this.inMotion=false;
  }
  markSent(n) {
    this.sent.set(n,this.tick);
    if (this.sent.size>96) this.sent.delete(this.sent.keys().next().value);
  }
  advance(dt, intent, fresh) {
    if (this.player.dead || !fresh) { this.carry=0; this.inMotion=false; return; }
    this.carry+=bounded(dt,0,100);
    if (this.carry+1e-7<TICK) return;
    const b=intent.board;
    const c=b ? {...intent,board:new ArtillerySight(GameState.arena.bounds,{x:b[0],y:b[1]})} : intent;
    while (this.carry+1e-7>=TICK) {
      this.carry-=TICK; this.history.push({tick:++this.tick,c});
      const yaw=this.body.tAngle;
      PlatoonMotion.drive(this.body,c,true); this.turnStep=wrapAngle(this.body.tAngle-yaw);
      this.inMotion=true;
    }
    if (this.history.length>90) this.history.splice(0,this.history.length-90);
  }
  reconcile(row, state, reset, hostTick) {
    const p=this.player, b=this.body, [seq,held,yawRate,riseSpeed,pitchVel,rollVel,flags]=state;
    PlatoonMotion.pose.forEach((k,i)=>{ b[k]=row[i]; });
    Object.assign(b,{driveSpeed:row[12]/3.6,speedKmh:row[12],currentTerrain:row[13],vx:row[15],vy:row[16],
      yawRate,riseSpeed,pitchVel,rollVel,airborne:p.airborne,isMoving:p.isMoving,trackBroken:p.trackBroken,
      trackRepairAt:0,engineRestartAt:flags&1?Infinity:0,_placed:true,landingSpeed:0,treeDrag:0});
    b.critTimers.engine=flags&2?Infinity:0; b.fieldKit.fuelBoostTimer=flags&4?Infinity:0;
    // Echo of an actual command integrated on the host, plus the number of fixed
    // steps it was held for. Neither clock sync nor a client-provided dt/pose is trusted.
    const sentTick=this.sent.get(seq);
    const observed=sentTick===undefined ? null : sentTick+held;
    // A heartbeat or aim packet during a long curve isn't a new steering start.
    // Its RTT varies, but the host's steps advance monotonically. Track that
    // timeline; use the echoed command as a slow drift correction, not a fresh
    // time origin which adds/removes several steps of the same turn every packet.
    let covered=null;
    if (observed!==null) {
      let sample=observed;
      if (!reset && this.hostTick!=null && this.covered!=null) {
        const expected=this.covered+hostTick-this.hostTick, drift=observed-expected;
        if (Math.abs(drift)<=30) sample=expected+bounded(.09*drift,-.6,.6);
        sample=Math.max(this.covered,sample);
      }
      this.covered=bounded(sample,0,this.tick); covered=Math.round(this.covered);
    } else this.covered=null;
    this.hostTick=hostTick;
    if (p.dead || reset || covered===null || this.tick-covered>90) {
      this.history.length=0; this.carry=0; this.inMotion=false; this.turnStep=0;
    } else {
      for (const sample of this.history) if (sample.tick>covered) PlatoonMotion.drive(b,sample.c,true);
    }
    const snap=p.dead || reset || Math.hypot(p.x-b.x,p.y-b.y)>5*BATTLE_UNITS_PER_METRE;
    this.offset=PlatoonMotion.pose.map((k,i)=>{
      const d=p[k]-this.renderValue(k); return snap ? 0 : PlatoonMotion.angle(i) ? wrapAngle(d) : d;
    });
    this.present(0);
  }
  // The private body stays on 60 Hz ticks. Only the drawing pose uses the
  // fractional remainder: on a 120 Hz display every other frame used to stall.
  renderValue(k) {
    const b=this.body,f=this.inMotion ? bounded(this.carry/TICK,0,1) : 0;
    return b[k]+f*(k==='x' ? b.vx : k==='y' ? b.vy : k==='angle' ? b.yawRate/60 : k==='tAngle' ? this.turnStep : 0);
  }
  present(dt) {
    const p=this.player,b=this.body,blend=-Math.expm1(-dt/100),o=this.offset;
    // A small correction must not reverse a held turn or send the camera
    // backwards along the road. Still settle fully at rest or snap on teleport.
    const length=Math.hypot(o[0],o[1]);
    const xy=length ? Math.min(blend,dt/1000*(1+.5*Math.abs(b.driveSpeed))*BATTLE_UNITS_PER_METRE/length) : blend;
    PlatoonMotion.pose.forEach((k,i)=>{
      let change=o[i]*(i<2 ? xy : blend);
      if (i===3) {const cap=dt/1000*(.12+.45*Math.abs(b.yawRate));change=bounded(change,-cap,cap);}
      o[i]-=change; p[k]=this.renderValue(k)+o[i];
    });
    p.tAngle=wrapAngle(p.tAngle); p.angle=wrapAngle(p.angle);
    p.driveSpeed=b.driveSpeed; p.yawRate=b.yawRate;
    p.vx=b.vx; p.vy=b.vy; p.speedKmh=b.speedKmh; p.currentTerrain=b.currentTerrain; p.isMoving=b.isMoving;
  }
}

// Play two complete host samples on the host's fixed-tick timeline. Starting
// a new tween from the last *rendered* frame on each arrival causes hitching
// when packets arrive in bursts. An under-run may coast only a short distance.
class PlatoonPlayback {
  constructor() { this.frames=[]; this.cursor=null; this.jitter=0; }
  push(world, now, http) {
    const prev=this.frames.at(-1);
    if (prev && world.tick<prev.tick) return false;
    const reset=!prev || now-this.arrival>1000 || world.tick-prev.tick>60;
    const base=http ? 18 : 6;
    if (reset) { this.frames.length=0; this.jitter=0; this.spacing=base; }
    else if (world.tick>prev.tick) {
      const ticks=world.tick-prev.tick;
      this.spacing+=.18*(bounded(ticks,2,36)-this.spacing);
      this.jitter+=.20*(Math.min(18,Math.abs((now-this.arrival)/TICK-ticks))-this.jitter);
    } else this.frames.pop();
    this.arrival=now;
    this.delay=bounded(this.spacing+.9*this.jitter,http?10:4,http?29:13);
    if (reset) this.cursor=world.tick-this.delay;
    this.frames.push(world); if (this.frames.length>16) this.frames.shift();
    return true;
  }
  draw(units, own, now, dt, http) {
    if (!this.frames.length) return;
    const last=this.frames.at(-1), coast=http?9:5;
    const target=last.tick+Math.max(0,now-this.arrival)/TICK-this.delay;
    const error=target-this.cursor;
    const next=error>30 ? target : this.cursor+dt/TICK*bounded(1+error*.045,.75,1.25);
    this.cursor=bounded(next,this.frames[0].tick,last.tick+coast);
    while (this.frames.length>2 && this.frames[1].tick<=this.cursor) this.frames.shift();
    const a=this.frames[0],b=this.frames[1] || a;
    const f=bounded((this.cursor-a.tick)/(b.tick-a.tick || 1),0,1),lead=Math.max(0,this.cursor-b.tick);
    for (let j=0;j<units.length;j++) {
      const p=units[j]; if (p===own) continue;
      const x=a.units[j],y=b.units[j];
      if (p.dead || Math.hypot(y[0]-x[0],y[1]-x[1])>10*BATTLE_UNITS_PER_METRE) {
        PlatoonMotion.pose.forEach((k,i)=>{p[k]=last.units[j][i];}); continue;
      }
      PlatoonMotion.pose.forEach((k,i)=>{
        const d=y[i]-x[i]; p[k]=x[i]+(PlatoonMotion.angle(i)?wrapAngle(d):d)*f;
      });
      if (lead && b!==a) {
        // Coast along the sampled curve (also for a stationary pivot), rather
        // than freezing the heading and jumping to the next steering sample.
        const yaw=bounded(wrapAngle(y[3]-x[3])/(b.tick-a.tick),-.03,.03)*lead;
        p.angle=wrapAngle(p.angle+yaw);
        p.tAngle=wrapAngle(p.tAngle+bounded(wrapAngle(y[4]-x[4])/(b.tick-a.tick),-.05,.05)*lead);
        if (y[11]&32) { const c=Math.cos(yaw/2),s=Math.sin(yaw/2);
          p.x+=lead*(c*y[15]-s*y[16]); p.y+=lead*(s*y[15]+c*y[16]); }
      }
    }
  }
}
