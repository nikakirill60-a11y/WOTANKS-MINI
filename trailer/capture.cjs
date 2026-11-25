// Film the shipped game in an isolated, offline Chromium context. The director changes
// the camera and advances the game clock; no renderer or recording code ships in the player.
// node trailer/capture.cjs /tmp/ct-film [--proof] [bay|drive|salvo|team ...]
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../tests/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
if(!args[0])throw Error('Pass an output directory for temporary frames');
const out=path.resolve(args.shift()),proof=args.includes('--proof'),shots=args.filter(x=>x!=='--proof');
const lens={bay:120,drive:120,salvo:180,team:180};
async function capture(browser,shot){
  const n=lens[shot];if(!n)throw Error('Unknown shot '+shot);
  const context=await browser.newContext({offline:true,viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  try{
    page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https?:/,r=>{errors.push('External request: '+r.request().url());return r.abort();});
    await page.addInitScript(()=>{let seed=455182;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.evaluate(shot=>{const owned=['ST-II','LEOPARD-1','KPZ-67'];localStorage.setItem('ct_progress_v1',JSON.stringify({owned,selected:shot==='drive'?owned[1]:shot==='team'?owned[2]:owned[0],settings:{volume:0}}));},shot);
    await page.locator('#entry-guest').click();await page.waitForFunction(()=>DepotView.stats()?.triangles>0);
    await page.evaluate(async shot=>{
      const g=GameState,T=THREE,bay=shot==='bay',m=BATTLE_UNITS_PER_METRE;
      if(!bay){
        const map={drive:'desert',salvo:'frost',team:'port'}[shot];
        document.querySelector('#map-select').value=map;document.querySelector('#train-nat-select').value='germany';fillEnemySelect();document.querySelector('#enemy-select').value='LEOPARD-1';
        // Fix the weather for matching cuts, but keep the original terrain and sky.
        const init=WeatherEngine.initWeatherForBattle;
        WeatherEngine.initWeatherForBattle=function(a){init.call(this,a);this.currentWeather=map==='frost'?'snow':'clear';};
        g.controlMode='mobile';if(!await (shot==='team'?startBattle(15):startTraining()))throw Error(document.querySelector('#battle-notice-text').textContent);
        stopBattleLoop();stopPerfMonitor();
      }
      const [renderer,scene,original]=await new Promise(resolve=>{
        const proto=T.Mesh.prototype,hook=proto.onBeforeRender;
        proto.onBeforeRender=function(r,s,c,...rest){
          if(r.domElement.id===(bay?'depot-canvas':'game') && c.isPerspectiveCamera){proto.onBeforeRender=hook;resolve([r,s,c]);}
          return hook.call(this,r,s,c,...rest);
        };
        if(bay)DepotView.view('iso');else BattleView.draw();
      });
      const cam=new T.PerspectiveCamera(bay?37:36,16/9,bay?.08:.8,original.far),target=new T.Vector3();
      renderer.setPixelRatio(1);renderer.setSize(1280,720,false);
      const render=renderer.render.bind(renderer),labels=scene.children.filter(o=>o.isGroup && o.children.length===3 && o.children.every(c=>c.geometry?.type==='PlaneGeometry'));
      if(!bay)renderer.render=function(scene){for(const l of labels){if(shot==='team')l.quaternion.copy(cam.quaternion);else l.visible=false;}render(scene,cam);};
      const p=g.player,e=g.units[1];let time=1000,oldTicks=0;
      BattleClock.now=()=>time;BattleClock.date=()=>100000+time;
      let model,center,span,fx,pack,meta={};
      const uniforms=new Set();
      if(bay){
        model=scene.getObjectByName('СТ-II');const b=new T.Box3().setFromObject(model);center=b.getCenter(new T.Vector3());span=b.getSize(new T.Vector3());
        scene.traverse(o=>{if(o.material?.uniforms?.uTime)uniforms.add(o.material.uniforms.uTime);});
      }else if(shot==='drive'){
        // The stationary training target is not part of the travelling shot.
        e.x=-1800;e.y=800;TrackDrive.place(e);p.driveSpeed=8;g.keys.KeyW=true;
      }else if(shot==='salvo'){
        p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
        if(!p.modelAsset.muzzles.every(t=>p.sightHit(650,true,false,t).hit===e))throw Error('Blocked salvo at the training position');
        fx=new T.PointLight(0xffbb70,0,105,1);scene.add(fx);
      }else {if(g.units.length!==30)throw Error('Expected both teams');g.keys.KeyW=true;}
      const point=(x,h,z,tx,th,tz,fov)=>{cam.position.set(x,h,z);target.set(tx,th,tz);cam.fov=fov;cam.lookAt(target);cam.updateProjectionMatrix();cam.updateMatrixWorld();};
      window.filmFrame=(i,last,read)=>{
        const u=i/(last-1),seconds=i/24;
        if(bay){
          const a=.87-.50*u,d=Math.max(span.z*1.30,6.55)-.52*u;
          point(center.x+Math.sin(a)*d,center.y+1.32+.48*u,center.z+Math.cos(a)*d,center.x-.15,center.y+.15,center.z-.16,39);
          for(const t of uniforms)t.value=seconds+5;
        }else{
          // Slow the SAME volley, not two separate calls to fire. All movement, damage,
          // recoil and HP changes come from the game at its normal 60 simulation ticks/s.
          const t=shot==='salvo'?(i<=90?seconds:3.75+(Math.min(i,126)-90)/24*.24+Math.max(0,i-126)/24):seconds;
          const tick=Math.floor(t*60+1e-5);
          while(oldTicks<tick){time=1000+(++oldTicks)*1000/60;update();}
          if(shot==='drive'){
            point(p.x+64-40*u,p.rideHeight+21+3*u,p.y+94,p.x+8,p.rideHeight+12,p.y,35);
          }else if(shot==='salvo'){
            // Input slew must not drift to the free camera between the staged shot and impact.
            p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
            if(i===90){if(!p.fire(0)||g.bullets.length!==2)throw Error('Not a double volley');meta.volley=g.bullets.map(b=>[b.x,b.y,b.h,b.dmg]);}
            const flash=Math.max(0,1-(i-90)/8);
            if(i>=90){const q=p.muzzle();fx.position.set(q.x,q.h+1,q.y);fx.intensity=170*flash*flash;}
            if(i<100){const a=.82-.40*Math.min(i,90)/90,d=133-24*Math.min(i,90)/90;
              point(p.x+d*Math.cos(a),p.rideHeight+36-7*u,p.y-d*Math.sin(a),p.x+8,p.rideHeight+16,p.y,36);}
            else if(i<111){point(p.x-30,p.rideHeight+40,p.y-33,e.x,e.aimHeight,e.y,39);}
            else{const v=(i-111)/(last-111);point(e.x-95+17*v,e.rideHeight+33-5*v,e.y+61+12*v,e.x-3,e.rideHeight+13,e.y,36);}
            if(i>=90 && i<100){meta.tips??={};meta.tips[i]=p.modelAsset.muzzles.map(t=>{const a=p.muzzle(t),v=new T.Vector3(a.x,a.h,a.y).project(cam);return [(1+v.x)*640,(1-v.y)*360];});}
            if(g.battleDmg>0 && meta.hitFrame==null)meta.hitFrame=i;
          }else{
            const z=p.y,x=p.x,h=p.rideHeight,sign=Math.sin(p.angle)>=0?1:-1;
            if(i<90){const v=i/90;point(x+122+42*v,h+65+92*v,z+sign*(147+95*v),x,h+13,z+sign*(5+32*v),46);}
            else{const v=(i-90)/90;
              pack??=g.units.slice(0,15).sort((a,b)=>Math.hypot(a.x-x,a.y-z)-Math.hypot(b.x-x,b.y-z)).slice(0,5);
              const cx=pack.reduce((s,a)=>s+a.x,0)/pack.length,cz=pack.reduce((s,a)=>s+a.y,0)/pack.length;
              const dist=Math.max(275,2.32*Math.max(...pack.map(a=>Math.hypot(a.x-cx,a.y-cz))));
              point(cx-dist*(.38+.18*v),h+dist*(.45+.14*v),cz-sign*dist*(.86-.18*v),cx,h+6,cz,40);}
          }
        }
        if(i===last-1 && shot==='salvo'){meta.damage=g.battleDmg;if(meta.damage!==880)throw Error('Wrong on-screen damage: '+meta.damage);}
        if(!read)return null;
        if(bay)render(scene,cam);else BattleView.draw();return renderer.domElement.toDataURL('image/jpeg',.94).split(',')[1];
      };
      window.filmNotes=()=>meta;
    },shot);
    const dir=path.join(out,proof?'proof':'frames',shot);fs.mkdirSync(dir,{recursive:true});
    for(let i=0;i<n;i++){
      const read=!proof || [0,Math.floor(n/2),n-1,...(shot==='salvo'?[90,96,103,113,120]:[])].includes(i);
      const data=await page.evaluate(([i,n,read])=>filmFrame(i,n,read),[i,n,read]);
      if(data)fs.writeFileSync(path.join(dir,String(i).padStart(3,'0')+'.jpg'),Buffer.from(data,'base64'));
    }
    if(errors.length)throw Error(errors.join('\n'));
    const notes=await page.evaluate(()=>filmNotes());fs.writeFileSync(path.join(dir,'notes.json'),JSON.stringify(notes));console.log(shot,proof?'proof':n+' frames',notes.damage??'');
  }finally{await context.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{for(const shot of shots.length?shots:Object.keys(lens))await capture(b,shot);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
