const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const {openGame}=require('./winter-harness.cjs');
const root=path.dirname(process.env.CITY_TANKS_INDEX||path.resolve(__dirname,'../index.html'));
const source=n=>fs.readFileSync(path.join(root,'js/'+n+'.js'),'utf8');
const ids=['city','field','desert','port','quarry','frost','burgstadt','cape','sawmill','airfield'];

test('offline sound bank: distinct events, audible stereo sectors, bounded samples and clean one-shot edges',()=>{
  const f=vm.runInNewContext(source('sector-foley')+';SectorFoley',{Math});
  const context={createBuffer(n,len){const data=Array.from({length:n},()=>new Float32Array(len));return {getChannelData:i=>data[i]};}};
  const seen=new Set();
  function sound(data){let sum=0,peak=0;for(const s of data){sum+=s*s;peak=Math.max(peak,Math.abs(s));}
    assert.ok(peak<1 && Math.sqrt(sum/data.length)>.012);const key=createHash('sha256').update(Buffer.from(data.buffer)).digest('hex');assert.ok(!seen.has(key));seen.add(key);}
  for(const name of ['shot','rapidfire','bigshot','hit','rico','ready','boom','collapse','splash','impact','smoke','signal','service','timber']){
    const data=f.effect(context,name).getChannelData(0);sound(data);assert.equal(Math.abs(data[0]),0);assert.ok(Math.abs(data.at(-1))<.002);
  }
  for(const name of ['engine','chain','grit'])sound(f.motor(context,name).getChannelData(0));
  for(const id of ids){const b=f.ambience(context,id,'clear');sound(b.getChannelData(0));sound(b.getChannelData(1));}
  for (const [id,weather] of [['field','rain'],['desert','sandstorm'],['frost','snow'],['port','night']]) sound(f.ambience(context,id,weather).getChannelData(0));
});

test('no audio device: an audition or sortie is silent without throwing or fetching files',()=>{
  const a=vm.runInNewContext(source('audio')+';AudioSystem',{window:{},document:{addEventListener(){}},GameState:{arena:{id:'city'}}});
  assert.equal(a.unlock(),false);assert.ok(!a.preview('city'));a.enter();a.motion();a.play('shot');a.setVolume(0);a.stop();
});

test('shipped audio graph: ten portraits load offline, manual preview, moving tracks, stereo falloff, mute, pause and teardown',async t=>{
  const {page}=await openGame(t,{webgl:true,mobile:true,seed:{settings:{volume:.58}}});
  assert.ok(await page.evaluate(()=>AudioSystem.context==null));
  // Observe native audio nodes, not a log of what the mixer intended to play.
  await page.evaluate(()=>{window.sounds=[];window.pans=[];window.nextNode=new WeakMap();
    const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(to,...args){nextNode.set(this,to);return connect.call(this,to,...args);};
    const proto=AudioBufferSourceNode.prototype,start=proto.start;proto.start=function(...args){sounds.push(this);return start.apply(this,args);};
    const pan=AudioContext.prototype.createStereoPanner;AudioContext.prototype.createStereoPanner=function(){const p=pan.call(this);pans.push(p);return p;};
  });
  for(const id of ids){await page.selectOption('#map-select',id);assert.deepEqual(await page.locator('#map-vista').evaluate(async img=>{await img.decode();return [img.getAttribute('src'),img.naturalWidth,img.naturalHeight];}),['assets/sectors/'+id+'.webp',768,320]);}
  await page.locator('#sector-atlas summary').click();await page.locator('#map-listen').click();
  await page.waitForFunction(()=>AudioSystem.context?.state==='running'&&sounds.length===1);
  assert.equal(await page.locator('#map-listen').getAttribute('aria-pressed'),'true');
  const off=()=>page.waitForFunction(()=>document.querySelector('#map-listen').getAttribute('aria-pressed')==='false');
  await off(); // natural end, without a second click
  await page.locator('#map-listen').click();await page.locator('#map-listen').click();await off();
  await page.locator('#map-listen').click();await page.selectOption('#map-select','port');await off();
  assert.ok(await page.locator('#map-sights li').evaluateAll(ls=>ls.length===3 && ls.every(li=>/^[A-G][1-5]$/.test(li.dataset.grid))));
  assert.ok(await page.evaluate(async()=>{GameState.controlMode='mobile';return startTraining();}));
  assert.deepEqual(await page.evaluate(()=>sounds.filter(s=>s.loop).map(s=>s.buffer.numberOfChannels)),[1,1,1,2]);
  await page.evaluate(()=>{stopBattleLoop();const c=AudioSystem.context;window.meter=c.createAnalyser();AudioSystem.masterGain.connect(meter);
    window.level=()=>{const x=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(x);return Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);};
    GameState.player.speedKmh=25;GameState.player.currentTerrain='cobble';});
  await page.waitForFunction(()=>{AudioSystem.motion();return sounds.find(s=>s.loop).playbackRate.value>1.15 && level()>.001;});
  await page.waitForFunction(()=>{AudioSystem.motion();window.chainGain=nextNode.get(nextNode.get(sounds.filter(s=>s.loop)[1])).gain;return chainGain.value>.22;});
  await page.evaluate(()=>{GameState.player.currentTerrain='mud';});await page.waitForFunction(()=>{AudioSystem.motion();return chainGain.value<.10;});
  assert.deepEqual(await page.evaluate(()=>{const p=GameState.player,a=BattleView.listenerYaw;pans.length=0;
    const first=sounds.length;for(const d of [200,-200,1800])snd('shot',.8,{x:p.x-d*Math.sin(a),y:p.y+d*Math.cos(a)});
    snd('shot',.8,{x:p.x,y:p.y+9000});snd('shot',.8,{x:p.x,y:p.y+22,team:'enemy',visible:false});const filters=sounds.slice(first).map(s=>nextNode.get(s));
    return [pans.map(v=>Math.sign(v.pan.value)),filters[2].frequency.value<filters[0].frequency.value,nextNode.get(filters[2]).gain.value<nextNode.get(filters[0]).gain.value/2];}),[[1,-1,1],true,true]);
  await page.evaluate(()=>AudioSystem.setVolume(0));await page.waitForFunction(()=>level()<.00001);
  await page.evaluate(()=>{AudioSystem.setVolume(.58);BattleInput.pause();});await page.waitForFunction(()=>level()<.00001);
  const before=await page.evaluate(()=>{snd('boom');return sounds.length;});await page.locator('#resume-input').click();
  await page.waitForFunction(n=>sounds.length===n+4&&level()>.001,before);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>level()<.00001 && BattleInput.state==='paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#resume-input').click();await page.waitForFunction(()=>level()>.001);
  await page.evaluate(()=>backToGarage());await page.waitForFunction(()=>level()<.00001);
});
