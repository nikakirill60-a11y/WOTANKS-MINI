// Second-unit photography for the feature trailer and the 1.3 bulletin. No runtime game patches.
// node trailer/editions/shoot.cjs WORK [--proof] [shot ...]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../../tests/node_modules/playwright-core');
const root = path.resolve(__dirname, '../..'), [work,...args] = process.argv.slice(2);
if (!work) throw Error('Pass a temporary work directory');
const proof = args.includes('--proof'), picked = args.filter(v=>v!=='--proof');
const set = {
  cradle: ['MS1','bay',108], debut: ['MS1','field',132], scout: ['LTR','desert',100],
  foundry: ['KV1','city',112], tiger: ['TIGERP','quarry',112], titan: ['MAUS','desert',164],
  summit: ['IS7','frost',168], carrier: ['GPZ','bay',112], scope: ['GPZ','city',152]
};
async function shoot(b,key){
  const [id,stage,n] = set[key], bay=stage==='bay',
    dir=path.resolve(work,proof?'proof':'frames',key),extra=path.resolve(work,'inserts');
  fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(extra,{recursive:true});
  const c=await b.newContext({offline:true,viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'reduce'});
  try{
    const page=await c.newPage(),errors=[]; page.setDefaultTimeout(40000);
    page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{errors.push(r.request().url());return r.abort();});
    await page.addInitScript(()=>{let s=14683;Math.random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);});
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.evaluate(id=>{if(!DB[id])throw Error('Unknown vehicle '+id);
      const start=id==='GPZ'?'MS1':id;localStorage.setItem('ct_progress_v1',JSON.stringify({owned:[start],selected:start,XP:500,settings:{volume:0}}));},id);
    const click=name=>page.getByRole('button',{name,exact:true}).click();await click('ГОСТЬ');
    if(id==='GPZ'){
      await click('Код');await page.getByLabel('Промокод',{exact:true}).fill('ARTA');await click('АКТИВИРОВАТЬ');
      assert.match(await page.locator('#promo-result').innerText(),/Аренда на 4 боя/);
      if(key==='carrier')await page.locator('.promo-content').screenshot({path:path.join(extra,'rental.png')});
      await click('ЗАКРЫТЬ');await click('Выбрать для боя: G.Pz. Mk. VI (e)');
    }
    await page.waitForFunction(id=>DepotView.stats()?.id===id && DepotView.stats().triangles>0,id);
    if(key==='cradle'){
      const slate=await page.evaluate(()=>{
        const roster=makeRosters('KPZ-67',7);return {roster:roster.map(a=>a.map(id=>({id,n:DB[id].n,t:DB[id].tier,art:DB[id].thumbnail}))),
          routes:[USSR_BRANCH,GERMAN_MAUS_BRANCH].map(a=>a.map(t=>({n:t.n,t:t.tier,art:t.thumbnail}))) };
      });assert.notDeepEqual(slate.roster[0].map(v=>v.id).sort(),slate.roster[1].map(v=>v.id).sort());
      fs.writeFileSync(path.join(extra,'ledger.json'),JSON.stringify(slate,null,2));
    }
    await page.evaluate(async({key,id,stage,bay})=>{
      const g=GameState,T=THREE,scope=key==='scope';
      if(!bay){
        const rival=scope?'T28_USSR':key==='summit'?'MAUS':'T26';
        const $=id=>document.getElementById(id);$('map-select').value=stage;if($('map-select').value!==stage)throw Error('Map mismatch '+stage);
        $('train-nat-select').value=DB[rival].nat;fillEnemySelect();$('enemy-select').value=rival;
        const init=WeatherEngine.initWeatherForBattle;WeatherEngine.initWeatherForBattle=function(a){init.call(this,a);this.currentWeather=stage==='frost'?'snow':'clear';};
        g.controlMode='mobile';if(!await startTraining())throw Error($('battle-notice-text').textContent);stopBattleLoop();stopPerfMonitor();
        if(scope){if(!g.player.rented || g.rentalBattles.GPZ!==3)throw Error('Missing four-battle rental');BattleView.toggleScope();BattleView.focusDistance(-1);
          // Keep the real artillery ring and status widget; remove touch buttons from this insert.
          const style=document.createElement('style');style.textContent='#hud > :not(#arty-overlay),#mobile-controls,#perf-hud{visibility:hidden!important}#arty-overlay{visibility:visible!important}';document.head.append(style);}
      }
      const [renderer,scene,original]=await new Promise(resolve=>{const proto=T.Mesh.prototype,old=proto.onBeforeRender;
        proto.onBeforeRender=function(r,s,c,...xs){if(r.domElement.id===(bay?'depot-canvas':'game')&&c.isPerspectiveCamera){proto.onBeforeRender=old;resolve([r,s,c]);}return old.call(this,r,s,c,...xs);};
        if(bay)DepotView.view('iso');else BattleView.draw();});
      const cam=new T.PerspectiveCamera(35,16/9,bay?.04:.7,original.far), render=renderer.render.bind(renderer);
      renderer.setPixelRatio(1);renderer.setSize(1280,720,false);
      const labels=scene.children.filter(o=>o.isGroup && o.children.length===3 && o.children.every(c=>c.geometry?.type==='PlaneGeometry'));
      if(!bay && !scope)renderer.render=s=>{labels.forEach(l=>l.visible=false);render(s,cam);};
      const p=g.player,e=g.units[1];let t=2000,ticks=0,center,span,fx,box;const uniforms=[];const notes={id,stage};
      BattleClock.now=()=>t;BattleClock.date=()=>100000+t;
      if(bay){const m=scene.getObjectByName(DB[id].n);if(!m)throw Error('Missing garage mesh '+id);box=new T.Box3().setFromObject(m);
        center=box.getCenter(new T.Vector3());span=box.getSize(new T.Vector3());scene.traverse(o=>{if(o.material?.uniforms?.uTime)uniforms.push(o.material.uniforms.uTime);});}
      else if(scope){notes.sight=BattleView.stats().mode;notes.before=g.rentalBattles.GPZ+1;
        BattleView.artillery.moveTo(e.x-33,e.y-12);}
      else if(key==='summit'){
        fx=new T.PointLight(0xffb15c,0,135,1);scene.add(fx);
      }else{e.x=-2100;e.y=800;TrackDrive.place(e);g.keys.KeyW=true;p.driveSpeed=key==='debut'?2:4;}
      function point(x,y,z,tx,ty,tz,f){cam.position.set(x,y,z);cam.lookAt(tx,ty,tz);cam.fov=f;cam.updateProjectionMatrix();cam.updateMatrixWorld();}
      window.takeFrame=(i,N,read)=>{
        const u=i/(N-1),su=u*u*(3-2*u),s=i/24;
        if(bay){const gp=id==='GPZ',a=gp?.90-.72*su:1.05-.81*su;
          const d=Math.max(span.z*(gp?1.24:1.53),gp?4.95:4.10)+(1-su)*(gp?.65:2.5);
          point(center.x+Math.sin(a)*d,center.y+(gp?1.05:.50)+.65*(1-su),center.z+Math.cos(a)*d,center.x-.10,center.y+.09,center.z,37);
          uniforms.forEach(j=>j.value=s+3);
        }else{
          const sim=key==='summit'&&i>99?99/24+(Math.min(132,i)-99)/24*.32+Math.max(i-132,0)/24:s;
          while(ticks<Math.floor(sim*60+1e-6)){t=2000+(++ticks)*1000/60;update();}
          if(scope){const a=BattleView.artillery,v=Math.min(1,i/37),ease=v*v*(3-2*v);a.moveTo(e.x-33*(1-ease),e.y-12*(1-ease));
            if(i===109){notes.ready=a.aligned(p);notes.focus=a.focus;if(!p.fire(0,a)||!g.bullets[0]?.arc)throw Error('The real artillery shot did not launch');}
            BattleView.syncCamera();BattleView.aim();if(i===N-1){notes.damage=g.battleDmg;if(notes.sight!=='artillery'||notes.focus<.95)throw Error('No converged overhead sight');}
          }else if(key==='summit'){
            p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);
            if(i===99){if(!p.fire(0))throw Error('IS-7 did not fire');notes.shot=i;}
            const f=Math.max(0,1-(i-99)/8);if(i>=99){const q=p.muzzle();fx.position.set(q.x,q.h+1,q.y);fx.intensity=240*f*f;}
            if(i<111){const a=.93-.54*su,d=138-24*su;point(p.x+Math.cos(a)*d,p.rideHeight+24+7*(1-u),p.y-Math.sin(a)*d,p.x+5,p.rideHeight+13,p.y,34);}
            else if(i<131){point(p.x-69,p.rideHeight+36,p.y-39,e.x,e.aimHeight,e.y,33);}
            else{point(e.x-107,e.rideHeight+26,e.y+65+14*u,e.x,e.rideHeight+17,e.y,40);}
            if(i===N-1)notes.damage=g.battleDmg;
          }else{
            const b=p.modelAsset.hull.boundingBox,length=(b.max.z-b.min.z)*9,h=p.modelAsset.height*9;
            const [alpha,arc,range,lift]=({debut:[1.10,-.59,1.78,.78],scout:[.32,.67,1.85,.72],tiger:[1.18,-.62,1.66,.73],foundry:[.64,.48,1.79,.88],titan:[1.22,-.78,1.62,.62]})[key];
            const angle=p.angle+alpha+arc*su,d=length*(range+.20*(1-su));
            point(p.x+Math.cos(angle)*d,p.rideHeight+h*(lift+.40*(1-su)),p.y+Math.sin(angle)*d,p.x+Math.cos(p.angle)*length*.06,p.rideHeight+h*.54,p.y+Math.sin(p.angle)*length*.06,37);
          }
        }
        if(!read)return null;if(bay)render(scene,cam);else BattleView.draw();
        return scope?null:renderer.domElement.toDataURL('image/jpeg',.93).split(',')[1];
      };window.shootNotes=()=>notes;
    },{key,id,stage,bay});
    for(let i=0;i<n;i++){
      const read=!proof||[0,Math.floor(n/2),n-1,100,110,119,139].includes(i),name=path.join(dir,String(i).padStart(3,'0')+'.jpg');
      const data=await page.evaluate(([i,n,r])=>takeFrame(i,n,r),[i,n,read]);
      if(read){if(key==='scope')await page.screenshot({path:name,type:'jpeg',quality:92});else fs.writeFileSync(name,Buffer.from(data,'base64'));}
    }
    const notes=await page.evaluate(()=>shootNotes());assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'notes.json'),JSON.stringify(notes));console.log(key,proof?'proof':n,notes);
  }finally{await c.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const k of picked.length?picked:Object.keys(set)){if(!set[k])throw Error('Unknown shot '+k);await shoot(b,k);}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
