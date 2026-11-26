// Film the 1.4 build on disk. The camera and the three scripted driver seats are for
// photography only: no live accounts, copied HUD mockups or changes to the game archive.
const fs = require('node:fs'), path = require('node:path'), {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict'), {chromium} = require('../../tests/node_modules/playwright-core');
const root = path.resolve(__dirname, '../..'), [work, ...args] = process.argv.slice(2);
if (!work) throw Error('Pass a rushes directory outside the repository');
const proof = args.includes('--proof'), plansOnly=args.includes('--plans'), picks = args.filter(a => !a.startsWith('--'));
// Camera rails in game metres, two different landmarks per new sector.
// [first eye, last eye, first target, last target, field of view].
const rails = {
  quarry: [[[155,42,-179],[176,32,-188],[222,14,-213],[233,11,-214],48]],
  burgstadt: [ [[-56,84,129],[-17,63,105],[31,15,-42],[74,13,-32],48],
    [[277,49,103],[246,36,87],[235,32,-2],[226,33,-6],49] ],
  cape: [ [[86,44,-26],[116,31,-35],[178,21,-77],[179,18,-77],48],
    [[-57,28,126],[-73,21,136],[-122,9,81],[-129,8,80],50] ],
  sawmill: [ [[20,35,-23],[39,24,-43],[92,11,-89],[98,9,-94],47],
    [[26,18,160],[42,14,159],[76,7,111],[87,6,116],51] ],
  airfield: [ [[-54,43,-10],[-26,30,-22],[71,13,-90],[77,11,-93],50],
    [[163,22,-198],[176,13,-191],[206,6,-169],[209,4,-170],43] ]
};
const lens = {quarry:56, burgstadt:96, cape:96, sawmill:96, airfield:96, kpz:97, squad:91, tree:81, case:89};
async function plans(b) {
  const c=await b.newContext({offline:true});
  try {const p=await c.newPage();await p.goto(pathToFileURL(path.join(root,'index.html')).href);
    const images=await p.evaluate(keys=>{const select=document.querySelector('#map-select'),plan=document.querySelector('#map-plan');
      plan.width=plan.height=320;MapChart.initPicker();return keys.map(key=>{select.value=key;select.dispatchEvent(new Event('change'));
        if(!plan.getAttribute('aria-label').includes(BattleMaps.specs[key].name))throw Error('Plan mismatch: '+key);
        return plan.toDataURL('image/png').split(',')[1];});},Object.keys(rails));
    assert.equal(new Set(images).size,Object.keys(rails).length);
    fs.mkdirSync(path.resolve(work,'inserts'),{recursive:true});Object.keys(rails).forEach((key,i)=>fs.writeFileSync(path.resolve(work,'inserts',key+'-plan.png'),Buffer.from(images[i],'base64')));
    console.log('Five distinct sector charts OK');
  }finally{await c.close();}
}
async function shoot(browser, shot) {
  const dir = path.resolve(work, proof ? 'proof' : 'rushes', shot), insert = path.resolve(work,'inserts');
  fs.mkdirSync(dir, {recursive:true}); fs.mkdirSync(insert,{recursive:true});
  const c = await browser.newContext({offline:true, viewport:{width:1280,height:720}, reducedMotion:'reduce'});
  try {
    const page = await c.newPage(), errors = []; page.setDefaultTimeout(40000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r=>{ errors.push(r.request().url()); return r.abort(); });
    await page.addInitScript(()=>{ let seed=140462; Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296); });
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    if (shot==='kpz'||shot==='squad'||shot==='tree') {
      await page.evaluate(()=>localStorage.setItem('ct_progress_v1',JSON.stringify({owned:['KPZ-67','AMX-50-B','ARES-90'],selected:'KPZ-67',settings:{volume:0},tree2026:{gingerbread:1,deer:1,fir:1,bauble:1},treeSlots2026:[]})));
      await page.locator('#entry-guest').click();
      await page.waitForFunction(()=>DepotView.stats()?.id==='KPZ-67'&&DepotView.stats().triangles>0);
    }
    if (shot==='kpz') {
      const guide=page.locator('#kpz-guide'); await guide.locator('summary').click();
      for(let j=0;j<2;j++) {await page.locator('#kpz-ammo').selectOption({index:j});
        await guide.screenshot({path:path.join(insert,'guide-'+j+'.png')});}
      await page.locator('#kpz-ammo').selectOption({index:0}); await guide.locator('summary').click();
    }
    if (shot==='tree') {
      await page.locator('#tree-open').click();
      for(const [i,id] of ['gingerbread','deer','fir','bauble'].entries()) await page.getByLabel('Слот '+(i+1),{exact:true}).selectOption(id);
      await page.locator('#tree-branches').screenshot({path:path.join(insert,'hooks.png')});
      await page.keyboard.press('Escape');
    }
    await page.evaluate(async({shot,rails,n})=>{
      const T=THREE,g=GameState,m=BATTLE_UNITS_PER_METRE,W=1280,H=720;
      const lerp=(a,b,u)=>a+(b-a)*u,vec=(a,b,u)=>new T.Vector3(...a.map((v,i)=>lerp(v,b[i],u)));
      const cubic=u=>u*u*(3-2*u), $=id=>document.getElementById(id);
      let r,s,cam,draw,doFrame,receipt={shot};
      const setupCamera=(f,near,far)=>new T.PerspectiveCamera(f,W/H,near,far);
      const snap=()=>r.domElement.toDataURL('image/jpeg',.93).split(',')[1];
      async function grab(bay){
        return new Promise(resolve=>{const proto=T.Mesh.prototype,old=proto.onBeforeRender;
          proto.onBeforeRender=function(r,s,c,...xs){if(r.domElement.id===(bay?'depot-canvas':'game')&&c.isPerspectiveCamera){proto.onBeforeRender=old;resolve([r,s,c]);}return old.call(this,r,s,c,...xs);};
          if(bay)DepotView.view('iso');else BattleView.draw();});
      }
      if(rails){
        const a=BattleMaps.create(shot);WeatherEngine.currentWeather='clear';s=new T.Scene();
        buildBattleWorld(s,{arena:a,walls:a.walls,terrainZones:a.zones});
        r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(W,H,false);cam=setupCamera(48,.6,19000);
        receipt.name=a.spec.name;receipt.size=a.spec.size;receipt.sector=a.spec.sector;
        doFrame=(i,read)=>{if(!read)return;const j=Math.min(rails.length-1,Math.floor(i*rails.length/n)),v=(i-j*n/rails.length)/(n/rails.length-1),u=v*.62+.38*cubic(v);
          const [a,b,x,y,f]=rails[j];cam.position.copy(vec(a,b,u).multiplyScalar(m));cam.lookAt(vec(x,y,u).multiplyScalar(m));cam.fov=f;cam.updateProjectionMatrix();r.render(s,cam);return snap();};
      }else if(shot==='case'){
        s=new T.Scene();r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(W,H,false);
        r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.15;
        const rig=CrateModel.build('ornament');CrateModel.studio(s);s.add(rig.group);rig.group.position.y=.02;
        // The production tray illustrates all four possible toys. Stage ONE genuine
        // model on the pad for this opening: receipt and image represent one drop.
        const prize=rig.cargo.children[0];for(const toy of rig.cargo.children)toy.visible=(toy===prize);
        prize.position.x=prize.position.z=0;prize.rotation.set(-.37,0,-.09);prize.scale.setScalar(1.03);
        receipt.rig=rig.group.name;receipt.reward='gingerbread';cam=setupCamera(32,.05,60);let last=0;
        doFrame=(i,read)=>{const sec=i/16,u=i/(n-1),t=Math.max(0,sec-1.4),k=cubic(Math.min(1,t/1.68));
          CrateMotion.step(rig,t>0,sec-last,sec);last=sec;
          const az=.59-.43*u,dir=new T.Vector3(Math.sin(az),lerp(.44,.83,k),Math.cos(az)).normalize();
          rig.group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(rig.group,true),target=bounds.getCenter(new T.Vector3());
          const right=new T.Vector3().crossVectors(cam.up,dir).normalize(),up=new T.Vector3().crossVectors(dir,right),slope=Math.tan(cam.fov*Math.PI/360);let dist=4.25;
          for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
            const v=new T.Vector3(x,y,z).sub(target),depth=v.dot(dir);dist=Math.max(dist,depth+Math.abs(v.dot(up))/.94/slope,depth+Math.abs(v.dot(right))/.94/slope/cam.aspect);}
          cam.position.copy(target).addScaledVector(dir,dist);cam.lookAt(target);
          if(!read)return;r.render(s,cam);return snap();};
      }else if(shot==='tree'){
        [r,s]=await grab(true);r.setSize(W,H,false);cam=setupCamera(42,.05,125);
        const tree=s.getObjectByName('festive-spruce');if(!tree)throw Error('Winter yard missing');
        receipt.slots=[...g.treeSlots2026];const target=tree.getWorldPosition(new T.Vector3());
        const room=tree.parent,units=new Set();s.traverse(o=>{if(o.material?.uniforms?.uTime)units.add(o.material.uniforms.uTime);});
        doFrame=(i,read)=>{if(!read)return;const u=i/(n-1),a=lerp(-.43,.03,u),d=lerp(7.2,6.3,u),base=tree.position;
          cam.position.copy(room.localToWorld(new T.Vector3(base.x+Math.sin(a)*d,2.02+.55*u,base.z+Math.cos(a)*d)));
          cam.lookAt(target.clone().add(new T.Vector3(.1,2.07,0)));for(const t of units)t.value=i/16+1;
          r.render(s,cam);return snap();};
      }else{
        const team=shot==='squad';g.controlMode='mobile';const map=team?'airfield':'burgstadt';$('map-select').value=map;
        const init=WeatherEngine.initWeatherForBattle;WeatherEngine.initWeatherForBattle=function(...a){init.apply(this,a);this.currentWeather='clear';};
        let net;
        if(team){const members=['KPZ-67','AMX-50-B','ARES-90'].map((tank,seat)=>({tank,seat,nick:['Полюс','Лиса','Иней'][seat],mods:[],upgrades:{}}));
          net=new PlatoonMatch({id:'c014f00d-film',map,me:0,members},{});
          if(!await launchBattle(7,net))throw Error($('battle-notice-text').textContent);net.live=true;beginSortie();
        }else{ $('train-nat-select').value='ussr';fillEnemySelect();$('enemy-select').value='IS7';if(!await startTraining())throw Error($('battle-notice-text').textContent); }
        stopBattleLoop();stopPerfMonitor();const p=g.player,e=g.units[1];
        if(team){receipt.vehicles=g.units.length;receipt.humans=g.units.filter(v=>v.driverSeat!=null).length;receipt.bots=g.units.filter(v=>v.bot).length;
          for(const [j,v] of g.units.slice(0,3).entries()){v.x=(-140-5*j)*m;v.y=([0,-8,9][j])*m;v.angle=v.tAngle=v.lookYaw=0;TrackDrive.place(v);}g.keys.KeyW=true;
        }else{e.angle=e.tAngle=e.lookYaw=p.angle; p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);}
        [r,s,cam]=await grab(false);cam=cam.clone();cam.clearViewOffset();cam.zoom=1;cam.aspect=W/H;
        r.setPixelRatio(1);r.setSize(W,H,false);draw=r.render.bind(r);
        const labels=s.children.filter(o=>o.isGroup&&o.children.length===3&&o.children.every(x=>x.geometry?.type==='PlaneGeometry'));
        r.render=(scene)=>{for(const lab of labels){if(team&&lab.children.some(x=>x.name.startsWith('callsign:')))lab.quaternion.copy(cam.quaternion);else lab.visible=false;}draw(scene,cam);};
        const base=BattleClock.now(),date=BattleClock.date();let ticks=0,now=base;BattleClock.now=()=>now;BattleClock.date=()=>date+now-base;
        doFrame=(i,read)=>{
          const u=i/(n-1),sec=i/16;
          // Exactly 16 camera frames per second, 60 actual simulation ticks per second.
          while(ticks<Math.floor(sec*60+1e-6)){now=base+(++ticks)*1000/60;
            if(team)for(let seat=1;seat<3;seat++)net.receiveInput(seat,{n:ticks,forward:1,turn:0,yaw:0,pitch:0});update();}
          if(team){const q=g.units.slice(0,3),x=q.reduce((a,b)=>a+b.x,0)/3,z=q.reduce((a,b)=>a+b.y,0)/3;
            cam.position.set(x+184-68*u,p.rideHeight+77-21*u,z+132+13*u);cam.lookAt(x,p.rideHeight+13,z);cam.fov=39;
          }else{
            p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
            if(i===8||i===64){if(!p.toggleCalibration())throw Error('Selector blocked');}
            if(i===16)receipt.blocked=!p.fire(0);
            if(i===24)receipt.active=p.calibration.active;
            if(i===38){if(!p.fire(0))throw Error('No calibrated shot');receipt.damage=g.bullets.at(-1).dmg;}
            if(i===80)receipt.off=!p.calibration.active;
            ShellUI.status(p,now);(receipt.status??=[]).push($('calibration-state').textContent);
            const a=p.angle+.98-.39*u,d=136-11*u,tip=p.muzzle();
            cam.position.set(p.x+Math.cos(a)*d,p.rideHeight+39-10*u,p.y+Math.sin(a)*d);
            cam.lookAt(lerp(p.x,tip.x,.28),p.rideHeight+13,lerp(p.y,tip.y,.28));cam.fov=38;
          }
          if(!read)return;cam.updateProjectionMatrix();cam.updateMatrixWorld();BattleView.draw();return snap();
        };
      }
      window.photo=doFrame;window.receipt=()=>receipt;
    },{shot,rails:rails[shot],n:lens[shot]});
    const n=lens[shot];for(let i=0;i<n;i++) {const read=!proof||[0,Math.floor(n/4),Math.floor(n/2),Math.floor(n*.75),n-1].includes(i);
      const jpg=await page.evaluate(([i,read])=>photo(i,read),[i,read]);if(jpg)fs.writeFileSync(path.join(dir,('000'+i).slice(-3)+'.jpg'),Buffer.from(jpg,'base64')); }
    const note=await page.evaluate(()=>receipt());if(shot==='kpz')assert.ok(note.blocked&&note.active&&note.damage===380&&note.off,JSON.stringify(note));
    if(shot==='squad')assert.deepEqual([note.vehicles,note.humans,note.bots],[14,3,11]);if(shot==='tree')assert.deepEqual(note.slots,['gingerbread','deer','fir','bauble']);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'slate.json'),JSON.stringify({...note,n}));console.log(shot,proof?'proof':n,'OK');
  }finally{await c.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{if(plansOnly||!picks.length||picks.some(k=>rails[k]))await plans(b);if(plansOnly)return;for(const k of (picks.length?picks:Object.keys(lens))){if(!lens[k])throw Error('Unknown shot '+k);await shoot(b,k);}}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
