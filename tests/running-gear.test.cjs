const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {openGame}=require('./winter-harness.cjs');
const root=process.env.CITY_TANKS_INDEX?path.dirname(process.env.CITY_TANKS_INDEX):path.join(__dirname,'..');

test('all catalogue identities resolve to fitted wheels; render exclusions are valid triangles in the correct original mesh',()=>{
  const ctx=vm.createContext({});for(const f of ['catalog','running-gear'])vm.runInContext(readFileSync(path.join(root,'models',f+'.js'),'utf8'),ctx);
  const {DB,modelKey,WHEEL_FITS}=vm.runInContext('({DB,modelKey,WHEEL_FITS})',ctx);
  assert.equal(Object.keys(DB).length,275);
  const ids=new Set(Object.keys(DB).map(modelKey));assert.deepEqual(ids,new Set(Object.keys(WHEEL_FITS)));
  for(const id of ids){
    const [fit,omit]=WHEEL_FITS[id], script=readFileSync(path.join(root,'models',DB[id].file),'utf8');
    const d=JSON.parse(script.slice(script.indexOf('{'),script.lastIndexOf('}')+1));assert.equal(d.id,id);
    for(const side of [-1,1])assert.ok(fit.filter(([x])=>Math.sign(x)===side).length>=3,id);
    for(const row of fit)assert.ok(row.length===5 && row.every(Number.isFinite) && row[3]>0 && row[4]>0,id);
    assert.ok(Object.keys(omit).length,id);
    for(const [key,runs] of Object.entries(omit)){
      assert.ok(['body','wheels'].includes(d.meshes[key][0]),id);if(runs===true)continue;
      const count=Buffer.from(d.meshes[key][2],'base64').length/6;let end=0;
      for(let i=0;i<runs.length;i+=2){assert.ok(runs[i]>=end && runs[i+1]>0,id);end=runs[i]+runs[i+1];}
      assert.ok(end<=count,id);
    }
  }
});

test('WebGL: actual instanced matrices roll with signed travel and opposite track speeds in a pivot; hydraulic cradle never carries the wheels',async t=>{
  const {page,click}=await openGame(t,{webgl:true,seed:{owned:['STRV103B'],selected:'STRV103B'}});
  await page.waitForFunction(()=>DepotView.stats()?.id==='STRV103B');
  assert.ok(await page.evaluate(()=>DepotView.stats().triangles>0));
  // Capture the real mounted scene, not an unmounted copy of the rig.
  await page.evaluate(()=>{const build=buildBattleWorld;buildBattleWorld=(s,g)=>{window.testWorld=s;return build(s,g);};});
  await click('ТРЕНИРОВКА');await page.locator('#train-nat-select').selectOption('germany');await page.locator('#enemy-select').selectOption('STURMTIGER');
  const actual=await page.evaluate(async()=>{
    if(!await launchBattle(1))throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop();const p=GameState.player,a=p.modelAsset,wheels=[];testWorld.traverse(o=>{if(o.name==='Опорные катки')wheels.push(o);});
    const wheel=wheels.find(w=>w.geometry===a.wheel),root=wheel.parent,cradle=root.children.find(c=>c.isGroup);
    const matrix=new THREE.Matrix4(),angles=()=>a.axles.map((_,i)=>{wheel.getMatrixAt(i,matrix);return Math.atan2(matrix.elements[6],matrix.elements[5]);});
    const advance=m=>{p.x+=m*p.modelScale*Math.cos(p.angle);p.y+=m*p.modelScale*Math.sin(p.angle);BattleView.draw();};
    const delta=(a,b)=>a.map((v,i)=>wrapAngle(b[i]-v));const zero=angles();advance(.12);const ahead=angles();advance(-.12);const back=angles();
    p.angle+=.04;BattleView.draw();const yaw=angles(),ver=wheel.instanceMatrix.version;
    p.suspensionPitch=.08;BattleView.draw();const stable=wheel.instanceMatrix.version===ver && Math.abs(cradle.rotation.x+.08)<1e-6;
    // Check a shell's last sweep as well: a thin obstruction just BEYOND range must survive.
    const g=GameState, wall={x:13,y:-2,w:2,h:4,baseHeight:0,height:100,type:'fixture'};
    const b={x:0,y:0,h:80,dx:1,dy:0,dh:0,traveled:BATTLE_RANGE-12,speed:21,shooter:p};
    const old=g.walls;g.walls=[wall];g.bullets=[b];updateBullets();const last=[b.x,b.traveled,g.bullets.length];g.walls=old;
    const info={wheels:wheels.length,instanced:wheel.isInstancedMesh,count:wheel.count,fit:a.axles,stable,
      ahead:delta(zero,ahead),back:delta(ahead,back),yaw:delta(back,yaw),last,range:BATTLE_RANGE};
    backToGarage();return info;
  });
  assert.deepEqual([actual.wheels,actual.instanced,actual.count,actual.stable],[2,true,actual.fit.length,true]);
  assert.deepEqual(actual.last,[12,actual.range,0]);
  for(const [i,[x,,,r]] of actual.fit.entries()){
    assert.ok(Math.abs(actual.ahead[i]-.12/r)<1e-5 && Math.abs(actual.back[i]+.12/r)<1e-5,'drive/reverse');
    assert.ok(Math.abs(actual.yaw[i]-.04*x/r)<1e-5,'left/right steer');
  }
});
