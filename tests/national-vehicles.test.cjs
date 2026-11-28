const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {rows,active}=require('./fixtures/national.cjs'), {openGame}=require('./winter-harness.cjs');
const root=process.env.CITY_TANKS_INDEX ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX)) : path.join(__dirname,'..');
const native={NAT090:6,NAT095:6,NAT103:8};

test('114 supplied rows, four held only; 110 independent playable records, exact sheets and rig data',()=>{
  const ctx=vm.createContext({window:{addEventListener(){}},console:{log(){}}});
  for(const src of ['models/catalog','models/running-gear','js/tree-event','js/config','js/battle-space','js/tank'])
    vm.runInContext(fs.readFileSync(path.join(root,src+'.js'),'utf8'),ctx);
  const {DB,BRANCHES,NATIONAL_TANKS,WHEEL_FITS,Tank,m}=vm.runInContext('({DB,BRANCHES,NATIONAL_TANKS,WHEEL_FITS,Tank,m:BATTLE_UNITS_PER_METRE})',ctx);
  assert.equal(rows.length,114);assert.equal(active.length,110);assert.equal(Object.keys(DB).length,428);
  assert.deepEqual(Array.from(NATIONAL_TANKS,t=>t.id).sort(),active.map(t=>t.id).sort());
  assert.deepEqual(rows.filter(t=>!t.triangles).map(t=>t.id),['NAT015','NAT060','NAT082','NAT087']);
  const blitz=[];
  for(const t of rows){
    const spec=DB[t.id],slug='national-'+t.id.slice(3),meshPath=path.join(root,'models',slug+'.mesh.js');
    if(!t.triangles){assert.equal(spec,undefined);assert.equal(fs.existsSync(meshPath),false);assert.equal(WHEEL_FITS[t.id],undefined);continue;}
    assert.deepEqual([spec.n,spec.nat,spec.cls,spec.source,spec.tier,spec.alpha,spec.parent,spec.xp,spec.file,spec.thumbnail],
      [t.name,t.nat,t.cls,t.source,t.tier,t.damage*t.count,undefined,undefined,slug+'.mesh.js',slug+'.webp']);
    assert.equal(BRANCHES[t.nat].tanks.includes(spec),false);
    for(const team of ['player','enemy']){
      const u=new Tank(t.id,0,0,team);
      assert.deepEqual([u.maxHp,u.dmg,u.salvoSize,u.magSize,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)],
        [t.hp,t.damage,t.id==='NAT011'?2:1,t.id==='NAT011'?1:t.count,t.reload,t.pen,t.hull,t.turret,t.speed],t.id);
    }
    const text=fs.readFileSync(meshPath,'utf8'),d=JSON.parse(text.slice('BattleModels.receive('.length,-3));
    assert.match(d.source,new RegExp('batch114-tank-viewers-110\\.zip / '+t.id.slice(3)+'-'));assert.ok(!d.source.includes('/undefined'));
    assert.deepEqual([d.id,d.triangles],[t.id,t.triangles]);
    const [fit,omit,parts]=WHEEL_FITS[t.id],wi=d.meshes.findIndex(m=>m[0]==='wheels');
    assert.equal(omit[wi],true);assert.ok(omit[0].length>0);
    if(native[t.id]){
      assert.equal(parts.wheels.length,native[t.id]);assert.equal(fit.length,native[t.id]);
      assert.ok(d.meshes.every(m=>m[0]!=='tracks'));
    }else{
      assert.equal(Buffer.from(d.meshes[wi][2],'base64').length,fit.length*6*32,t.id+' original axle guides');
      for(const side of [-1,1]){
        const wheels=Array.from(fit).filter(r=>Math.sign(r[0])===side).sort((a,b)=>Math.abs(a[0])-Math.abs(b[0]));
        for(const [i,[x,y,z,r,w]] of wheels.entries())for(const [X,Y,Z,R,W] of wheels.slice(i+1)){
          if(Math.hypot(Y-y,Z-z)<r+R)assert.ok(Math.abs(X)-W/2>Math.abs(x)+.704*w,t.id+' intersecting wheels');
        }
      }
    }
    if(d.source.includes('BlitzKit')){
      blitz.push(t.id);const buffer=Buffer.from(d.meshes.find(m=>m[0]==='gun')[1],'base64'),points=[];
      for(let i=0;i<buffer.length;i+=6)points.push([0,2,4].map(k=>buffer.readInt16LE(i+k)));
      const z=points.map(p=>p[2]),tip=Math.max(...z),rim=points.filter(p=>p[2]>=tip-12);
      assert.equal(Math.min(...z),0,t.id+' pitch at barrel root');assert.ok(tip>1000);
      for(const axis of [0,1]){const r=rim.map(p=>p[axis]);assert.ok(Math.abs(Math.min(...r)+Math.max(...r))<=1,t.id+' centered tip');}
    }
  }
  assert.equal(blitz.length,12);assert.deepEqual([DB.NAT114.n,DB.NAT114.nat,DB.NAT114.hp,DB.NAT114.speed],['M7','usa',540,60]);
});

// Exercise all 110 mounted actors in six real WebGL worlds, not 110 mocked
// assets or 110 costly context creations. Only the roster deal is fixed; the
// normal loader, depot, builds, wheel animation, tank transforms and shots run.
for(const [nat,playerId] of Object.entries({ussr:'NAT011',germany:'NAT034',usa:'NAT114',sweden:'NAT074',japan:'NAT090',france:'NAT103'}))test(`offline WebGL: all ${nat} specials deploy, roll and fire from their supplied rigs`,async t=>{
  const batch=active.filter(v=>v.nat===nat), owned=batch.map(v=>v.id);
  const {page}=await openGame(t,{webgl:true,seed:{owned,selected:playerId}});
  await page.context().setOffline(true);await page.waitForFunction(id=>DepotView.stats()?.id===id,playerId);
  const result=await page.evaluate(async ids=>{
    const g=GameState,deal=makeRosters,clock=BattleClock.now,follow=RoadWheels.prototype.follow,rigs=new WeakMap();
    const seats=[g.selected,...ids.filter(id=>id!==g.selected)];while(seats.length<20)seats.push('MS1');
    makeRosters=()=>[seats.slice(0,10),seats.slice(10)];g.controlMode='mobile';
    RoadWheels.prototype.follow=function(u,far){rigs.set(u,this);return follow.call(this,u,far);};
    try{
      if(!await launchBattle(10))throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop();let ms=BattleClock.now();BattleClock.now=()=>ms;
      const units=g.units.filter(u=>ids.includes(u.id)),mat=new THREE.Matrix4();
      const angles=p=>p.modelAsset.axles.map((_,i)=>{const w=rigs.get(p);if(w.tyres)return w.tyres[i].rotation.x;w.mesh.getMatrixAt(i,mat);return Math.atan2(mat.elements[6],mat.elements[5]);});
      const rest=units.map(angles);
      for(const p of units){p.x+=.13*p.modelScale*Math.cos(p.angle);p.y+=.13*p.modelScale*Math.sin(p.angle);p.setLook(p.angle+.11,.08);p.slewSight(Math.PI,Math.PI);}
      BattleView.draw();
      return Object.fromEntries(units.map((p,k)=>{
        const a=p.modelAsset,after=angles(p),w=rigs.get(p);g.bullets.length=0;
        const rolled=a.axles.every(([,,,r],i)=>Math.abs(wrapAngle(after[i]-rest[k][i])-.13/r)<1e-5);
        const expected=[];
        for(let i=0;i<p.magSize;i++){
          const tips=!a.muzzles?[a.muzzle]:p.salvoSize===2?a.muzzles:[a.muzzles[i]];
          expected.push(...tips.map(tip=>p.muzzle(tip)));
          if(!p.fire(0))throw Error('No round: '+p.id);
          ms=p.nextShot-1;if(p.fire(0))throw Error('Early fire: '+p.id);ms++;
        }
        const fromRims=expected.length===g.bullets.length && expected.every((r,i)=>{const b=g.bullets[i];return Math.hypot(b.x-r.x,b.y-r.y,b.h-r.h)<1e-6;});
        return [p.id,[a.sourceTriangles,w.tyres?.length||0,rolled,fromRims,g.bullets.map(b=>b.dmg),p.curMag,p.isReloading,p.reloadTime]];
      }));
    }finally{makeRosters=deal;RoadWheels.prototype.follow=follow;BattleClock.now=clock;backToGarage();}
  },owned);
  for(const v of batch)assert.deepEqual(result[v.id],[v.triangles,native[v.id]||0,true,true,Array(v.count).fill(v.damage),0,true,v.reload],v.name);
});
