// Offline second unit: two map fly-bys, one actual OBJ261 training sortie,
// the real paid wheel in a throwaway guest profile and the shipping game ledger.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('../../tests/node_modules/playwright-core');
const root=path.resolve(__dirname,'../..'),work=process.argv[2],parts=process.argv.slice(3);
if(!work)throw Error('Pass a temporary rushes directory');
const folder=(...s)=>{const d=path.resolve(work,...s);fs.mkdirSync(d,{recursive:true});return d;};
const file=pathToFileURL(path.join(root,'index.html')).href;
const bytes=(name,b64)=>fs.writeFileSync(name,Buffer.from(b64,'base64'));
const pad=n=>String(n).padStart(3,'0');
async function withPage(b,fn){
  const c=await b.newContext({offline:true,viewport:{width:1120,height:740},deviceScaleFactor:1,reducedMotion:'reduce'});
  try{const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>{errors.push(r.request().url());return r.abort()});
    await p.addInitScript(()=>{let s=15026;Math.random=()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);});
    await p.goto(file);await fn(p);assert.deepEqual(errors,[]);
  }finally{await c.close();}
}
async function ledger(p){const data=await p.evaluate(()=>{
  const ids=['GWE100','OBJ261V4','OBJ261','BC15558','AMX13105','EBR105','PROJETMURAT','NAT013','NAT035','NAT014'];
  const fleet=Object.fromEntries(ids.map(id=>{const v=DB[id],route=BRANCHES[v.nat].routes.find(r=>r.at(-1).id===id);return [id,{name:v.n,nat:CONFIG.NATIONS[v.nat],cls:v.cls,tier:v.tier,art:v.thumbnail,route:route?.slice(-3).map(t=>t.n),type:v.source||'tree',mag:v.mag||1}];}));
  return {fleet,maps:Object.fromEntries(Object.entries(BattleMaps.specs).map(([id,s])=>[id,{title:s.name,sec:s.sector,landmark:s.sights[0][1]}])),boxes:Roulette907.boxes.map(id=>[id,NationalCrates.catalog[id].country,CONTAINERS[id].vehicleChance]),victory:NATIONAL_BOX_CHANCE,counts:['collection','premium'].map(k=>NATIONAL_TANKS.filter(t=>t.source===k).length),odds:Roulette907.bands.map(b=>[b.key,b.weight]),price:[Roulette907.price(0),Roulette907.price(1)]};
});assert.deepEqual(data.counts,[86,24]);assert.equal(data.victory,.2);assert.ok(data.boxes.length===6&&data.boxes.every(b=>b[2]===.02));assert.deepEqual(data.odds.map(b=>b[1]),[1,3,30,66]);assert.deepEqual(data.price,[150,200]);assert.equal(Object.keys(data.maps).length,10);assert.equal(Object.values(data.fleet).filter(v=>v.route?.length===3&&v.tier===10).length,7);fs.writeFileSync(path.join(folder(),'ledger.json'),JSON.stringify(data,null,2));}
async function sector(p,id){const dir=folder('rushes',id),n=44;await p.evaluate(id=>{
  const T=THREE,a=BattleMaps.create(id),s=a.spec,m=BATTLE_UNITS_PER_METRE,scene=new T.Scene();WeatherEngine.currentWeather='clear';
  const world=buildBattleWorld(scene,{arena:a,walls:a.walls,terrainZones:a.zones});const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(960,540,false);r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.shadowMap.autoUpdate=false;r.shadowMap.needsUpdate=true;
  const mark=a.sights[0],hero=a.walls.find(w=>w.model===s.sights[0][0]),[x,h,z]=s.view,base=hero.baseHeight,cam=new T.PerspectiveCamera(42,16/9,.7,2*Math.hypot(a.bounds.x,a.bounds.y)+2800);
  window.frame=u=>{const arc=(u-.5)*.24,dx=(x*Math.cos(arc)-z*Math.sin(arc))*(1.08-.12*u),dz=(x*Math.sin(arc)+z*Math.cos(arc))*(1.08-.12*u),X=mark.x+dx*m,Z=mark.y+dz*m;
    cam.position.set(X,Math.max(base,a.ground.at(X,Z))+(h+4-3*u)*m,Z);cam.lookAt(mark.x+.07*x*m,base+hero.height*.52,mark.y);world.time.value=7+u*4;r.render(scene,cam);return r.domElement.toDataURL('image/jpeg',.93).split(',')[1];};
},id);for(let j=0;j<n;j++)bytes(path.join(dir,pad(j)+'.jpg'),await p.evaluate(u=>frame(u),j/(n-1)));}
async function drive(p){const dir=folder('rushes','drive');await p.evaluate(()=>localStorage.setItem('ct_progress_v1',JSON.stringify({owned:['OBJ261'],selected:'OBJ261',settings:{volume:0}})));await p.locator('#entry-guest').click();
  await p.evaluate(async()=>{const g=GameState;g.controlMode='mobile';document.querySelector('#map-select').value='field';const init=WeatherEngine.initWeatherForBattle;WeatherEngine.initWeatherForBattle=function(...args){init.apply(this,args);this.currentWeather='clear';};
    if(!await launchBattle(1))throw Error(document.querySelector('#battle-notice-text').textContent);stopBattleLoop();stopPerfMonitor();const v=g.player;
    const proto=THREE.Mesh.prototype,old=proto.onBeforeRender;let renderer;proto.onBeforeRender=function(r,s,c,...xs){if(c.isPerspectiveCamera&&r.domElement.id==='game'){renderer=r;proto.onBeforeRender=old;}return old.call(this,r,s,c,...xs);};BattleView.draw();if(!renderer)throw Error('Missing battle renderer');
    const cam=new THREE.PerspectiveCamera(38,16/9,.7,18000),draw=renderer.render.bind(renderer);renderer.setPixelRatio(1);renderer.setSize(960,540,false);renderer.render=s=>draw(s,cam);
    const base=BattleClock.now(),date=BattleClock.date(),x=v.x,z=v.y;let ticks=0,shot=false;BattleClock.now=()=>base+ticks*1000/60;BattleClock.date=()=>date+ticks*1000/60;
    window.driveFrame=i=>{const u=i/87;g.keys.KeyW=i>=16&&i<55;while(ticks<Math.round(i*60/16)){ticks++;update();}
      if(i===57)shot=v.fire(0);const a=v.angle+.98+.36*u,d=135-16*u;cam.position.set(v.x+Math.cos(a)*d,v.rideHeight+37-7*u,v.y+Math.sin(a)*d);cam.lookAt(v.x+Math.cos(v.angle)*4,v.rideHeight+11,v.y+Math.sin(v.angle)*4);cam.updateMatrixWorld();BattleView.draw();return renderer.domElement.toDataURL('image/jpeg',.93).split(',')[1];};
    window.slate=()=>({vehicle:v.id,shot,fireFrame:57,fps:16,metres:Math.hypot(v.x-x,v.y-z)/BATTLE_UNITS_PER_METRE});
  });for(let i=0;i<88;i++)bytes(path.join(dir,pad(i)+'.jpg'),await p.evaluate(i=>driveFrame(i),i));const s=await p.evaluate(()=>slate());assert.ok(s.vehicle==='OBJ261'&&s.shot&&s.metres>1,JSON.stringify(s));fs.writeFileSync(path.join(dir,'slate.json'),JSON.stringify(s));}
async function wheel(p){const d=folder('rushes','wheel');await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>localStorage.setItem('ct_progress_v1',JSON.stringify({GOLD:700,SILVER:0})));await p.locator('#entry-guest').click();await p.locator('#roulette-open').click();const desk=p.locator('#roulette-modal');await desk.locator('img').first().evaluate(i=>i.decode());await desk.screenshot({path:path.join(d,'before.png')});
  await p.evaluate(()=>{const old=Math.random,timer=window.setTimeout,values=[.8,.25];try{
    // Hold only the presentation callback for photography, never the ledger.
    window.setTimeout=(fn,ms,...args)=>{if(ms===1560){window.revealReceipt=fn;return 0;}return timer(fn,ms,...args);};
    Math.random=()=>values.length?values.shift():old();document.querySelector('#roulette-spin').click();
  }finally{Math.random=old;window.setTimeout=timer;}window.dialAnim=document.querySelector('#roulette-disc').getAnimations()[0];dialAnim.pause();});
  // Seek the desk's actual WAAPI easing; only this local guest pays once.
  for(let i=0;i<30;i++){await p.evaluate(i=>{dialAnim.currentTime=1550*i/29;},i);await desk.screenshot({path:path.join(d,pad(i)+'.png')});}
  await p.evaluate(()=>revealReceipt());await desk.screenshot({path:path.join(d,'after.png')});const s=await p.evaluate(()=>[GameState.GOLD,GameState.SILVER,GameState.roulette907]);assert.deepEqual(s,[550,10000,{spins:1,prize:'silver',amount:10000}]);fs.writeFileSync(path.join(d,'receipt.json'),JSON.stringify(s));}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{for(const k of parts.length?parts:['ledger','wheel','burgstadt','port','drive']){await withPage(b,p=>k==='ledger'?ledger(p):k==='wheel'?wheel(p):k==='drive'?drive(p):sector(p,k));console.log(k,'OK');}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
