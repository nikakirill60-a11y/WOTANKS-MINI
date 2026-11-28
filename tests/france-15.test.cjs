const test = require('node:test'), assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const {additions,native} = require('./fixtures/france.cjs');

// The native rigs must be the exported faces at their exact positions, not just
// equally many black cylinders. Compare in the original millimetre frame.
test('five native chassis: rotate each original tyre, retain every face and paint only the wheels (including the fixed AMD spare)', async t => {
  const {page} = await openGame(t);
  for (const [id,count] of Object.entries(native)) {
    const actual=await page.evaluate(async id=>{
      const a=await BattleModels.load(id,new AbortController().signal), [axles,omit,slices]=WHEEL_FITS[id];
      const hull=a.hull.attributes, rubber=new THREE.Color('#151515').r, paint=new THREE.Color('#566e6c');
      // The bound/physics buffer still contains body then wheels; only the draw index omits them.
      const guideCount=slices.wheels.flatMap(s=>s[1]).reduce((n,v,i)=>n+(i%2?v:0),0);
      const bodyCount=hull.position.count/3-guideCount, offsets=[0,bodyCount];
      const indices=Array.from(a.hull.index.array), visible=new Set(indices.filter((_,i)=>!(i%3)).map(v=>v/3));
      const seen=new Set();let correct=true, rubberOnly=true, exactNormals=true;
      a.nativeWheels.forEach((geo,i)=>{
        const {position,normal,color}=geo.attributes;let v=0;
        slices.wheels[i].forEach((runs,k)=>{
          for(let j=0;j<runs.length;j+=2)for(let face=runs[j];face<runs[j]+runs[j+1];face++){
            const f=offsets[k]+face;if(visible.has(f)||seen.has(f))correct=false;seen.add(f);
            for(let corner=0;corner<3;corner++,v++)for(let c=0;c<3;c++){
              const old=(f*3+corner)*3+c;
              correct &&= Math.abs(position.array[v*3+c]+axles[i][c]/1000-hull.position.array[old])<1e-6;
              // BufferGeometry.translate re-normalizes the normals, even for an identity normal matrix.
              exactNormals &&= Math.abs(normal.array[v*3+c]-hull.normal.array[old])<1e-6;
              rubberOnly &&= Math.abs(color.array[v*3+c]-rubber)<1e-7;
            }
          }
        });
        correct &&= v===position.count && v>300;
      });
      const spare=new Set();for(let i=0;i<(slices.spare?.length||0);i+=2)for(let j=0;j<slices.spare[i+1];j++)spare.add(slices.spare[i]+j);
      for(const f of visible)for(let corner=0;corner<3;corner++)for(let c=0;c<3;c++){
        const wanted=spare.has(f)?rubber:[paint.r,paint.g,paint.b][c];rubberOnly &&= Math.abs(hull.color.array[f*9+corner*3+c]-wanted)<1e-7;
      }
      return [!!a.wheel,a.nativeWheels.length,correct,exactNormals,rubberOnly,seen.size+visible.size===hull.position.count/3,
        seen.size*3+a.hull.index.count+a.turret.attributes.position.count+a.gun.attributes.position.count===a.sourceTriangles*3,
        spare.size>0 && [...spare].every(f=>visible.has(f)),!!omit[0]];
    },id);
    assert.deepEqual(actual,[false,count,true,true,true,true,true,id==='AMD178B',true],id);
  }
});

test('local 1.5: all 20 depot models deploy and fire, the black tyres keep moving at distance, all nine SPGs have an overhead sight',async t=>{
  const ids=additions.map(r=>r[0]);const {page,click}=await openGame(t,{webgl:true,seed:{owned:ids,selected:ids[0]}});
  await page.context().setOffline(true);
  assert.match(await page.title(),/CITY TANKS 1\.5\b/);
  assert.equal(await page.locator('.entry-log').getAttribute('href'),'UPDATE-1.5.txt');
  await page.evaluate(()=>{
    const update=RoadWheels.prototype.follow;window.rigs15=new WeakMap();
    RoadWheels.prototype.follow=function(u,far){rigs15.set(u,this);return update.call(this,u,far);};
  });
  for(const [id,name,cls,,damage,mag,seconds,pen,,,,tri] of additions){
    await click('Выбрать для боя: '+name);await page.waitForFunction(id=>DepotView.stats()?.id===id,id);
    const depot=await page.evaluate(()=>DepotView.stats());assert.equal(depot.sourceTriangles,tri);
    if(native[id])assert.equal(depot.triangles,tri,id+' no extra or lost wheels in depot');
    if(!await page.locator('#enemy-select').isVisible())await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('france');await page.locator('#enemy-select').selectOption('EBR105');
    const result=await page.evaluate(async()=>{
      const g=GameState;g.controlMode='mobile';
      if(!await launchBattle(1))throw Error(document.getElementById('battle-notice-text').textContent);
      stopBattleLoop();const clock=BattleClock.now;let ms=BattleClock.now();BattleClock.now=()=>ms;
      try {
        const p=g.player,a=p.modelAsset,rig=rigs15.get(p),mat=new THREE.Matrix4();
        const angles=()=>rig.tyres?rig.tyres.map(o=>o.rotation.x):a.axles.map((_,i)=>{rig.mesh.getMatrixAt(i,mat);return Math.atan2(mat.elements[6],mat.elements[5]);});
        const travel=n=>{p.x+=n*p.modelScale*Math.cos(p.angle);p.y+=n*p.modelScale*Math.sin(p.angle);BattleView.draw();};
        const rest=angles();travel(.1);const forward=angles();travel(-.1);const back=angles();
        const rolled=a.axles.every(([,,,r],i)=>Math.abs(wrapAngle(forward[i]-rest[i])-.1/r)<1e-5 && Math.abs(wrapAngle(back[i]-forward[i])+.1/r)<1e-5);
        const original=rig.tyres?rig.mesh.isGroup && rig.tyres.every((o,i)=>o.geometry===a.nativeWheels[i]):rig.mesh.isInstancedMesh && rig.mesh.geometry===a.wheel;
        // Far opponent keeps its own geometry too. A wreck must replace the material on every tyre.
        const e=g.units[1],er=rigs15.get(e);e.x=p.x+80*BATTLE_UNITS_PER_METRE;e.dead=true;BattleView.draw();
        const far=er.tyres.every((o,i)=>o.geometry===e.modelAsset.nativeWheels[i] && o.material===er.mesh.parent.children[0].material);
        if(p.isSPG){
          BattleView.toggleScope();const sight=BattleView.artillery;
          sight.moveTo(p.x+180*Math.cos(p.angle),p.y+180*Math.sin(p.angle));p.setLook(p.angle,ArtillerySight.raisedPitch);p.slewSight(Math.PI,Math.PI);
        }
        const mode=BattleView.stats().mode,shots=[];
        for(let i=0;i<p.magSize;i++){
          firePlayer();firePlayer();updateHUD();const shell=g.bullets.at(-1),hud=document.querySelector('#ammo-val').textContent;
          if(!shell||g.bullets.length!==i+1)throw Error(p.id+' shot '+i);
          shots.push([shell.dmg,shell.pen,!!shell.arc,p.curMag,p.isReloading,Math.round(p.nextShot-ms)]);
          if(p.id==='BC15558' && (!hud.includes('ОФ') || !hud.includes(`${2-i}/3`) || !hud.includes(i===2?'ПЕРЕЗАРЯДКА':'ДО ВЫСТРЕЛА')))throw Error(hud);
          ms=p.nextShot-1;firePlayer();if(g.bullets.length!==i+1)throw Error('Early fire: '+p.id);ms++;
        }
        firePlayer();
        return {original,rolled,far,overhead:mode==='artillery',refilled:g.bullets.length===p.magSize+1 && p.curMag===p.magSize-1,shots,
          auxiliary:CONFIG.ARTILLERY_SUPPORT || CombatMechanics.artilleryStrikes.length>0};
      } finally {BattleClock.now=clock;backToGarage();}
    });
    const interval={AMX1390:2500,AMX13105:2730,ERAC105:2500,PROJETLOUIS:2400,PROJETMURAT:2000,BC15558:10000}[id];
    assert.deepEqual(result,{original:true,rolled:true,far:true,overhead:cls==='spg',refilled:true,auxiliary:false,
      shots:Array.from({length:mag},(_,i)=>[damage,pen,cls==='spg',mag-i-1,i===mag-1,i===mag-1?seconds*1000:interval])},id);
  }
});
