const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright-core');
const {execFileSync}=require('node:child_process');
const {openGame}=require('./winter-harness.cjs');
const root=path.dirname(process.env.CITY_TANKS_INDEX || path.resolve(__dirname,'../index.html'));
const countries=['ussr','germany','france','sweden','usa','japan'];
const ids=countries.map(n=>'national-'+n),names=['Ящик СССР','Ящик Германии','Ящик Франции','Ящик Швеции','Ящик США','Ящик Японии'];
const downloadControls='[download], a[href$=".zip" i], a[href$=".glb" i], a[href$=".gltf" i]';

test('the six inspection rigs keep their distinct shapes and animated hinges without model exports',()=>{
  const src=['vendor/three-r180.min.js','js/model-kit.js','js/national-crates.js','js/crate-motion.js'];
  const [T,models,M]=vm.runInNewContext(src.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n')+';[THREE,NationalCrates,CrateMotion]',{AbortController,TextDecoder,TextEncoder});
  assert.deepEqual(Object.keys(models.catalog),ids);
  const crateFiles=fs.readdirSync(path.join(root,'assets/crates'));
  assert.ok(!crateFiles.some(f=>/\.(zip|glb|gltf)$/i.test(f)),'no directly downloadable crate models or packs');
  for(const id of ids)assert.ok(!fs.existsSync(path.join(root,'models',id+'.glb')),'old model URL: '+id);
  const silhouettes=new Set();
  for(const id of ids){
    const rig=models.build(id),{group,hinge}=rig,interior=group.getObjectByName('Interior');
    assert.equal(hinge.name,'LidHinge');assert.ok(hinge.position.z<0 && hinge.position.y>0);
    assert.deepEqual(Array.from(hinge.children,o=>o.name),['Lid','Lid fittings']);assert.ok(!hinge.getObjectById(interior.id));
    let triangles=0,meshes=0;
    group.traverse(o=>{if(!o.isMesh)return;meshes++;const {position,normal,color}=o.geometry.attributes;
      triangles+=position.count/3;assert.equal(o.material.vertexColors,true);assert.equal(color.count,position.count);assert.equal(normal.count,position.count);
    });
    assert.equal(meshes,5);assert.ok(triangles>500 && triangles<4000);silhouettes.add(new T.Box3().setFromObject(group).getSize(new T.Vector3()).toArray().join(','));
    const point=new T.Vector3(0,0,-2*hinge.position.z),closed=hinge.localToWorld(point.clone()),fixed=interior.getWorldPosition(new T.Vector3()),axis=hinge.getWorldPosition(new T.Vector3());
    for(const open of [true,false]){
      const start=hinge.rotation.x;
      M.step(rig,open,1/M.film.fps,0);assert.ok(hinge.rotation.x> M.angle && hinge.rotation.x<0 && hinge.rotation.x!==start);
      M.snap(rig,open);
      assert.ok(axis.distanceTo(hinge.getWorldPosition(new T.Vector3()))<1e-8);assert.ok(fixed.distanceTo(interior.getWorldPosition(new T.Vector3()))<1e-8);
      const end=hinge.localToWorld(point.clone());if(open)assert.ok(end.y>closed.y+.55 && end.z<axis.z);else assert.ok(end.distanceTo(closed)<1e-6);
    }
    for(const pose of ['','-open','-motion'])assert.ok(crateFiles.includes(id+pose+'.webp'));
  }
  assert.equal(silhouettes.size,6,'not six paint jobs on one box');
});

const watchBench=()=>{
  const original=THREE.Scene.prototype.onAfterRender;window.bench={};
  THREE.Scene.prototype.onAfterRender=function(r,s,c){original.apply(this,arguments);const h=s.getObjectByName('LidHinge');if(!h)return;
    const record=bench[h.parent.name]??={};record.eye=c.position.toArray();record.angle=h.rotation.x;
    if(h.rotation.x<-.08 && h.rotation.x>-2.49)record.moved=true;
  };
};

test('hangar: every national model can be dragged, opened and closed for free; original shop, stock and balances stay unchanged',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{inventory:{premium:2,ornament:1},SILVER:100000,GOLD:2300}}),before=await saved();
  await click('Контейнеры');await page.locator('#to-national').click();await page.evaluate(watchBench);
  assert.equal(await page.locator('#container-grid .c-buy').count(),3);assert.equal(await page.locator('#national-grid button').count(),6);
  assert.deepEqual(await page.locator('#national-grid .crate-art img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));return imgs.map(i=>[i.naturalWidth,i.naturalHeight]);}),ids.map(()=>[512,352]));
  const showcase=page.locator('#national-showcase');
  assert.equal(await showcase.locator(downloadControls).count(),0);assert.doesNotMatch(await showcase.innerText(),/скачать/i);
  for(const [i,name] of names.entries()){
    await click('Осмотреть модель: '+name);assert.equal(await page.locator('#unpack-title').innerText(),name);
    assert.equal(await page.locator('#container-opening').locator(downloadControls).count(),0);
    const canvas=page.locator('#crate-canvas');assert.equal(await canvas.getAttribute('aria-label'),'3D-модель: '+name);
    const frame=()=>page.evaluate(n=>bench[n],name),first=await frame();assert.equal(Math.abs(first.angle),0);
    const b=await canvas.boundingBox(),x=b.x+b.width*.42,y=b.y+b.height*.57;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+88,y-14,{steps:4});await page.mouse.up();assert.notDeepEqual((await frame()).eye,first.eye);
    if(i===0)await page.emulateMedia({reducedMotion:'no-preference'});
    await click('Открыть крышку');await page.waitForFunction(n=>bench[n].angle===-2.55,name);
    if(i===0){assert.ok((await frame()).moved);await page.emulateMedia({reducedMotion:'reduce'});}
    assert.ok(await page.locator('#reward-display').isHidden());await click('Закрыть крышку');assert.equal(Math.abs((await frame()).angle),0);
    await click('Назад');assert.equal(await page.locator('#crate-canvas').count(),0);assert.deepEqual(await saved(),before);
  }
  const checks=await page.evaluate(ids=>ids.map(id=>{
    buyContainer(id);openFromInventory(id);openAllFromInventory(id);
    return [CONTAINERS[id].cost??null,migrateSupplyBoxes({[id]:2}),CrateView.active];
  }),ids);assert.deepEqual(checks,ids.map(id=>[null,{[id]:2},false]));await click('Инвентарь');
  assert.equal(await page.locator('#inventory-grid .inv-card').count(),2);assert.deepEqual(await saved(),before);await click('В ангар');await page.reload();assert.deepEqual(await saved(),before);
});

test('earned opening uses the national 3D hinge and a saved vehicle receipt, not the free exhibit',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{inventory:{'national-france':1}}});
  await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();await page.evaluate(watchBench);
  await page.locator('.inv-open').evaluate(b=>{const old=Math.random,r=[.019,0];try{Math.random=()=>r.length?r.shift():old();b.click();}finally{Math.random=old;}});
  await page.locator('#reward-display:not([hidden])').waitFor();assert.equal(await page.locator('#crate-canvas').getAttribute('aria-label'),'3D-модель: Ящик Франции');
  await page.waitForFunction(()=>bench['Ящик Франции']?.angle===-2.55);assert.match(await page.locator('#reward-lines').innerText(),/AM Gendron/);
  const s=await saved();assert.deepEqual(s.owned,['MS1','NAT095']);assert.deepEqual(s.inventory,{});
  await click('Повторить анимацию');await click('Пропустить анимацию');await page.locator('#unpack-collect').click();await page.reload();assert.deepEqual(await saved(),s);
});

test('mobile without WebGL: all six have closed/open posters plus local opening and closing frames, without a reward',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{inventory:{basic:1}}}),before=await saved();await click('Контейнеры');await page.locator('#to-national').click();
  assert.ok(await page.locator('#tab-shop').evaluate(p=>p.scrollWidth<=p.clientWidth));
  await page.evaluate(()=>{const draw=CanvasRenderingContext2D.prototype.drawImage;window.tiles=[];
    CanvasRenderingContext2D.prototype.drawImage=function(sheet,x,y){if(this.canvas.className==='crate-film')tiles.push([sheet.src.split('/').pop(),x,y,sheet.naturalWidth,sheet.naturalHeight]);return draw.apply(this,arguments);};});
  for(const [i,id] of ids.entries()){
    await click('Осмотреть модель: '+names[i]);const poster=page.locator('.crate-poster');assert.equal(await page.locator('#crate-canvas').count(),0);
    for(const open of [false,true]){if(open)await click('Открыть крышку');await poster.evaluate(n=>n.decode());assert.equal(await poster.getAttribute('src'),`assets/crates/${id}${open?'-open':''}.webp`);}
    assert.equal(await page.locator('.crate-film').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
    // Replay starts the opening track from closed. Closing has its own half of the sheet.
    for(const [opening,button] of [[true,'Повторить анимацию'],[false,'Закрыть крышку']]){
      await page.evaluate(()=>{tiles.length=0;});await click(button);await page.waitForFunction(()=>new Set(tiles.map(t=>`${t[1]},${t[2]}`)).size>=2);
      const tile=await page.evaluate(()=>tiles[0]);assert.deepEqual(tile,[id+'-motion.webp',0,opening?0:960,2688,1920]);
      await click('Пропустить анимацию');assert.ok(await page.locator('#reward-display').isHidden());
    }
    await page.emulateMedia({reducedMotion:'reduce'});await click('Назад');
  }
  assert.deepEqual(await saved(),before);
});

test('standalone view-only gallery: phone touch rotates a rig offline, without model files, download links or a profile',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ct-national-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  execFileSync(process.execPath,[path.resolve(__dirname,'../tools/build_national_gallery.mjs'),dir,root]);
  assert.ok(!fs.readdirSync(dir,{recursive:true}).some(f=>/\.(glb|gltf|zip)$/i.test(f)));
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const issues=[];t.after(async()=>{await b.close();assert.deepEqual(issues,[]);});
  const page=await b.newPage({offline:true,hasTouch:true,reducedMotion:'reduce',viewport:{width:390,height:780}});page.setDefaultTimeout(12000);
  page.on('pageerror',e=>issues.push(e.message));page.on('requestfailed',r=>issues.push(r.url()));page.on('request',r=>{if(/^https?:/.test(r.url()))issues.push(r.url());});
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href);await page.evaluate(watchBench);
  assert.equal(await page.locator('.national-card').count(),6);assert.equal(await page.locator(downloadControls).count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/скачать/i);
  const inspect=page.getByRole('button',{name:'Осмотреть модель: Ящик Швеции',exact:true});await inspect.tap();
  const canvas=page.locator('#crate-canvas'),eye=()=>page.evaluate(()=>bench['Ящик Швеции'].eye),first=await eye();
  const c=await page.context().newCDPSession(page),bb=await canvas.boundingBox(),x=bb.x+bb.width*.38,y=bb.y+bb.height*.5;
  for(const [type,offset] of [['touchStart',0],['touchMove',35],['touchMove',72],['touchEnd',0]])await c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:x+offset,y,id:1}]});
  // The snapshot in watchBench is from the last *rendered* frame, not the tap handler.
  await page.waitForFunction(from=>bench['Ящик Швеции'].eye.some((x,i)=>x!==from[i]),first);
  await page.getByRole('button',{name:'Открыть крышку'}).tap();await page.waitForFunction(()=>bench['Ящик Швеции'].angle===-2.55);
  await page.getByRole('button',{name:'Закрыть крышку'}).tap();await page.waitForFunction(()=>bench['Ящик Швеции'].angle===0);
  await page.getByRole('button',{name:'Назад'}).tap();assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>localStorage.length),0);
});
